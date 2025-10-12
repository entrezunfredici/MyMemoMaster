// src/config.js

// ! To prevent accidentally leaking env variables to the client, only variables prefixed with VITE_ are exposed to your Vite-processed code
// ! https://stackoverflow.com/questions/67378099/import-meta-env-undefined-on-production-build-vitejs


// Permet d'injecter une config au runtime via server_docker_compose (window.__APP_CONFIG__)
const runtimeCfg = typeof window !== 'undefined' ? window.__APP_CONFIG__ || {} : {};

const normalizeUrl = (maybeUrl, fallbackUrl) => {
  const candidate = typeof maybeUrl === 'string' && maybeUrl.trim().length > 0
    ? maybeUrl.trim()
    : fallbackUrl;

  if (!candidate || typeof candidate !== 'string') return fallbackUrl;

  const trimmed = candidate.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed.replace(/^\/+/, '')}`;
};

export const VITE_APP_NAME = runtimeCfg.APP_NAME || import.meta.env.VITE_APP_NAME || 'MyMemoMaster';
export const VITE_APP_COMPANY_NAME =
  runtimeCfg.APP_COMPANY_NAME || import.meta.env.VITE_APP_COMPANY_NAME || 'MyMemoMaster';
export const VITE_APP_AUTHOR_NAME =
  runtimeCfg.APP_AUTHOR_NAME || import.meta.env.VITE_APP_AUTHOR_NAME || "MyMemoMaster's team";
const fallbackFrontUrl = import.meta.env.VITE_FRONT_URL || 'http://localhost';
const fallbackApiUrl = import.meta.env.VITE_API_URL || 'http://localhost/api';
export const VITE_FRONT_URL = normalizeUrl(runtimeCfg.PUBLIC_URL, fallbackFrontUrl);
export const VITE_API_URL = normalizeUrl(runtimeCfg.API_URL, fallbackApiUrl);

//export const VITE_APP_NAME = import.meta.env.VITE_APP_NAME || 'MyMemoMaster';
//export const VITE_APP_COMPANY_NAME = import.meta.env.VITE_APP_COMPANY_NAME || 'MyMemoMaster';
//export const VITE_APP_AUTHOR_NAME = import.meta.env.VITE_APP_AUTHOR_NAME || "MyMemoMaster's team";
//export const VITE_FRONT_URL = import.meta.env.VITE_FRONT_URL || 'http://localhost';
//export const VITE_API_URL = import.meta.env.VITE_API_URL  || "http://localhost/api";

