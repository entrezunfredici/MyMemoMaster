# ---- Stage 1: build native dependencies ----
FROM node:22-alpine AS deps
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

# ---- Stage 2: production image (no build tools) ----
FROM node:22-alpine AS production
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE ${API_PORT}

CMD ["/entrypoint.sh"]
