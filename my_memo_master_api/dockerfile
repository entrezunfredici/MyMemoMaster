# FROM node:18-alpine AS build
# Utilise une image de base node
FROM node:18-alpine AS build

# Définit le répertoire de travail
WORKDIR /app

# Copie les fichiers package.json et package-lock.json
COPY package*.json ./

# Installe les dépendances
RUN npm ci

# Copie tout le reste des fichiers de l'application
COPY . .

# Compile l'application pour la production
RUN npm run build

# Expose le port de l'application
EXPOSE 8000

# Démarre l'application
CMD ["npm", "start"]
