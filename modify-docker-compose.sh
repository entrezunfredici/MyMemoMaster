#!/bin/bash

# Chemin vers le fichier docker-compose.yml
DOCKER_COMPOSE_FILE="/var/www/html/mymemomaster/docker-compose.yml"

# Supprimer les services postgres et pgadmin du fichier docker-compose.yml
sed -i '/postgres:/,/pgadmin:/d' $DOCKER_COMPOSE_FILE

# Supprimer les volumes postgres-data et pgadmin-data du fichier docker-compose.yml
sed -i '/postgres-data:/d' $DOCKER_COMPOSE_FILE
sed -i '/pgadmin-data:/d' $DOCKER_COMPOSE_FILE
