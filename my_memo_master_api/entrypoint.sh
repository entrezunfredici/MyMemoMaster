#!/bin/sh
set -e

echo "[entrypoint] Syncing dependencies..."
npm install --prefer-offline

echo "[entrypoint] Running database migrations..."
npx sequelize-cli db:migrate

echo "[entrypoint] Seeding roles..."
npx sequelize-cli db:seed --seed 20260605000001-seed-roles.js

echo "[entrypoint] Seeding admin user..."
npx sequelize-cli db:seed --seed 20260605000002-seed-admin-user.js

echo "[entrypoint] Syncing PostgreSQL sequences..."
node scripts/sync-pg-sequences.js

echo "[entrypoint] Starting the API..."
exec npm run start
