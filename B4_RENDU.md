# Dossier de certification — Bloc 4 : Maintenir l'application logicielle en condition opérationnelle

**Projet : MyMemoMaster** — plateforme web de révision et de suivi pédagogique

**Candidat : Macabiau Frédéric** — Expert en développement logiciel (RNCP niveau 7)

---

### Plan du dossier

| Section      | Contenu                                                                                          | Compétence couverte |
| ------------ | ------------------------------------------------------------------------------------------------ | -------------------- |
| Introduction | Présentation du projet                                                                          | —                   |
| 1            | Mise à jour des dépendances et bibliothèques tierces                                          | C4.1.1               |
| 2            | Système de supervision et d'alerte                                                              | C4.1.2               |
| 3            | Collecte et consignation des anomalies                                                           | C4.2.1               |
| 4            | Création et déploiement du correctif via CI/CD                                                 | C4.2.2               |
| 5            | Recommandations d'amélioration argumentées                                                     | C4.3.1               |
| 6            | Journal des versions déployées                                                                 | C4.3.2               |
| 7            | Collaboration avec le support et les retours utilisateurs                                        | C4.3.3               |
| Annexes      | A. Index des documents du dépôt · B. Synthèse de couverture des compétences · C. Glossaire | —                   |

---

# Présentation du projet

La plupart des étudiants ont des méthodes de révision peu efficaces qui les mettent en difficulté : 83,6 % s'appuient sur des méthodes de révision passives, 27 % préparent leurs examens au dernier moment, seulement 34 % disposent d'un calendrier de révision utile et seul 1 étudiant sur 2 s'entraîne via des annales ou des exercices (études et enquêtes versionnées dans [docs/sources/](annexes/docs/sources/) — voir Annexe D).

Pour remédier à ces problèmes, MyMemoMaster propose une plateforme de révision et de suivi étudiant tout-en-un, à destination des étudiants principalement et des enseignants. La plateforme centralise des fonctionnalités fondées sur des méthodes pédagogiques actives dont l'efficacité est documentée par ces mêmes travaux :

- **Systèmes de Leitner** : questions-réponses à répétition espacée — l'algorithme représente les cartes dans des « boîtes » et fait remonter plus fréquemment les questions échouées et moins fréquemment les questions réussies ;
- **Cartes mentales** : éditeur graphique de schémas de notions et de leurs liens ;
- **Séries d'exercices** : entraînement avec correction automatique, y compris une correction par similarité sémantique pour les réponses ouvertes, exécutée par un modèle d'IA embarqué dans l'API (bibliothèque `@xenova/transformers`, modèle multilingue `paraphrase-multilingual-MiniLM-L12-v2`);
- **Calendrier, échéances et rappels** : planification des sessions de révision, todo-list, notifications par email (file de traitement BullMQ/Redis) ;
- **KPI personnels et pédagogiques** : indicateurs de progression pour l'étudiant, tableaux de bord pour l'enseignant, avec gestion du consentement de partage ;
- **Groupes classes et établissements** : partage de ressources pédagogiques, invitations, périmètre d'administration pour les gérants d'établissement.

## Stack technique

La stack est documentée dans [dev/CONVENTIONS.md](annexes/dev/CONVENTIONS.md) et vérifiable dans le manifeste npm de l'api ([my_memo_master_api/package.json](my_memo_master_api/package.json)) et celui du front ([my_memo_master_front/package.json](my_memo_master_front/package.json)) :

