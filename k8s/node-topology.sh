#!/bin/bash
# =============================================================================
#  node-topology.sh — dédie un nœud du cluster à l'outillage (SonarQube, etc.)
#
#  Pose sur le nœud désigné :
#    - le label  workload=tooling            → les charges d'outillage l'y VISENT
#    - le taint  workload=tooling:NoSchedule → tout le reste en est EXCLU
#
#  UN SEUL nœud est tainté. Ne pas tainter les trois :
#  ingress-nginx, cert-manager, coredns et metrics-server sont des Deployments
#  SANS toleration ; tainter tous les nœuds les enfermerait sur le seul nœud
#  qui les tolère. Et comme le Service ingress est en
#  `externalTrafficPolicy: Local`, le LoadBalancer Octavia ne route que vers
#  les nœuds portant un pod ingress : tout le trafic de PRODUCTION entrerait
#  alors par le nœud d'outillage. Voir .agents/DECISIONS.md (2026-08-28).
#
#  `NoSchedule` (et non `NoExecute`) : les pods DÉJÀ en cours sur le nœud n'en
#  sont PAS expulsés. Ils y restent jusqu'à leur prochain redéploiement, où le
#  scheduler les placera ailleurs. Aucune coupure au moment de l'exécution.
#
#  Usage :
#    bash k8s/node-topology.sh <nom-du-nœud>              # applique
#    bash k8s/node-topology.sh <nom-du-nœud> --dry-run    # montre sans faire
#    bash k8s/node-topology.sh <nom-du-nœud> --revert     # retire label + taint
#
#  Lister les nœuds :  kubectl get nodes
# =============================================================================

set -euo pipefail

LABEL_KEY="workload"
LABEL_VAL="tooling"
TAINT_EFFECT="NoSchedule"

# Deployments cluster sans toleration : un nœud qui les héberge n'est pas le
# meilleur candidat (ils devront migrer à leur prochain rollout).
ADDON_NAMESPACES="ingress-nginx cert-manager kube-system"

NODE=""
MODE="apply"
DRY_RUN="false"

# ── Arguments ────────────────────────────────────────────────────────────────
while [ $# -gt 0 ]; do
  case "$1" in
    --revert)  MODE="revert" ;;
    --dry-run) DRY_RUN="true" ;;
    -h|--help)
      sed -n '2,30p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    -*)
      echo "Option inconnue : $1" >&2
      exit 1
      ;;
    *)
      if [ -n "$NODE" ]; then
        echo "Un seul nœud attendu (reçu « $NODE » puis « $1 »)." >&2
        exit 1
      fi
      NODE="$1"
      ;;
  esac
  shift
done

if [ -z "$NODE" ]; then
  echo "Usage : bash k8s/node-topology.sh <nom-du-nœud> [--dry-run] [--revert]" >&2
  echo "Nœuds disponibles :" >&2
  kubectl get nodes -o name 2>/dev/null | sed 's|node/|  |' >&2 || true
  exit 1
fi

run() {
  if [ "$DRY_RUN" = "true" ]; then
    echo "  [dry-run] $*"
  else
    echo "  \$ $*"
    "$@"
  fi
}

# ── Vérifications ────────────────────────────────────────────────────────────
echo "── Vérifications ────────────────────────────────────────────────────────"

if ! kubectl get node "$NODE" >/dev/null 2>&1; then
  echo "ERREUR : le nœud « $NODE » n'existe pas sur le cluster courant." >&2
  echo "Nœuds disponibles :" >&2
  kubectl get nodes -o name | sed 's|node/|  |' >&2
  exit 1
fi
echo "✓ Nœud « $NODE » trouvé"

NODE_COUNT="$(kubectl get nodes --no-headers | wc -l | tr -d ' ')"
if [ "$MODE" = "apply" ] && [ "$NODE_COUNT" -lt 3 ]; then
  echo "ERREUR : $NODE_COUNT nœud(s) sur le cluster." >&2
  echo "Dédier un nœud à l'outillage n'en laisserait qu'un pour prod ET preprod," >&2
  echo "ce qui est PIRE que la situation actuelle. Minimum requis : 3 nœuds." >&2
  exit 1
