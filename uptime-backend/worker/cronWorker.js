// uptime-backend/worker/cronWorker.js
// Run by GitHub Actions on schedule. Scans DB for monitors due for check and runs checkMonitor().

import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';
import { checkMonitor } from './processors/monitorProcessor.js';

async function getDueMonitors(pool, limit = 100) {
  // Select monitors that are active and due (last_checked is null OR last_checked + check_interval <= now)
  const q = `
    SELECT id, check_interval, last_checked
    FROM monitors
    WHERE is_active = true
      AND (
        last_checked IS NULL
        OR (last_checked + COALESCE(check_interval, 60) * INTERVAL '1 second') <= now()
      )
    ORDER BY last_checked NULLS FIRST
    LIMIT $1
  `;
  const r = await pool.query(q, [limit]);
  return r.rows.map(r => r.id);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set. Exiting.');
    process.exit(1);
  }
  console.log('Cron worker starting — will look for due monitors...');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const monitorIds = await getDueMonitors(pool, 200);
    console.log(`Found ${monitorIds.length} due monitors.`);

    // Limit concurrency to a small number to avoid bursts (sequential or small concurrency)
    const concurrency = 5;
    let idx = 0;
    async function workerBatch() {
      while (idx < monitorIds.length) {
        const batch = [];
        for (let i = 0; i < concurrency && idx < monitorIds.length; i++, idx++) {
          const id = monitorIds[idx];
          console.log('Scheduling check for monitor', id);
          batch.push(
            (async () => {
              try {
                await checkMonitor(id);
                console.log('Checked', id);
              } catch (err) {
                console.error('checkMonitor error for', id, err?.message || err);
              }
            })()
          );
        }
        await Promise.all(batch);
      }
    }

    await workerBatch();
    console.log('Cron worker finished.');
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Cron worker failed:', err);
    try { await pool.end(); } catch(e){}
    process.exit(1);
  }
}

main();
