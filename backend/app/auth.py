from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .config import settings
import jwt
from .database import SessionLocal
from .crud import get_user_by_id

security = HTTPBearer()

def create_access_token(data: dict):
    token = jwt.encode(data, settings.JWT_SECRET, algorithm=settings.JWT_ALG)
    return token

def decode_token(token: str):
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALG])
        return payload
    except Exception:
        return None

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = decode_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    user_id = int(payload["sub"])
    db = SessionLocal()
    user = get_user_by_id(db, user_id)
    db.close()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user
