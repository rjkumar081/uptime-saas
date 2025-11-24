import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import monitorsRoute from './routes/monitors.js';

dotenv.config();
const app = express();
app.use(bodyParser.json());

app.get('/health', (req, res) => res.json({ ok: true }));
app.get('/', (req, res) => res.send('<h3>Uptime MVP API</h3><p>Use /monitors endpoints</p>'));

app.use('/monitors', monitorsRoute);

// admin enqueue endpoint
import IORedis from 'ioredis';
import { Queue } from 'bullmq';
const connection = new IORedis(process.env.REDIS_URL);
const queue = new Queue('monitor-checks', { connection });

app.post('/admin/enqueue/:monitorId', async (req, res) => {
  const monitorId = Number(req.params.monitorId);
  try {
    await queue.add('check', { monitorId }, { delay: 0 });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'enqueue error' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on ${port}`);
});
