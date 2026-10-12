# Runbook — Migration vers le cluster à control plane partagé

> **Périmètre** : bascule de la prod et de la preprod du cluster dédié `pck-dkoyol2` vers le cluster `pck-uuvuwp7` (2 × A4-Ram8-Disk20-Perf1, zone `az-3`).
> Contexte et dimensionnement : [.agents/DECISIONS.md](../.agents/DECISIONS.md) (entrées du 2026-10-02 et du 2026-10-12). Procédure Helm générale : [MANUEL_DEPLOIEMENT_KUBERNETES.md](MANUEL_DEPLOIEMENT_KUBERNETES.md).

Kubeconfigs : ancien `~/.kube/config` (contexte `kubernetes-admin@pck-dkoyol2`), nouveau `C:/Users/supoe/Downloads/pck-uuvuwp7-kubeconfig`. **Toujours passer `--kubeconfig` explicitement** : le contexte par défaut est l'ancien cluster.

```sh
OLD=~/.kube/config
NEW=/c/Users/supoe/Downloads/pck-uuvuwp7-kubeconfig
```

## ⚠️ Incident du 2026-10-12 : collision de nom de LoadBalancer entre les deux clusters (cause trouvée)

L'installation d'`ingress-nginx` sur le nouveau cluster a obtenu **la même IP de LoadBalancer** (`83.228.249.190`) que l'ancien. L'IP a été prise à l'ancien LoadBalancer et la prod a répondu 525 puis 523 (Cloudflare). **Conséquence : dès que le nouveau cluster expose un LoadBalancer, il reçoit le trafic de la prod.** Ne créer le LoadBalancer du nouveau cluster qu'au moment de basculer, c'est-à-dire **après** l'étape 3. Le DNS Cloudflare n'est pas modifié tant que le LoadBalancer reprend cette IP.

## État au 2026-10-12

| Élément | État |
|---|---|
| cert-manager v1.21.1 sur le nouveau cluster | ✅ installé |
| ClusterIssuers `letsencrypt-{prod,staging}-cloudflare` + Secret `cloudflare-api-token` | ✅ copiés |
| PriorityClasses `mmm-prod`, `mmm-preprod` | ✅ créées |
| Namespaces + Secrets `mmm-prod-secrets`, `mmm-preprod-secrets` | ✅ copiés depuis l'ancien cluster |
| Dumps `backups-local/migration/prod.dump` (169 Ko), `preprod.dump` (173 Ko) | ✅ faits, non commités |
| Chart prod : volume Postgres 20 Gi → 5 Gi (`values-prod.yaml`) | ✅ modifié, `helm lint` OK |
| ingress-nginx sur le nouveau cluster | ❌ **désinstallé volontairement** (voir incident) |
| metrics-server sur le nouveau cluster | ⚠️ installé mais en échec (même erreur de SAN des kubelets) |
| Déploiement Helm prod / preprod | ❌ à faire (étapes 1 à 5) |

## 1. Déployer la prod avec API et front à 0 réplica

```sh
helm upgrade --install mmm-prod ./helm -f helm/values-prod.yaml \
  -n mymemomaster --kubeconfig $NEW \
  --set replicas.api=0 --set replicas.front=0 --wait --timeout 6m
kubectl --kubeconfig $NEW get pods,pvc -n mymemomaster   # postgres-0, redis-0, prometheus-0 Running
```

## 2. Restaurer les données

Les dumps sont en format custom (`-Fc`). Base : `mymemomasterdb`, utilisateur `postgres`.

```sh
export MSYS_NO_PATHCONV=1
kubectl --kubeconfig $NEW exec -i -n mymemomaster mmm-prod-postgres-0 -- \
  sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' < backups-local/migration/prod.dump
# Contrôle : mêmes comptages que sur l'ancienne prod (2 utilisateurs, 79 migrations au 2026-10-12)
kubectl --kubeconfig $NEW exec -n mymemomaster mmm-prod-postgres-0 -- \
  sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "select count(*) from \"User\"" -c "select count(*) from \"SequelizeMeta\""'
```

## 3. Monter l'API et le front, vérifier sans trafic public

