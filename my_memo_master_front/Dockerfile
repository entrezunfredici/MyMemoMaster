# Utilise l'image de base node:18-alpine
FROM node:18-alpine

# Définit le répertoire de travail à /app
WORKDIR /app

# Copie les fichiers package.json et package-lock.json (ou yarn.lock) pour installer les dépendances
COPY package*.json ./

# Installe les dépendances avec npm
RUN npm ci

# Copie le reste des fichiers de l'application dans le conteneur
COPY . .

# Expose le port sur lequel Vite va tourner (par défaut 5173)
EXPOSE ${VITE_PORT}

# Lancer le serveur de développement Vite
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
