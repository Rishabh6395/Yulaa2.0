import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/yulaa_dev';
const isSSL = connectionString.includes('sslmode=');

const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ...(isSSL ? { ssl: { rejectUnauthorized: false } } : {}),
});

export default pool;

export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === 'development') {
    console.log('Query executed', { text: text.substring(0, 80), duration, rows: res.rowCount });
  }
  return res;
}
