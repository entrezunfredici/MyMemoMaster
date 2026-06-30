{{/*
  Nom du Secret K8s créé manuellement (mots de passe, clés JWT, SMTP…)
  Défaut : {{ .Release.Name }}-secrets  (ex: mmm-preprod-secrets)
*/}}
{{- define "mmm.secretName" -}}
{{- .Values.secretName | default (printf "%s-secrets" .Release.Name) -}}
{{- end }}

{{/*
  Nom du ConfigMap géré par le chart.
*/}}
{{- define "mmm.configName" -}}
{{- printf "%s-config" .Release.Name -}}
{{- end }}

{{/*
  Labels communs appliqués à toutes les ressources.
*/}}
{{- define "mmm.labels" -}}
app.kubernetes.io/name: mymemomaster
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
  Image complète de l'API.
*/}}
{{- define "mmm.imageApi" -}}
{{- printf "%s/%s:%s" .Values.dockerhubUsername .Values.image.api.name .Values.image.api.tag -}}
{{- end }}

{{/*
  Image complète du frontend.
*/}}
{{- define "mmm.imageFront" -}}
{{- printf "%s/%s:%s" .Values.dockerhubUsername .Values.image.front.name .Values.image.front.tag -}}
{{- end }}
