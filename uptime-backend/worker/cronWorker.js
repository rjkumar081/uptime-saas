// worker/cronWorker.js
import { MongoClient, ObjectId } from 'mongodb';
import axios from 'axios';
import cron from 'node-cron';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'uptime';
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '*/1 * * * *'; // every minute
const REQUEST_TIMEOUT_MS = parseInt(process.env.REQUEST_TIMEOUT_MS || '10000', 10);
const CHECK_CONCURRENCY = parseInt(process.env.CHECK_CONCURRENCY || '10', 10);

let client;
let db;
let running = false;

// Small concurrency limiter
async function pMapLimit(iterable, mapper, concurrency = 10) {
  const ret = [];
  const executing = new Set();
  for (const item of iterable) {
    const p = Promise.resolve().then(() => mapper(item));
    ret.push(p);
    executing.add(p);
    const clean = () => executing.delete(p);
    p.then(clean).catch(clean);
    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }
  return Promise.allSettled(ret);
}

async function connectDb() {
  if (db) return db;
  client = new MongoClient(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  await client.connect();
  db = client.db(DB_NAME);
  console.log('Worker: connected to MongoDB');
  return db;
}

async function checkMonitor(monitor) {
  const checksColl = db.collection('checks');
  const monitorsColl = db.collection('monitors');
  const incidentsColl = db.collection('incidents');

  const url = monitor.url;
  const method = (monitor.method || 'GET').toUpperCase();
  const expected = monitor.expectedStatusRange || { min: 200, max: 399 };

  const start = Date.now();
  let status = 'down';
  let statusCode = null;
  let responseTime = null;
  let errorMessage = null;

  try {
    const res = await axios.request({
      url,
      method,
      timeout: REQUEST_TIMEOUT_MS,
      validateStatus: () => true,
      maxRedirects: 5,
    });
    statusCode = res.status;
    responseTime = Date.now() - start;
    if (statusCode >= expected.min && statusCode <= expected.max) {
      status = 'up';
    } else {
      status = 'down';
      errorMessage = `unexpected_status_${statusCode}`;
    }
  } catch (err) {
    responseTime = Date.now() - start;
    errorMessage = err.code || err.message || 'request_failed';
    status = 'down';
  }

  const checkedAt = new Date();

  const checkRecord = {
    monitorId: monitor._id,
    url,
    method,
    status,
    statusCode,
    responseTime,
    errorMessage,
    checkedAt,
  };

  await checksColl.insertOne(checkRecord);

  // update monitor summary and detect status change
  const prevStatus = monitor.lastStatus || 'unknown';
  const update = {
    $set: {
      lastChecked: checkedAt,
      lastStatus: status,
      lastStatusCode: statusCode,
      lastError: errorMessage,
      responseTime,
    },
  };
  if (status === 'down') {
    update.$inc = { downtimeCount: 1 };
    update.$set.lastDownAt = checkedAt;
  } else {
    update.$set.lastUpAt = checkedAt;
  }

  await monitorsColl.updateOne({ _id: monitor._id }, update);

  if (prevStatus !== status) {
    const incident = {
      monitorId: monitor._id,
      url,
      previousStatus: prevStatus,
      currentStatus: status,
      reason: errorMessage || `status_${statusCode}`,
      createdAt: checkedAt,
      acknowledged: false,
    };
    await incidentsColl.insertOne(incident);
    console.log(`Incident created for monitor ${monitor._id}: ${prevStatus} -> ${status}`);
  }

  return { monitorId: monitor._id.toString(), status, statusCode, responseTime, errorMessage };
}

async function runChecks() {
  if (running) {
    console.log('Worker: previous run active — skipping tick');
    return;
  }
  running = true;
  try {
    await connectDb();
    const monitorsColl = db.collection('monitors');
    const monitors = await monitorsColl.find({ disabled: { $ne: true } }).toArray();
    if (!monitors.length) {
      console.log('Worker: no monitors to check');
      running = false;
      return;
    }
    console.log(`Worker: checking ${monitors.length} monitors (concurrency=${CHECK_CONCURRENCY})`);
    await pMapLimit(
      monitors,
      async (m) => {
        try {
          return await checkMonitor(m);
        } catch (err) {
          console.error('checkMonitor error for', m._id, err);
          return { monitorId: m._id.toString(), status: 'error', error: err.message };
        }
      },
      CHECK_CONCURRENCY
    );
  } catch (err) {
    console.error('Worker runChecks error:', err);
  } finally {
    running = false;
  }
}

// Public: run a single check for a given monitorId (string)
export async function runCheckForMonitor(monitorId) {
  await connectDb();
  const monitorsColl = db.collection('monitors');
  let query;
  try {
    query = { _id: new ObjectId(monitorId) };
  } catch (e) {
    // if not ObjectId, try string match
    query = { id: monitorId };
  }
  const monitor = await monitorsColl.findOne(query);
  if (!monitor) throw new Error('monitor not found');
  const result = await checkMonitor(monitor);
  return result;
}

let task = null;

// start cron worker and return
export async function start() {
  await connectDb();
  console.log('Worker: scheduling cron job ->', CRON_SCHEDULE);
  // run immediate first-time pass (non-blocking)
  runChecks().catch(err => console.error('Initial runChecks error:', err));

  // schedule
  task = cron.schedule(
    CRON_SCHEDULE,
    () => {
      runChecks().catch(err => console.error('Scheduled runChecks error:', err));
    },
    { scheduled: true }
  );

  // graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Worker: SIGINT received, shutting down...');
    if (task) task.stop();
    await shutdown();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    console.log('Worker: SIGTERM received, shutting down...');
    if (task) task.stop();
    await shutdown();
    process.exit(0);
  });

  return { started: true };
}

export async function shutdown() {
  try {
    if (client && client.close) await client.close();
    console.log('Worker: MongoDB connection closed');
  } catch (err) {
    console.warn('Worker shutdown error:', err);
  }
}
