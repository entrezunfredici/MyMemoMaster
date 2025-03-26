#!/bin/sh
set -e

if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi
#seed doent work
#echo "🌱 Running database seed..."
#npm run seed || echo "⚠️ Seed script failed, but continuing..."

echo "🚀 Starting the API..."
exec npm run start