```sh
helm upgrade --install mmm-prod ./helm -f helm/values-prod.yaml \
  -n mymemomaster --kubeconfig $NEW --wait --timeout 8m
kubectl --kubeconfig $NEW get pods -n mymemomaster -o wide      # 2 API + 2 front Running, un par nœud
kubectl --kubeconfig $NEW port-forward -n mymemomaster svc/mmm-prod-api 8080:80 &
curl -s localhost:8080/api/v1/health                             # 200
kubectl --kubeconfig $NEW get certificate -n mymemomaster        # READY=True (DNS01, sans trafic)
```

## 4. Basculer : installer ingress-nginx sur le nouveau cluster

C'est cette étape qui détourne le trafic de la prod vers le nouveau cluster (même IP d'origine).

```sh
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx -n ingress-nginx --create-namespace \
  --version 4.15.1 -f k8s/ingress-nginx-values.yaml --kubeconfig $NEW --wait --timeout 8m
kubectl --kubeconfig $NEW get svc -n ingress-nginx ingress-nginx-controller   # EXTERNAL-IP attendu : 83.228.249.190
curl -s -o /dev/null -w "%{http_code}\n" https://app.my-memo-master.com
curl -s -o /dev/null -w "%{http_code}\n" https://api.my-memo-master.com/api/v1/health
```

Si l'IP obtenue est **différente**, mettre à jour les enregistrements A (`app`, `api`, `preprod`, `preprod-api`, `preprod-pgadmin`) dans Cloudflare.

## 5. Preprod (optionnelle, ≈ 1,35 Gi de requests)

Même procédure avec `values-preprod.yaml`, `-n mymemomaster-preprod`, release `mmm-preprod`, dump `preprod.dump`. À ne démarrer que si le besoin existe (coût / RAM).

## 6. Après la bascule

1. Mettre à jour les secrets GitHub `KUBECONFIG_PROD` et `KUBECONFIG_PREPROD` (kubeconfig du nouveau cluster, encodé en base64 — voir README partie 3). Tant qu'ils pointent sur l'ancien cluster, un push redéploie l'ancien.
2. Réinstaller le metrics-server avec `--kubelet-insecure-tls` si on veut `kubectl top` (même défaut de SAN que sur l'ancien cluster).
3. Surveiller 48 h, puis détruire l'ancien cluster et **supprimer à la main les volumes Cinder `Retain`** dans le manager Infomaniak (volumes SonarQube et ancienne prod), sinon ils restent facturés.
4. Rejouer `load-tests/api-load.js` et `load-tests/grading-load.js` sur la preprod du nouveau cluster (`RATE_LIMIT_DISABLED=true`), puis seulement ajuster les requests de l'API (≈ 500 Mi mesurés pour 896 Mi demandés).

## Retour arrière

Tant que l'ancien cluster n'est pas détruit : `helm uninstall ingress-nginx -n ingress-nginx --kubeconfig $NEW`, puis forcer la resynchronisation du LoadBalancer de l'ancien cluster (`kubectl --kubeconfig $OLD -n ingress-nginx annotate svc ingress-nginx-controller resync=$(date +%s) --overwrite`). Lors de l'incident du 2026-10-12, la désinstallation seule n'a **pas** suffi à rendre l'IP à l'ancien LoadBalancer (réponse 523 persistante) : prévoir de vérifier l'association de l'IP dans le manager Infomaniak.


## Cause de l'incident et état au 2026-10-12 (soir)

Les deux clusters sont nommés `kubernetes` et exposaient `ingress-nginx/ingress-nginx-controller` : même nom de LoadBalancer OpenStack. Le nouveau cluster a repris puis supprimé le LB de l'ancien (Octavia : `404 not found`). Réparation : retrait des annotations `loadbalancer.openstack.org/load-balancer-id` et `-address` sur le service de l'ancien cluster (LB recréé, IP `83.228.248.18`) ; sur le nouveau cluster, ingress-nginx est installé avec `fullnameOverride=ingress-nginx-v2` (IP `83.228.248.132`). La nouvelle prod est déployée, restaurée (46 tables identiques) et répond en direct ; **reste le changement DNS Cloudflare** des A `app`/`api` vers `83.228.248.132`.