| Couche                      | Technologie                                                                      |
| --------------------------- | -------------------------------------------------------------------------------- |
| Runtime API                 | Node.js 22                                                                       |
| Framework API               | Express.js v4                                                                    |
| ORM / Base de données      | Sequelize v6 — PostgreSQL 17 (test/preprod/prod), SQLite (développement local) |
| Authentification            | JWT (`jsonwebtoken`) + `bcryptjs`, refresh token avec rotation               |
| File de tâches asynchrones | BullMQ + Redis (rappels, notifications email)                                    |
| IA embarquée               | `@xenova/transformers` (correction par similarité sémantique)                |
| Front                       | Vue.js 3 + Vite v6 + Pinia (state) + Tailwind CSS v3                             |
| Tests                       | Jest + Supertest (API), Vitest + @vue/test-utils (front)                         |
| Qualité                    | ESLint (API v9, front v8) + Prettier                                             |
| Documentation API           | swagger-jsdoc + swagger-ui-express                                               |
| Conteneurisation            | Docker, Docker Compose, Helm/Kubernetes                                          |
| CI/CD                       | GitHub Actions                                                                   |

---

# Section 1 — Mise à jour des dépendances et bibliothèques tierces

**Compétence couverte : C4.1.1** — Gérer les mises à jour des dépendances et des bibliothèques tiers, en surveillant régulièrement les nouvelles versions, en évaluant les impacts des mises à jour, et en les intégrant de manière sécurisée pour maintenir l'application à jour et sécurisée.

Le processus de mise à jour des dépendances couvre l'ensemble des couches applicatives :

* l'API (Express, Sequelize, BullMQ, bcryptjs, jsonwebtoken…)
* le front (Vue 3, Vite, Pinia, Axios, MathLive…)
* les images Docker de base (Node 22, nginx, PostgreSQL, Redis)
* les pipelines CI/CD. Toute nouvelle dépendance doit figurer dans la liste approuvée de [dev/CONVENTIONS.md](annexes/dev/CONVENTIONS.md).

J'ai mis en place un système de **vérification automatique continue** et de **mises à jour manuelles maîtrisées** :

- **À chaque push**, le job `test_and_lint` du CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) exécute `npm audit --omit=dev --audit-level=high` afin de vérifier les vulnérabilités des dépendances de *production*. Si une dépendance de *production* a une vulnérabilité `high`/`critical` connue (contrôle OWASP A06) alors le build **échoue**. Les `devDependencies` sont exclues car elles n'entrent jamais dans les images déployées.
- Quand l'audit remonte une vulnérabilité, j'applique le correctif sur une branche dédiée, je rejoue la suite de tests complète pour vérifier l'absence de régression, puis le pipeline CI/CD redéploie normalement.
- Les montées de version fonctionnelles (au-delà du correctif de sécurité) sont évaluées au cas par cas : lecture du changelog de la librairie, impact sur les décisions déjà prises ([dev/DECISIONS.md](annexes/dev/DECISIONS.md)), exécution des tests API + front + lint avant fusion.

La vérification automatique garantit qu'aucune mise à jour n'est validée sans passer par les tests et empêche qu'une vulnérabilité haute soit mise en production par erreur.

**Exemple réel** — Pendant le push du 2026-06-10, le `npm audit` du commit `057cbfe` avait remonté **21 vulnérabilités** sur le front (1 critique, 12 high, 8 moderate). Afin de résoudre les 21 vulnérabilités, j'ai appliqué un `npm audit fix --legacy-peer-deps` (flag requis par la peer dependency de `@pinia/testing`) pour mettre à jour `vite`, `vitest`, `ws`, `yaml` et `ajv`. Cela a résolu les vulnérabilités et, par la suite, les 41 tests Vitest existants sont restés verts, validant que le correctif n'a rien cassé avant même le redéploiement.

---

# Section 2 — Système de supervision et d'alerte

**Compétence couverte : C4.1.2** — Concevoir un système de supervision et d'alerte en déterminant le périmètre de supervision et en identifiant les indicateurs de suivi pertinents, en mettant en place des sondes, en configurant la modalité des signalements afin de garantir une disponibilité permanente du logiciel.

    MyMemoMaster est une application web, avec un front, une API, une base de données PostgreSQL et un cache Redis. Elle est déployée sur VPS et Kubernetes selon l'environnement.

Ainsi, pour superviser l'application, il faut surveiller quatre choses :

* la disponibilité de l'API et de sa base
* la santé des conteneurs
* le succès des builds et des déploiements
* l'intégrité des sauvegardes.

