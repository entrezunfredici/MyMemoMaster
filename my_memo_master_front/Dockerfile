FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the app code and build it
COPY . .
RUN npm run build

# Use a simple server to serve the static files
RUN npm install -g serve
CMD ["serve", "-s", "dist", "-l", "80"]
