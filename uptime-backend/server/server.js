// server.js
import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import monitorsRoute from './routes/monitors.js';
import { Queue } from 'bullmq';

dotenv.config();
const app = express();
app.use(bodyParser.json());

app.get('/health', (req, res) => res.json({ ok: true }));
app.get('/', (req, res) => res.send('<h3>Uptime MVP API</h3><p>Use /monitors endpoints</p>'));
app.use('/monitors', monitorsRoute);

// ---------- Redis / BullMQ setup ----------
// REDIS_URL example: redis://:password@hostname:6379/0
const { REDIS_URL } = process.env;

function parseRedisUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const res = {
      host: u.hostname,
      port: u.port ? Number(u.port) : undefined,
      password: u.password || undefined,
      db: u.pathname && u.pathname.length > 1 ? Number(u.pathname.slice(1)) : undefined,
      // keep original for diagnostics
      original: url,
    };
    return res;
  } catch (err) {
    return null;
  }
}

// detect Upstash pattern (Upstash hostnames include 'upstash.io' or 'us1-upstash' etc)
function isUpstash(url) {
  if (!url) return false;
  return /upstash\.io|upstash/.test(url);
}

if (!REDIS_URL) {
  console.error('FATAL: REDIS_URL is not set. BullMQ requires a Redis instance.');
  process.exit(1);
}

if (isUpstash(REDIS_URL)) {
  console.error('FATAL: Detected Upstash in REDIS_URL. BullMQ is not compatible with Upstash (serverless Redis).');
  console.error('Please use a BullMQ-compatible Redis instance (self-hosted Redis, managed Redis such as AWS ElastiCache, DigitalOcean Managed Redis, Redis Cloud, etc.) and set REDIS_URL accordingly.');
  console.error('Your REDIS_URL:', REDIS_URL);
  // show local path of the screenshot you provided (for reference)
  console.error('Reference screenshot:', '/mnt/data/75e8f640-8f08-45be-9fd3-95ffd573c598.png');
  process.exit(1);
}

// parse into connection options acceptable by bullmq (ioredis options)
const parsed = parseRedisUrl(REDIS_URL);
const connectionOpts = parsed
  ? { host: parsed.host, port: parsed.port, password: parsed.password, db: parsed.db }
  : REDIS_URL; // fallback to passing raw connection string

// Create a queue. BullMQ will create its own ioredis clients using these options.
const queue = new Queue('monitor-checks', {
  connection: connectionOpts,
});

// admin enqueue endpoint
app.post('/admin/enqueue/:monitorId', async (req, res) => {
  const monitorId = String(req.params.monitorId);
  try {
    // Add a job named 'check' with some sensible defaults
    await queue.add(
      'check',
      { monitorId },
      {
        removeOnComplete: true,
        removeOnFail: 1000,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      }
    );
    res.json({ ok: true, monitorId });
  } catch (err) {
    console.error('enqueue error:', err);
    res.status(500).json({ error: 'enqueue error', detail: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on ${port}`);
});
