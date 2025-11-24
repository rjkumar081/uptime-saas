// uptime-backend/worker/processors/monitorProcessor.js
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

import { Pool } from "pg";
import IORedis from "ioredis";
import { sendTemplateWhatsApp } from "../../server/lib/whatsapp.js";
import { sendEmail } from "../../server/lib/email.js";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Only load BullMQ if USE_BULLMQ = true
async function scheduleNextCheck(monitorId, delayMs) {
  if (process.env.USE_BULLMQ !== "true") return;

  const { Queue } = await import("bullmq"); // DYNAMIC IMPORT
  const connection = new IORedis(process.env.REDIS_URL);

  const queue = new Queue("monitor-checks", { connection });
  await queue.add("check", { monitorId }, { delay: delayMs });
}

export async function checkMonitor(monitorId) {
  const result = await pool.query("SELECT * FROM monitors WHERE id=$1", [
    monitorId,
  ]);
  if (result.rows.length === 0) return;

  const m = result.rows[0];
  if (!m.is_active) return;

  let url = m.url;
  if (!url.startsWith("http")) url = `http://${url}`;

  const start = Date.now();
  let up = false;
  let statusCode = null;
  let responseTime = null;
  let raw = null;

  try {
    const res = await axios.get(url, {
      timeout: 10000,
      validateStatus: () => true,
    });
    statusCode = String(res.status);
    responseTime = Date.now() - start;
    raw = { headers: res.headers, length: res.data?.length || null };
    up = res.status >= 200 && res.status < 400;
  } catch (err) {
    statusCode = "ERR";
    responseTime = null;
    raw = { error: err.message };
    up = false;
  }

  await pool.query(
    `UPDATE monitors SET last_status=$1, last_checked=now() WHERE id=$2`,
    [up ? "UP" : "DOWN", monitorId]
  );

  await pool.query(
    `INSERT INTO checks (monitor_id, scheduled_at, executed_at, status, status_code, response_time_ms, raw_response)
     VALUES ($1, now(), now(), $2, $3, $4, $5)`,
    [monitorId, up ? "UP" : "DOWN", statusCode, responseTime, raw]
  );

  if (!up) {
    await pool.query(
      `INSERT INTO incidents (monitor_id, status_code, response_time_ms, message_sent)
       VALUES ($1, $2, $3, false)`,
      [monitorId, statusCode, responseTime]
    );

    if (m.owner_email) {
      await sendEmail(
        m.owner_email,
        `Alert: ${m.url} is DOWN`,
        `Status: ${statusCode}\nResponse Time: ${responseTime || "N/A"}`
      );
    }

    if (m.owner_phone && process.env.WHATSAPP_API_KEY) {
      await sendTemplateWhatsApp(m.owner_phone, "SITE_DOWN_ALERT", [
        m.url,
        new Date().toISOString(),
        statusCode,
        `${responseTime || "N/A"}ms`,
      ]);
    }
  }

  const delayMs = (m.check_interval || 60) * 1000;
  await scheduleNextCheck(monitorId, delayMs);
}
