# File my_memo_master_front/Dockerfile

FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . ./
RUN npm run build

FROM debian:bullseye

RUN apt-get update && apt-get install -y apache2 && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /var/log/apache2 && chown -R www-data:www-data /var/log/apache2

RUN rm -rf /var/www/html/*

COPY --from=0 /app/dist /var/www/html

EXPOSE 80
EXPOSE 443

CMD ["apachectl", "-D", "FOREGROUND"]
