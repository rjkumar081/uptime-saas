// server.js
import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import monitorsRoute from './routes/monitors.js';
import * as worker from './worker/cronWorker.js';

dotenv.config();
const app = express();
app.use(bodyParser.json());

app.get('/health', (req, res) => res.json({ ok: true }));
app.get('/', (req, res) => res.send('<h3>Uptime MVP API</h3><p>Use /monitors endpoints</p>'));
app.use('/monitors', monitorsRoute);

// Admin: trigger an immediate check for a monitor
app.post('/admin/enqueue/:monitorId', async (req, res) => {
  try {
    const monitorId = req.params.monitorId;
    const result = await worker.runCheckForMonitor(monitorId);
    res.json({ ok: true, result });
  } catch (err) {
    console.error('enqueue error:', err);
    res.status(500).json({ error: 'enqueue error', detail: err.message });
  }
});

const port = process.env.PORT || 3000;

async function start() {
  // start the background worker (cron)
  try {
    await worker.start();
  } catch (err) {
    console.error('Worker failed to start:', err);
    // continue — worker errors are logged inside worker
  }

  app.listen(port, () => {
    console.log(`Server listening on ${port}`);
    console.log('Reference screenshot (if needed): /mnt/data/75e8f640-8f08-45be-9fd3-95ffd573c598.png');
  });
}

start().catch(err => {
  console.error('App failed to start:', err);
  process.exit(1);
});
