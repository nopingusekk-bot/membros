const { Pool } = require('pg');

let pool;
let initializedPromise;

function getDatabaseUrl() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.STORAGE_DATABASE_URL ||
    process.env.STORAGE_POSTGRES_URL ||
    process.env.STORAGE_POSTGRES_PRISMA_URL ||
    process.env.STORAGE_DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.NEON_DATABASE_URL ||
    ''
  ).trim();
}

function getPool() {
  if (pool) return pool;
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw new Error('Banco Neon não configurado. Conecte o Neon à Vercel ou adicione DATABASE_URL.');
  }
  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  });
  pool.on('error', (err) => console.error('Postgres pool error:', err));
  return pool;
}

async function initDb() {
  if (initializedPromise) return initializedPromise;
  initializedPromise = (async () => {
    const db = getPool();
    await db.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE TABLE IF NOT EXISTS members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','blocked')),
        role TEXT NOT NULL DEFAULT 'member',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS progress (
        member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        lesson INTEGER NOT NULL,
        PRIMARY KEY (member_id, lesson)
      );

      CREATE TABLE IF NOT EXISTS notes (
        member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        lesson INTEGER NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        PRIMARY KEY (member_id, lesson)
      );

      CREATE TABLE IF NOT EXISTS ratings (
        member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        lesson INTEGER NOT NULL,
        rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
        PRIMARY KEY (member_id, lesson)
      );

      CREATE TABLE IF NOT EXISTS comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        lesson INTEGER NOT NULL,
        text TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS comments_status_idx ON comments(status);
      CREATE INDEX IF NOT EXISTS comments_member_idx ON comments(member_id);
    `);
  })().catch((err) => {
    initializedPromise = null;
    throw err;
  });
  return initializedPromise;
}

module.exports = { getPool, initDb, getDatabaseUrl };
