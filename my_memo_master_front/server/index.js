import fs from 'fs';
import path from 'path';
import express from 'express';
import compression from 'compression';
import morgan from 'morgan';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');
const indexHtmlPath = path.join(distDir, 'index.html');

const PORT = Number(process.env.PORT || process.env.FRONT_PORT || process.env.APP_PORT || 8080);
const PUBLIC_URL =
  process.env.APP_PUBLIC_URL ||
  process.env.PUBLIC_URL ||
  process.env.VITE_FRONT_URL ||
  'http://localhost:5173';
const API_URL =
  process.env.APP_API_URL ||
  process.env.TARGET_API_URL ||
  process.env.VITE_API_URL ||
  'http://localhost:3000/api';
const API_SECURITY_MODE = (
  process.env.APP_API_SECURITY_MODE ||
  process.env.API_SECURITY_MODE ||
  process.env.VITE_API_SECURITY_MODE ||
  'public'
).toLowerCase();
const API_KEY_HEADER =
  process.env.APP_API_KEY_HEADER ||
  process.env.API_KEY_HEADER ||
  process.env.VITE_API_KEY_HEADER ||
  'X-API-Key';
const API_KEY_VALUE =
  process.env.APP_API_KEY_VALUE ||
  process.env.API_KEY_VALUE ||
  process.env.VITE_API_KEY_VALUE ||
  '';
const API_BEARER_HEADER =
  process.env.APP_API_BEARER_HEADER ||
  process.env.API_BEARER_HEADER ||
  process.env.VITE_API_BEARER_HEADER ||
  'Authorization';
const API_BEARER_TOKEN =
  process.env.APP_API_BEARER_TOKEN ||
  process.env.API_BEARER_TOKEN ||
  process.env.VITE_API_BEARER_TOKEN ||
  '';
const API_GOOGLE_TOKEN_RELATIVE =
  process.env.APP_API_GOOGLE_TOKEN_URL ||
  process.env.API_GOOGLE_TOKEN_URL ||
  process.env.VITE_API_GOOGLE_TOKEN_URL ||
  '/_/cloud-run/token';
const API_GOOGLE_AUTH_HEADER =
  process.env.APP_API_GOOGLE_AUTH_HEADER ||
  process.env.API_GOOGLE_AUTH_HEADER ||
  process.env.VITE_API_GOOGLE_AUTH_HEADER ||
  'Authorization';
const API_GOOGLE_AUDIENCE =
  process.env.APP_API_GOOGLE_AUDIENCE ||
  process.env.API_GOOGLE_AUDIENCE ||
  process.env.VITE_API_GOOGLE_AUDIENCE ||
  API_URL;

const METADATA_IDENTITY_URL =
  process.env.GOOGLE_IDENTITY_METADATA_URL ||
  'http://metadata/computeMetadata/v1/instance/service-accounts/default/identity';
const STATIC_IDENTITY_TOKEN = process.env.STATIC_IDENTITY_TOKEN || '';
const TOKEN_REFRESH_MARGIN_MS = 60_000;

let cachedIdentityToken = null;
let cachedIdentityTokenExpiry = 0;

const ensureDistIsPresent = () => {
  if (!fs.existsSync(distDir)) {
    console.error(`[front-server] Missing build folder at ${distDir}. Run "npm run build" first.`);
    process.exit(1);
  }
  if (!fs.existsSync(indexHtmlPath)) {
    console.error(`[front-server] Missing index.html in ${distDir}.`);
    process.exit(1);
  }
};

const normalizeAudience = () => {
  if (!API_GOOGLE_AUDIENCE) return API_URL;
  return API_GOOGLE_AUDIENCE;
};

const base64UrlDecode = (segment) => {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? 0 : 4 - (normalized.length % 4);
  const padded = normalized + '='.repeat(padding);
  return Buffer.from(padded, 'base64').toString('utf8');
};

const decodeJwtPayload = (token) => {
  if (!token || typeof token !== 'string') return {};
  const parts = token.split('.');
  if (parts.length < 2) return {};
  try {
    const json = base64UrlDecode(parts[1]);
    return JSON.parse(json);
  } catch (error) {
    console.warn('[front-server] Unable to decode JWT payload:', error);
    return {};
  }
};

const computeTokenExpiry = (token) => {
  const payload = decodeJwtPayload(token);
  const expSeconds = typeof payload.exp === 'number' ? payload.exp : null;
  return expSeconds ? expSeconds * 1000 : Date.now() + 3_600_000;
};

