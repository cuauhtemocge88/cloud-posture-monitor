const { Pool } = require('pg');

/**
 * Creates a PostgreSQL connection pool when DATABASE_URL is configured.
 * Returns null when running in in-memory mode for lightweight local/test runs.
 */
function createPool(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) {
    return null;
  }

  return new Pool({
    connectionString: databaseUrl,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  });
}

/**
 * Ensures required tables exist on startup when PostgreSQL is enabled.
 */
async function initSchema(pool) {
  if (!pool) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS targets (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS scans (
      id SERIAL PRIMARY KEY,
      target_id INTEGER NOT NULL REFERENCES targets(id) ON DELETE CASCADE,
      status_code INTEGER,
      latency_ms INTEGER NOT NULL,
      score INTEGER NOT NULL,
      headers_present JSONB NOT NULL,
      error_message TEXT,
      scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

module.exports = {
  createPool,
  initSchema
};
