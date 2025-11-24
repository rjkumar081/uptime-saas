# This can be run as a lightweight scheduler service that enqueues jobs into RQ
import time
from .database import SessionLocal
from .models import Monitor
import redis, rq, os, json
from .config import settings

redis_conn = redis.from_url(settings.REDIS_URL)
q = rq.Queue('checks', connection=redis_conn)

def enqueue_checks():
    db = SessionLocal()
    try:
        monitors = db.query(Monitor).filter(Monitor.enabled==True).all()
        for m in monitors:
            payload = {"id": m.id, "url": m.url, "interval": m.interval}
            # enqueues worker function reference; worker module path below
            q.enqueue("worker.worker.perform_check", payload, job_timeout=120)
    finally:
        db.close()

if __name__ == "__main__":
    while True:
        enqueue_checks()
        time.sleep(30)
