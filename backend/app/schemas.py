from pydantic import BaseModel, HttpUrl
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    email: str
    password: str

class UserOut(BaseModel):
    id: int
    email: str
    telegram_chat_id: Optional[str] = None
    class Config:
        orm_mode = True

class UserLogin(BaseModel):
    email: str
    password: str

class MonitorCreate(BaseModel):
    url: HttpUrl
    interval: Optional[int] = 60
    name: Optional[str] = None

class MonitorOut(BaseModel):
    id: int
    url: HttpUrl
    interval: int
    enabled: bool
    last_status: Optional[str]
    last_checked: Optional[datetime]
    avg_response_ms: Optional[float]
    name: Optional[str]
    class Config:
        orm_mode = True