| Sonde                           | Emplacement                                                             | Ce qu'elle vérifie                                                                                                                                                                                                                                                                                                                     |
| ------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/v1/health`          | [my_memo_master_api/app.js](my_memo_master_api/app.js)                   | Teste réellement`sequelize.authenticate()` — `200 {status: ok}` si la base répond, `503` sinon. Déclarée **avant** le rate limiter global : une sonde limitée ferait passer les pods `NotReady` en cascade.                                                                                                         |
| Healthchecks Docker Compose     | [docker-compose.yml](docker-compose.yml)                                 | PostgreSQL et Redis exposent un healthcheck ; l'API n'est démarrée qu'une fois la base`healthy`.                                                                                                                                                                                                                                    |
| Readiness probes Kubernetes     | [helm/templates/deployment-api.yaml](helm/templates/deployment-api.yaml) | Ciblent`/api/v1/health` ; un pod dont la base est injoignable est retiré du Service, plus de trafic routé vers lui.                                                                                                                                                                                                                 |
| Vérification post-déploiement | [.github/workflows/cd.yml](.github/workflows/cd.yml)                     | Après chaque déploiement VPS, une boucle interroge l'état des conteneurs (24 tentatives × 5 s = 2 min max) ; si un service critique n'est pas`healthy`/`running`, le déploiement échoue et les 100 dernières lignes de logs sont affichées.                                                                                 |
| Prometheus par namespace        | [helm/templates/prometheus.yaml](helm/templates/prometheus.yaml)         | Scrape les pods annotés`prometheus.io/scrape` à intervalle configurable (`monitoring.scrapeInterval`) ; non exposé publiquement, accès par `kubectl port-forward`.                                                                                                                                                            |
| Service`backup`               | [docker-compose.yml](docker-compose.yml)                                 | `pg_dump -Fc` au démarrage puis chaque jour à `BACKUP_HOUR` (3h UTC par défaut), rétention `BACKUP_RETENTION_DAYS` (7 jours).                                                                                                                                                                                                 |
| Sonde d'uptime externe          | [.github/workflows/uptime.yml](.github/workflows/uptime.yml)             | Depuis l'infrastructure GitHub (donc hors du VPS/cluster supervisé), ping de`/api/v1/health` toutes les 5 minutes — 3 tentatives espacées de 10 s pour absorber un incident transitoire, alerte Discord en cas d'échec confirmé. URLs sondées configurées par la variable de dépôt `UPTIME_URLS`.                          |
| Alertmanager sur métriques     | [helm/templates/alertmanager.yaml](helm/templates/alertmanager.yaml)     | Alertes évaluées par le Prometheus du chart sur les métriques RED/USE de l'API : cible injoignable (2 min), taux de 5xx > 5 % (5 min), latence p95 > 1 s (10 min), event loop Node.js > 500 ms (5 min) — seuils ajustables par values. Routées vers le même webhook Discord, relance toutes les 4 h tant que l'alerte est active. |

Les seuils que j'ai fixés sont volontairement stricts et bloquants :

* zéro vulnérabilité `high`/`critical` en production
* tous les services critiques `healthy` en moins de 2 minutes après déploiement

Si ces seuils ne sont pas respectés, le pipeline échoue.

J'ai aussi branché une analyse statique continue (SonarCloud, job `sonarcloud` du CI, limité à `main`) pour suivre dette et duplication dans le temps.

À chaque fin de CI, le pipeline ([.github/workflows/notify_ci.yml](.github/workflows/notify_ci.yml)) notifie la branche et le résultat succès/échec (job `notify` de `cd.yml`) sur **Discord** (webhook `DISCORD_LOG`). La sonde d'uptime externe et l'Alertmanager alertent sur ce même webhook dès qu'un endpoint de santé ne répond plus ou qu'un seuil de métrique est franchi ; le signalement ne dépend donc pas uniquement des passages du pipeline CI/CD. Les échecs du health check sont logués côté serveur via Winston avec contexte et sont consultables par les procédures détaillées dans [docs/RUNBOOK.md](docs/RUNBOOK.md).

**Condition d'activation** : l'Alertmanager est livré dans le chart mais désactivé par défaut (`monitoring.alerting.enabled: false`). Pour l'activer il faut ajouter la clé `DISCORD_WEBHOOK_URL` au Secret manuel `<release>-secrets` du namespace, faute de quoi le pod ne démarre pas et le déploiement `--atomic` rollback. Ce verrou est volontaire, il permet d'éviter d'avoir un système d'alerte silencieusement inopérant.

---

# Section 3 — Collecte et consignation des anomalies

**Compétence couverte : C4.2.1** — Consigner les anomalies détectées en élaborant un processus de collecte et consignation, en utilisant des outils de collecte et en y intégrant toutes les informations pertinentes, afin de déterminer le correctif à mettre en place.

## 3.1 Processus de collecte et de consignation

J'ai mis en place cinq canaux de détection, chacun avec son mode de signalement :

| Canal                                   | Ce qu'il détecte                                                      | Signalement                                                                                                            |
| --------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Pipeline CI (tests, lint,`npm audit`) | Régressions, vulnérabilités de dépendances                         | Message Discord automatique à chaque échec                                                                           |
| Vérification post-déploiement du CD   | Service qui ne démarre pas / base injoignable après une mise à jour | Échec du pipeline + logs des conteneurs + Discord                                                                     |
| Sonde`GET /api/v1/health`             | Indisponibilité de la base en production                              | `503` + log Winston avec contexte                                                                                    |
| Retours utilisateurs                    | Bugs fonctionnels constatés à l'usage                                | Canal Discord du projet                                                                                                |
| Audits ciblés (OWASP, RGAA)            | Failles de sécurité, défauts d'accessibilité                       | Rapport dédié ([docs/SECURITY_AUDIT_OWASP.md](docs/SECURITY_AUDIT_OWASP.md), [docs/AUDIT_RGAA.md](docs/AUDIT_RGAA.md)) |

Chaque anomalie est consignée avec les informations nécessaires à sa **reproduction**, puis tracée de bout en bout selon un modèle constant :

```markdown
## Fiche anomalie [ID]
- Date de détection / Détectée par / Environnement / Gravité
- Symptôme — ce qui est observé
- Reproduction — étapes exactes, données d'entrée, résultat attendu vs obtenu
- Analyse — cause racine identifiée
- Correctif — ce qui a été changé, fichiers concernés
- Tests — tests de non-régression ajoutés/adaptés
- Déploiement — commit, branche, résultat CI/CD
```

La consignation elle-même passe par un commit conventionné `[FIX]` (règle [dev/CONVENTIONS.md](annexes/dev/CONVENTIONS.md)) et notée dans [dev/CHANGELOG.md](annexes/dev/CHANGELOG.md) (fichiers modifiés, hypothèses, dette éventuelle) et, si le correctif implique un choix structurant, il est noté dans [dev/DECISIONS.md](annexes/dev/DECISIONS.md).

## 3.2 Fiche d'anomalie réelle — exposition d'erreurs internes sur `addCard`

- **ID** : ANO-2026-06-10-01 (commit `0935e05`)
- **Détectée par** : revue de code lors des travaux sur le module Leitner, en environnement de dev
- **Gravité** : majeure (fuite d'information, OWASP A05)
- **Symptôme** : `POST /leitnercards` renvoyait **403 Forbidden pour toutes les erreurs**, y compris les erreurs internes imprévues (contrainte SQL violée) — le message brut de Sequelize était exposé au client.
- **Reproduction** : appeler l'endpoint, authentifié, avec un `idBox` provoquant une erreur DB inattendue. Attendu : `500` avec message générique en français. Obtenu : `403` avec le message d'erreur interne Sequelize dans la réponse.
- **Analyse** : le `catch` du controller traitait uniformément toutes les exceptions comme des refus de droits, sans distinguer l'erreur métier attendue de l'erreur système.
- **Correctif** : dans [my_memo_master_api/services/LeitnerCard.service.js](my_memo_master_api/services/LeitnerCard.service.js), l'erreur métier porte désormais `error.statusCode = 403` ; dans [my_memo_master_api/controllers/LeitnerCard.controller.js](my_memo_master_api/controllers/LeitnerCard.controller.js), le catch distingue `statusCode === 403` (message métier) du fallback `500` (message générique, détail logué côté serveur uniquement).
- **Tests** : `test/controllers/LeitnerCard.controller.test.js` — mock du cas 403 avec `statusCode`, cas d'erreur imprévue vérifiant un 500.
- **Déploiement** : commit `0935e05`, CI vert (tests + lint + audit), déployé sur l'environnement de test par le pipeline CD standard.

---

# Section 4 — Création et déploiement du correctif via CI/CD

**Compétence couverte : C4.2.2** — Créer et déployer un correctif en respectant le processus d'intégration et de déploiement continu afin de résoudre l'anomalie.

Le traitement d'une anomalie suit exactement le même chemin que toute livraison — aucun déploiement manuel n'est nécessaire, le correctif profite intégralement de la chaîne CI/CD :

```
branche fix (dev_back_* / dev_front_*)
   │  commit [FIX] + tests de non-régression
   ▼
