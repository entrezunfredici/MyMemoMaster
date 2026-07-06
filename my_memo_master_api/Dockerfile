# syntax=docker/dockerfile:1
# ---- Stage 1: build native dependencies ----
# node:22-bookworm-slim est basé sur Debian (glibc) — requis par onnxruntime-node (@xenova/transformers)
FROM node:22-bookworm-slim AS deps
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
# CHOIX: npm ci (lockfile strict, pas de résolution) + cache npm persistant entre builds (BuildKit)
# RAISON: reproductible (mêmes versions que la CI) et bien plus rapide quand la couche est invalidée ;
#         échoue volontairement si package-lock.json n'est plus synchro avec package.json
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

# ---- Stage 2: production image (no build tools) ----
FROM node:22-bookworm-slim AS production
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

COPY entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE ${API_PORT}

CMD ["/entrypoint.sh"]