fi
echo "✓ $NODE_COUNT nœuds — il en restera $((NODE_COUNT - 1)) pour prod et preprod"

# Un autre nœud porte-t-il déjà le label ?
OTHERS="$(kubectl get nodes -l "$LABEL_KEY=$LABEL_VAL" -o name 2>/dev/null \
          | sed 's|node/||' | grep -v "^${NODE}$" || true)"
if [ "$MODE" = "apply" ] && [ -n "$OTHERS" ]; then
  echo "⚠ Un autre nœud porte déjà $LABEL_KEY=$LABEL_VAL :"
  echo "$OTHERS" | sed 's/^/    /'
  echo "  Deux nœuds d'outillage : le placement ne sera plus déterministe."
fi

# Pods d'addons présents sur le nœud visé
if [ "$MODE" = "apply" ]; then
  FOUND=""
  for NS in $ADDON_NAMESPACES; do
    PODS="$(kubectl get pods -n "$NS" --field-selector "spec.nodeName=$NODE" \
              -o jsonpath='{range .items[?(@.metadata.ownerReferences[0].kind!="DaemonSet")]}{.metadata.name}{"\n"}{end}' \
              2>/dev/null || true)"
    if [ -n "$PODS" ]; then
      FOUND="$FOUND$(echo "$PODS" | sed "s|^|    $NS/|")"$'\n'
    fi
  done
  if [ -n "$FOUND" ]; then
    echo "⚠ Ce nœud héberge des pods d'addons (hors DaemonSet) :"
    printf '%s' "$FOUND"
    echo "  Ils ne seront PAS expulsés (NoSchedule), mais migreront à leur prochain"
    echo "  rollout. Vérifier qu'il restera un pod ingress-nginx ailleurs, sinon le"
    echo "  LoadBalancer (externalTrafficPolicy: Local) perdra une cible."
  else
    echo "✓ Aucun pod d'addon hors DaemonSet sur ce nœud — bon candidat"
  fi
fi

# Pods applicatifs qui devront migrer
APP_PODS="$(kubectl get pods -A --field-selector "spec.nodeName=$NODE" \
            --no-headers 2>/dev/null \
            | awk '$1 ~ /^mymemomaster/ {print "    " $1 "/" $2}' || true)"
if [ "$MODE" = "apply" ] && [ -n "$APP_PODS" ]; then
  echo "ℹ Pods applicatifs actuellement sur ce nœud (migreront au prochain rollout) :"
  printf '%s\n' "$APP_PODS"
fi

# ── Application ──────────────────────────────────────────────────────────────
echo
if [ "$MODE" = "revert" ]; then
  echo "── Retrait de la dédicace ───────────────────────────────────────────────"
  run kubectl taint node "$NODE" "${LABEL_KEY}:${TAINT_EFFECT}-"
  run kubectl label node "$NODE" "${LABEL_KEY}-"
  echo
  echo "Le nœud « $NODE » redevient ordonnançable par toutes les charges."
  echo "Penser à vider nodeSelector/tolerations dans helm-sonarqube/values.yaml,"
  echo "sinon SonarQube restera « Pending » faute de nœud portant le label."
else
  echo "── Application ──────────────────────────────────────────────────────────"
  run kubectl label node "$NODE" "${LABEL_KEY}=${LABEL_VAL}" --overwrite
  run kubectl taint node "$NODE" "${LABEL_KEY}=${LABEL_VAL}:${TAINT_EFFECT}" --overwrite
  echo
  if [ "$DRY_RUN" = "true" ]; then
    echo "Rien n'a été appliqué (--dry-run)."
  else
    echo "Nœud « $NODE » dédié à l'outillage."
    echo "Prochaine étape : déployer SonarQube (helm-sonarqube/), qui porte déjà"
    echo "le nodeSelector et la toleration correspondants."
  fi
fi

echo
echo "État des nœuds :"
kubectl get nodes -L "$LABEL_KEY" \
  -o custom-columns='NAME:.metadata.name,STATUS:.status.conditions[-1].type,WORKLOAD:.metadata.labels.workload,TAINTS:.spec.taints[*].key'
