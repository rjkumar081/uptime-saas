import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const sqlPath = path.join(process.cwd(), 'server', 'schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  try {
    console.log("Running migrations...");
    await pool.query(sql);
    console.log("Migrations applied successfully!");
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
