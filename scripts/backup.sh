#!/bin/bash
# pg_dump backup script — MyMemoMaster
#
# Usage depuis le VPS :
#   ENVIRONMENT=prod bash scripts/backup.sh
#
# Variables d'environnement reconnues :
#   ENVIRONMENT      — prod | preprod (défaut : prod)
#   BACKUP_DIR       — répertoire de destination (défaut : /var/backups/my_memo_master)
#   RETENTION_DAYS   — nombre de jours de rétention (défaut : 7)
#   PG_USER          — utilisateur PostgreSQL (défaut : postgres)
#   PG_DB            — nom de la base (défaut : mymemomasterdb)
#
# Prérequis :
#   - docker installé et l'utilisateur dans le groupe docker
#   - le conteneur postgres du bon environnement en cours d'exécution

set -euo pipefail

ENVIRONMENT="${ENVIRONMENT:-prod}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/my_memo_master}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
PG_USER="${PG_USER:-postgres}"
PG_DB="${PG_DB:-mymemomasterdb}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/mymemomaster_${ENVIRONMENT}_${TIMESTAMP}.dump"

# Nom du conteneur postgres selon la convention docker-compose (network name inclut l'environnement)
POSTGRES_CONTAINER="my_memo_master_${ENVIRONMENT}_network"

# Recherche dynamique du conteneur postgres actif pour cet environnement
PG_CONTAINER=$(docker ps --filter "name=postgres" \
                          --filter "network=my_memo_master_${ENVIRONMENT}_network" \
                          --format "{{.Names}}" | head -1)

if [ -z "${PG_CONTAINER}" ]; then
  echo "[backup] ERREUR : aucun conteneur postgres trouvé sur le réseau my_memo_master_${ENVIRONMENT}_network" >&2
  exit 1
fi

mkdir -p "${BACKUP_DIR}"

echo "[backup] Dump de ${PG_DB} depuis ${PG_CONTAINER} → ${BACKUP_FILE} ..."
docker exec "${PG_CONTAINER}" pg_dump -U "${PG_USER}" -Fc "${PG_DB}" > "${BACKUP_FILE}"

BACKUP_SIZE=$(du -sh "${BACKUP_FILE}" | cut -f1)
echo "[backup] Terminé : ${BACKUP_FILE} (${BACKUP_SIZE})"

echo "[backup] Nettoyage des sauvegardes de plus de ${RETENTION_DAYS} jours..."
find "${BACKUP_DIR}" -name "mymemomaster_${ENVIRONMENT}_*.dump" -mtime "+${RETENTION_DAYS}" -delete

echo "[backup] Sauvegardes actives (${ENVIRONMENT}) :"
ls -lh "${BACKUP_DIR}"/mymemomaster_${ENVIRONMENT}_*.dump 2>/dev/null || echo "  (aucune)"
