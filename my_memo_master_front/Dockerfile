# syntax=docker/dockerfile:1
# ---- Stage 1: Build Vite (prod) ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
# Cache npm persistant entre builds (BuildKit) — voir Dockerfile API pour la justification
RUN --mount=type=cache,target=/root/.npm npm ci --legacy-peer-deps

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

RUN npm run build

# ---- Stage 2: Nginx static ----
FROM nginx:stable-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
