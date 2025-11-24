import fs from 'fs';
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const sql = fs.readFileSync('./sql/schema.sql', 'utf8');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(sql);
    console.log('Migrations applied.');
  } catch (err) {
    console.error('Migration error', err.message);
  } finally {
    await pool.end();
  }
}

run();
