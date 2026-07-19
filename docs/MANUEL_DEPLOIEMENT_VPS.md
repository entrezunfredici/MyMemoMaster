# Manuel de déploiement — VPS (environnement de test)

> **Périmètre** : déploiement de l'environnement **test** sur un VPS, via Docker Compose et Traefik.
> Branche git : `dev` · Fichier de déploiement : [docker-compose.yml](../docker-compose.yml) (compose unifié, profil `test`) · Déploiement automatisé par [.github/workflows/cd.yml](../.github/workflows/cd.yml) (job `deploy_test`).
> Pour les environnements preprod/prod (Kubernetes + Helm), voir [MANUEL_DEPLOIEMENT_KUBERNETES.md](MANUEL_DEPLOIEMENT_KUBERNETES.md).
> Pour l'exploitation au quotidien (logs, sauvegardes, restauration, rollback), voir le [RUNBOOK.md](RUNBOOK.md).

---

## 1. Architecture déployée

Le VPS héberge l'ensemble de la stack derrière un reverse-proxy Traefik (déjà présent sur la machine, mutualisé entre projets) :

| Service | Image | Rôle | Exposition |
|---|---|---|---|
| `postgres` | postgres | Base de données | Réseau Docker interne uniquement |
| `redis` | redis | Broker BullMQ (rappels, notifications) | Réseau interne uniquement |
| `api_server` | `fredissimo/mymemomaster_test_api:latest` | API Express | `https://${API_DOMAIN}` via Traefik |
| `front_server` | `fredissimo/mymemomaster_test_front:latest` | Front Vue 3 servi par nginx | `https://${FRONT_DOMAIN}` via Traefik |
| `pgadmin_server` | pgadmin | Administration BDD | `https://${PGADMIN_DOMAIN}` via Traefik |
| `backup` | postgres (client) | `pg_dump` quotidien (3h00 UTC par défaut) | Aucune |