const mintIdentityToken = async () => {
  const audience = normalizeAudience();

  if (STATIC_IDENTITY_TOKEN) {
    cachedIdentityToken = STATIC_IDENTITY_TOKEN;
    cachedIdentityTokenExpiry = computeTokenExpiry(STATIC_IDENTITY_TOKEN);
    return cachedIdentityToken;
  }

  const url = `${METADATA_IDENTITY_URL}?audience=${encodeURIComponent(audience)}&format=full`;

  let response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: { 'Metadata-Flavor': 'Google' },
    });
  } catch (error) {
    console.error('[front-server] Failed to reach metadata server:', error);
    throw new Error('metadata_unreachable');
  }

  if (!response.ok) {
    const text = await response.text();
    console.error(
      `[front-server] Metadata server returned ${response.status}: ${text || '<empty>'}`,
    );
    throw new Error(`metadata_status_${response.status}`);
  }

  const token = await response.text();
  cachedIdentityToken = token;
  cachedIdentityTokenExpiry = computeTokenExpiry(token);

  return cachedIdentityToken;
};

const ensureIdentityToken = async () => {
  const now = Date.now();
  if (
    cachedIdentityToken &&
    cachedIdentityTokenExpiry &&
    now + TOKEN_REFRESH_MARGIN_MS < cachedIdentityTokenExpiry
  ) {
    return cachedIdentityToken;
  }

  return mintIdentityToken();
};

const buildRuntimeConfigPayload = () => ({
  PUBLIC_URL: PUBLIC_URL,
  API_URL: API_URL,
  API_SECURITY_MODE: API_SECURITY_MODE,
  API_KEY_HEADER: API_KEY_HEADER,
  API_KEY_VALUE: API_KEY_VALUE,
  API_BEARER_HEADER: API_BEARER_HEADER,
  API_BEARER_TOKEN: API_BEARER_TOKEN,
  API_GOOGLE_TOKEN_URL: API_GOOGLE_TOKEN_RELATIVE,
  API_GOOGLE_AUTH_HEADER: API_GOOGLE_AUTH_HEADER,
  API_GOOGLE_AUDIENCE: API_GOOGLE_AUDIENCE,
});

const cacheControlForFile = (filePath) => {
  const filename = path.basename(filePath);
  if (filename === 'index.html') return 'no-store, no-cache, must-revalidate';
  if (/\.(js|css|json|png|jpe?g|gif|svg|ico|webp|woff2?)$/i.test(filename)) {
    return 'public, max-age=31536000, immutable';
  }
  return 'public, max-age=300';
};

ensureDistIsPresent();

const app = express();
const isTestEnv = process.env.NODE_ENV === 'test';

if (!isTestEnv) {
  app.use(
    morgan('combined', {
      skip: () => process.env.DISABLE_REQUEST_LOGS === 'true',
    }),
  );
}

app.disable('x-powered-by');
app.use(compression());
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/config.js', (_req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  const payload = buildRuntimeConfigPayload();
  res.send(`window.__APP_CONFIG__ = ${JSON.stringify(payload, null, 2)};`);
});

app.all('/_/cloud-run/token', async (_req, res) => {
  if (API_SECURITY_MODE !== 'google-identity') {
    res.status(400).json({ error: 'google_identity_disabled' });
    return;
  }

  try {
    const token = await ensureIdentityToken();
    const payload = decodeJwtPayload(token);
    const expiresAtMs = computeTokenExpiry(token);
    res.json({
      token,
      audience: payload.aud || normalizeAudience(),
      expiresAt: new Date(expiresAtMs).toISOString(),
      issuedAt: payload.iat ? new Date(payload.iat * 1000).toISOString() : undefined,
    });
  } catch (error) {
    console.error('[front-server] Unable to mint Cloud Run identity token:', error);
    res.status(502).json({ error: 'identity_token_unavailable' });
  }
});

app.get(['/healthz', '/readyz'], (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use(
  express.static(distDir, {
    index: false,
    setHeaders: (res, filePath) => {
      res.setHeader('Cache-Control', cacheControlForFile(filePath));
    },
  }),
);

app.use((req, res, next) => {
  if (req.method !== 'GET') {
    next();
    return;
  }
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.sendFile(indexHtmlPath);
});

app.use((err, _req, res, _next) => {
  console.error('[front-server] Unhandled error:', err);
  res.status(500).json({ error: 'internal_server_error' });
});

app.listen(PORT, () => {
  console.log(`[front-server] Listening on port ${PORT}`);
});
