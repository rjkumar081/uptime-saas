import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { sendTemplateWhatsApp } from '../../server/lib/whatsapp.js';
import { sendEmail } from '../../server/lib/email.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const connection = new IORedis(process.env.REDIS_URL);
const queue = new Queue('monitor-checks', { connection });

export async function checkMonitor(monitorId) {
  const r = await pool.query('SELECT * FROM monitors WHERE id=$1', [monitorId]);
  if(r.rows.length === 0) return;
  const m = r.rows[0];
  if(!m.is_active) return;

  let url = m.url;
  if(!url.startsWith('http')) url = `http://${url}`;

  const start = Date.now();
  let up = false;
  let statusCode = null;
  let respTime = null;
  let raw = null;

  try {
    const res = await axios.get(url, { timeout: 10000, validateStatus: () => true });
    statusCode = String(res.status);
    respTime = Date.now() - start;
    raw = { headers: res.headers, length: res.data?.length || null };
    up = res.status >= 200 && res.status < 400;
  } catch (err) {
    statusCode = 'ERR';
    respTime = null;
    up = false;
    raw = { error: err.message };
  }

  try {
    await pool.query(
      `UPDATE monitors SET last_status=$1, last_checked=now() WHERE id=$2`,
      [up ? 'UP' : 'DOWN', monitorId]
    );
  } catch (e) {
    console.error('DB update error', e.message);
  }

  // Insert check record
  try {
    await pool.query(
      `INSERT INTO checks (monitor_id, scheduled_at, executed_at, status, status_code, response_time_ms, raw_response)
       VALUES ($1, now(), now(), $2, $3, $4, $5)`,
      [monitorId, up ? 'UP' : 'DOWN', statusCode, respTime, raw]
    );
  } catch (e) {
    console.error('Insert check error', e.message);
  }

  if(!up) {
    try {
      await pool.query(
        `INSERT INTO incidents (monitor_id, status_code, response_time_ms, message_sent) VALUES ($1,$2,$3,false)`,
        [monitorId, statusCode, respTime]
      );
    } catch (err) {
      console.error('Insert incident error', err.message);
    }

    const phone = m.owner_phone;
    const email = m.owner_email;
    const templateParams = [m.url, new Date().toISOString(), statusCode, `${respTime || 'N/A'}ms`];

    if(phone) {
      try {
        await sendTemplateWhatsApp(phone, 'SITE_DOWN_ALERT', templateParams);
      } catch (err) {
        console.error('WhatsApp send failed', err.message);
      }
    } else {
      console.log('No phone set for monitor', monitorId);
    }

    if(email) {
      try {
        await sendEmail(email, `ALERT: ${m.url} is down`, `Site: ${m.url}\nStatus: ${statusCode}\nResponse Time: ${respTime || 'N/A'}`);
      } catch (err) {
        console.error('Email send failed', err.message);
      }
    } else {
      console.log('No email set for monitor', monitorId);
    }
  }

  // schedule next check
  try {
    const delayMs = (m.check_interval || 60) * 1000;
    await queue.add('check', { monitorId }, { delay: delayMs });
  } catch (err) {
    console.error('Reschedule error', err.message);
  }
}