CI (ci.yml) — npm ci → tests → lint → npm audit (bloquant high/critical)
   │  échec ⇒ notification Discord, aucun déploiement possible
   ▼
merge sur dev
   ▼
CD (cd.yml) — build des images (cache GHA) → push DockerHub
   │  déploiement VPS test par SSH (docker compose --profile test)
   │  boucle de vérification : tous les services healthy < 2 min, sinon échec + logs
   ▼
notification Discord (✅/❌)
   ▼
promotion staging → preprod (Helm --atomic, rollback auto)
promotion main → prod (Helm --atomic, rollback auto)
```

Sur Kubernetes, `helm upgrade --atomic` annule automatiquement un déploiement raté ; sur le VPS, la procédure de rollback d'image et de migration est documentée dans [docs/RUNBOOK.md](docs/RUNBOOK.md). Un correctif qui casserait le démarrage de l'API serait détecté par la boucle de healthcheck du CD **avant** d'être considéré comme livré — jamais de correctif « à moitié déployé » silencieusement.

---

# Section 5 — Recommandations d'amélioration argumentées

**Compétence couverte : C4.3.1** — Proposer des axes d'amélioration en prenant en compte les indicateurs de performance et en analysant les retours utilisateurs.

Chaque recommandation est issue soit des indicateurs du projet (pipeline, supervision), soit de la dette explicitement documentée dans [dev/DECISIONS.md](annexes/dev/DECISIONS.md), et évaluée en gain / coût.

**R1 — Tags git semver + images Docker taguées (priorité haute).** Les images sont poussées en `:latest` par environnement ; le rollback VPS demande d'« identifier le tag de l'image précédente sur DockerHub », impossible avec un tag unique écrasé. Je recommande de taguer chaque merge sur `staging`/`main` (`vX.Y.Z`), de pousser les images avec ce tag en plus de `:latest`, et de publier une release GitHub reprenant l'entrée du journal de version (section 6). Gain : rollback fiable en moins de 5 minutes ; coût : environ un jour, sans impact runtime.

**R2 — Persistance Redis pour les rappels BullMQ (priorité haute).** Redis tourne sans persistance AOF/RDB (décision documentée le 2026-06-12) — un redémarrage du conteneur perd tous les rappels programmés, silencieusement. Activer `appendonly yes` et monter un volume, comme pour PostgreSQL. Gain : fiabilité d'une fonctionnalité cœur de la promesse produit ; coût négligeable (quelques lignes de configuration + un test de redémarrage).

**R3 — Alerting proactif sur la disponibilité (réalisée).** La supervision détectait mais n'alertait pas en dehors des déploiements (section 2) — une panne entre deux déploiements n'était vue qu'au prochain usage. Les deux volets de la recommandation ont été **mis en œuvre**. Premier volet : une sonde d'uptime externe ([.github/workflows/uptime.yml](.github/workflows/uptime.yml)) pingue `/api/v1/health` toutes les 5 minutes depuis l'infrastructure GitHub — donc indépendante du VPS et du cluster supervisés — avec 3 tentatives espacées de 10 s pour absorber les incidents transitoires, et alerte sur le webhook Discord déjà en place ; détection ramenée à ≤ 10 min (granularité du cron GitHub incluse) sans nouvel outil d'équipe. Second volet : un Alertmanager ([helm/templates/alertmanager.yaml](helm/templates/alertmanager.yaml)) branché sur le Prometheus du chart évalue des règles sur les métriques RED/USE de l'API — cible injoignable, taux de 5xx, latence p95, saturation de l'event loop — et route vers le même webhook Discord ; désactivé par défaut (`monitoring.alerting.enabled`), son activation exige la clé `DISCORD_WEBHOOK_URL` dans le Secret du namespace (section 2). Les deux vues sont complémentaires : la sonde observe le service de l'extérieur (up/down), l'Alertmanager de l'intérieur (dégradations avant la panne).

**R4 — Lien cliquable dans l'email de reset password (priorité moyenne).** L'utilisateur doit copier-coller un token de 64 caractères depuis l'email (limite UX identifiée dès la conception du correctif sécurité du 2026-06-15). Un email avec lien `https://<front>/reset-password?token=…` supprimerait cette friction sur un parcours critique, sans toucher au modèle de sécurité (le token reste hashé côté serveur). Coût : environ un jour front + template email.

