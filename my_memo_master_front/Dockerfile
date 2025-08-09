# ---- Step 1: Build Vue app ----
FROM node:18 AS builder
WORKDIR /app

# 1) Caching deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev=false

# 2) Build
COPY . .
# si tu utilises Vite + base spécifique, tu peux passer BASE=/ par arg
ARG BASE=/
ENV BASE=${BASE}
# exemple pour Vite: vite.config.js doit utiliser base: process.env.BASE || '/'
RUN npm run build

# ---- Step 2: Nginx static ----
FROM nginx:stable-alpine

# Nginx conf pour SPA (history mode)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# assets
COPY --from=builder /app/dist /usr/share/nginx/html

# option: compression gzip/brotli si tu veux (plugins/custom image)
# ici on reste standard

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
CMD wget -q -O - http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
