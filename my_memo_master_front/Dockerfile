# Utilise une image de base node:18-alpine
FROM node:18-alpine

# Définit le répertoire de travail
WORKDIR /app

# Installe les dépendances nécessaires pour Alpine
RUN apk add --no-cache bash git

# Copie les fichiers package.json et package-lock.json
COPY package*.json ./

# Installe les dépendances
RUN npm install

# Copie tout le reste des fichiers de l'application
COPY . .

# Expose le port sur lequel Vite va tourner
EXPOSE ${VITE_PORT}

# Commande pour démarrer l'application avec Vite
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