**R5 — Cache des droits Leitner si la charge augmente (différée).** Chaque écriture sur une carte et chaque endpoint `requireRole` déclenchent 1-2 requêtes DB de résolution de droits — choix assumé pour le MVP mono-instance. Je ne recommande **pas** d'agir tant que les temps de réponse restent bons ; si la latence se dégrade, un cache Redis courte durée (30-60 s) supprimerait la majorité de ces requêtes, au prix d'une invalidation à gérer (partages, changements de rôle) — c'est précisément pourquoi elle est différée jusqu'à un besoin mesuré.

---

# Section 6 — Journal des versions déployées

**Compétence couverte : C4.3.2** — Établir un journal des versions déployées en y intégrant la documentation des correctifs réalisés.

J'ai établi un journal des versions déployées, une « version » correspondant à un jalon mergé sur une branche de déploiement (`dev` → test, `staging` → preprod, `main` → prod). Faute de tags git à ce jour (recommandation R1), je nomme les versions `AAAA.MM.n` (année.mois.itération). Le détail technique exhaustif de chaque livraison reste dans [dev/CHANGELOG_AGENT.md](annexes/dev/CHANGELOG_AGENT.md) ; ce journal en est la vue synthétique orientée exploitation.

**2026.07.3 — Interpréteur de formules V2** (2026-07-19 → 2026-07-25). Nouvelles fonctionnalités : éditeur MathLive à palette (caractères, formules, opérateurs, matrices), équivalences algébriques par AST pour la correction sémantique, vérification d'homogénéité des unités sur formules LaTeX annotées. Anomalies corrigées : comparaison V1/LaTeX échouant sur corpus mixte ; corruption de matrices via l'API de commande MathLive (remplacée par des fonctions pures testées).