Choix opérés :
- **HTTPS terminé par Traefik** (certificats Let's Encrypt via certresolver) ; la redirection HTTP→HTTPS et les headers HSTS sont posés par les labels Docker du compose — la configuration statique de Traefik n'est pas modifiée par le projet. Détail de la mise en place TLS : [https-setup.md](https-setup.md).
- **Migrations et seeds automatiques au démarrage** : l'entrypoint de l'API ([my_memo_master_api/entrypoint.sh](../my_memo_master_api/entrypoint.sh)) exécute `sequelize-cli db:migrate`, les seeds idempotents (rôles, user admin) et la resynchronisation des séquences PostgreSQL avant de lancer le serveur. Un déploiement ne demande donc **aucune étape manuelle de migration** dans le cas nominal.
- **Healthchecks en chaîne** : l'API expose `GET /api/v1/health` (vérifie aussi la connexion DB) ; le compose conditionne le démarrage des services dépendants sur l'état `healthy`, et le pipeline CD s'appuie sur ce même statut pour valider le déploiement.
- **Limites de ressources par service** (CPU/mémoire) paramétrées dans le `.env` — défauts raisonnables fournis, à adapter à la capacité du VPS.

## 2. Prérequis

1. **VPS** avec Docker 24+ et Docker Compose v2.
2. **Traefik opérationnel** avec le réseau externe partagé et deux entrypoints (`web` → 80, `websecure` → 443 avec certresolver Let's Encrypt) :
   ```sh
   docker network create traefik_proxy
   ```
3. **DNS** : `FRONT_DOMAIN`, `API_DOMAIN`, `PGADMIN_DOMAIN` pointés vers l'IP du VPS (ex. `test.my-memo-master.com`, `test-api.my-memo-master.com`, `test-pgadmin.my-memo-master.com`).
4. **Images Docker Hub** publiées — c'est le rôle du job `push_images` du CD ; pour un premier déploiement avant tout passage du pipeline, pousser les images manuellement ou lancer le CD une fois.

## 3. Préparation initiale du VPS (une seule fois)

### 3.1 Créer le répertoire et le fichier d'environnement

```sh
mkdir -p /var/www/html/my_memo_master_test
cd /var/www/html/my_memo_master_test
# Copier .env.test.example du dépôt vers .env, puis remplir :
nano .env
```

Le template commenté est [.env.test.example](../.env.test.example). Règles :

- **`COMPOSE_PROFILES=test` obligatoire** — le compose déployé est le fichier unifié dev/test du dépôt ; ce profil active les services VPS (`api_server`, `front_server`, `pgadmin_server`, `backup`) pour les commandes lancées manuellement (le pipeline CD force de son côté `--profile test`).
- **`ENVIRONMENT=test` obligatoire** — le pipeline CD vérifie cette valeur avant de déployer et refuse tout autre contenu (garde-fou contre un déploiement sur la mauvaise machine).
- Remplacer toutes les valeurs `change_me` : `PG_PASS`, `AUTH_JWT_SECRET` (secret long aléatoire), `ADMIN_SEED_PASSWORD`, identifiants SMTP, `PGADMIN_DEFAULT_PASSWORD`.
- `API_BYPASS_AUTH=false` impératif.
- **Ne jamais committer ce `.env`** — il contient les secrets réels.

### 3.2 Valider la configuration

```sh
docker compose --env-file .env config -q   # aucune sortie = configuration valide
```

## 4. Premier déploiement manuel

```sh
cd /var/www/html/my_memo_master_test

# 1. Données d'abord (les healthchecks garantissent l'ordre)
docker compose --env-file .env up -d postgres redis

# 2. Applicatif (l'entrypoint API applique migrations + seeds automatiquement)
docker compose --env-file .env up -d pgadmin_server api_server front_server backup

# 3. Vérifier
docker compose --env-file .env ps          # tous les services healthy/running
curl -fsS https://${API_DOMAIN}/api/v1/health
```

## 5. Déploiement continu (cas nominal)

Chaque push sur la branche `dev` dont le CI est vert déclenche le job `deploy_test` de [cd.yml](../.github/workflows/cd.yml), qui :

1. **Valide la syntaxe** du docker-compose racine (profil `test`, avec le template `.env.test.example`) avant de toucher au serveur ;
2. Se connecte au VPS en SSH (secrets `SSH_TEST_PRIVATE_KEY`, `SSH_TEST_USERNAME`, `VPS_IP`, `VPS_PORT`) ;
3. Arrête l'environnement (`docker compose down` — les données restent dans les volumes) ;
4. **Téléverse le nouveau `docker-compose.yml`** (le `.env` du serveur n'est jamais touché) ;
5. **Valide le `.env` serveur** : présence du fichier et `ENVIRONMENT=test`, sinon échec explicite ;
6. Tire les nouvelles images (`pull`), redémarre (`up -d`), puis **boucle de vérification santé** : jusqu'à 24 tentatives espacées de 5 s sur l'état `healthy` de postgres/api_server/front_server — en cas d'échec, le job dump `compose ps` + les 100 dernières lignes de logs et sort en erreur ;
7. Une notification Discord (✅/❌) est envoyée quel que soit le résultat (job `notify`).

Les secrets GitHub Actions à configurer sont listés dans le [README.md](../README.md) (partie 3, « Secrets GitHub Actions à configurer »).

## 6. Mise à jour manuelle (secours) et rollback

Si le pipeline est indisponible, la procédure manuelle et le rollback (retour à une image antérieure, annulation de migration) sont documentés dans le [RUNBOOK.md](RUNBOOK.md), sections « Mise à jour », « Rollback » et « Sauvegarde et restauration PostgreSQL ». En résumé :

```sh
docker compose --env-file .env stop api_server front_server pgadmin_server
docker compose --env-file .env pull api_server front_server
docker compose --env-file .env up -d api_server front_server pgadmin_server
```

Rollback : modifier `IMAGE_API` / `IMAGE_FRONT` dans le `.env` vers le tag précédent, `pull` puis `up -d` ; `npx sequelize-cli db:migrate:undo` pour annuler une migration.

## 7. Vérifications post-déploiement

| Vérification | Commande / URL |
|---|---|
| Conteneurs healthy | `docker compose --env-file .env ps` |
| Santé API (inclut la DB) | `https://${API_DOMAIN}/api/v1/health` |
| Front accessible | `https://${FRONT_DOMAIN}` |
| Certificats TLS émis | le navigateur ne présente aucun avertissement |
| Sauvegarde active | `docker compose --env-file .env logs --tail=20 backup` |
| Logs applicatifs | `docker compose --env-file .env logs -f api_server` |
