import os
from pydantic import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@postgres:5432/pingpulse")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://redis:6379/0")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "supersecretkey")
    JWT_ALG: str = "HS256"
    TG_BOT_TOKEN: str | None = os.getenv("TG_BOT_TOKEN")
    BACKEND_INTERNAL_SECRET: str = os.getenv("BACKEND_INTERNAL_SECRET", "internal-secret")
    CALLBACK_URL: str = os.getenv("BACKEND_CALLBACK_URL", "http://backend:8000")
    ENV: str = os.getenv("ENV", "development")

settings = Settings()
