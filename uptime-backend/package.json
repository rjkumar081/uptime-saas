# create a simple package.json at repo root (if not already)
cat > package.json <<'JSON'
{
  "name": "uptime-root",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "start": "node uptime-backend/server.js"
  }
}
JSON

git add package.json
git commit -m "Add root start script -> run uptime-backend/server.js for Railway"
git push origin main
