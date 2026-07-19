# Manuel de déploiement — Kubernetes (preprod et prod)

> **Périmètre** : déploiement des environnements **preprod** (cluster Infomaniak mutualisé) et **prod** (cluster Infomaniak dédié) via **Helm**.
> Branches git : `staging` → preprod · `main` → prod · Chart : [helm/](../helm/) · Déploiement automatisé par [.github/workflows/cd.yml](../.github/workflows/cd.yml) (jobs `deploy_preprod` / `deploy_prod`).
> Pour l'environnement de test (VPS Docker Compose), voir [MANUEL_DEPLOIEMENT_VPS.md](MANUEL_DEPLOIEMENT_VPS.md).

> ⚠️ **Note historique** : les manifests bruts [k8s/preprod/](../k8s/preprod/) et [k8s/prod/](../k8s/prod/) sont conservés en référence mais **ne sont plus appliqués par le CD** depuis la migration vers Helm (décision du 2026-06-30, [.agents/DECISIONS.md](../.agents/DECISIONS.md)). Toute modification de déploiement passe par le chart `helm/`.

---

## 1. Architecture déployée

Un seul chart Helm sert les deux environnements ; les différences sont portées par les fichiers de valeurs :

| Fichier | Rôle |
|---|---|
| [helm/values.yaml](../helm/values.yaml) | Base commune : config applicative, ressources CPU/mémoire, domaines et images vides (à surcharger) |
| [helm/values-preprod.yaml](../helm/values-preprod.yaml) | Surcharges preprod : images `mymemomaster_preprod_*`, domaines `preprod*.my-memo-master.com`, Redis **éphémère** (Deployment sans PVC), PgAdmin **activé** |
| [helm/values-prod.yaml](../helm/values-prod.yaml) | Surcharges prod : images `mymemomaster_*`, domaines `my-memo-master.com`, Redis **persistant** (StatefulSet + PVC), PgAdmin désactivé |

Composants déployés par le chart ([helm/templates/](../helm/templates/)) :

| Composant | Type K8s | Notes |
|---|---|---|
| PostgreSQL | StatefulSet + PVC (5 Gi) | Données persistées |
| Redis | Deployment (preprod) **ou** StatefulSet + PVC (prod) selon `redis.persistent` | Broker BullMQ |
| API | Deployment | Migrations/seeds automatiques à chaque démarrage de pod (entrypoint) |
| Front | Deployment | nginx + config runtime injectée (`window.__APP_CONFIG__`) |
| PgAdmin | Deployment (optionnel, `pgadmin.enabled`) | Activé en preprod uniquement |
| Ingress | Ingress nginx + TLS cert-manager | Un host par domaine (`domain.api` / `domain.front` / `domain.pgadmin`) |

Ségrégation configuration / secrets :
- **ConfigMap** (générée par le chart depuis `config:` des values) : variables **non sensibles**, versionnées dans git ;
- **Secret K8s** (`mmm-preprod-secrets` / `mmm-prod-secrets`) : créé **manuellement sur le cluster, jamais committé** — mots de passe DB, secret JWT, identifiants SMTP, S3. Le nom par défaut est `{release}-secrets` (voir [helm/templates/_helpers.tpl](../helm/templates/_helpers.tpl)).

## 2. Prérequis

1. **Outils** : `kubectl` et Helm ≥ 3.16 (version utilisée par le CD).
2. **Kubeconfig Infomaniak** : manager.infomaniak.com → Public Cloud → Kubernetes → cluster → onglet Accès → « Télécharger le kubeconfig ». Vérifier : `kubectl --kubeconfig=<fichier> cluster-info`.
3. **cert-manager installé sur le cluster**, puis les ressources d'émission de certificats du dépôt :
   ```sh
   kubectl apply -f k8s/cert-manager/cloudflare-secret.yml       # token API Cloudflare (non committé — voir .example)
   kubectl apply -f k8s/cert-manager/cluster-issuer-cloudflare.yml  # ClusterIssuers Let's Encrypt (challenge DNS01)
   ```
4. **DNS Cloudflare** : les domaines de l'environnement pointés vers l'IP du LoadBalancer/Ingress du cluster.
5. **Images Docker Hub** publiées par le job `push_images` du CD.

## 3. Premier déploiement d'un environnement

### 3.1 Cas particulier — cluster ayant déjà reçu des `kubectl apply`

Si l'environnement a été déployé historiquement avec les manifests bruts, Helm refusera d'adopter des ressources qu'il ne gère pas. Exécuter **une seule fois** le script d'adoption ([k8s/helm-migrate.sh](../k8s/helm-migrate.sh)) qui pose les annotations `meta.helm.sh/*` et le label `managed-by=Helm` sur les ressources existantes, **sans interruption de service** :

```sh
bash k8s/helm-migrate.sh preprod   # ou : prod
```

### 3.2 Créer le Secret applicatif (une seule fois par cluster)

