import axios from 'axios'
import {
  VITE_API_URL,
  VITE_API_SECURITY_MODE,
  VITE_API_KEY_HEADER,
  VITE_API_KEY_VALUE,
  VITE_API_BEARER_HEADER,
  VITE_API_BEARER_TOKEN,
  VITE_API_GOOGLE_TOKEN_URL,
  VITE_API_GOOGLE_AUDIENCE,
  VITE_API_GOOGLE_AUTH_HEADER,
} from '@/config';
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const SECURITY_MODES = {
  PUBLIC: 'public',
  API_KEY: 'api-key',
  STATIC_BEARER: 'static-bearer',
  GOOGLE_IDENTITY: 'google-identity',
};

const NORMALISED_SECURITY_MODE = (VITE_API_SECURITY_MODE || '').toLowerCase();
const GOOGLE_TOKEN_REFRESH_MARGIN_MS = 60 * 1000; // refresh one minute before expiry

let cachedGoogleIdentityToken = null;
let cachedGoogleIdentityTokenExpiry = 0;

const hasAxiosHeaderInterface = (headers) =>
  headers && typeof headers.set === 'function' && typeof headers.get === 'function';

const setHeader = (headers, key, value) => {
  if (!headers || !key || !value) return;
  if (hasAxiosHeaderInterface(headers)) {
    headers.set(key, value);
  } else {
    headers[key] = value;
  }
};

const removeHeader = (headers, key) => {
  if (!headers || !key) return;
  if (hasAxiosHeaderInterface(headers) && typeof headers.delete === 'function') {
    headers.delete(key);
  } else if (Object.prototype.hasOwnProperty.call(headers, key)) {
    delete headers[key];
  }
};

const hasHeader = (headers, key) => {
  if (!headers || !key) return false;
  if (hasAxiosHeaderInterface(headers)) {
    return headers.has(key);
  }
  return Object.prototype.hasOwnProperty.call(headers, key);
};

const getHeader = (headers, key) => {
  if (!headers || !key) return undefined;
  if (hasAxiosHeaderInterface(headers)) {
    return headers.get(key);
  }
  return headers[key];
};

