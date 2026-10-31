#!/usr/bin/env bash
# Ajoute au secret applicatif les identifiants des providers SMTP du basculement
# (helm/values.yaml : SMTP_PROVIDERS). À lancer AVANT de déployer un chart qui référence ces providers.
#
# Clés écrites, selon les variables d'environnement fournies (aucune valeur n'est affichée) :
#   - SMTP_INFOMANIAK_USER / _PASS : INFOMANIAK_SMTP_USER / INFOMANIAK_SMTP_PASS (adresse de la boîte et
#                                    mot de passe d'appareil Infomaniak)
#   - SMTP_MAILJET_USER / _PASS    : MAILJET_API_KEY / MAILJET_SECRET_KEY (facultatif, ignoré si absent)
#   - SMTP_HOSTINGER_USER / _PASS  : copiés depuis SMTP_USER / SMTP_PASS du secret, seulement s'ils
#                                    n'existent pas encore (facultatif, HOSTINGER=1 pour forcer la copie)
#
# Usage :
#   export INFOMANIAK_SMTP_USER=support@my-memo-master.com INFOMANIAK_SMTP_PASS=...
#   DRY_RUN=1 bash k8s/smtp-providers-secrets.sh preprod   # simulation côté serveur, rien n'est écrit
#   bash k8s/smtp-providers-secrets.sh preprod             # puis prod
#
# Le patch en `data` ne remplace que les clés listées : les autres variables du secret ne sont pas touchées.
# Cluster : voir « Accès aux environnements » de .agents/CONVENTIONS.md.
set -euo pipefail

ENVIRONMENT="${1:-}"
case "$ENVIRONMENT" in
  preprod) NAMESPACE="mymemomaster-preprod"; SECRET="mmm-preprod-secrets" ;;
  prod)    NAMESPACE="mymemomaster";          SECRET="mmm-prod-secrets" ;;
  *) echo "Usage : $0 preprod|prod" >&2; exit 1 ;;
esac

: "${INFOMANIAK_SMTP_USER:?INFOMANIAK_SMTP_USER doit être défini dans l'environnement}"
: "${INFOMANIAK_SMTP_PASS:?INFOMANIAK_SMTP_PASS doit être défini dans l'environnement}"

KUBECONFIG_FILE="${KUBECONFIG_FILE:-k8s/kubeconfig/pck-uuvuwp7-kubeconfig}"
K=(kubectl --kubeconfig "$KUBECONFIG_FILE" --request-timeout=20s -n "$NAMESPACE")

read_key() { "${K[@]}" get secret "$SECRET" -o "jsonpath={.data.$1}"; }
encode() { printf '%s' "$1" | base64 | tr -d '\n'; }

ENTRIES=()
KEYS=()
add_entry() { ENTRIES+=("\"$1\":\"$2\""); KEYS+=("$1"); }

add_entry SMTP_INFOMANIAK_USER "$(encode "$INFOMANIAK_SMTP_USER")"
add_entry SMTP_INFOMANIAK_PASS "$(encode "$INFOMANIAK_SMTP_PASS")"

if [ -n "${MAILJET_API_KEY:-}" ] && [ -n "${MAILJET_SECRET_KEY:-}" ]; then
  add_entry SMTP_MAILJET_USER "$(encode "$MAILJET_API_KEY")"
  add_entry SMTP_MAILJET_PASS "$(encode "$MAILJET_SECRET_KEY")"
fi

if [ "${HOSTINGER:-0}" = "1" ] || [ -z "$(read_key SMTP_HOSTINGER_USER)" ]; then
  HOSTINGER_USER_B64="$(read_key SMTP_USER)"
  HOSTINGER_PASS_B64="$(read_key SMTP_PASS)"
  if [ -n "$HOSTINGER_USER_B64" ] && [ -n "$HOSTINGER_PASS_B64" ]; then
    add_entry SMTP_HOSTINGER_USER "$HOSTINGER_USER_B64"
    add_entry SMTP_HOSTINGER_PASS "$HOSTINGER_PASS_B64"
  fi
fi

PATCH="{\"data\":{$(IFS=,; echo "${ENTRIES[*]}")}}"

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
  echo "Simulation réussie pour $SECRET ($NAMESPACE) : rien n'a été écrit. Clés concernées : ${KEYS[*]}"
else
  echo "Clés ajoutées à $SECRET ($NAMESPACE) : ${KEYS[*]}"
fi
