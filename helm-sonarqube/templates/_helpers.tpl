{{/*
  Nom du Secret K8s créé MANUELLEMENT sur le cluster (jamais committé).
  Même convention que le chart applicatif : {{ .Release.Name }}-secrets
  Clés attendues : PG_USER, PG_PASS
*/}}
{{- define "sq.secretName" -}}
{{- .Values.secretName | default (printf "%s-secrets" .Release.Name) -}}
{{- end }}

{{/*
  Nom du ConfigMap géré par le chart.
*/}}
{{- define "sq.configName" -}}
{{- printf "%s-config" .Release.Name -}}
{{- end }}

{{/*
  Labels communs appliqués à toutes les ressources.
*/}}
{{- define "sq.labels" -}}
app.kubernetes.io/name: sonarqube
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
  Nom du Service PostgreSQL — utilisé dans l'URL JDBC.
*/}}
{{- define "sq.postgresService" -}}
{{- printf "%s-postgres" .Release.Name -}}
{{- end }}
