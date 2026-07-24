import pg from 'pg';
const { Pool } = pg;

const connectionString = 'postgresql://neondb_owner:npg_g3SZi8nThJNX@ep-billowing-wildflower-avvy492s-pooler.c-11.us-east-1.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require';

const pool = new Pool({
  connectionString,
});

async function run() {
  try {
    const res = await pool.query(`SELECT * FROM users`);
    console.log('Rows in users table:', res.rows);
  } catch (err) {
    console.error('Error querying rows:', err);
  } finally {
    await pool.end();
  }
}

run();
