# syntax=docker/dockerfile:1
# ---- Stage 1: build native dependencies ----
# node:22-bookworm-slim est basé sur Debian (glibc) — requis par onnxruntime-node (@xenova/transformers)
FROM node:22-bookworm-slim AS deps
# CVE image de base (Bloc 4) : le npm embarqué dans l'image officielle traîne souvent des versions
# vulnérables de ses propres dépendances (tar, brace-expansion) ; se réaligner sur le dernier npm
# les corrige sans attendre une nouvelle publication de l'image node elle-même.
RUN npm install -g npm@latest
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
# CHOIX: npm ci (lockfile strict, pas de résolution) + cache npm persistant entre builds (BuildKit)
# RAISON: reproductible (mêmes versions que la CI) et bien plus rapide quand la couche est invalidée ;
#         échoue volontairement si package-lock.json n'est plus synchro avec package.json
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

# ---- Stage 2: production image (no build tools) ----
FROM node:22-bookworm-slim AS production
# entrypoint.sh exécute npm/npx au démarrage du conteneur (pas seulement au build) — même correctif
# CVE que le stage deps, sur cette image indépendante.
RUN npm install -g npm@latest
# Client PostgreSQL 17 (pg_dump / pg_restore) pour les sauvegardes lancées par l'API (Backup.service.js).
# CHOIX: dépôt officiel PGDG plutôt que le paquet Debian bookworm
# RAISON: bookworm n'embarque que le client 15 ; pg_dump refuse de sauvegarder un serveur plus récent que lui
#         (la base tourne en postgres:17). Les outils de téléchargement sont purgés dans la même couche.
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl gnupg \
    && install -d /usr/share/postgresql-common/pgdg \
    && curl -fsSL -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc \
    && echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update && apt-get install -y --no-install-recommends postgresql-client-17 \
    && apt-get purge -y curl gnupg && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

COPY entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE ${API_PORT}

CMD ["/entrypoint.sh"]
