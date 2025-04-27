# File my_memo_master_api/Dockerfile

FROM node:18

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . ./

EXPOSE ${API_PORT}

RUN if [ -f entrypoint.sh ]; then \
        cp entrypoint.sh /entrypoint.sh; \
    else \
        cp my_memo_master_api/entrypoint.sh /entrypoint.sh; \
    fi

RUN chmod +x /entrypoint.sh
CMD ["/entrypoint.sh"]
