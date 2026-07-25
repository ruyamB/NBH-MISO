import pg from 'pg';

const { Pool } = pg;

const connectionString = 'postgresql://neondb_owner:npg_g3SZi8nThJNX@ep-billowing-wildflower-avvy492s-pooler.c-11.us-east-1.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require';

export const pool = new Pool({ connectionString });

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      auth_key TEXT NOT NULL
    );
  `);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS sign_in_count INTEGER DEFAULT 1;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS snapshots (
      id TEXT PRIMARY KEY,
      username TEXT REFERENCES users(username) ON DELETE CASCADE,
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      score INTEGER NOT NULL,
      findings JSONB NOT NULL,
      files_scanned JSONB NOT NULL,
      rule_set_version TEXT NOT NULL
    );
  `);
  await pool.query(`ALTER TABLE snapshots ADD COLUMN IF NOT EXISTS contract_version TEXT DEFAULT '0.1.0';`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS developer_issues (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL,
      issue TEXT NOT NULL,
      timestamp TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vulnerability_knowledge (
      id TEXT PRIMARY KEY,
      vulnerability_id TEXT NOT NULL,
      language TEXT NOT NULL,
      compiler_version TEXT,
      vulnerability_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      embedding TEXT,
      ast_pattern TEXT,
      bytecode_pattern TEXT,
      ai_reasoning TEXT,
      suggested_fix TEXT,
      confidence INTEGER DEFAULT 0,
      frequency INTEGER DEFAULT 1,
      timestamp TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}