const computeExpiryTimestamp = (now, payload) => {
  const parseIsoDate = (value) => {
    if (!value || typeof value !== 'string') return null;
    const ts = Date.parse(value);
    return Number.isNaN(ts) ? null : ts;
  };

  const parseNumberSeconds = (value) => {
    if (value === undefined || value === null) return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  return (
    parseIsoDate(payload?.expiresAt) ??
    parseIsoDate(payload?.expirationTime) ??
    parseIsoDate(payload?.expiration) ??
    parseIsoDate(payload?.expiry) ??
    (() => {
      const seconds =
        parseNumberSeconds(payload?.expiresIn) ??
        parseNumberSeconds(payload?.expires_in) ??
        parseNumberSeconds(payload?.ttl);
      return seconds ? now + seconds * 1000 : null;
    })() ??
    now + 60 * 60 * 1000
  );
};

const extractTokenFromPayload = (payload) => {
  if (!payload || typeof payload !== 'object') return null;
  return (
    payload.token ||
    payload.idToken ||
    payload.accessToken ||
    payload.identityToken ||
    payload.bearer
  );
};

const ensureGoogleIdentityToken = async () => {
  const now = Date.now();
  if (
    cachedGoogleIdentityToken &&
    cachedGoogleIdentityTokenExpiry &&
    now + GOOGLE_TOKEN_REFRESH_MARGIN_MS < cachedGoogleIdentityTokenExpiry
  ) {
    return cachedGoogleIdentityToken;
  }

  if (!VITE_API_GOOGLE_TOKEN_URL) {
    throw new Error(
      'API security mode is "google-identity" but VITE_API_GOOGLE_TOKEN_URL is not defined.'
    );
  }

  if (typeof fetch !== 'function') {
    throw new Error('Fetch API is not available to retrieve the Google identity token.');
  }

  const bodyPayload = {};
  if (VITE_API_GOOGLE_AUDIENCE) bodyPayload.audience = VITE_API_GOOGLE_AUDIENCE;

  let response;
  try {
    response = await fetch(VITE_API_GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload),
    });
  } catch (error) {
    console.error('Unable to reach the Google token endpoint:', error);
    throw new Error('Erreur lors de la récupération du token Google Cloud Run.');
  }

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Le service de token Google a renvoyé ${response.status} (${details || 'réponse vide'}).`
    );
  }

  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    console.error('Invalid JSON received from Google token endpoint:', error);
    throw new Error('La réponse du service de token Google est invalide.');
  }

  const token = extractTokenFromPayload(payload);
  if (!token) {
    console.error('Token endpoint payload does not contain a usable token field:', payload);
    throw new Error("La réponse du service de token Google ne contient pas d'ID token.");
  }

  const expiresAt = computeExpiryTimestamp(now, payload);
  cachedGoogleIdentityToken = token;
  cachedGoogleIdentityTokenExpiry = expiresAt;

  return cachedGoogleIdentityToken;
};

const shouldAttachPrivateCredentials = () =>
  Boolean(NORMALISED_SECURITY_MODE && NORMALISED_SECURITY_MODE !== SECURITY_MODES.PUBLIC);

const attachPrivateCredentials = async (config) => {
  if (!shouldAttachPrivateCredentials()) return;

  if ([SECURITY_MODES.API_KEY, 'apikey', 'api_key'].includes(NORMALISED_SECURITY_MODE)) {
    if (!VITE_API_KEY_VALUE) {
      throw new Error('API security mode is "api-key" but VITE_API_KEY_VALUE is empty.');
    }
    setHeader(config.headers, VITE_API_KEY_HEADER, VITE_API_KEY_VALUE);
    return;
  }

  if (
    [SECURITY_MODES.STATIC_BEARER, 'bearer', 'static_bearer'].includes(NORMALISED_SECURITY_MODE)
  ) {
    if (!VITE_API_BEARER_TOKEN) {
      throw new Error('API security mode is "static-bearer" but VITE_API_BEARER_TOKEN is empty.');
    }
    setHeader(config.headers, VITE_API_BEARER_HEADER, `Bearer ${VITE_API_BEARER_TOKEN}`);
    return;
  }

  if (
    [
      SECURITY_MODES.GOOGLE_IDENTITY,
      'google',
      'cloud-run',
      'google_identity',
      'gcp',
    ].includes(NORMALISED_SECURITY_MODE)
  ) {
    const token = await ensureGoogleIdentityToken();
    setHeader(config.headers, VITE_API_GOOGLE_AUTH_HEADER, `Bearer ${token}`);
    return;
  }

  console.warn(`Unknown API security mode "${NORMALISED_SECURITY_MODE}". No private headers added.`);
};

const axiosApi = axios.create({
  baseURL: VITE_API_URL,
  timeout: 10000,
  headers: {},
  validateStatus(status) {
    return status >= 200 && status < 500
  },
})

axiosApi.interceptors.request.use(async (config) => {
  config.headers = config.headers || {};
  const headers = config.headers;

  if (config.data instanceof FormData) {
    removeHeader(headers, 'Content-Type');
  } else if (!hasHeader(headers, 'Content-Type')) {
    setHeader(headers, 'Content-Type', 'application/json');
  }

  await attachPrivateCredentials(config);

  const authStore = useAuthStore()

  if (authStore.authenticated) {
    const token = authStore.token || authStore.user.connectionToken || null
    if (token) {
      const existingAuthHeader = getHeader(headers, 'Authorization');
      if (!existingAuthHeader) {
        setHeader(headers, 'Authorization', `Bearer ${token}`);
      } else if (
        existingAuthHeader !== `Bearer ${token}` &&
        !hasHeader(headers, 'X-User-Authorization')
      ) {
        setHeader(headers, 'X-User-Authorization', `Bearer ${token}`);
      }
    }
  }

  config.headers = headers;

  return config;
});

function isStatusOk(status) {
  if (!status) return false

  // 401: Unauthorized
  if (status === 401) {
    useAuthStore().logout()
    return false
  }

  // 204: No Content (ex: user not found)
  if (status === 204) {
    return false
  }

  return [200].includes(status);
}

async function get(endpoint, params = {}) {
  if (!endpoint) throw new Error('Please provide an endpoint for the API call')
  if (typeof endpoint !== 'string') throw new Error('Endpoint must be a string')
  if (typeof params !== 'object') throw new Error('Params must be an object')

  const router = useRouter();
  try {
    const response = await axiosApi.get(endpoint, { params })

    if (!isStatusOk(response?.status)) return

    return {
      data: response.data,
      status: response.status,
    }
  } catch (error) {
    console.error('Error during API call using api.js:', error.stack)
    router.push({ path: '/error-server' });
  }
}

async function post(endpoint, data = {}, config = {}) {
  if (!endpoint) throw new Error('Please provide an endpoint for the API call')
  if (typeof endpoint !== 'string') throw new Error('Endpoint must be a string')
  if (typeof data !== 'object') throw new Error('Data must be an object')
  if (typeof config !== 'object') throw new Error('Config must be an object')

  const router = useRouter();
  try {
    const response = await axiosApi.post(endpoint, data, config)

    if (!isStatusOk(response?.status)) return

    return {
      data: response.data,
      status: response.status,
    }
  } catch (error) {
    console.error('Error during API call using api.js:', error.stack)
    router.push({ path: '/error-server' });
  }
}

async function put(endpoint, data = {}, config = {}) {
  if (!endpoint) throw new Error('Please provide an endpoint for the API call')
  if (typeof endpoint !== 'string') throw new Error('Endpoint must be a string')
  if (typeof data !== 'object') throw new Error('Data must be an object')
  if (typeof config !== 'object') throw new Error('Config must be an object')

  const router = useRouter();
  try {
    const response = await axiosApi.put(endpoint, data, config)

    if (!isStatusOk(response?.status)) return

    return {
      data: response.data,
      status: response.status,
    }
  } catch (error) {
    console.error('Error during API call using api.js:', error.stack)
    router.push({ path: '/error-server' });
  }
}

async function del(endpoint, data = {}) {
  if (!endpoint) throw new Error('Please provide an endpoint for the API call')
  if (typeof endpoint !== 'string') throw new Error('Endpoint must be a string')
  if (typeof data !== 'object') throw new Error('Data must be an object')

  const router = useRouter();
  try {
    const response = await axiosApi.delete(endpoint, { data })

    if (!isStatusOk(response?.status)) return

    return {
      data: response.data,
      status: response.status,
    }
  } catch (error) {
    console.error('Error during API call using api.js:', error.stack)
    router.push({ path: '/error-server' });
  }
}

export const api = {
  get,
  post,
  put,
  del,
}
