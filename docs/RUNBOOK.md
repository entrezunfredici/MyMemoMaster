# Runbook d'exploitation — MyMemoMaster

> Ce document couvre les opérations courantes sur l'infrastructure VPS.
> Stack : Docker Compose + Traefik + PostgreSQL + Node.js API + Vue 3 (nginx)

---

## Prérequis VPS

- Docker 24+ et Docker Compose v2 installés
- Traefik en cours d'exécution avec le réseau externe `traefik_proxy` :
  ```sh
  docker network create traefik_proxy
  # Traefik doit exposer deux entrypoints :
  #   web      → port 80  (HTTP — requis pour la redirection automatique vers HTTPS)
  #   websecure → port 443 (HTTPS — avec certresolver=letsencrypt)
  # La redirection HTTP→HTTPS et les headers HSTS sont configurés via les labels
  # Docker Compose du projet — aucune modification de la config Traefik statique requise.
  ```
- DNS configurés : `FRONT_DOMAIN`, `API_DOMAIN`, `PGADMIN_DOMAIN` → IP du VPS

---

## Premier déploiement

### 1. Préparer les fichiers sur le VPS

```sh
mkdir -p /var/www/html/my_memo_master_prod
cd /var/www/html/my_memo_master_prod

# Copier le docker-compose.yml (fait automatiquement par le pipeline CD)
# Copier manuellement le .env depuis .env.example :
cp server_docker_compose/.env.example .env
nano .env   # remplir toutes les valeurs "change_me"
```

### 2. Vérifier la configuration

```sh
docker compose --env-file .env config -q
```

Si aucune erreur n'est affichée, la configuration est valide.

### 3. Démarrer les services

```sh
# PostgreSQL en premier (healthcheck garantit qu'il est prêt)
docker compose --env-file .env up -d postgres

# Vérifier que postgres est healthy
docker compose --env-file .env ps

# Lancer l'API, le front et PgAdmin
docker compose --env-file .env up -d pgadmin api front
```

### 4. Appliquer les migrations et les seeds

```sh
# Migrations Sequelize
docker compose --env-file .env exec api npx sequelize-cli db:migrate

# Seeds (rôles + user admin — une seule fois sur une base vide)
docker compose --env-file .env exec api npx sequelize-cli db:seed:all
```

### 5. Vérifier que tout est up

```sh
docker compose --env-file .env ps
```

---

## Mise à jour (déploiement continu)

Le pipeline CD (GitHub Actions) gère automatiquement la mise à jour à chaque push sur `main` (prod) ou `dev` (preprod). En cas de déploiement manuel :

```sh
cd /var/www/html/my_memo_master_prod

# Arrêter les services applicatifs (pas postgres — les données sont dans un volume)
docker compose --env-file .env stop api front pgadmin

# Tirer les nouvelles images
docker compose --env-file .env pull api front

# Redémarrer
docker compose --env-file .env up -d api front pgadmin

# Appliquer les nouvelles migrations si nécessaire
docker compose --env-file .env exec api npx sequelize-cli db:migrate
```

---

## Rollback

### Rollback applicatif (image précédente)

```sh
# Identifier le tag de l'image précédente sur DockerHub
# Modifier IMAGE_API et IMAGE_FRONT dans .env
nano .env

# Redéployer
docker compose --env-file .env pull api front
docker compose --env-file .env up -d api front
```

### Rollback de migration

```sh
# Annuler la dernière migration
docker compose --env-file .env exec api npx sequelize-cli db:migrate:undo

# Annuler toutes les migrations jusqu'à une version spécifique
docker compose --env-file .env exec api npx sequelize-cli db:migrate:undo:all --to 20260605000001-add-indexes.js
```

---

## Logs

```sh
# Logs en temps réel de tous les services
docker compose --env-file .env logs -f

# Logs d'un service spécifique
docker compose --env-file .env logs -f api
docker compose --env-file .env logs -f front
docker compose --env-file .env logs -f postgres

# 100 dernières lignes
docker compose --env-file .env logs --tail=100 api
```

---

## Sauvegarde et restauration PostgreSQL

### Service de sauvegarde automatique

Le service `backup` est inclus dans le `docker-compose.yml` et démarre automatiquement avec le pipeline CD.
Il exécute un `pg_dump` en format custom (`-Fc`) :
- **Au démarrage du conteneur** (vérification de config immédiate)
- **Quotidiennement à `BACKUP_HOUR`h00 UTC** (défaut : 3h00)

Les dumps sont stockés dans le volume Docker `backup-data` (`/backups` dans le conteneur).

