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

# Comptes de test des parcours E2E (QA.03/QA.05). Le seeder n'est meme pas
# invoque sans opt-in : les seeders sont rejoues au demarrage de CHAQUE pod,
# production comprise. Le fichier porte en plus son propre garde-fou sur
# NODE_ENV — deux verrous valent mieux qu'un pour des comptes a mot de passe
# connu.
if [ "$SEED_E2E_USERS" = "true" ]; then
  echo "[entrypoint] Seeding E2E test users..."
  npx sequelize-cli db:seed --seed 20260829000001-seed-e2e-users.js
fi

echo "[entrypoint] Syncing PostgreSQL sequences..."
node scripts/sync-pg-sequences.js

echo "[entrypoint] Starting the API..."
exec npm run start
