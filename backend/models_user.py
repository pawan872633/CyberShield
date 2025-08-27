from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Integer, DECIMAL, TEXT, Boolean, TIMESTAMP, func, UniqueConstraint
from database import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    password: Mapped[str] = mapped_column(String(128), nullable=False, default="changeme")

class Detection(Base):
    __tablename__ = "detections"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    src_ip: Mapped[str] = mapped_column(String(45), nullable=False)
    dest_ip: Mapped[str] = mapped_column(String(45), nullable=True)
    score: Mapped[float] = mapped_column(DECIMAL(6, 4), nullable=False)
    is_malicious: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    features: Mapped[str] = mapped_column(TEXT, nullable=True)   # JSON string
    created_at: Mapped[str] = mapped_column(TIMESTAMP, server_default=func.current_timestamp())

    __table_args__ = (
        UniqueConstraint('id', name='pk_detection_id'),
    )

class Blacklist(Base):
    __tablename__ = "blacklist"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ip: Mapped[str] = mapped_column(String(45), unique=True, index=True, nullable=False)
    reason: Mapped[str] = mapped_column(String(255), nullable=True)
    created_at: Mapped[str] = mapped_column(TIMESTAMP, server_default=func.current_timestamp())
