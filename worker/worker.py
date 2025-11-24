# worker/worker.py
import os, time, requests
import redis, json
from datetime import datetime

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
BACKEND_CALLBACK = os.getenv("BACKEND_CALLBACK_URL", "http://backend:8000")
INTERNAL_SECRET = os.getenv("BACKEND_INTERNAL_SECRET", "internal-secret")

def perform_check(monitor):
    # monitor: dict with id, url
    mid = monitor.get("id")
    url = monitor.get("url")
    if not url or not mid:
        return
    try:
        start = time.time()
        r = requests.get(url, timeout=10)
        duration_ms = (time.time() - start) * 1000
        status = "up" if r.status_code < 400 else "down"
        # update backend
        requests.post(f"{BACKEND_CALLBACK}/internal/monitor/update",
                      json={"monitor_id": mid, "status": status, "response_ms": duration_ms},
                      headers={"X-Internal-Secret": INTERNAL_SECRET}, timeout=5)
        if status == "down":
            requests.post(f"{BACKEND_CALLBACK}/internal/notify",
                          json={"monitor_id": mid, "status_code": r.status_code, "body_preview": r.text[:200]},
                          headers={"X-Internal-Secret": INTERNAL_SECRET}, timeout=5)
    except Exception as e:
        # network error
        requests.post(f"{BACKEND_CALLBACK}/internal/monitor/update",
                      json={"monitor_id": mid, "status": "down", "response_ms": None},
                      headers={"X-Internal-Secret": INTERNAL_SECRET}, timeout=5)
        requests.post(f"{BACKEND_CALLBACK}/internal/notify",
                      json={"monitor_id": mid, "error": str(e), "monitor_id": mid},
                      headers={"X-Internal-Secret": INTERNAL_SECRET}, timeout=5)

# Allow this file to be imported by RQ (function path: 'worker.worker.perform_check')
if __name__ == "__main__":
    # simple loop fallback (not used when RQ runs jobs)
    import redis, rq
    redis_conn = redis.from_url(REDIS_URL)
    q = rq.Queue('checks', connection=redis_conn)
    while True:
        # worker will process enqueued jobs; here we sleep
        time.sleep(10)
