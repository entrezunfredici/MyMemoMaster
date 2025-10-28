# ---- Step 1: Build Vue app ----
# ---- Step 1: build Vite en prod ----
FROM node:20-alpine AS build
WORKDIR /app

# Cache deps
COPY package*.json ./
RUN npm ci

# Code + variables de build (Vite lit les VITE_* au build)
COPY . .
ARG VITE_APP_NAME
ARG VITE_APP_COMPANY_NAME
ARG VITE_APP_AUTHOR_NAME
ARG VITE_APP_DESCRIPTION
ARG VITE_APP_THEME_COLOR
ARG VITE_APP_BG_COLOR
ARG VITE_FRONT_URL
ARG VITE_API_URL
ARG BASE=/
ENV VITE_APP_NAME=$VITE_APP_NAME \
    VITE_APP_COMPANY_NAME=$VITE_APP_COMPANY_NAME \
    VITE_APP_AUTHOR_NAME=$VITE_APP_AUTHOR_NAME \
    VITE_APP_DESCRIPTION=$VITE_APP_DESCRIPTION \
    VITE_APP_THEME_COLOR=$VITE_APP_THEME_COLOR \
    VITE_APP_BG_COLOR=$VITE_APP_BG_COLOR \
    VITE_FRONT_URL=$VITE_FRONT_URL \
    VITE_API_URL=$VITE_API_URL \
    BASE=$BASE
# ⚠️ Assure-toi que vite.config.* lit process.env.BASE (voir snippet plus bas)
RUN npm run build

# ---- Step 2: Node runtime avec serveur Express ----
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=8080

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY server ./server

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -q -O - http://127.0.0.1:${PORT}/healthz || exit 1

CMD ["node", "server/index.js"]