**2026.07.2 — Correctif reset password + consolidation docs** (2026-07-18). Anomalies corrigées : parcours « mot de passe oublié » réparé de bout en bout (commit `fe9c0a9`), limitation des tentatives de reset ajoutée. Maintenance : documentation dédupliquée (suppression des copies obsolètes de `docs/CONVENTIONS.md` et `docs/DECISIONS.md` au profit des versions `.agents/`).

**2026.07.1 — Durcissement sécurité + observabilité K8s** (2026-07-06 → 2026-07-12). Nouvelles fonctionnalités : endpoint de santé `/api/v1/health` (commit `515bf84`), déploiement Helm unifié avec `--atomic`, Prometheus par namespace. Anomalies corrigées : refresh token désormais hashé SHA-256 en base (audit OWASP, ticket M-00b.07b) ; flag Helm inexistant `--rollback-on-failure` remplacé par `--atomic`.

**2026.06.3 — Authentification durcie + RBAC** (2026-06-14 → 2026-06-15). Nouvelles fonctionnalités : refresh token opaque avec rotation, middleware RBAC `requireRole`, reset password par token 64 caractères hashé SHA-256. Anomalie corrigée : faible entropie du code de reset password (900 000 valeurs, stocké en clair).

**2026.06.2 — Modules Calendrier, Planning et Rappels** (2026-06-10 → 2026-06-13). Nouvelles fonctionnalités : événements récurrents à occurrences matérialisées, échéances liées à une occurrence précise, score de charge pondéré, rappels BullMQ + Redis. Anomalies corrigées : fiche ANO-2026-06-10-01 (§3.2) ; 21 vulnérabilités npm du front → 0 (commit `057cbfe`).