```sh
# Vérifier que le service backup tourne
docker compose --env-file .env ps backup

# Consulter les logs du service backup
docker compose --env-file .env logs backup
docker compose --env-file .env logs --tail=50 backup

# Lancer un dump manuel immédiat (sans attendre le cycle planifié)
docker compose --env-file .env exec backup /bin/sh -c '
  PGPASSWORD="${PG_PASS}" pg_dump -h postgres -U "${PG_USER}" -Fc "${PG_DB}" \
    > /backups/mymemomaster_${ENVIRONMENT}_manual_$(date +"%Y%m%d_%H%M%S").dump
'

# Lister les dumps disponibles dans le volume
docker compose --env-file .env exec backup ls -lh /backups/
```

### Variables de configuration backup (dans `.env`)

| Variable | Défaut | Description |
|----------|--------|-------------|
| `BACKUP_HOUR` | `3` | Heure UTC du dump quotidien (0–23) |
| `BACKUP_RETENTION_DAYS` | `7` | Nombre de jours de rétention |

### Extraire un dump du volume vers le système hôte

```sh
# Identifier le conteneur backup
BACKUP_CONTAINER=$(docker compose --env-file .env ps -q backup)

# Copier tous les dumps vers /var/backups/my_memo_master/ sur le VPS
docker cp "${BACKUP_CONTAINER}:/backups/." /var/backups/my_memo_master/

# Ou copier un dump spécifique
docker cp "${BACKUP_CONTAINER}:/backups/mymemomaster_test_20260101_030000.dump" \
  /var/backups/mymemomaster_test_20260101_030000.dump
```

### Restaurer une sauvegarde

```sh
# Lister les dumps disponibles
docker compose --env-file .env exec backup ls -lh /backups/

# Restaurer (la base doit exister, les données actuelles seront écrasées)
DUMP_FILE=mymemomaster_test_20260101_030000.dump
PG_CONTAINER=$(docker compose --env-file .env ps -q postgres)

docker compose --env-file .env exec backup sh -c \
  "PGPASSWORD=\"\${PG_PASS}\" pg_restore -h postgres -U \"\${PG_USER}\" \
   -d \"\${PG_DB}\" --clean --if-exists /backups/${DUMP_FILE}"
```

### Sauvegarde manuelle hors Docker (script host)

Le script `scripts/backup.sh` permet un dump depuis le VPS host (hors Docker Compose) :

```sh
cd /var/www/html/my_memo_master_test
ENVIRONMENT=test PG_USER=postgres PG_DB=mymemomasterdb \
  bash /chemin/vers/scripts/backup.sh
```

Le dump est créé dans `/var/backups/my_memo_master/` au format pg_dump custom (`-Fc`).

---

## Commandes utiles

### Statut des services

```sh
docker compose --env-file .env ps
```

### Redémarrer un service

```sh
docker compose --env-file .env restart api
```

### Accéder à la console PostgreSQL

```sh
docker compose --env-file .env exec postgres psql -U postgres -d mymemomasterdb
```

### Vérifier la taille de la base

```sh
docker compose --env-file .env exec postgres psql -U postgres -c "\l+"
```

### Vider le cache Docker (images inutilisées)

```sh
docker image prune -f
docker volume prune -f   # ATTENTION : ne pas exécuter avec des volumes de données actifs
```

### Lister les volumes et leur taille

```sh
docker system df -v
```

---

## Variables d'environnement critiques

| Variable | Description | Valeur prod |
|----------|-------------|-------------|
| `AUTH_JWT_SECRET` | Clé de signature JWT | Secret long aléatoire |
| `PG_PASS` | Mot de passe PostgreSQL | Secret fort |
| `ADMIN_SEED_PASSWORD` | Mot de passe du compte admin initial | À changer après premier login |
| `API_BYPASS_AUTH` | Désactive l'auth JWT | `false` impératif en prod |
| `ENVIRONMENT` | Nom de l'environnement | `prod` ou `preprod` |

---

## Accès PgAdmin

URL : `https://${PGADMIN_DOMAIN}`
Identifiants : `PGADMIN_DEFAULT_EMAIL` / `PGADMIN_DEFAULT_PASSWORD` du `.env`

Connexion au serveur dans PgAdmin :
- **Host** : `postgres` (nom du service dans le réseau Docker)
- **Port** : `5432`
- **Database** : valeur de `PG_DB`
- **Username** : valeur de `PG_USER`
- **Password** : valeur de `PG_PASS`

---

## Surveillance

### Vérifier la santé des conteneurs

```sh
docker inspect --format='{{.Name}} → {{.State.Health.Status}}' \
  $(docker compose --env-file .env ps -q)
```

### Vérifier l'espace disque

```sh
df -h
du -sh /var/backups/my_memo_master/
```

---

## Contacts et ressources

- Documentation API : `https://${API_DOMAIN}/api-docs`
- Schéma BDD : `diagrams/schema_bdd.md`
- Algo Leitner : `diagrams/leitner_algo.md`
- Règles Calendrier : `diagrams/calendar_rules.md`