```sh
# preprod (namespace mymemomaster-preprod) — adapter pour prod (release mmm-prod, namespace mymemomaster)
kubectl create secret generic mmm-preprod-secrets \
  --namespace mymemomaster-preprod \
  --from-literal=PG_USER=postgres \
  --from-literal=PG_PASS=<mot_de_passe_fort> \
  --from-literal=AUTH_JWT_SECRET=<secret_aléatoire_long> \
  --from-literal=SMTP_USER=<email_smtp> \
  --from-literal=SMTP_PASS=<mot_de_passe_smtp> \
  --from-literal=S3_ACCESS_KEY=<clé_s3> \
  --from-literal=S3_SECRET_KEY=<secret_s3> \
  --from-literal=REDIS_PASS= \
  --from-literal=PGADMIN_DEFAULT_PASSWORD=<mot_de_passe>
```

### 3.3 Déployer avec Helm

```sh
# preprod
helm upgrade --install mmm-preprod ./helm \
  -f helm/values-preprod.yaml \
  -n mymemomaster-preprod \
  --create-namespace \
  --atomic --timeout 5m

# prod
helm upgrade --install mmm-prod ./helm \
  -f helm/values-prod.yaml \
  -n mymemomaster \
  --create-namespace \
  --atomic --timeout 8m
```

`--atomic` : si le déploiement n'atteint pas l'état sain dans le délai, Helm **annule et restaure automatiquement** la révision précédente — un déploiement raté ne laisse jamais l'environnement dans un état intermédiaire.

## 4. Déploiement continu (cas nominal)

Chaque push sur `staging` (preprod) ou `main` (prod) dont le CI est vert déclenche le job Helm correspondant de [cd.yml](../.github/workflows/cd.yml) :

1. Le kubeconfig est reconstruit depuis le secret GitHub (`KUBECONFIG_PREPROD` / `KUBECONFIG_PROD`, encodé base64 — procédure d'encodage dans le [README.md](../README.md) partie 3) ;
2. `helm upgrade --install` est exécuté avec le fichier de valeurs de l'environnement et `--set rolloutTimestamp=$(date +%s)` — cette astuce force un **rolling update à chaque push** même si le tag d'image (`:latest`) n'a pas changé ;
3. `--atomic` garantit le rollback automatique en cas d'échec ;
4. Notification Discord ✅/❌ en fin de pipeline.

**Activation de la prod** : le job `deploy_prod` ne s'exécute que si la variable GitHub Actions `K8S_PROD_ENABLED=true` est définie (Settings → Variables) — garde-fou tant que le cluster dédié n'est pas prêt.

## 5. Modifier la configuration d'un environnement

- **Variable non sensible** : éditer `config:` dans `helm/values-<env>.yaml` puis merger sur la branche de l'environnement — le CD applique.
- **Secret** : `kubectl edit secret mmm-<env>-secrets -n <namespace>` (valeurs en base64) puis redémarrer les pods concernés (`kubectl rollout restart deployment mmm-<env>-api -n <namespace>`), ou recréer le secret.
- **Ressources / répliques / composants** : mêmes fichiers de valeurs (`resources`, `replicas`, `pgadmin.enabled`, `redis.persistent`).

## 6. Rollback

```sh
helm history mmm-preprod -n mymemomaster-preprod     # lister les révisions
helm rollback mmm-preprod <révision> -n mymemomaster-preprod
```

En complément : `--atomic` couvre le cas du déploiement raté (rollback automatique) ; `helm rollback` couvre le cas du déploiement réussi mais fonctionnellement défectueux. Pour revenir aussi sur une migration de schéma : `kubectl exec` dans un pod API puis `npx sequelize-cli db:migrate:undo` (voir [RUNBOOK.md](RUNBOOK.md) pour la logique, identique au VPS).

## 7. Vérifications post-déploiement

```sh
helm status mmm-preprod -n mymemomaster-preprod
kubectl get pods -n mymemomaster-preprod            # tous Running/Ready
kubectl get ingress -n mymemomaster-preprod
kubectl get certificate -n mymemomaster-preprod     # READY=True (cert-manager)
kubectl logs -n mymemomaster-preprod deploy/mmm-preprod-api --tail=50
```

Puis en HTTP : `https://preprod-api.my-memo-master.com/api/v1/health` (santé API + DB) et le front `https://preprod.my-memo-master.com`.

## 8. Correspondance environnements

| | preprod | prod |
|---|---|---|
| Branche git | `staging` | `main` |
| Cluster Infomaniak | mutualisé | dédié |
| Release Helm | `mmm-preprod` | `mmm-prod` |
| Namespace | `mymemomaster-preprod` | `mymemomaster` |
| Values | `helm/values-preprod.yaml` | `helm/values-prod.yaml` |
| Images | `fredissimo/mymemomaster_preprod_{api,front}` | `fredissimo/mymemomaster_{api,front}` |
| Domaines | `preprod[-api\|-pgadmin].my-memo-master.com` | `[api.]my-memo-master.com` |
| Redis | éphémère (Deployment) | persistant (StatefulSet + PVC) |
| PgAdmin | activé | désactivé |
| Timeout Helm | 5 min | 8 min |
