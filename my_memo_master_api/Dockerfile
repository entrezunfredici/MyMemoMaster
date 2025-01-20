FROM node:18

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . ./

EXPOSE ${API_PORT}

CMD ["sh", "-c", "npm start && npm run seed "]
