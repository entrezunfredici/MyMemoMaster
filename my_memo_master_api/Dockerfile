# Utilise l'image de base node:18-alpine
FROM node:18-alpine

# Définit le répertoire de travail à /app
WORKDIR /app

# Copie les fichiers package.json et package-lock.json (ou yarn.lock)
COPY package*.json ./

# Installe les dépendances
RUN npm ci

# Copie tout le reste des fichiers de l'application dans le conteneur
COPY . .

# Expose le port sur lequel l'API va tourner (par défaut 3000)
EXPOSE ${API_PORT}

# Commande pour démarrer l'application
CMD ["sh", "-c", "npm start && npm run seed "]
