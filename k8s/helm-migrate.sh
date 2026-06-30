#!/bin/bash
# =============================================================================
#  helm-migrate.sh — Adoption des ressources existantes par Helm
#
#  À exécuter UNE SEULE FOIS avant le premier déploiement via `helm upgrade`.
#  Sans cette étape, Helm refusera de gérer des ressources déjà présentes
#  en base Kubernetes sans ses propres annotations.
#
#  Prérequis : kubectl configuré sur le bon cluster (kubeconfig actif).
#
#  Usage :
#    bash k8s/helm-migrate.sh preprod
#    bash k8s/helm-migrate.sh prod
# =============================================================================

set -euo pipefail

ENV="${1:-}"
[[ -z "$ENV" ]] && { echo "Usage: $0 <preprod|prod>"; exit 1; }

case "$ENV" in
  preprod) RELEASE="mmm-preprod"; NS="mymemomaster-preprod" ;;
  prod)    RELEASE="mmm-prod";    NS="mymemomaster" ;;
  *) echo "Environnement inconnu: $ENV (preprod|prod)"; exit 1 ;;
esac

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }

echo ""
info "Migration vers Helm — release: $RELEASE  namespace: $NS"
echo ""

annotate() {
  local kind="$1" name="$2"
  if kubectl get "$kind" "$name" -n "$NS" &>/dev/null 2>&1; then
    kubectl annotate "$kind" "$name" -n "$NS" \
      "meta.helm.sh/release-name=${RELEASE}" \
      "meta.helm.sh/release-namespace=${NS}" \
      --overwrite &>/dev/null
    kubectl label "$kind" "$name" -n "$NS" \
      "app.kubernetes.io/managed-by=Helm" \
      --overwrite &>/dev/null
    echo -e "  ${GREEN}✓${NC} $kind/$name"
  else
    warn "  $kind/$name introuvable — ignoré"
  fi
}

COMPONENTS=(postgres redis api front)
[[ "$ENV" == "preprod" ]] && COMPONENTS+=(pgadmin)

for comp in "${COMPONENTS[@]}"; do
  name="${RELEASE}-${comp}"
  annotate statefulset "$name" 2>/dev/null || annotate deployment "$name"
  annotate service "$name"
  annotate ingress "$name" 2>/dev/null || true
done

annotate configmap "${RELEASE}-config"

echo ""
info "Migration terminée. Lance maintenant le premier déploiement Helm :"
echo ""
if [[ "$ENV" == "preprod" ]]; then
  echo "  helm upgrade --install $RELEASE ./helm \\"
  echo "    -f helm/values-preprod.yaml \\"
  echo "    -n $NS \\"
  echo "    --set rolloutTimestamp=\$(date +%s) \\"
  echo "    --atomic --timeout 3m"
else
  echo "  helm upgrade --install $RELEASE ./helm \\"
  echo "    -f helm/values-prod.yaml \\"
  echo "    -n $NS \\"
  echo "    --set rolloutTimestamp=\$(date +%s) \\"
  echo "    --atomic --timeout 5m"
fi
echo ""
