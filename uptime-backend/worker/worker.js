import dotenv from 'dotenv';
dotenv.config();

import { Worker, QueueScheduler } from 'bullmq';
import IORedis from 'ioredis';
import { checkMonitor } from './processors/monitorProcessor.js';

const connection = new IORedis(process.env.REDIS_URL);
const queueName = 'monitor-checks';

const scheduler = new QueueScheduler(queueName, { connection });
await scheduler.waitUntilReady();

const worker = new Worker(queueName, async job => {
  if(job.name === 'check') {
    const monitorId = job.data.monitorId;
    await checkMonitor(monitorId);
  }
}, { connection, concurrency: 5 });

worker.on('completed', job => {});
worker.on('failed', (job, err) => {
  console.error('Job failed', job?.id, err?.message);
});
console.log('Worker started. Listening for jobs...');
