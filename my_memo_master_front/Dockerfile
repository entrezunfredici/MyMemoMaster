# Step 1: Build the Vue.js application
FROM node:18 AS build-stage

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Step 2: Use a lightweight Debian image with Apache
FROM debian:bullseye

# Install Apache
RUN apt-get update && apt-get install -y apache2 && rm -rf /var/lib/apt/lists/*

# Copy the built files to the Apache web directory
COPY --from=build-stage /app/dist /var/www/html/mymemomaster/my_memo_master_front

# Expose port 80 et 443
EXPOSE 80
EXPOSE 443

# Start Apache server
CMD ["apachectl", "-D", "FOREGROUND"]