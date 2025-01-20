FROM node:18 AS build-stage

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . ./

RUN npm run build

FROM debian:bullseye

RUN apt-get update && apt-get install -y apache2 && rm -rf /var/lib/apt/lists/*

COPY --from=build-stage /app/dist /var/www/html/mymemomaster/my_memo_master_front

EXPOSE 80
EXPOSE 443

CMD ["apachectl", "-D", "FOREGROUND"]