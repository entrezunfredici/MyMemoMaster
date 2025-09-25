const db = require("./models");
const app = require("./app");

const DEFAULT_MAX_RETRIES = 10;
const DEFAULT_RETRY_DELAY_MS = 5000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

async function bootstrap() {
  const maxRetries = toPositiveInt(process.env.DB_SYNC_MAX_RETRIES, DEFAULT_MAX_RETRIES);
  const retryDelayMs = toPositiveInt(process.env.DB_SYNC_RETRY_DELAY, DEFAULT_RETRY_DELAY_MS);

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      await db.syncModels();
      console.log('\x1b[32m%s\x1b[0m', 'Database connected and synchronized');

      app.listen(process.env.API_PORT, () => {
        console.log('Server is running on:', `http://localhost:${process.env.API_PORT}`);
      });
      return;
    } catch (error) {
      console.error(`Database synchronization failed (attempt ${attempt}/${maxRetries})`, error);

      if (attempt === maxRetries) {
        throw error;
      }

      await wait(retryDelayMs);
    }
  }
}

bootstrap().catch((error) => {
  console.error('Unable to start the API after retrying:', error);
  process.exit(1);
});
