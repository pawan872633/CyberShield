from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Union, Literal
from sqlalchemy.orm import Session
from decimal import Decimal
from loguru import logger
from contextlib import asynccontextmanager

from config import get_settings
from database import get_db, create_all
from models_user import User, Detection, Blacklist
from utils.firewall import block_ip, unblock_ip  # 👈 include unblock_ip
from logger_mongo import log_event

# ML
from pathlib import Path
import joblib
from ml.preprocessing import to_feature_vector, FEATURE_ORDER
from ml.train import MODEL_PATH as MODEL_FILE

settings = get_settings()
model = None  # Global ML model variable

# ------------------- Lifespan (startup/shutdown) -------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    global model
    create_all()
    try:
        if not Path(MODEL_FILE).exists():
            from ml.train import train_dummy
            train_dummy()
        model = joblib.load(MODEL_FILE)
        logger.info("✅ ML model loaded.")
    except Exception as e:
        logger.exception(f"❌ Model load/train failed: {e}")
        model = None
    yield
    logger.info("🛑 Shutting down backend...")

# ------------------- FastAPI App -------------------
app = FastAPI(title="CyberShield Backend", version="1.0.0", lifespan=lifespan)

# CORS
allow_origins = list(set([
    "http://localhost:3000",
    "http://127.0.0.1:3000"
] + settings.cors_origins_list))
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------- Schemas -------------------
class UserCreate(BaseModel):
    username: str
    email: str
    password: str = "changeme"

class LoginRequest(BaseModel):
    email: str
    password: str

class DetectRequest(BaseModel):
    src_ip: str
    dest_ip: Optional[str] = None
    features: Union[dict, list, str] = Field(..., description="Dict/list/json string")
    threshold: float = 0.5  # 0..1
    block_target: Literal["src", "dest"] = "dest"  # 👈 which IP to block

class DetectResponse(BaseModel):
    id: int
    is_malicious: bool
    score: float

class BlacklistCreate(BaseModel):
    ip: str
    reason: Optional[str] = None

# ------------------- Root & Health -------------------
@app.get("/")
def root():
    return {"app": "CyberShield Backend", "docs": "/docs", "health": "/health"}

@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": model is not None}

# ------------------- Auth & Users -------------------
@app.post("/users", response_model=dict)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(409, "Username already exists")
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(409, "Email already exists")
    user = User(username=payload.username, email=payload.email, password=payload.password)
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "username": user.username, "email": user.email}

@app.post("/auth/login", response_model=dict)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or user.password != payload.password:
        raise HTTPException(401, "Invalid email or password")
    return {"id": user.id, "username": user.username, "email": user.email}

# ------------------- Blacklist -------------------
@app.get("/blacklist", response_model=List[dict])
def get_blacklist(q: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Blacklist)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(Blacklist.ip.like(like))
    rows = query.order_by(Blacklist.id.asc()).all()
    return [{"id": r.id, "ip": r.ip, "reason": r.reason, "created_at": str(r.created_at)} for r in rows]

@app.post("/blacklist", response_model=dict)
def add_blacklist(payload: BlacklistCreate, db: Session = Depends(get_db)):
    ip = payload.ip.strip()
    existing = db.query(Blacklist).filter(Blacklist.ip == ip).first()
    if existing:
        return {"id": existing.id, "ip": existing.ip, "reason": existing.reason}
    row = Blacklist(ip=ip, reason=payload.reason or "manual")
    db.add(row)
    db.commit()
    db.refresh(row)
    if settings.AUTO_BLOCK:
        ok, msg = block_ip(ip)
        logger.info(f"Firewall block (manual) {ip}: {ok} {msg}")
    return {"id": row.id, "ip": row.ip, "reason": row.reason}

@app.delete("/blacklist/{ip}", response_model=dict)
def delete_blacklist(ip: str, db: Session = Depends(get_db)):
    ip = ip.strip()
    row = db.query(Blacklist).filter(Blacklist.ip == ip).first()
    if not row:
        raise HTTPException(404, "IP not found in blacklist")
    db.delete(row)
    db.commit()
    ok, msg = unblock_ip(ip)
    logger.info(f"Firewall unblock {ip}: {ok} {msg}")
    return {"ok": True, "ip": ip, "unblocked": ok, "message": msg}

# ------------------- Detections -------------------
@app.get("/detections", response_model=List[dict])
def list_detections(db: Session = Depends(get_db)):
    rows = db.query(Detection).order_by(Detection.id.desc()).limit(200).all()
    return [{
        "id": r.id,
        "src_ip": r.src_ip,
        "dest_ip": r.dest_ip,
        "score": float(r.score),
        "is_malicious": bool(r.is_malicious),
        "created_at": str(r.created_at)
    } for r in rows]

# ------------------- Detect (ML + DB + optional firewall) -------------------
@app.post("/detect", response_model=DetectResponse)
def detect(payload: DetectRequest, db: Session = Depends(get_db)):
    if model is None:
        raise HTTPException(500, "Model not loaded")

    # Convert features
    vec, normalized_json = to_feature_vector(payload.features)

    # Validate count
    expected = len(FEATURE_ORDER)  # 6 values
    if vec.ndim != 2 or vec.shape[1] != expected:
        raise HTTPException(
            status_code=400,
            detail=(f"Invalid features: expected exactly {expected} values "
                    f"in order {FEATURE_ORDER}. Example list: [1200, 800, 40, 3, 54321, 443]"),
        )

    # Clamp threshold [0,1]
    thr = max(0.0, min(1.0, float(payload.threshold)))

    # Score with IsolationForest
    decision = model.decision_function(vec)[0]
    score = 1 / (1 + pow(2.718281828, -12 * float(-decision)))  # sigmoid mapping
    is_bad = score >= thr

    logger.info(f"🔎 Detect: threshold={thr:.2f}, score={score:.6f}, is_bad={is_bad}")

    # Save detection
    det = Detection(
        src_ip=payload.src_ip,
        dest_ip=payload.dest_ip,
        score=Decimal(str(round(score, 6))),
        is_malicious=bool(is_bad),
        features=normalized_json
    )
    db.add(det)
    db.commit()
    db.refresh(det)

    # Log to Mongo (best-effort)
    try:
        log_event({
            "type": "detection",
            "src_ip": payload.src_ip,
            "dest_ip": payload.dest_ip,
            "score": float(score),
            "is_malicious": bool(is_bad)
        })
    except Exception:
        pass

    # ✅ Auto-block logic: user-controlled src/dest
    if is_bad:
        target_ip = payload.src_ip if payload.block_target == "src" else payload.dest_ip
        if target_ip:
            if not db.query(Blacklist).filter(Blacklist.ip == target_ip).first():
                db.add(Blacklist(ip=target_ip, reason=f"auto-{payload.block_target}"))
                db.commit()
            if settings.AUTO_BLOCK:
                ok, msg = block_ip(target_ip)
                logger.info(f"Firewall block ({payload.block_target}) {target_ip}: {ok} {msg}")

    return DetectResponse(id=det.id, is_malicious=is_bad, score=float(score))
