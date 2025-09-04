# ---- Step 1: Build Vue app ----
# ---- Step 1: build Vite en prod ----
FROM node:20-alpine AS build
WORKDIR /app

# Cache deps
COPY package*.json ./
RUN npm ci

# Code + variables de build (Vite lit les VITE_* au build)
COPY . .
ARG VITE_FRONT_URL
ARG VITE_API_URL
ARG BASE=/
ENV VITE_FRONT_URL=$VITE_FRONT_URL
ENV VITE_API_URL=$VITE_API_URL
ENV BASE=$BASE
# ⚠️ Assure-toi que vite.config.* lit process.env.BASE (voir snippet plus bas)
RUN npm run build

# ---- Step 2: Nginx statique ----
FROM nginx:alpine

# Nginx conf pour SPA (history mode) + cache assets
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Fichiers du build
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
CMD wget -q -O - http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
