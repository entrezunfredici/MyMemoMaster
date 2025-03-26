# Step 1: Build the Vue.js app
FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./

# Installe les dépendances
RUN npm install

# Copie tout le reste des fichiers de l'application
COPY . .
RUN npm run build

# Step 2: Use nginx to serve the built app
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start nginx server
CMD ["nginx", "-g", "daemon off;"]
