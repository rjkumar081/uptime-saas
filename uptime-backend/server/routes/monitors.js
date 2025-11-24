import express from 'express';
import { pool } from '../lib/db.js';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
const connection = new IORedis(process.env.REDIS_URL);
const queue = new Queue('monitor-checks', { connection });

router.post('/', async (req, res) => {
  try {
    const { user_id, name, url, check_interval = 60, owner_phone=null, owner_email=null } = req.body;
    if(!user_id || !url) return res.status(400).json({ error: 'user_id and url required' });
    const r = await pool.query(
      `INSERT INTO monitors (user_id,name,url,check_interval,owner_phone,owner_email) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [user_id, name || url, url, check_interval, owner_phone, owner_email]
    );
    const monitor = r.rows[0];
    await queue.add('check', { monitorId: monitor.id }, { delay: 0 });
    res.json({ monitor });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const user_id = req.query.user_id;
    if(!user_id) return res.status(400).json({ error: 'user_id required' });
    const r = await pool.query(`SELECT * FROM monitors WHERE user_id=$1 ORDER BY created_at DESC`, [user_id]);
    res.json({ monitors: r.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

router.get('/:id/status', async (req, res) => {
  try {
    const id = req.params.id;
    const r = await pool.query(`SELECT * FROM monitors WHERE id=$1`, [id]);
    if(r.rows.length===0) return res.status(404).json({ error: 'not found' });
    const m = r.rows[0];
    const incidents = await pool.query(`SELECT * FROM incidents WHERE monitor_id=$1 ORDER BY detected_at DESC LIMIT 20`, [id]);
    res.json({ monitor: m, incidents: incidents.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

export default router;
