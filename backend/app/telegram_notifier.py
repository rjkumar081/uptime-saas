import os, requests
from .config import settings

def send_telegram(chat_id: str, text: str):
    token = settings.TG_BOT_TOKEN
    if not token or not chat_id:
        return False
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    try:
        r = requests.post(url, json={"chat_id": chat_id, "text": text, "parse_mode":"HTML"})
        return r.ok
    except Exception:
        return False
