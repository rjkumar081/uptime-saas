// uptime-backend/worker/cronWorker.js
// find the function getDueMonitors and replace the query part with this

async function getDueMonitors(pool) {
  // returns rows of monitors due for check
  const sql = `
    SELECT id
    FROM monitors
    WHERE is_active = true
      AND (
        last_checked IS NULL
        OR (last_checked + (check_interval * INTERVAL '1 second')) <= now()
      )
    ORDER BY id
    LIMIT 100
  `;
  const res = await pool.query(sql);
  return res.rows.map(r => r.id);
}
