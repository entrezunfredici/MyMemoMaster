const http = require('http');
const db = require('./models');
const app = require('./app');

const DEFAULT_MAX_RETRIES = 10;
const DEFAULT_RETRY_DELAY_MS = 5000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

// 1) Start listening immediately (Cloud Run expects the port to open ASAP)
const PORT = Number(process.env.PORT || process.env.API_PORT || 8080);
const HOST = '0.0.0.0';
const shouldSyncSchema = (process.env.ENVIRONMENT || '').trim().toLowerCase() !== 'prod';

const server = http.createServer(app);
server.listen(PORT, HOST, () => {
  console.log(`[API] Listening on ${HOST}:${PORT}`);
});

// 2) Handle DB init in the background so boot is not blocked
(async () => {
  const maxRetries = toPositiveInt(process.env.DB_SYNC_MAX_RETRIES, DEFAULT_MAX_RETRIES);
  const retryDelayMs = toPositiveInt(process.env.DB_SYNC_RETRY_DELAY, DEFAULT_RETRY_DELAY_MS);
  let schemaSynced = false;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const dbEmpty = await db.isDatabaseEmpty();

      if (!schemaSynced && (shouldSyncSchema || dbEmpty)) {
        const reason = dbEmpty ? 'empty database detected' : 'dev/test mode';
        console.log(`[DB] Running Sequelize sync (${reason})…`);
        await db.syncModels();
        schemaSynced = true;
      }

      await db.instance.authenticate();
      console.log('\x1b[32m%s\x1b[0m', 'Database connection OK');
      return;
    } catch (err) {
      console.error(`DB connect failed (${attempt}/${maxRetries})`, err?.message || err);
      if (attempt < maxRetries) {
        await wait(retryDelayMs);
      }
    }
  }

  console.error('DB still unreachable; API keeps serving non-DB routes.');
})();
