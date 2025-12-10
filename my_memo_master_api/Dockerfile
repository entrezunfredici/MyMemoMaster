# File my_memo_master_api/Dockerfile

FROM node:20-bullseye-slim

WORKDIR /app

COPY package*.json ./
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && npm install \
    && npm cache clean --force \
    && apt-get purge -y --auto-remove python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY . ./

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Démarrage
CMD ["npm","start"]
