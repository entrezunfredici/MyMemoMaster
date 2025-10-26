const http = require('http');
const db = require('./models');
const app = require('./app');

const DEFAULT_MAX_RETRIES = 10;
const DEFAULT_RETRY_DELAY_MS = 5000;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const toPositiveInt = (v, fb) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fb;
};

// 1) Démarre l'écoute IMMÉDIATEMENT sur le PORT Cloud Run
const PORT = Number(process.env.PORT || process.env.API_PORT || 8080);
const HOST = '0.0.0.0';

const server = http.createServer(app);
server.listen(PORT, HOST, () => {
  console.log(`[API] Listening on ${HOST}:${PORT}`);
});

// 2) Synchro/connexion DB en arrière-plan (sans bloquer le boot)
(async () => {
  const maxRetries = toPositiveInt(process.env.DB_SYNC_MAX_RETRIES, DEFAULT_MAX_RETRIES);
  const retryDelayMs = toPositiveInt(process.env.DB_SYNC_RETRY_DELAY, DEFAULT_RETRY_DELAY_MS);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Idéal en prod : NE PAS faire de sync() ici, réserver au Cloud Run Job
      // await db.syncModels();
      await db.instance.authenticate();
      console.log('\x1b[32m%s\x1b[0m', 'Database connection OK');
      return;
    } catch (err) {
      console.error(`DB connect failed (${attempt}/${maxRetries})`, err?.message || err);
      if (attempt < maxRetries) await wait(retryDelayMs);
    }
  }
  console.error('DB still unreachable; API keeps serving non-DB routes.');
})();
