# MCO — Mise à jour des dépendances et supervision (Bloc 4 / A4.1)

> Livrable de certification — compétences C4.1.1 et C4.1.2.
> Décrit le processus de mise à jour des dépendances logicielles et le système
> de supervision/alerte de MyMemoMaster, tels qu'implémentés dans le projet.

---

## 1. Processus de mise à jour des dépendances (C4.1.1)

### 1.1 Périmètre

| Périmètre | Contenu | Fichiers |
|-----------|---------|----------|
| API | Express 4, Sequelize 6, BullMQ, bcryptjs, jsonwebtoken… | `my_memo_master_api/package.json` |
| Front | Vue 3, Vite, Pinia, Axios, MathLive… | `my_memo_master_front/package.json` |
| Images Docker | Node 22 (API), nginx (front), PostgreSQL, Redis | `Dockerfile` de chaque module, `docker-compose.yml` |
| Infrastructure CI | Actions GitHub (checkout, setup-node, build-push…) | `.github/workflows/*.yml` |

Toute nouvelle dépendance doit figurer dans la liste approuvée de
`.agents/CONVENTIONS.md` — l'ajout non signalé est interdit par les règles projet.

### 1.2 Fréquence et type de mise à jour

Le processus combine un **garde-fou automatique continu** et des **mises à jour
manuelles maîtrisées** :

- **À chaque push (automatique, bloquant)** — le job `test_and_lint` du pipeline
  CI (`.github/workflows/ci.yml`) exécute :

  ```sh
  npm audit --omit=dev --audit-level=high
  ```

  Le build **échoue** si une dépendance de *production* présente une
  vulnérabilité connue de sévérité `high` ou `critical` (contrôle OWASP A06 —
  composants vulnérables). Les `devDependencies` sont exclues car elles
  n'entrent pas dans les images déployées.

- **Correctifs de sécurité (manuel, dès détection)** — quand l'audit remonte des
  vulnérabilités, une branche dédiée applique `npm audit fix`, les suites de
  tests valident la non-régression, puis le pipeline CI/CD redéploie.

- **Montées de version fonctionnelles (manuel, au besoin)** — évaluées au cas
  par cas : lecture du changelog de la lib, impact sur les décisions
  documentées (`.agents/DECISIONS.md`), exécution des tests API + front + lint
  avant merge.

Le choix **manuel avec garde-fou automatique** (plutôt qu'un bot type Dependabot
en auto-merge) est délibéré : chaque mise à jour est validée par les suites de
tests et évaluée pour son impact, tandis que le CI garantit qu'aucune
vulnérabilité haute ne peut être déployée silencieusement.

### 1.3 Procédure type

1. Créer une branche `dev_back_*` ou `dev_front_*` (les branches partent de `dev`).
2. `npm audit` / `npm outdated` pour établir l'état.
3. Appliquer la mise à jour (`npm audit fix`, ou montée de version ciblée).
4. Exécuter localement `npm run test` et `npm run lint`.
5. Push → le CI rejoue tests + lint + audit ; en cas d'échec, notification Discord immédiate.
6. Merge sur `dev` → le CD reconstruit les images Docker et redéploie l'environnement de test.

### 1.4 Exemple réel — correctif du 2026-06-10 (commit `057cbfe`)

- **Constat** : `npm audit` remonte **21 vulnérabilités** sur le front
  (1 critique, 12 high, 8 moderate).
- **Action** : `npm audit fix --legacy-peer-deps` (flag requis par la peer
  dependency `@pinia/testing`) — mise à jour de `vite`, `vitest`, `ws`, `yaml`, `ajv`.
- **Validation** : 21 vulnérabilités → **0** ; les 41 tests Vitest restent verts.
- **Déploiement** : via le pipeline CD standard, sans intervention sur le serveur.

---

## 2. Système de supervision et d'alerte (C4.1.2)

### 2.1 Périmètre supervisé

La typologie du logiciel (application web client/serveur, API centrale,
PostgreSQL + Redis) impose de superviser : la **disponibilité de l'API et de sa
base de données**, la **santé des conteneurs**, le **succès des builds et des
déploiements**, et l'**intégrité des sauvegardes**.

