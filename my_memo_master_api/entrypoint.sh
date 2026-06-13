#!/bin/sh
set -e

if [ ! -d node_modules ]; then
  echo "[entrypoint] Installing dependencies..."
  npm install
fi

echo "[entrypoint] Running database migrations..."
npx sequelize-cli db:migrate

echo "[entrypoint] Starting the API..."
exec npm run start
