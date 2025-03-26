#!/bin/sh

# Arrêter l'exécution en cas d'erreur
set -e

# Vérifier si node_modules est bien installé, sinon l'installer
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Exécuter les migrations et le seed (si nécessaire)
echo "🌱 Running database seed..."
npm run seed || echo "⚠️ Seed script failed, but continuing..."

# Lancer l'application
echo "🚀 Starting the API..."
exec npm run start