### 2.2 Sondes mises en place

| Sonde | Emplacement | Finalité |
|-------|-------------|----------|
| Endpoint `GET /api/v1/health` | `my_memo_master_api/app.js` | Vérifie la connexion effective à la base (`sequelize.authenticate()`) : `200 {status: ok}` si joignable, `503` sinon. Déclaré **avant** le rate limiter global pour que la sonde ne soit jamais bloquée (une sonde limitée ferait passer les pods `NotReady` en cascade). |
| Healthchecks Docker Compose | `docker-compose.yml` | PostgreSQL et Redis exposent un healthcheck ; l'API n'est démarrée qu'une fois la base `healthy`. |
| Readiness probes Kubernetes | `helm/templates/deployment-api.yaml` | Ciblent `/api/v1/health` — un pod dont la DB est injoignable est retiré du Service (plus de trafic routé vers lui). |
| Vérification post-déploiement | `.github/workflows/cd.yml` | Après chaque déploiement VPS, une boucle interroge l'état des conteneurs (24 tentatives × 5 s = 2 min max). Si `postgres`, `api_server` ou `front_server` n'est pas `healthy`/`running`, le déploiement est marqué **échoué** et les 100 dernières lignes de logs sont affichées. |
| Prometheus (K8s) | `helm/templates/prometheus.yaml` | Un Prometheus par namespace scrape les pods annotés `prometheus.io/scrape` (intervalle configurable via `monitoring.scrapeInterval`). Non exposé publiquement — accès par `kubectl port-forward`. |
| Sauvegarde quotidienne | service `backup` (`docker-compose.yml`) | `pg_dump -Fc` au démarrage puis chaque jour à `BACKUP_HOUR` (3h UTC par défaut), rétention `BACKUP_RETENTION_DAYS` (7 j). Ses logs attestent du bon déroulement. |

### 2.3 Seuils et critères

- **Disponibilité API** : la DB doit répondre à `authenticate()` — sinon `503`
  et retrait du pod (K8s) ou détection au healthcheck (compose).
- **Déploiement** : tous les services critiques `healthy` en **moins de 2 minutes**,
  sinon échec du pipeline (pas de déploiement "à moitié réussi" silencieux).
- **Dépendances** : zéro vulnérabilité `high`/`critical` en production (seuil
  bloquant dans le CI).
- **Qualité de code** : analyse SonarCloud continue sur `main` (job `sonarcloud`
  du CI) — dette, duplication, code smells.

### 2.4 Modalités de signalement

Le signalement passe par **Discord** (webhook `DISCORD_LOG`), canal consulté
quotidiennement par l'équipe :

- **Échec/succès du CI** (`.github/workflows/notify_ci.yml`) : à chaque fin de
  workflow CI, un message indique la branche et le résultat. Les GIFs aléatoires
  rendent l'échec immédiatement identifiable visuellement dans le fil.
- **Résultat du CD** (job `notify` de `cd.yml`) : `✅ Déploiement **dev** réussi.`
  ou `❌ … échoué.` après chaque build/déploiement.
- **Logs applicatifs** : Winston côté API (chaque échec du health check est
  logué avec contexte) ; consultation via `docker compose logs` (procédures
  détaillées dans `docs/RUNBOOK.md`).

### 2.5 Limites connues et évolutions prévues

- Pas d'Alertmanager branché sur le Prometheus K8s (métriques consultables mais
  alerting non automatisé) et pas de sonde d'uptime externe : le signalement
  proactif repose aujourd'hui sur le pipeline CI/CD. Recommandation d'évolution
  documentée dans `docs/MCO_MAINTENANCE_EVOLUTIONS.md`.
- Le cluster K8s preprod est en pause pour raisons de coût depuis le 2026-07-12
  (`K8S_PREPROD_ENABLED=false`) — la supervision Prometheus s'applique quand un
  cluster est actif ; l'environnement de test VPS reste supervisé par les
  healthchecks compose + CD.
