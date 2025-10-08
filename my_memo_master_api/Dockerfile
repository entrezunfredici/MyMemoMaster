# File my_memo_master_api/Dockerfile

FROM node:20-bullseye-slim

WORKDIR /app

ENV PYTHON=/usr/bin/python3

COPY package*.json ./

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && npm install \
    && npm cache clean --force \
    && apt-get purge -y --auto-remove python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY . ./

EXPOSE ${API_PORT}

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
CMD ["/entrypoint.sh"]
