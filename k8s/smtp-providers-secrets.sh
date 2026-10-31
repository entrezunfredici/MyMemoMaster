#!/usr/bin/env bash
# Ajoute au secret applicatif les identifiants des providers SMTP du basculement
# (helm/values.yaml : SMTP_PROVIDERS=hostinger,mailjet). À lancer AVANT de déployer le chart.
#
#   - SMTP_HOSTINGER_USER / _PASS : copie des SMTP_USER / SMTP_PASS déjà présents dans le secret
#   - SMTP_MAILJET_USER / _PASS   : clé API et clé secrète Mailjet, lues dans l'environnement
#
# Usage :
#   export MAILJET_API_KEY=... MAILJET_SECRET_KEY=...
#   DRY_RUN=1 bash k8s/smtp-providers-secrets.sh preprod   # simulation côté serveur, rien n'est écrit
#   bash k8s/smtp-providers-secrets.sh preprod             # puis prod
#
# Le patch en `data` ne remplace que les clés listées : les autres variables du secret ne sont pas touchées.
# Aucune valeur n'est affichée. Cluster : voir « Accès aux environnements » de .agents/CONVENTIONS.md.
set -euo pipefail

ENVIRONMENT="${1:-}"
case "$ENVIRONMENT" in
  preprod) NAMESPACE="mymemomaster-preprod"; SECRET="mmm-preprod-secrets" ;;
  prod)    NAMESPACE="mymemomaster";          SECRET="mmm-prod-secrets" ;;
  *) echo "Usage : $0 preprod|prod" >&2; exit 1 ;;
esac

: "${MAILJET_API_KEY:?MAILJET_API_KEY doit être défini dans l'environnement}"
: "${MAILJET_SECRET_KEY:?MAILJET_SECRET_KEY doit être défini dans l'environnement}"

KUBECONFIG_FILE="${KUBECONFIG_FILE:-k8s/kubeconfig/pck-uuvuwp7-kubeconfig}"
K=(kubectl --kubeconfig "$KUBECONFIG_FILE" --request-timeout=20s -n "$NAMESPACE")

read_key() { "${K[@]}" get secret "$SECRET" -o "jsonpath={.data.$1}"; }
encode() { printf '%s' "$1" | base64 | tr -d '\n'; }

HOSTINGER_USER_B64="$(read_key SMTP_USER)"
HOSTINGER_PASS_B64="$(read_key SMTP_PASS)"
if [ -z "$HOSTINGER_USER_B64" ] || [ -z "$HOSTINGER_PASS_B64" ]; then
  echo "SMTP_USER ou SMTP_PASS absent du secret $SECRET : rien n'a été modifié." >&2
  exit 1
fi

PATCH=$(printf '{"data":{"SMTP_HOSTINGER_USER":"%s","SMTP_HOSTINGER_PASS":"%s","SMTP_MAILJET_USER":"%s","SMTP_MAILJET_PASS":"%s"}}' \
  "$HOSTINGER_USER_B64" "$HOSTINGER_PASS_B64" "$(encode "$MAILJET_API_KEY")" "$(encode "$MAILJET_SECRET_KEY")")

DRY_RUN_ARGS=()
[ "${DRY_RUN:-0}" = "1" ] && DRY_RUN_ARGS=(--dry-run=server)

# `${tableau[@]+...}` : un tableau vide ne doit pas faire échouer `set -u` sur les bash < 4.4.
RESULT="$("${K[@]}" patch secret "$SECRET" --type=merge ${DRY_RUN_ARGS[@]+"${DRY_RUN_ARGS[@]}"} -p "$PATCH" 2>&1)" || {
  echo "$RESULT" | grep -v metrics.k8s.io >&2
  echo "Échec du patch du secret $SECRET : rien n'a été modifié." >&2
  exit 1
}
echo "$RESULT" | grep -v metrics.k8s.io || true
if [ "${DRY_RUN:-0}" = "1" ]; then
  echo "Simulation réussie pour $SECRET ($NAMESPACE) : rien n'a été écrit."
else
  echo "Clés ajoutées à $SECRET ($NAMESPACE) : SMTP_HOSTINGER_USER, SMTP_HOSTINGER_PASS, SMTP_MAILJET_USER, SMTP_MAILJET_PASS"
fi
