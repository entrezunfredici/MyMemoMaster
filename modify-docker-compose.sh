#!/bin/bash
DOCKER_COMPOSE_FILE="/var/www/html/mymemomaster/docker-compose.yml"

if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
    echo "Le fichier $DOCKER_COMPOSE_FILE n'existe pas. Abandon."
    exit 1
fi

sed -i '/^  postgres:/,/^[^ ]/d' "$DOCKER_COMPOSE_FILE"
sed -i '/^  pgadmin:/,/^[^ ]/d' "$DOCKER_COMPOSE_FILE"

sed -i '/^  postgres-data:/d' "$DOCKER_COMPOSE_FILE"
sed -i '/^  pgadmin-data:/d' "$DOCKER_COMPOSE_FILE"

echo "$DOCKER_COMPOSE_FILE has editted."
