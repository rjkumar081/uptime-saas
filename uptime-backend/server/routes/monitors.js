// routes/monitors.js
import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'uptime';

let client;
let db;
async function getDb() {
  if (db) return db;
  client = new MongoClient(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  await client.connect();
  db = client.db(DB_NAME);
  return db;
}

// list monitors
router.get('/', async (req, res) => {
  try {
    const database = await getDb();
    const monitors = await database.collection('monitors').find({}).toArray();
    res.json(monitors);
  } catch (err) {
    console.error('monitors list error', err);
    res.status(500).json({ error: err.message });
  }
});

// get monitor
router.get('/:id', async (req, res) => {
  try {
    const database = await getDb();
    const id = req.params.id;
    let query;
    try {
      query = { _id: new ObjectId(id) };
    } catch (e) {
      query = { id };
    }
    const m = await database.collection('monitors').findOne(query);
    if (!m) return res.status(404).json({ error: 'not found' });
    res.json(m);
  } catch (err) {
    console.error('monitors get error', err);
    res.status(500).json({ error: err.message });
  }
});

// create monitor
router.post('/', async (req, res) => {
  try {
    const database = await getDb();
    const payload = req.body;
    // minimal validation
    if (!payload || !payload.url) {
      return res.status(400).json({ error: 'url required' });
    }
    const doc = {
      url: payload.url,
      method: payload.method || 'GET',
      expectedStatusRange: payload.expectedStatusRange || { min: 200, max: 399 },
      disabled: payload.disabled || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const r = await database.collection('monitors').insertOne(doc);
    res.json({ insertedId: r.insertedId, doc });
  } catch (err) {
    console.error('monitors create error', err);
    res.status(500).json({ error: err.message });
  }
});

// update monitor
router.put('/:id', async (req, res) => {
  try {
    const database = await getDb();
    const id = req.params.id;
    let query;
    try {
      query = { _id: new ObjectId(id) };
    } catch (e) {
      query = { id };
    }
    const payload = req.body;
    payload.updatedAt = new Date();
    const r = await database.collection('monitors').findOneAndUpdate(query, { $set: payload }, { returnDocument: 'after' });
    if (!r.value) return res.status(404).json({ error: 'not found' });
    res.json(r.value);
  } catch (err) {
    console.error('monitors update error', err);
    res.status(500).json({ error: err.message });
  }
});

// delete monitor
router.delete('/:id', async (req, res) => {
  try {
    const database = await getDb();
    const id = req.params.id;
    let query;
    try {
      query = { _id: new ObjectId(id) };
    } catch (e) {
      query = { id };
    }
    const r = await database.collection('monitors').deleteOne(query);
    res.json({ deletedCount: r.deletedCount });
  } catch (err) {
    console.error('monitors delete error', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
