from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from . import models, schemas, crud, auth, telegram_notifier
from .database import SessionLocal, engine
from .config import settings
from sqlalchemy.orm import Session

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="PingPulse - Uptime API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/signup", response_model=schemas.UserOut)
def signup(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, payload.email)
    if user:
        raise HTTPException(status_code=400, detail="User exists")
    return crud.create_user(db, payload)

@app.post("/token")
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    user = crud.authenticate(db, payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = auth.create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}

@app.post("/monitors", response_model=schemas.MonitorOut)
def create_monitor(m: schemas.MonitorCreate, current_user=Depends(auth.get_current_user), db: Session = Depends(get_db)):
    return crud.create_monitor(db, user_id=current_user.id, monitor_in=m)

@app.get("/monitors", response_model=list[schemas.MonitorOut])
def list_monitors(current_user=Depends(auth.get_current_user), db: Session = Depends(get_db)):
    return crud.get_monitors_by_user(db, current_user.id)

# internal callback for worker updates (protected by header)
@app.post("/internal/monitor/update")
def internal_update(payload: dict, x_internal_secret: str | None = Header(None), db: Session = Depends(get_db)):
    if x_internal_secret != settings.BACKEND_INTERNAL_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")
    monitor_id = payload.get("monitor_id")
    status = payload.get("status")
    resp_ms = payload.get("response_ms")
    mon = crud.update_monitor_status(db, monitor_id, status, resp_ms)
    return {"ok": bool(mon)}

@app.post("/internal/notify")
def internal_notify(payload: dict, x_internal_secret: str | None = Header(None), db: Session = Depends(get_db)):
    if x_internal_secret != settings.BACKEND_INTERNAL_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")
    monitor_id = payload.get("monitor_id")
    mon = db.query(models.Monitor).filter(models.Monitor.id==monitor_id).first()
    if not mon:
        return {"ok": False}
    user = mon.owner
    chat_id = getattr(user, "telegram_chat_id", None)
    text = f"⚠️ <b>Monitor:</b> {mon.name or mon.url}\n<b>Status:</b> DOWN\nDetails: {payload.get('error') or payload.get('status_code')}"
    telegram_notifier.send_telegram(chat_id, text)
    return {"notified": True}
