// src/config.js

// ! To prevent accidentally leaking env variables to the client, only variables prefixed with VITE_ are exposed to your Vite-processed code
// ! https://stackoverflow.com/questions/67378099/import-meta-env-undefined-on-production-build-vitejs

export const VITE_APP_NAME = import.meta.env.VITE_APP_NAME || 'MyMemoMaster';
export const VITE_APP_COMPANY_NAME = import.meta.env.VITE_APP_COMPANY_NAME || 'MyMemoMaster';
export const VITE_APP_AUTHOR_NAME = import.meta.env.VITE_APP_AUTHOR_NAME || "MyMemoMaster's team";
export const VITE_FRONT_URL = import.meta.env.VITE_FRONT_URL || 'http://localhost';
export const VITE_API_URL = import.meta.env.VITE_API_URL  || "http://localhost/api";