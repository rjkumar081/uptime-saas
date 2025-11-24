# uptime-saas# PingPulse - Uptime SaaS (Starter repo)

## What you get
- FastAPI backend (auth, monitors CRUD, internal endpoints)
- Redis + RQ job queue
- Worker that performs URL checks and calls backend
- Simple Next.js frontend (signup/login/dashboard)
- Docker + docker-compose for local dev
- Telegram notifier example
- Internal secret protection for worker callbacks

## Quick local run (needs Docker)
1. Copy repository files.
2. `docker-compose up --build`
3. Backend: http://localhost:8000
4. Frontend: http://localhost:3000

## Production deploy suggestions
- Frontend: Vercel (Next.js)
- Backend & Scheduler & Worker: Render (each as service) OR Railway
- Postgres: Render managed Postgres or Supabase
- Redis: Upstash (serverless) or Render Redis
- Use environment variables for secrets (JWT_SECRET, BACKEND_INTERNAL_SECRET, TG_BOT_TOKEN)
- Protect internal endpoints with a strong `BACKEND_INTERNAL_SECRET`
- Use HTTPS & proper CORS in production

## Next steps / improvements
- Add email verification, password reset
- Add billing (Razorpay / Stripe) webhooks
- Add per-monitor rate-limiting and concurrency control
- Add monitor result history table
- Implement status pages & webhooks for customers