**2026.06.1 — Socle technique et normalisation** (2026-06-03 → 2026-06-06). Nouvelles fonctionnalités : architecture controller → service → model, validation centralisée, Swagger, stack conteneurisée, cartes Leitner, mind maps, exercices. Anomalies corrigées : routes non-REST normalisées, index manquants sur les FK, CORS par fonction, `trust proxy` activé pour un rate limiting correct derrière Traefik.

---

# Section 7 — Collaboration avec le support et les retours utilisateurs

**Compétence couverte : C4.3.3** — Collaborer avec les équipes de support, en fournissant une expertise technique, en répondant aux retours clients, en résolvant des problèmes complexes afin d'améliorer le logiciel.

Le projet étant porté par une petite équipe, le rôle de support est assuré via le **serveur Discord du projet** : les testeurs y remontent leurs problèmes sur le même canal qui reçoit les notifications CI/CD — retours et état de la plateforme visibles au même endroit. Je qualifie le problème (fiche d'anomalie, §3.1), le corrige, puis notifie le testeur au déploiement du correctif.

**Exemple réel — parcours « mot de passe oublié » (2026-07-18, commit `fe9c0a9`).** Un testeur ne parvenait pas à réinitialiser son mot de passe : le parcours échouait entre la demande (`ForgotPasswordPage`) et la saisie du nouveau mot de passe (`ResetPasswordPage`). J'ai reproduit le parcours complet en environnement de test et identifié un désalignement entre le front et l'API sur le flux de vérification du token, ainsi que l'absence de limite de tentatives. Résolution : `User.service.js`, `User.controller.js` et `User.validators.js` réalignés côté API, ajout d'un compteur de tentatives de reset (migration `20260718000000-add-reset-password-attempts-to-user`) pour empêcher le brute-force du token ; `ForgotPasswordPage.vue` et `ResetPasswordPage.vue` corrigées côté front ; suites `User.service.test.js` et `User.controller.test.js` adaptées (cas nominal, tentatives épuisées, token invalide). Le testeur a fourni le scénario de reproduction et validé le correctif sur l'environnement de test une fois le déploiement automatique terminé — la boucle a été fermée sur le même canal Discord que la remontée initiale.

---

# Annexes

## Annexe A — Index des documents du dépôt (Bloc 4)

| Document                                                                                                                                                                              | Contenu                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [docs/RUNBOOK.md](docs/RUNBOOK.md)                                                                                                                                                     | Procédures d'exploitation : déploiement, mise à jour, rollback, logs, sauvegarde/restauration |
| [dev/CHANGELOG_AGENT.md](annexes/dev/CHANGELOG_AGENT.md)                                                                                                                               | Détail technique exhaustif de chaque livraison (fichiers, hypothèses, dette)                   |
| [dev/DECISIONS.md](annexes/dev/DECISIONS.md)                                                                                                                                           | Journal des décisions techniques structurantes (Contexte/Décision/Alternative/Conséquences)   |
| [docs/SECURITY_AUDIT_OWASP.md](docs/SECURITY_AUDIT_OWASP.md)                                                                                                                           | Audit de sécurité OWASP Top 10                                                                 |
| [docs/AUDIT_RGAA.md](docs/AUDIT_RGAA.md)                                                                                                                                               | Audit d'accessibilité RGAA                                                                      |
| [.github/workflows/ci.yml](.github/workflows/ci.yml) / [cd.yml](.github/workflows/cd.yml) / [notify_ci.yml](.github/workflows/notify_ci.yml) / [uptime.yml](.github/workflows/uptime.yml) | Pipelines d'intégration, de déploiement, de notification et sonde d'uptime externe             |
| [helm/](helm/)                                                                                                                                                                         | Chart Helm (déploiement, probes, Prometheus, Alertmanager)                                      |

## Annexe B — Synthèse de couverture des compétences

| Compétence                             | Section | Réponse apportée (preuves clés)                                                                                                                                                                                                                               |
| --------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C4.1.1 — Mise à jour des dépendances | 1       | `npm audit` bloquant en CI (high/critical) ; correctif réel de 21 vulnérabilités front (commit `057cbfe`) sans régression                                                                                                                                |
| C4.1.2 — Supervision et alerte         | 2       | Endpoint`/api/v1/health` testant la base, healthchecks Compose, readiness probes K8s, boucle de vérification post-déploiement, Prometheus par namespace, sonde d'uptime externe (`uptime.yml`), Alertmanager sur métriques RED/USE, notifications Discord |
| C4.2.1 — Consignation des anomalies    | 3       | Processus à 5 canaux de détection, modèle de fiche, fiche réelle ANO-2026-06-10-01 reproductible                                                                                                                                                             |
| C4.2.2 — Correctif via CI/CD           | 4       | Schéma complet du circuit fix → CI → CD, healthchecks bloquants, rollback`--atomic`                                                                                                                                                                         |
| C4.3.1 — Axes d'amélioration          | 5       | 5 recommandations argumentées gain/coût, priorisées, appuyées sur la dette documentée                                                                                                                                                                       |
| C4.3.2 — Journal de version            | 6       | 6 versions reconstituées avec fonctionnalités et anomalies corrigées, adossées au CHANGELOG_AGENT                                                                                                                                                            |
| C4.3.3 — Collaboration support         | 7       | Canal Discord unique retours/CI-CD, cas réel résolu de bout en bout (forgot password, commit`fe9c0a9`)                                                                                                                                                       |

## Annexe C — Glossaire

| Terme                                   | Définition dans le contexte du projet                                                                                                                     |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CD (déploiement continu)**     | Pipeline qui construit les images et déploie automatiquement à chaque fusion validée ([cd.yml](.github/workflows/cd.yml)).                               |
| **CI (intégration continue)**    | Validation automatique (tests, lint, audit, build) de chaque push ([ci.yml](.github/workflows/ci.yml)).                                                     |
| **Fiche de consignation**         | Description structurée d'une anomalie (symptôme, reproduction, analyse, correctif) permettant de la traiter et de la tracer.                             |
| **Healthcheck / readiness probe** | Sonde vérifiant qu'un conteneur/pod est apte à recevoir du trafic ; conditionne démarrages et rollouts.                                                 |
| **MCO**                           | Maintien en Condition Opérationnelle — l'ensemble des activités assurant la disponibilité et la fiabilité d'un logiciel après sa mise en production. |
| **npm audit**                     | Commande détectant les vulnérabilités connues des dépendances installées ; exécutée avec seuil bloquant en CI.                                      |
| **Rollback**                      | Retour automatique ou manuel à la version précédente après un déploiement échoué (`helm --atomic`, RUNBOOK).                                      |

---

*Fin du dossier — Bloc 4. Les compétences C4.1.1, C4.1.2, C4.2.1, C4.2.2, C4.3.1, C4.3.2 et C4.3.3 sont chacune couvertes par une section dédiée avec preuves issues du dépôt.*
