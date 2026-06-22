#!/bin/bash
# =============================================================================
#  setup.sh — Déploiement HTTPS MyMemoMaster sur Kubernetes Infomaniak
#
#  Ce script configure uniquement les ressources applicatives.
#  ingress-nginx et cert-manager sont déjà fournis par Infomaniak — ne pas
#  les réinstaller.
#
#  Ce script applique dans l'ordre :
#    1. Namespace mymemomaster
#    2. ClusterIssuer Let's Encrypt (staging + prod)
#    3. Ingress API + Frontend (avec TLS + HSTS)
#
#  Usage :
#    bash k8s/setup.sh --email your@email.com \
#                      --api-domain api.yourdomain.com \
#                      --front-domain app.yourdomain.com
#
#  Prérequis :
#    - kubectl configuré et pointant vers le cluster Infomaniak
#    - DNS api.yourdomain.com et app.yourdomain.com → 179.237.72.87
# =============================================================================

set -euo pipefail

# ── Valeurs par défaut ────────────────────────────────────────────────────────
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-}"
API_DOMAIN="${API_DOMAIN:-api.yourdomain.com}"
FRONT_DOMAIN="${FRONT_DOMAIN:-app.yourdomain.com}"
NAMESPACE="mymemomaster"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Couleurs ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }
step()  { echo -e "\n${GREEN}══ $* ${NC}"; }

# ── Arguments ─────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --email)        LETSENCRYPT_EMAIL="$2"; shift 2 ;;
    --api-domain)   API_DOMAIN="$2";        shift 2 ;;
    --front-domain) FRONT_DOMAIN="$2";      shift 2 ;;
    *) error "Argument inconnu : $1" ;;
  esac
done

# ── Vérifications ─────────────────────────────────────────────────────────────
step "Vérification des prérequis"

command -v kubectl >/dev/null 2>&1 || error "kubectl non trouvé."
kubectl cluster-info >/dev/null 2>&1 || error "kubectl ne peut pas joindre le cluster."

# Vérifier que ingress-nginx est bien présent
kubectl get ingressclass nginx >/dev/null 2>&1 \
  || error "ingress-nginx introuvable sur le cluster. Vérifier avec : kubectl get ingressclass"

# Vérifier que cert-manager est bien présent
kubectl get namespace cert-manager >/dev/null 2>&1 \
  || error "cert-manager introuvable sur le cluster. Vérifier avec : kubectl get ns"

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

# ── 1. Namespace ──────────────────────────────────────────────────────────────
step "1/3 — Namespace ${NAMESPACE}"
kubectl apply -f "${SCRIPT_DIR}/namespace.yml"

# ── 2. ClusterIssuer Let's Encrypt ───────────────────────────────────────────
step "2/3 — ClusterIssuer Let's Encrypt"

ISSUER_TMP=$(mktemp)
sed "s/LETSENCRYPT_EMAIL/${LETSENCRYPT_EMAIL}/g" \
  "${SCRIPT_DIR}/cert-manager/cluster-issuer.yml" > "${ISSUER_TMP}"
kubectl apply -f "${ISSUER_TMP}"
rm "${ISSUER_TMP}"

info "Attente que les ClusterIssuers soient prêts (15s)..."
sleep 15
kubectl get clusterissuer letsencrypt-staging letsencrypt-prod 2>/dev/null || true

# ── 3. Ingress applicatif ─────────────────────────────────────────────────────
step "3/3 — Ingress API + Frontend"

INGRESS_TMP=$(mktemp)
sed "s/api\.yourdomain\.com/${API_DOMAIN}/g; s/app\.yourdomain\.com/${FRONT_DOMAIN}/g" \
  "${SCRIPT_DIR}/app/ingress.yml" > "${INGRESS_TMP}"
kubectl apply -f "${INGRESS_TMP}" -n "${NAMESPACE}"
rm "${INGRESS_TMP}"

# ── Résumé ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Déploiement terminé${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════════${NC}"
echo ""

NGINX_IP=$(kubectl get svc ingress-nginx-controller -n ingress-nginx \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "en attente...")

echo "  LoadBalancer IP : ${NGINX_IP}"
echo "  API             : https://${API_DOMAIN}"
echo "  Frontend        : https://${FRONT_DOMAIN}"
echo ""
echo -e "${YELLOW}  DNS à configurer : ${API_DOMAIN} + ${FRONT_DOMAIN} → ${NGINX_IP}${NC}"
echo -e "${YELLOW}  Certificats générés automatiquement par cert-manager au premier accès HTTPS${NC}"
echo ""
echo "  Vérifier les certificats :"
echo "    kubectl get certificate -n ${NAMESPACE}"
echo "    kubectl get certificaterequest -n ${NAMESPACE}"
echo ""
echo "  En cas de problème :"
echo "    kubectl describe certificate mmm-api-tls -n ${NAMESPACE}"
echo "    kubectl logs -n cert-manager -l app=cert-manager --tail=50"
