#!/bin/bash
# =============================================================================
#  setup-k8s-https.sh — Installation HTTPS sur Kubernetes (cert-manager + Traefik)
#
#  Ce script installe et configure :
#    1. cert-manager  — gestion automatique des certificats Let's Encrypt
#    2. Traefik        — ingress controller (reverse proxy)
#    3. ClusterIssuer  — configuration Let's Encrypt (staging + prod)
#    4. Middlewares    — HSTS + redirect HTTP→HTTPS
#
#  Usage :
#    bash setup.sh --email your@email.com --api-domain api.yourdomain.com \
#                  --front-domain app.yourdomain.com
#
#  Prérequis :
#    - kubectl configuré et connecté au cluster
#    - helm v3 installé
#    - DNS configurés vers l'IP du LoadBalancer du cluster
# =============================================================================

set -euo pipefail

# ── Valeurs par défaut ────────────────────────────────────────────────────────
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-}"
API_DOMAIN="${API_DOMAIN:-api.yourdomain.com}"
FRONT_DOMAIN="${FRONT_DOMAIN:-app.yourdomain.com}"
CERT_MANAGER_VERSION="${CERT_MANAGER_VERSION:-v1.14.5}"
NAMESPACE="mymemomaster"

# ── Couleurs ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }
step()  { echo -e "\n${GREEN}══ $* ${NC}"; }

# ── Arguments ─────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --email)        LETSENCRYPT_EMAIL="$2";  shift 2 ;;
    --api-domain)   API_DOMAIN="$2";          shift 2 ;;
    --front-domain) FRONT_DOMAIN="$2";        shift 2 ;;
    --cm-version)   CERT_MANAGER_VERSION="$2"; shift 2 ;;
    *) error "Argument inconnu : $1" ;;
  esac
done

# ── Vérifications ─────────────────────────────────────────────────────────────
step "Vérification des prérequis"

command -v kubectl >/dev/null 2>&1 || error "kubectl non trouvé."
command -v helm    >/dev/null 2>&1 || error "helm non trouvé."
kubectl cluster-info >/dev/null 2>&1 || error "kubectl ne peut pas joindre le cluster."

if [[ -z "$LETSENCRYPT_EMAIL" ]]; then
  echo -n "Email Let's Encrypt : "
  read -r LETSENCRYPT_EMAIL
  [[ -z "$LETSENCRYPT_EMAIL" ]] && error "Email obligatoire."
fi

info "Email ACME   : ${LETSENCRYPT_EMAIL}"
info "API domain   : ${API_DOMAIN}"
info "Front domain : ${FRONT_DOMAIN}"
info "Namespace    : ${NAMESPACE}"
echo ""

# ── Namespace ─────────────────────────────────────────────────────────────────
step "1/5 — Namespace ${NAMESPACE}"
kubectl apply -f "$(dirname "$0")/namespace.yml"

# ── cert-manager ──────────────────────────────────────────────────────────────
step "2/5 — cert-manager ${CERT_MANAGER_VERSION}"

helm repo add jetstack https://charts.jetstack.io --force-update
helm repo update

if helm status cert-manager -n cert-manager >/dev/null 2>&1; then
  info "cert-manager déjà installé — upgrade."
  helm upgrade cert-manager jetstack/cert-manager \
    --namespace cert-manager \
    --version "${CERT_MANAGER_VERSION}" \
    --set crds.enabled=true
else
  helm install cert-manager jetstack/cert-manager \
    --namespace cert-manager \
    --create-namespace \
    --version "${CERT_MANAGER_VERSION}" \
    --set crds.enabled=true
fi

info "Attente que cert-manager soit prêt..."
kubectl rollout status deployment/cert-manager -n cert-manager --timeout=120s
kubectl rollout status deployment/cert-manager-webhook -n cert-manager --timeout=120s

# ── Traefik ingress controller ────────────────────────────────────────────────
step "3/5 — Traefik ingress controller"

helm repo add traefik https://traefik.github.io/charts --force-update
helm repo update

if helm status traefik -n traefik >/dev/null 2>&1; then
  info "Traefik déjà installé — upgrade."
  helm upgrade traefik traefik/traefik \
    --namespace traefik \
    -f "$(dirname "$0")/traefik/values.yml"
else
  helm install traefik traefik/traefik \
    --namespace traefik \
    --create-namespace \
    -f "$(dirname "$0")/traefik/values.yml"
fi

info "Attente que Traefik soit prêt..."
kubectl rollout status deployment/traefik -n traefik --timeout=120s

# ── ClusterIssuer Let's Encrypt ───────────────────────────────────────────────
step "4/5 — ClusterIssuer Let's Encrypt"

# Substituer l'email dans le fichier cluster-issuer.yml
ISSUER_TMP=$(mktemp)
sed "s/LETSENCRYPT_EMAIL/${LETSENCRYPT_EMAIL}/g" \
  "$(dirname "$0")/cert-manager/cluster-issuer.yml" > "${ISSUER_TMP}"
kubectl apply -f "${ISSUER_TMP}"
rm "${ISSUER_TMP}"

# ── Middlewares HSTS + redirect ───────────────────────────────────────────────
step "4b/5 — Middlewares HSTS + redirect HTTP→HTTPS"
kubectl apply -f "$(dirname "$0")/traefik/middleware-hsts.yml"

# ── Ingress applicatif ────────────────────────────────────────────────────────
step "5/5 — Ingress API + Frontend"

INGRESS_TMP=$(mktemp)
sed "s/api\.yourdomain\.com/${API_DOMAIN}/g; s/app\.yourdomain\.com/${FRONT_DOMAIN}/g" \
  "$(dirname "$0")/app/ingress.yml" > "${INGRESS_TMP}"
kubectl apply -f "${INGRESS_TMP}" -n "${NAMESPACE}"
rm "${INGRESS_TMP}"

# ── Résumé ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  HTTPS k8s configuré avec succès${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════════${NC}"
echo ""

TRAEFIK_IP=$(kubectl get svc traefik -n traefik \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "en attente...")

echo "  LoadBalancer IP : ${TRAEFIK_IP}"
echo "  API             : https://${API_DOMAIN}"
echo "  Frontend        : https://${FRONT_DOMAIN}"
echo ""
echo -e "${YELLOW}  DNS à configurer : ${API_DOMAIN} + ${FRONT_DOMAIN} → ${TRAEFIK_IP}${NC}"
echo -e "${YELLOW}  Certificats générés automatiquement par cert-manager au premier accès${NC}"
echo ""
echo "  Vérifier les certificats :"
echo "    kubectl get certificate -n ${NAMESPACE}"
echo "    kubectl get certificaterequest -n ${NAMESPACE}"
echo ""
echo "  En cas de problème :"
echo "    kubectl describe certificate mmm-api-tls -n ${NAMESPACE}"
echo "    kubectl logs -n cert-manager -l app=cert-manager --tail=50"
