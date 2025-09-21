// src/config.js

// ! To prevent accidentally leaking env variables to the client, only variables prefixed with VITE_ are exposed to your Vite-processed code
// ! https://stackoverflow.com/questions/67378099/import-meta-env-undefined-on-production-build-vitejs


// Permet d'injecter une config au runtime via server_docker_compose (window.__APP_CONFIG__)
const runtimeCfg = typeof window !== 'undefined' ? window.__APP_CONFIG__ || {} : {};

export const VITE_APP_NAME = runtimeCfg.APP_NAME || import.meta.env.VITE_APP_NAME || 'MyMemoMaster';
export const VITE_APP_COMPANY_NAME =
  runtimeCfg.APP_COMPANY_NAME || import.meta.env.VITE_APP_COMPANY_NAME || 'MyMemoMaster';
export const VITE_APP_AUTHOR_NAME =
  runtimeCfg.APP_AUTHOR_NAME || import.meta.env.VITE_APP_AUTHOR_NAME || "MyMemoMaster's team";
export const VITE_FRONT_URL =
  runtimeCfg.PUBLIC_URL || import.meta.env.VITE_FRONT_URL || 'http://localhost';
export const VITE_API_URL =
  runtimeCfg.API_URL || import.meta.env.VITE_API_URL || 'http://localhost/api';

//export const VITE_APP_NAME = import.meta.env.VITE_APP_NAME || 'MyMemoMaster';
//export const VITE_APP_COMPANY_NAME = import.meta.env.VITE_APP_COMPANY_NAME || 'MyMemoMaster';
//export const VITE_APP_AUTHOR_NAME = import.meta.env.VITE_APP_AUTHOR_NAME || "MyMemoMaster's team";
//export const VITE_FRONT_URL = import.meta.env.VITE_FRONT_URL || 'http://localhost';
//export const VITE_API_URL = import.meta.env.VITE_API_URL  || "http://localhost/api";

