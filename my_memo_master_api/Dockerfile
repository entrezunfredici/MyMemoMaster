# File my_memo_master_api/Dockerfile

FROM node:22alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . ./

EXPOSE ${API_PORT}

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
CMD ["/entrypoint.sh"]
