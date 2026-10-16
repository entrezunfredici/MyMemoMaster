#!/bin/bash
# =============================================================================
#  setup-traefik.sh — Installation de Traefik sur VPS (idempotent)
#
#  Ce script déploie Traefik comme reverse proxy centralisé sur le VPS.
#  Il doit être exécuté UNE SEULE FOIS, avant de lancer le compose applicatif.
#
#  Usage :
#    bash setup-traefik.sh [--email your@email.com] [--dir /opt/traefik]
#
#  Prérequis :
#    - Docker 24+ et Docker Compose v2
#    - Ports 80 et 443 libres sur le serveur
#    - DNS configurés (domaines → IP du VPS)
# =============================================================================

set -euo pipefail

# ── Valeurs par défaut ────────────────────────────────────────────────────────
TRAEFIK_DIR="${TRAEFIK_DIR:-/opt/traefik}"
NETWORK_NAME="traefik_proxy"
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-}"
TRAEFIK_LOG_LEVEL="${TRAEFIK_LOG_LEVEL:-INFO}"

# ── Couleurs ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()    { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ── Arguments ─────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --email) LETSENCRYPT_EMAIL="$2"; shift 2 ;;
    --dir)   TRAEFIK_DIR="$2";        shift 2 ;;
    --log)   TRAEFIK_LOG_LEVEL="$2";  shift 2 ;;
    *) error "Argument inconnu : $1" ;;
  esac
done

# ── Vérifications préalables ──────────────────────────────────────────────────
info "Vérification des prérequis..."

command -v docker >/dev/null 2>&1 || error "Docker n'est pas installé."
docker compose version >/dev/null 2>&1 || error "Docker Compose v2 n'est pas installé."

if [[ -z "$LETSENCRYPT_EMAIL" ]]; then
  echo -n "Email Let's Encrypt (notifications expiration) : "
  read -r LETSENCRYPT_EMAIL
  [[ -z "$LETSENCRYPT_EMAIL" ]] && error "Email obligatoire pour Let's Encrypt."
fi

# Vérifier que les ports 80 et 443 sont libres
for PORT in 80 443; do
  if ss -tlnp 2>/dev/null | grep -q ":${PORT} " || \
     netstat -tlnp 2>/dev/null | grep -q ":${PORT} "; then
    warn "Le port $PORT semble déjà utilisé. Vérifier avant de continuer."
  fi
done

# ── Réseau Docker ─────────────────────────────────────────────────────────────
info "Création du réseau Docker '${NETWORK_NAME}'..."
if docker network ls --format '{{.Name}}' | grep -q "^${NETWORK_NAME}$"; then
  info "Réseau '${NETWORK_NAME}' déjà existant — skip."
else
  docker network create "${NETWORK_NAME}"
  info "Réseau '${NETWORK_NAME}' créé."
fi

# ── Répertoire Traefik ────────────────────────────────────────────────────────
info "Création du répertoire ${TRAEFIK_DIR}..."
mkdir -p "${TRAEFIK_DIR}"

# ── Fichier .env ──────────────────────────────────────────────────────────────
ENV_FILE="${TRAEFIK_DIR}/.env"
if [[ -f "$ENV_FILE" ]]; then
  warn ".env déjà présent dans ${TRAEFIK_DIR} — non écrasé."
else
  info "Génération de ${ENV_FILE}..."
  cat > "${ENV_FILE}" <<EOF
LETSENCRYPT_EMAIL=${LETSENCRYPT_EMAIL}
TRAEFIK_DASHBOARD=false
TRAEFIK_DASHBOARD_DOMAIN=traefik.localhost
TRAEFIK_DASHBOARD_AUTH=admin:\$\$2y\$\$10\$\$disabled
TRAEFIK_LOG_LEVEL=${TRAEFIK_LOG_LEVEL}
EOF
  chmod 600 "${ENV_FILE}"
  info ".env créé. Éditer ${ENV_FILE} pour activer le dashboard si besoin."
fi

# ── docker-compose.yml ────────────────────────────────────────────────────────
COMPOSE_FILE="${TRAEFIK_DIR}/docker-compose.yml"
info "Génération de ${COMPOSE_FILE}..."
cat > "${COMPOSE_FILE}" <<'COMPOSE_EOF'
services:
  traefik:
    image: traefik:v3.0
    container_name: traefik
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik-letsencrypt:/letsencrypt
    command:
      - --providers.docker=true
      - --providers.docker.exposedbydefault=false
      - --providers.docker.network=traefik_proxy
      - --entrypoints.web.address=:80
      - --entrypoints.websecure.address=:443
      - --certificatesresolvers.letsencrypt.acme.email=${LETSENCRYPT_EMAIL}
      - --certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json
      - --certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web
      - --log.level=${TRAEFIK_LOG_LEVEL:-INFO}
      - --accesslog=true
      - --api.dashboard=${TRAEFIK_DASHBOARD:-false}
    labels:
      - traefik.enable=true
      - traefik.http.routers.traefik-dashboard.rule=Host(`${TRAEFIK_DASHBOARD_DOMAIN:-traefik.localhost}`)
      - traefik.http.routers.traefik-dashboard.entrypoints=websecure
      - traefik.http.routers.traefik-dashboard.tls.certresolver=letsencrypt
      - traefik.http.routers.traefik-dashboard.service=api@internal
      - traefik.http.routers.traefik-dashboard.middlewares=traefik-auth
      - traefik.http.middlewares.traefik-auth.basicauth.users=${TRAEFIK_DASHBOARD_AUTH:-admin:$$2y$$10$$disabled}
    networks:
      - traefik_proxy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "traefik", "healthcheck", "--ping"]
      interval: 30s
      timeout: 5s
      retries: 3

volumes:
  traefik-letsencrypt:
    name: traefik_letsencrypt

networks:
  traefik_proxy:
    external: true
COMPOSE_EOF

# ── Démarrage ─────────────────────────────────────────────────────────────────
info "Démarrage de Traefik..."
cd "${TRAEFIK_DIR}"
docker compose --env-file .env pull
docker compose --env-file .env up -d

# ── Vérification ──────────────────────────────────────────────────────────────
info "Attente démarrage Traefik (10s)..."
sleep 10

if docker compose --env-file .env ps | grep -q "traefik.*running\|traefik.*Up"; then
  info "Traefik est démarré."
else
  error "Traefik ne semble pas démarré. Vérifier : docker compose --env-file .env logs traefik"
fi

# ── Résumé ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Traefik installé avec succès${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════════${NC}"
echo ""
echo "  Répertoire : ${TRAEFIK_DIR}"
echo "  Réseau     : ${NETWORK_NAME}"
echo "  Email ACME : ${LETSENCRYPT_EMAIL}"
echo ""
echo "  Prochaine étape : lancer le compose applicatif"
echo "  cd /var/www/html/my_memo_master_prod"
echo "  docker compose --env-file .env up -d"
echo ""
echo -e "${YELLOW}  Certificats Let's Encrypt : générés au premier accès HTTPS${NC}"
echo -e "${YELLOW}  Vérifier les logs si besoin : docker logs traefik${NC}"
