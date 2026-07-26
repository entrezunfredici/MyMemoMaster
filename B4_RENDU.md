# Dossier de certification — Bloc 4 : Maintenir l'application logicielle en condition opérationnelle

**Projet : MyMemoMaster** — plateforme web de révision et de suivi pédagogique

**Candidat : Macabiau Frédéric** — Expert en développement logiciel (RNCP niveau 7)

---

### Plan du dossier

| Section      | Contenu                                                                 | Compétence couverte      |
| ------------ | ------------------------------------------------------------------------ | -------------------------- |
| Introduction | Contexte du bloc MCO                                                    | —                          |
| 1            | Monitorer l'application                                                 | C4.1.1, C4.1.2              |
| 2            | Traitement des anomalies                                                | C4.2.1, C4.2.2              |
| 3            | Maintenance du logiciel                                                 | C4.3.1, C4.3.2, C4.3.3      |
| Annexes      | A. Index des documents du dépôt · B. Synthèse de couverture des compétences · C. Glossaire | —                          |

---

# Introduction

Ce dossier documente le maintien en condition opérationnelle (MCO) de MyMemoMaster, projet dont la conception et le développement sont détaillés dans le dossier du [Bloc 2](B2_RENDU.md) (architecture, stack, environnements, CI/CD, tests, sécurité, accessibilité). Le Bloc 4 s'appuie sur cette même infrastructure de déploiement mais en couvre un périmètre distinct : la surveillance de l'application **une fois en production**, le traitement des anomalies qui y sont détectées, et la maintenance continue du logiciel (dépendances, versions, retours utilisateurs).

Les preuves apportées ici sont toutes vérifiables dans le dépôt : pipelines [.github/workflows/](.github/workflows/), endpoint de santé [my_memo_master_api/app.js](my_memo_master_api/app.js), charts [helm/](helm/), historique de commits `[FIX]`, et les deux journaux qui font mémoire du projet — [.agents/CHANGELOG_AGENT.md](.agents/CHANGELOG_AGENT.md) (détail technique de chaque livraison) et [.agents/DECISIONS.md](.agents/DECISIONS.md) (choix structurants, au format Contexte/Décision/Alternative écartée/Conséquences).

---

# Section 1 — Monitorer l'application

**Compétences couvertes : C4.1.1** — Gérer les mises à jour des dépendances et des bibliothèques tiers, en surveillant régulièrement les nouvelles versions, en évaluant les impacts des mises à jour, et en les intégrant de manière sécurisée pour maintenir l'application à jour et sécurisée. **C4.1.2** — Concevoir un système de supervision et d'alerte en déterminant le périmètre de supervision et en identifiant les indicateurs de suivi pertinents, en mettant en place des sondes, en configurant la modalité des signalements afin de garantir une disponibilité permanente du logiciel.

## 1.1 Processus de mise à jour des dépendances

Le périmètre couvre l'API (Express, Sequelize, BullMQ, bcryptjs, jsonwebtoken…), le front (Vue 3, Vite, Pinia, Axios, MathLive…), les images Docker de base (Node 22, nginx, PostgreSQL, Redis) et les actions GitHub du pipeline CI/CD. Toute nouvelle dépendance doit figurer dans la liste approuvée de [.agents/CONVENTIONS.md](.agents/CONVENTIONS.md) — je ne me suis jamais autorisé d'ajout de dépendance non signalé.

J'ai combiné un **garde-fou automatique continu** à des **mises à jour manuelles maîtrisées**, plutôt qu'un bot de mise à jour en auto-merge :

- **À chaque push**, le job `test_and_lint` du CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) exécute `npm audit --omit=dev --audit-level=high` : le build **échoue** si une dépendance de *production* a une vulnérabilité `high`/`critical` connue (contrôle OWASP A06). Les `devDependencies` sont exclues car elles n'entrent jamais dans les images déployées.
- Quand l'audit remonte une vulnérabilité, j'applique le correctif sur une branche dédiée, je rejoue la suite de tests complète pour vérifier l'absence de régression, puis le pipeline CI/CD redéploie normalement.
- Les montées de version fonctionnelles (au-delà du correctif de sécurité) sont évaluées au cas par cas : lecture du changelog de la librairie, impact sur les décisions déjà prises ([.agents/DECISIONS.md](.agents/DECISIONS.md)), exécution des tests API + front + lint avant fusion.

