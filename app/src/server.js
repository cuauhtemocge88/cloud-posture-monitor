const { createPool, initSchema } = require('./db');
const { createApp } = require('./app');

const PORT = Number(process.env.PORT) || 8080;
const ALLOW_IN_MEMORY = process.env.ALLOW_IN_MEMORY !== 'false';

async function main() {
  const pool = createPool(process.env.DATABASE_URL);

  if (pool) {
    await initSchema(pool);
    console.log('[DB] PostgreSQL schema verified');
  } else {
    console.log('[DB] DATABASE_URL not set; running in in-memory mode');
  }

  const app = createApp({ pool, allowInMemory: ALLOW_IN_MEMORY });

  const server = app.listen(PORT, () => {
    console.log(`[SERVER] cloud-posture-monitor listening on port ${PORT}`);
  });

  async function shutdown(signal) {
    console.log(`[SERVER] Received ${signal}, shutting down gracefully...`);
    server.close(async () => {
      if (pool) {
        await pool.end();
      }
      process.exit(0);
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
