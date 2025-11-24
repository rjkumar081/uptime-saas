from . import models, schemas
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from datetime import datetime

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email==email).first()

def get_user_by_id(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id==user_id).first()

def create_user(db: Session, user_in: schemas.UserCreate):
    hashed = pwd_ctx.hash(user_in.password)
    user = models.User(email=user_in.email, hashed_password=hashed)
    db.add(user); db.commit(); db.refresh(user)
    return user

def authenticate(db: Session, email: str, password: str):
    user = get_user_by_email(db, email)
    if not user:
        return None
    if not pwd_ctx.verify(password, user.hashed_password):
        return None
    return user

def create_monitor(db: Session, user_id: int, monitor_in: schemas.MonitorCreate):
    mon = models.Monitor(
        user_id=user_id, url=str(monitor_in.url), interval=monitor_in.interval or 60, name=monitor_in.name or ""
    )
    db.add(mon); db.commit(); db.refresh(mon)
    return mon

def get_monitors_by_user(db: Session, user_id: int):
    return db.query(models.Monitor).filter(models.Monitor.user_id==user_id).all()

def get_all_enabled_monitors(db: Session):
    return db.query(models.Monitor).filter(models.Monitor.enabled==True).all()

def update_monitor_status(db: Session, monitor_id: int, status:str, response_ms: float | None):
    mon = db.query(models.Monitor).filter(models.Monitor.id==monitor_id).first()
    if not mon:
        return None
    mon.last_status = status
    mon.last_checked = datetime.utcnow()
    mon.avg_response_ms = response_ms
    db.add(mon); db.commit(); db.refresh(mon)
    return mon