Ce choix — manuel avec garde-fou automatique — garantit qu'aucune mise à jour n'est validée sans passer par les tests, tout en empêchant qu'une vulnérabilité haute reste silencieusement en production.

**Exemple réel** (commit `057cbfe`, 2026-06-10) : `npm audit` avait remonté **21 vulnérabilités** sur le front (1 critique, 12 high, 8 moderate). J'ai appliqué `npm audit fix --legacy-peer-deps` (flag requis par la peer dependency de `@pinia/testing`), ce qui a mis à jour `vite`, `vitest`, `ws`, `yaml` et `ajv`. Résultat : 21 vulnérabilités → **0**, et les 41 tests Vitest existants sont restés verts — la preuve que le correctif n'a rien cassé avant même le redéploiement.

## 1.2 Système de supervision et d'alerte

La typologie du logiciel (application web client/serveur, API centrale, PostgreSQL + Redis, déployée sur VPS et Kubernetes selon l'environnement) m'a conduit à superviser quatre choses : la disponibilité de l'API et de sa base, la santé des conteneurs, le succès des builds/déploiements, et l'intégrité des sauvegardes.

| Sonde | Emplacement | Ce qu'elle vérifie |
| --- | --- | --- |
| `GET /api/v1/health` | [my_memo_master_api/app.js](my_memo_master_api/app.js) | Teste réellement `sequelize.authenticate()` — `200 {status: ok}` si la base répond, `503` sinon. Déclarée **avant** le rate limiter global : une sonde limitée ferait passer les pods `NotReady` en cascade. |
| Healthchecks Docker Compose | [docker-compose.yml](docker-compose.yml) | PostgreSQL et Redis exposent un healthcheck ; l'API n'est démarrée qu'une fois la base `healthy`. |
| Readiness probes Kubernetes | [helm/templates/deployment-api.yaml](helm/templates/deployment-api.yaml) | Ciblent `/api/v1/health` ; un pod dont la base est injoignable est retiré du Service, plus de trafic routé vers lui. |
| Vérification post-déploiement | [.github/workflows/cd.yml](.github/workflows/cd.yml) | Après chaque déploiement VPS, une boucle interroge l'état des conteneurs (24 tentatives × 5 s = 2 min max) ; si un service critique n'est pas `healthy`/`running`, le déploiement échoue et les 100 dernières lignes de logs sont affichées. |
| Prometheus par namespace | [helm/templates/prometheus.yaml](helm/templates/prometheus.yaml) | Scrape les pods annotés `prometheus.io/scrape` à intervalle configurable (`monitoring.scrapeInterval`) ; non exposé publiquement, accès par `kubectl port-forward`. |
| Service `backup` | [docker-compose.yml](docker-compose.yml) | `pg_dump -Fc` au démarrage puis chaque jour à `BACKUP_HOUR` (3h UTC par défaut), rétention `BACKUP_RETENTION_DAYS` (7 jours). |

Les seuils que j'ai fixés sont volontairement stricts et bloquants : zéro vulnérabilité `high`/`critical` en production, tous les services critiques `healthy` en moins de 2 minutes après déploiement, sinon le pipeline échoue plutôt que de livrer un état incertain. J'ai aussi branché une analyse statique continue (SonarCloud, job `sonarcloud` du CI, limité à `main`) pour suivre dette et duplication dans le temps.

Le signalement passe par **Discord** (webhook `DISCORD_LOG`) : chaque fin de CI notifie la branche et le résultat ([.github/workflows/notify_ci.yml](.github/workflows/notify_ci.yml)), chaque déploiement notifie succès/échec (job `notify` de `cd.yml`), et tout échec du health check est logué côté serveur via Winston avec contexte — consultable par les procédures détaillées dans [docs/RUNBOOK.md](docs/RUNBOOK.md).

**Limite assumée** : je n'ai pas branché d'Alertmanager sur le Prometheus Kubernetes ni de sonde d'uptime externe — le signalement proactif repose aujourd'hui sur le pipeline CI/CD, qui ne couvre pas une panne survenant entre deux déploiements. C'est la première recommandation d'amélioration de la section 3.

---

# Section 2 — Traitement des anomalies

**Compétences couvertes : C4.2.1** — Consigner les anomalies détectées en élaborant un processus de collecte et consignation, en utilisant des outils de collecte et en y intégrant toutes les informations pertinentes, afin de déterminer le correctif à mettre en place. **C4.2.2** — Créer et déployer un correctif en respectant le processus d'intégration et de déploiement continu afin de résoudre l'anomalie.

## 2.1 Processus de collecte et de consignation

J'ai identifié cinq canaux de détection, chacun avec son mode de signalement :

| Canal | Ce qu'il détecte | Signalement |
| --- | --- | --- |
| Pipeline CI (tests, lint, `npm audit`) | Régressions, vulnérabilités de dépendances | Message Discord automatique à chaque échec |
| Vérification post-déploiement du CD | Service qui ne démarre pas / base injoignable après une mise à jour | Échec du pipeline + logs des conteneurs + Discord |
| Sonde `GET /api/v1/health` | Indisponibilité de la base en production | `503` + log Winston avec contexte |
| Retours utilisateurs | Bugs fonctionnels constatés à l'usage | Canal Discord du projet |
| Audits ciblés (OWASP, RGAA) | Failles de sécurité, défauts d'accessibilité | Rapport dédié ([docs/SECURITY_AUDIT_OWASP.md](docs/SECURITY_AUDIT_OWASP.md), [docs/AUDIT_RGAA.md](docs/AUDIT_RGAA.md)) |

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

La consignation elle-même passe par un commit conventionné `[FIX]` (règle [.agents/CONVENTIONS.md](.agents/CONVENTIONS.md)) accompagné d'une entrée dans [.agents/CHANGELOG_AGENT.md](.agents/CHANGELOG_AGENT.md) (fichiers modifiés, hypothèses, dette éventuelle) et, si le correctif implique un choix structurant, d'une entrée dans [.agents/DECISIONS.md](.agents/DECISIONS.md).

## 2.2 Fiche d'anomalie réelle — exposition d'erreurs internes sur `addCard`

- **ID** : ANO-2026-06-10-01 (commit `0935e05`)
- **Détectée par** : revue de code lors des travaux sur le module Leitner, en environnement de dev
- **Gravité** : majeure (fuite d'information, OWASP A05)
- **Symptôme** : `POST /leitnercards` renvoyait **403 Forbidden pour toutes les erreurs**, y compris les erreurs internes imprévues (contrainte SQL violée) — le message brut de Sequelize était exposé au client.
- **Reproduction** : appeler l'endpoint, authentifié, avec un `idBox` provoquant une erreur DB inattendue. Attendu : `500` avec message générique en français. Obtenu : `403` avec le message d'erreur interne Sequelize dans la réponse.
- **Analyse** : le `catch` du controller traitait uniformément toutes les exceptions comme des refus de droits, sans distinguer l'erreur métier attendue de l'erreur système.
- **Correctif** : dans [my_memo_master_api/services/LeitnerCard.service.js](my_memo_master_api/services/LeitnerCard.service.js), l'erreur métier porte désormais `error.statusCode = 403` ; dans [my_memo_master_api/controllers/LeitnerCard.controller.js](my_memo_master_api/controllers/LeitnerCard.controller.js), le catch distingue `statusCode === 403` (message métier) du fallback `500` (message générique, détail logué côté serveur uniquement).
- **Tests** : `test/controllers/LeitnerCard.controller.test.js` — mock du cas 403 avec `statusCode`, cas d'erreur imprévue vérifiant un 500.
- **Déploiement** : commit `0935e05`, CI vert (tests + lint + audit), déployé sur l'environnement de test par le pipeline CD standard.

## 2.3 Création et déploiement du correctif via CI/CD

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

# Section 3 — Maintenance du logiciel

**Compétences couvertes : C4.3.1** — Proposer des axes d'amélioration en prenant en compte les indicateurs de performance et en analysant les retours utilisateurs. **C4.3.2** — Établir un journal des versions déployées en y intégrant la documentation des correctifs réalisés. **C4.3.3** — Collaborer avec les équipes de support, en fournissant une expertise technique, en répondant aux retours clients, en résolvant des problèmes complexes afin d'améliorer le logiciel.

## 3.1 Recommandations d'amélioration argumentées

Chaque recommandation est issue soit des indicateurs du projet (pipeline, supervision), soit de la dette explicitement documentée dans [.agents/DECISIONS.md](.agents/DECISIONS.md), et évaluée en gain / coût.

**R1 — Tags git semver + images Docker taguées (priorité haute).** Les images sont poussées en `:latest` par environnement ; le rollback VPS demande d'« identifier le tag de l'image précédente sur DockerHub », impossible avec un tag unique écrasé. Je recommande de taguer chaque merge sur `staging`/`main` (`vX.Y.Z`), de pousser les images avec ce tag en plus de `:latest`, et de publier une release GitHub reprenant l'entrée du journal de version (§3.2). Gain : rollback fiable en moins de 5 minutes ; coût : environ un jour, sans impact runtime.

**R2 — Persistance Redis pour les rappels BullMQ (priorité haute).** Redis tourne sans persistance AOF/RDB (décision documentée le 2026-06-12) — un redémarrage du conteneur perd tous les rappels programmés, silencieusement. Activer `appendonly yes` et monter un volume, comme pour PostgreSQL. Gain : fiabilité d'une fonctionnalité cœur de la promesse produit ; coût négligeable (quelques lignes de configuration + un test de redémarrage).

**R3 — Alerting proactif sur la disponibilité (priorité moyenne).** La supervision détecte mais n'alerte pas en dehors des déploiements (§1.2) — une panne entre deux déploiements n'est vue qu'au prochain usage. Je recommande une sonde d'uptime externe (ping de `/api/v1/health` toutes les 5 min) branchée sur le webhook Discord déjà en place ; à terme, un Alertmanager sur le Prometheus Kubernetes quand un cluster est actif. Gain : détection ramenée à ≤ 5 min sans nouvel outil d'équipe ; coût : une demi-journée pour la sonde externe.

**R4 — Lien cliquable dans l'email de reset password (priorité moyenne).** L'utilisateur doit copier-coller un token de 64 caractères depuis l'email (limite UX identifiée dès la conception du correctif sécurité du 2026-06-15). Un email avec lien `https://<front>/reset-password?token=…` supprimerait cette friction sur un parcours critique, sans toucher au modèle de sécurité (le token reste hashé côté serveur). Coût : environ un jour front + template email.

**R5 — Cache des droits Leitner si la charge augmente (différée).** Chaque écriture sur une carte et chaque endpoint `requireRole` déclenchent 1-2 requêtes DB de résolution de droits — choix assumé pour le MVP mono-instance. Je ne recommande **pas** d'agir tant que les temps de réponse restent bons ; si la latence se dégrade, un cache Redis courte durée (30-60 s) supprimerait la majorité de ces requêtes, au prix d'une invalidation à gérer (partages, changements de rôle) — c'est précisément pourquoi elle est différée jusqu'à un besoin mesuré.

## 3.2 Journal des versions déployées

J'ai établi un journal des versions déployées, une « version » correspondant à un jalon mergé sur une branche de déploiement (`dev` → test, `staging` → preprod, `main` → prod). Faute de tags git à ce jour (recommandation R1), je nomme les versions `AAAA.MM.n` (année.mois.itération). Le détail technique exhaustif de chaque livraison reste dans [.agents/CHANGELOG_AGENT.md](.agents/CHANGELOG_AGENT.md) ; ce journal en est la vue synthétique orientée exploitation.

**2026.07.3 — Interpréteur de formules V2** (2026-07-19 → 2026-07-25). Nouvelles fonctionnalités : éditeur MathLive à palette (caractères, formules, opérateurs, matrices), équivalences algébriques par AST pour la correction sémantique, vérification d'homogénéité des unités sur formules LaTeX annotées. Anomalies corrigées : comparaison V1/LaTeX échouant sur corpus mixte ; corruption de matrices via l'API de commande MathLive (remplacée par des fonctions pures testées).

**2026.07.2 — Correctif reset password + consolidation docs** (2026-07-18). Anomalies corrigées : parcours « mot de passe oublié » réparé de bout en bout (commit `fe9c0a9`), limitation des tentatives de reset ajoutée. Maintenance : documentation dédupliquée (suppression des copies obsolètes de `docs/CONVENTIONS.md` et `docs/DECISIONS.md` au profit des versions `.agents/`).

**2026.07.1 — Durcissement sécurité + observabilité K8s** (2026-07-06 → 2026-07-12). Nouvelles fonctionnalités : endpoint de santé `/api/v1/health` (commit `515bf84`), déploiement Helm unifié avec `--atomic`, Prometheus par namespace. Anomalies corrigées : refresh token désormais hashé SHA-256 en base (audit OWASP, ticket M-00b.07b) ; flag Helm inexistant `--rollback-on-failure` remplacé par `--atomic`.

**2026.06.3 — Authentification durcie + RBAC** (2026-06-14 → 2026-06-15). Nouvelles fonctionnalités : refresh token opaque avec rotation, middleware RBAC `requireRole`, reset password par token 64 caractères hashé SHA-256. Anomalie corrigée : faible entropie du code de reset password (900 000 valeurs, stocké en clair).

**2026.06.2 — Modules Calendrier, Planning et Rappels** (2026-06-10 → 2026-06-13). Nouvelles fonctionnalités : événements récurrents à occurrences matérialisées, échéances liées à une occurrence précise, score de charge pondéré, rappels BullMQ + Redis. Anomalies corrigées : fiche ANO-2026-06-10-01 (§2.2) ; 21 vulnérabilités npm du front → 0 (commit `057cbfe`).

**2026.06.1 — Socle technique et normalisation** (2026-06-03 → 2026-06-06). Nouvelles fonctionnalités : architecture controller → service → model, validation centralisée, Swagger, stack conteneurisée, cartes Leitner, mind maps, exercices. Anomalies corrigées : routes non-REST normalisées, index manquants sur les FK, CORS par fonction, `trust proxy` activé pour un rate limiting correct derrière Traefik.

## 3.3 Collaboration avec le support et les retours utilisateurs

Le projet étant porté par une petite équipe, le rôle de support est assuré via le **serveur Discord du projet** : les testeurs y remontent leurs problèmes sur le même canal qui reçoit les notifications CI/CD — retours et état de la plateforme visibles au même endroit. Je qualifie le problème (fiche d'anomalie, §2.1), le corrige, puis notifie le testeur au déploiement du correctif.

**Exemple réel — parcours « mot de passe oublié » (2026-07-18, commit `fe9c0a9`).** Un testeur ne parvenait pas à réinitialiser son mot de passe : le parcours échouait entre la demande (`ForgotPasswordPage`) et la saisie du nouveau mot de passe (`ResetPasswordPage`). J'ai reproduit le parcours complet en environnement de test et identifié un désalignement entre le front et l'API sur le flux de vérification du token, ainsi que l'absence de limite de tentatives. Résolution : `User.service.js`, `User.controller.js` et `User.validators.js` réalignés côté API, ajout d'un compteur de tentatives de reset (migration `20260718000000-add-reset-password-attempts-to-user`) pour empêcher le brute-force du token ; `ForgotPasswordPage.vue` et `ResetPasswordPage.vue` corrigées côté front ; suites `User.service.test.js` et `User.controller.test.js` adaptées (cas nominal, tentatives épuisées, token invalide). Le testeur a fourni le scénario de reproduction et validé le correctif sur l'environnement de test une fois le déploiement automatique terminé — la boucle a été fermée sur le même canal Discord que la remontée initiale.

---

# Annexes

## Annexe A — Index des documents du dépôt (Bloc 4)

| Document | Contenu |
| --- | --- |
| [docs/RUNBOOK.md](docs/RUNBOOK.md) | Procédures d'exploitation : déploiement, mise à jour, rollback, logs, sauvegarde/restauration |
| [.agents/CHANGELOG_AGENT.md](.agents/CHANGELOG_AGENT.md) | Détail technique exhaustif de chaque livraison (fichiers, hypothèses, dette) |
| [.agents/DECISIONS.md](.agents/DECISIONS.md) | Journal des décisions techniques structurantes (Contexte/Décision/Alternative/Conséquences) |
| [docs/SECURITY_AUDIT_OWASP.md](docs/SECURITY_AUDIT_OWASP.md) | Audit de sécurité OWASP Top 10 |
| [docs/AUDIT_RGAA.md](docs/AUDIT_RGAA.md) | Audit d'accessibilité RGAA |
| [.github/workflows/ci.yml](.github/workflows/ci.yml) / [cd.yml](.github/workflows/cd.yml) / [notify_ci.yml](.github/workflows/notify_ci.yml) | Pipelines d'intégration, de déploiement et de notification |
| [helm/](helm/) | Chart Helm (déploiement, probes, Prometheus) |

## Annexe B — Synthèse de couverture des compétences

| Compétence | Section | Réponse apportée (preuves clés) |
| --- | --- | --- |
| C4.1.1 — Mise à jour des dépendances | 1.1 | `npm audit` bloquant en CI (high/critical) ; correctif réel de 21 vulnérabilités front (commit `057cbfe`) sans régression |
| C4.1.2 — Supervision et alerte | 1.2 | Endpoint `/api/v1/health` testant la base, healthchecks Compose, readiness probes K8s, boucle de vérification post-déploiement, Prometheus par namespace, notifications Discord |
| C4.2.1 — Consignation des anomalies | 2.1, 2.2 | Processus à 5 canaux de détection, modèle de fiche, fiche réelle ANO-2026-06-10-01 reproductible |
| C4.2.2 — Correctif via CI/CD | 2.3 | Schéma complet du circuit fix → CI → CD, healthchecks bloquants, rollback `--atomic` |
| C4.3.1 — Axes d'amélioration | 3.1 | 5 recommandations argumentées gain/coût, priorisées, appuyées sur la dette documentée |
| C4.3.2 — Journal de version | 3.2 | 6 versions reconstituées avec fonctionnalités et anomalies corrigées, adossées au CHANGELOG_AGENT |
| C4.3.3 — Collaboration support | 3.3 | Canal Discord unique retours/CI-CD, cas réel résolu de bout en bout (forgot password, commit `fe9c0a9`) |

## Annexe C — Glossaire

| Terme | Définition dans le contexte du projet |
| --- | --- |
| **CD (déploiement continu)** | Pipeline qui construit les images et déploie automatiquement à chaque fusion validée ([cd.yml](.github/workflows/cd.yml)). |
| **CI (intégration continue)** | Validation automatique (tests, lint, audit, build) de chaque push ([ci.yml](.github/workflows/ci.yml)). |
| **Fiche de consignation** | Description structurée d'une anomalie (symptôme, reproduction, analyse, correctif) permettant de la traiter et de la tracer. |
| **Healthcheck / readiness probe** | Sonde vérifiant qu'un conteneur/pod est apte à recevoir du trafic ; conditionne démarrages et rollouts. |
| **MCO** | Maintien en Condition Opérationnelle — l'ensemble des activités assurant la disponibilité et la fiabilité d'un logiciel après sa mise en production. |
| **npm audit** | Commande détectant les vulnérabilités connues des dépendances installées ; exécutée avec seuil bloquant en CI. |
| **Rollback** | Retour automatique ou manuel à la version précédente après un déploiement échoué (`helm --atomic`, RUNBOOK). |

---

*Fin du dossier — Bloc 4. Les compétences C4.1.1, C4.1.2, C4.2.1, C4.2.2, C4.3.1, C4.3.2 et C4.3.3 sont chacune couvertes par une section dédiée avec preuves issues du dépôt.*
