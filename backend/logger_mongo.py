from typing import Optional, Dict, Any
from pymongo import MongoClient
from config import get_settings

settings = get_settings()

_client = None
_collection = None

def _init():
    global _client, _collection
    try:
        _client = MongoClient(settings.MONGO_URI, serverSelectionTimeoutMS=500)
        db = _client[settings.MONGO_DB]
        _collection = db["events"]
    except Exception:
        _client, _collection = None, None

def log_event(doc: Dict[str, Any]) -> Optional[str]:
    global _collection
    if _collection is None:
        _init()
    if _collection is None:
        return None
    res = _collection.insert_one(doc)
    return str(res.inserted_id)
