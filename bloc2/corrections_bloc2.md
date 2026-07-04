# Corrections et compléments pour conception_et_developpement.docx

> Ce fichier liste toutes les erreurs trouvées dans le document et propose le texte corrigé/complété.
> Il suit la structure du document Word original section par section.

---

## ERREURS FACTUELLES CRITIQUES À CORRIGER EN PRIORITÉ

### ❌ ERREUR #1 — Service IA Python (inexistant)
Le document mentionne partout un **"service IA isolé en Python"**. Ce service n'existe pas.
L'intelligence artificielle sémantique est assurée par la bibliothèque **`@xenova/transformers`** intégrée directement dans l'API Node.js (`services/Semantic.service.js`). Il n'y a aucun conteneur Python dans le projet.

**Texte à utiliser en remplacement :**
> La correction sémantique des réponses en langage naturel (cartes Leitner et exercices ouverts) repose sur `@xenova/transformers` intégré à l'API Node.js. Ce modèle de traitement du langage naturel fonctionne sans serveur externe et calcule la similarité sémantique entre la réponse de l'étudiant et les réponses correctes de référence.

### ❌ ERREUR #2 — Dates de la section 3.7 (juillet-septembre 2025)
L'historique indique des dates de **2025**. L'ensemble du développement documenté a eu lieu en **juin 2026**.

### ❌ ERREUR #3 — Outils de validation ("zod/ajv")
Section 3.5 mentionne "validateBody (zod/ajv)". Le projet utilise **`express-validator`** (pas zod, pas ajv).

### ❌ ERREUR #4 — Tests "prévus" alors qu'ils sont livrés
La section 3.4 présente les tests comme à venir ("E2E Cypress à joindre"). En réalité : **724 tests back** (Jest + Supertest) et **130+ tests front** (Vitest) sont déjà exécutés et passent.

---

## SECTION 1 — Contexte du logiciel (TEXTE CORRIGÉ)

MyMemoMaster est une application web d'aide à la révision destinée en priorité aux étudiants, avec des fonctionnalités encadrées pour les enseignants et administrateurs. La plateforme centralise plusieurs outils de mémorisation et d'entraînement : cartes mentales interactives, révision espacée par l'algorithme de Leitner, exercices (QCM, texte à trou, phrase à constituer, réponse ouverte), tutoriels, calendrier avec gestion des échéances et des séances de révision, système de rappels automatiques par email, et module de planification de charge.

**Architecture technique :**
- Frontend web : **Vue.js 3** + Vite + Pinia (gestion d'état) + Tailwind CSS
- API métier : **Node.js 22** + Express.js v4 (architecture controller → service → model)
- ORM : **Sequelize v6** avec migrations CLI
- Base de données : **PostgreSQL** (production) / SQLite (développement local)
- Authentification : **JWT** (access token 15 min) + refresh token rotatif (7 jours) + bcryptjs
- Traitement NLP : **`@xenova/transformers`** intégré à l'API Node.js
- Queue asynchrone : **BullMQ + Redis** (rappels email différés)
- Conteneurisation : **Docker Compose** + Traefik (reverse proxy HTTPS, Let's Encrypt)
- CI/CD : **GitHub Actions** (lint + tests + build + déploiement VPS)

Cette architecture en couches strictes facilite la séparation des responsabilités, le test unitaire de chaque couche, et l'évolution indépendante du front et du back.

---

## SECTION 2.1 — Environnement de développement (TABLEAU COMPLÉTÉ)

| Élément | Description | Outils / preuve |
|---------|-------------|-----------------|
| Frontend | Vue.js 3 + Vite, composants métier, state Pinia, routing Vue Router | `my_memo_master_front/`, Tailwind CSS, Pinia persist |
| Backend | API Node.js 22, architecture controller → service → model, 18 entités | `my_memo_master_api/`, Express v4, Sequelize v6 |
| Base de données | SQLite en local (dev) / PostgreSQL en production Docker | `config/db.config.js`, `config/dbms.config.js` |
| Gestion de source | GitHub, branche `dev` d'intégration, branches `dev_back_*` / `dev_front_*` | Dépôt GitHub, conventions commits [ADD]/[IMP]/[REF]/[FIX] |
| Conteneurisation | Docker Compose orchestrant 5 services en local | `docker-compose.yml`, Dockerfile API + Front |
| Documentation API | Swagger/OpenAPI auto-générée depuis JSDoc des routes | `/api-docs` (swagger-ui-express) |
| Qualité code | ESLint v9 (back) + ESLint v8 + Prettier (front) | `npm run lint`, `npm run format` |
| Tests back | Jest + Supertest (724 tests intégration + unitaires) | `npm test` dans `my_memo_master_api/` |
| Tests front | Vitest + @vue/test-utils + @pinia/testing (130+ tests) | `npm test` dans `my_memo_master_front/` |
| Logging | Winston (tous les controllers) | `helpers/logger.js` |
| Envoi email | Nodemailer (SMTP configurable) | `helpers/sendEmail.js`, variables SMTP_* |
| Queue jobs | BullMQ + Redis (rappels asynchrones) | `jobs/reminder.queue.js`, `jobs/reminder.worker.js` |
| Migrations DB | Sequelize CLI (23 migrations) | `my_memo_master_api/migrations/` |
| Seeders | Sequelize CLI (rôles + user admin) | `my_memo_master_api/seeders/` |

---

## SECTION 2.3 — Protocole de déploiement continu (TEXTE CORRIGÉ)

Le déploiement continu est opérationnel via GitHub Actions. Le pipeline enchaîne automatiquement :

1. **Lint** : ESLint sur l'API et le front (0 erreur requise)
2. **Tests** : Jest (back) + Vitest (front) — 724 + 130+ tests
3. **Build** : `vite build` du frontend (détecte les erreurs TypeScript/imports)
4. **Déploiement préproduction** : push sur `dev` → build image Docker → push DockerHub → SSH VPS → `docker compose pull && docker compose up -d`
5. **Déploiement production** : push sur `main` → même pipeline → services production

La matrice CI est dynamique : une branche `dev_back_*` ne lance que les tests et le lint du back, une branche `dev_front_*` ne lance que les tests et le build du front, `main` et `dev` lancent les deux services en parallèle.

Le `server_docker_compose/docker-compose.yml` est valide par `docker compose config -q` dans le pipeline CD avant toute tentative de déploiement (gate de sécurité).

**Stratégie de retour arrière :** les images Docker sont taguées `latest` sur DockerHub. Un rollback consiste à repasser sur l'image précédente via `docker compose pull <tag_précédent> && docker compose up -d`. La procédure est documentée dans `docs/RUNBOOK.md`.

---

## SECTION 3.1 — Architecture logicielle (TEXTE ENRICHI)

L'API respecte une **architecture strictement en couches** :
- **Routes** (`routes/*.routes.js`) : déclaration des endpoints, middlewares, Swagger JSDoc
- **Controllers** (`controllers/*.controller.js`) : uniquement try/catch + appel service + réponse HTTP
- **Services** (`services/*.service.js`) : toute la logique métier, exportés comme singletons
- **Models** (`models/*.model.js`) : modèles Sequelize + associations

Aucune logique métier ne se trouve dans les controllers. Cette séparation permet de tester les services de façon isolée (mock des modèles) et les controllers de façon isolée (mock des services).

**Middlewares transversaux :**
- `Auth.middleware.js` : vérification JWT (Bearer token), injection `req.user = { id: userId }`
- `requireRole.middleware.js` : vérification RBAC (requête DB pour lire le roleId)
- `validate.middleware.js` : exécution des règles express-validator
- `sanitize.middleware.js` : nettoyage des entrées HTML
- `rateLimit.middleware.js` : 3 limiteurs (auth: 5 req/15min, register: 10/1h, API global: 200/15min)
- `errorHandler.middleware.js` : filet de sécurité global pour les erreurs non catchées

**18 entités back-end** avec CRUD complet : User, Role, Subject, Unit, Fields, FieldsType, Test, Question, Response, LeitnerSystem, LeitnerBox, LeitnerCard, Diagramme, Tutorials, OnboardingState, Kpi, CalendarEvent/EventOccurrence, ClassGroup, RevisionSession, Deadline, Reminder, Planning, Storage, Grading/Semantic, TestResult.

---

## SECTION 3.3 — Fonctionnalités développées (TABLEAU COMPLÉTÉ)

| Fonctionnalité | Besoin couvert | Éléments développés | État |
|----------------|----------------|---------------------|------|
| Authentification complète | Sécuriser l'accès, gérer les sessions | Register/login/logout, vérification email, reset password (SHA-256), access token 15 min + refresh token rotatif 7j, intercepteur Axios transparent | **Livré** |
| Gestion des rôles (RBAC) | Adapter l'accès selon le profil | 5 rôles (Admin plateforme, Étudiant, Enseignant, Admin établissement, Modérateur), `requireRole` middleware, `useRole()` composable front, guards Vue Router | **Livré** |
| Onboarding | Guider la première prise en main | `UserOnboardingState` : `tour_seen`, `checklist` JSON, endpoint GET/PUT, init lazy à l'inscription | **Livré** |
| Carte mentale (Mind Map) | Créer des schémas conceptuels interactifs | Éditeur front (nœuds, liens, zones, styles, auto-save), store Pinia `mindmapBuilder`, upload images nœuds (S3/local), format JSON blob, `diagrams/DOC_mindmap_editor.md` | **Livré** |
| Système de Leitner | Révision espacée avec progression | 5 boîtes, algo Leitner (bonne → +1, mauvaise → boîte 1), `next_review_at` dayjs, correction sémantique @xenova/transformers, session front complète, droits propriétaire/partagé | **Livré** |
| Exercices (4 types) | Créer, organiser, effectuer des exercices | QCM, texte à trou, phrase à constituer, réponse ouverte ; correction server-side (`POST /tests/:id/submit`) ; scores historisés (`TestResult`) ; éditeur + player front | **Livré** |
| Tutoriels | Accompagner l'usage et diffuser des ressources | CRUD tutoriels avec liens YouTube, filtres par thème, révision\_tips ; page front avec lecture intégrée | **Livré** |
| Calendrier + récurrence | Organiser les événements de cours | `CalendarEvent` avec occurrences matérialisées (mode auto/manuel), récurrence weekly/biweekly/monthly via dayjs, `Deadline` liée à une occurrence spécifique, protection RESTRICT | **Livré** |
| To-do et séances de révision | Suivre les tâches du jour | `RevisionSession` CRUD + marquage `isDone`, `GET /revision-sessions/today`, `TodoWidget` 4 onglets (À faire / Aujourd'hui / À venir / Terminé), affichage Deadlines intégré | **Livré** |
| Rappels automatiques (BullMQ) | Ne pas manquer une échéance ou séance | `Reminder` CRUD, queue BullMQ + worker Redis, job planifié avec délai précis, envoi email Nodemailer, statuts (pending/sent/failed), polling 5 min front (`NotificationBellComponent`) | **Livré** |
| Module Planning | Visualiser et prioriser la charge de travail | `GET /planning/load` (score pondéré : deadlines×5, sessions×3, cartes×1) + `GET /planning/priorities` (overdue/today/upcoming), agenda latéral `CalendarPage` | **Livré** |
| Profil utilisateur | Gérer ses informations personnelles | Modification profil, changement mot de passe (critères front + back), suppression compte (confirmation textuelle "SUPPRIMER"), déconnexion | **Livré** |
| Upload de fichiers | Stocker les pièces jointes et images | Upload S3 (Infomaniak/compatible) avec fallback disque local dev, `multerS3` dynamique, images mindmap (`/api/uploads/mindmaps/`), `POST /storage/upload` multi-fichiers | **Livré** |
| Infrastructure Docker + CD | Déployer de façon reproductible | Docker Compose local (5 services) + VPS (4 services), Traefik HTTPS/HSTS, Let's Encrypt, pipeline CD GitHub Actions, `backup.sh`, `docs/RUNBOOK.md` | **Livré** |

---

## SECTION 3.4 — Tests unitaires (TEXTE COMPLÉTÉ)

### Suite de tests back-end (Jest + Supertest) — 724 tests au total

| Périmètre | Type | Nombre | Fichier(s) |
|-----------|------|--------|-----------|
| Intégration API — controllers (18 entités) | Supertest | ~500 | `test/controllers/*.controller.test.js` |
| Auth middleware (JWT invalide, expiré, absent) | Unitaire | 7 | `test/middlewares/auth.middleware.test.js` |
| RequireRole middleware (RBAC) | Unitaire | 8 | `test/middlewares/requireRole.middleware.test.js` |
| Sécurité (CORS, rate limiting) | Intégration | 8 | `test/middlewares/security.test.js` |
| Moteur Leitner (algo boîtes, compteurs, droits) | Unitaire | 23 | `test/services/LeitnerCard.service.test.js` |
| Authentification bcrypt (verifyPassword, setPassword, create) | Unitaire | 6 | `test/services/User.service.test.js` |
| CalendarEvent service (récurrence, occurrences) | Unitaire | 25 | `test/services/CalendarEvent.service.test.js` |
| RevisionSession service | Unitaire | 14 | `test/services/RevisionSession.service.test.js` |
| Deadline service | Unitaire | 11 | `test/services/Deadline.service.test.js` |
| Reminder service | Unitaire | 13 | `test/services/Reminder.service.test.js` |
| Planning service | Unitaire | 13 | `test/services/Planning.service.test.js` |
| Session complète Leitner (BDD SQLite in-memory) | Fonctionnel end-to-end | 12 | `test/bdd/leitner.session.test.js` |
| Flux Deadline + Reminder (BDD SQLite in-memory) | Fonctionnel end-to-end | 15 | `test/bdd/deadline.reminder.test.js` |
| Moteur de correction exercices (4 types) | Unitaire | 16 | `test/services/Test.service.test.js` |
| Couche API Axios (get, post, put, del) | Unitaire | 20 | `my_memo_master_front/test/helpers/api.test.js` |

### Suite de tests front-end (Vitest + @vue/test-utils) — 130+ tests

| Périmètre | Type | Nombre | Fichier(s) |
|-----------|------|--------|-----------|
| Store Pinia leitnerCards (fetchDueCards, submitResponse) | Store | 7 | `test/stores/leitnerCards.store.test.js` |
| Composant FlashcardsSessionPage (session complète) | Composant | 13 | `test/components/FlashcardsSessionPage.test.js` |
| Composant TodoWidget (onglets, filtres, checkbox, tri) | Composant | 19 | `test/components/TodoWidget.test.js` |
| Composant NotificationBellComponent (badge, polling, dropdown) | Composant | 33 | `test/components/NotificationBellComponent.test.js` |
| Composant ProfilePage (saveProfile, changePassword, logout, suppression) | Composant | 17 | `test/components/ProfilePage.test.js` |
| Guard Vue Router (routes privées, redirection, meta.roles) | Router | 12 | `test/router/router.guard.test.js` |
| Composable useRole (5 rôles, computed, hasAnyRole) | Composable | 20 | `test/composables/useRole.test.js` |

**Commandes d'exécution :**
```bash
# Back-end
cd my_memo_master_api && npm test        # → 724/724 ✅

# Front-end
cd my_memo_master_front && npm test      # → 130+/130+ ✅
```

---

## SECTION 3.5 — Mesures de sécurité (TEXTE ENRICHI)

| Risque / exigence | Mesure mise en œuvre | Détail technique |
|-------------------|---------------------|-----------------|
| Authentification | JWT obligatoire sur toutes les routes privées via `Auth.middleware.js` | Bearer token, `jwt.verify()`, injection `req.user = { id }` |
| Session longue durée | Refresh token rotatif (opaque 128 chars hex) | Rotation à chaque renouvellement, révocation au logout, intercepteur Axios transparent |
| Reset de mot de passe | Token SHA-256 hashé en base | `crypto.randomBytes(32)`, hash stocké, token brut envoyé par email, expiration 30 min |
| Autorisation granulaire (RBAC) | `requireRole` middleware avec vérification DB | 5 rôles, vérification par requête DB (pas JWT), injection `req.user.roleId` |
| Anti-IDOR | Vérification ownership dans chaque service | `userId === req.user.id` sur toutes les opérations de modification/suppression |
| Validation des entrées | `express-validator` sur tous les endpoints POST/PUT | `validators/[Entity].validators.js` branché via `validate.middleware.js` |
| Injection HTML/XSS | `sanitize.middleware.js` | Nettoyage des champs texte libres avant persistance |
| Fuite d'informations | Aucun `error.message` interne exposé au client | Messages génériques en 500, logs internes Winston |
| Rate limiting | 3 limiteurs configurables via `.env` | Auth: 5 req/15min, Register: 10/1h, API global: 200/15min |
| CORS | Vérification côté serveur (pas uniquement navigateur) | Fonction `origin` avec whitelist `CORS_ORIGIN`, pas de header si origine non autorisée |
| Confiance proxy | `app.set('trust proxy', 1)` | Lecture IP depuis `X-Forwarded-For` Traefik (rate limiting efficace) |
| HTTPS + HSTS | Traefik + labels Docker Compose | Redirect HTTP→HTTPS (301), HSTS 2 ans + preload, Let's Encrypt automatique |
| Secrets | Variables d'environnement `.env` (exclus du dépôt) | `.gitignore`, `.env.example` fourni comme documentation |
| Données persistées front | JWT token uniquement dans localStorage | `pinia-plugin-persistedstate` avec `paths: ['token','user','authenticated']` |

---

## SECTION 3.7 — Historique des versions (CORRIGÉ)

| Lot / version | Date | Évolution | Preuve |
|---------------|------|-----------|--------|
| Socle technique + 18 entités CRUD | Juin 2026 (init) | Architecture controller→service→model, 18 entités, Swagger, JWT, SQLite/PostgreSQL, Docker Compose | `my_memo_master_api/`, `my_memo_master_front/` |
| Système Leitner (algo + front + tests) | 2026-06-03 → 06-10 | Algo répétition espacée (next_review_at, 5 boîtes), correction sémantique NLP, session front complète, 23 tests unitaires + 12 tests BDD | Branches `dev_back_leitner`, `dev_front_leitner` |
| Infrastructure Docker + CI/CD | 2026-06-11 → 06-12 | Docker Compose VPS, Traefik HTTPS/HSTS, pipeline CI (lint+tests+build), pipeline CD (DockerHub+SSH), RUNBOOK | `.github/workflows/`, `server_docker_compose/`, `docs/RUNBOOK.md` |
| Calendrier + Todo + Rappels BullMQ | 2026-06-10 → 06-14 | 6 entités calendrier, récurrence auto, todo list (isDone), BullMQ+Redis rappels email, NotificationBell polling | Branches `dev_back_calendar`, `dev_front_calendar` |
| Sécurité avancée (RBAC, refresh token, SHA-256) | 2026-06-14 → 06-17 | 5 rôles, requireRole middleware, refresh token rotatif, reset password SHA-256, guards Vue Router, useRole composable, ProfilePage tests | Branches `dev_back_security`, `dev_front_rbac` |
| Exercices (4 types + correction server-side) | 2026-06-19 → 06-21 | QCM/trou/reorder/open, `POST /tests/:id/submit`, TestResult historique scores, éditeur + player front | Branches `dev_back_exercises`, `dev_front_exercises` |
| Mind Map (upload images S3 + doc) | 2026-06-22 → 06-23 | Upload images nœuds multerS3 (fallback local), auto-resize, DOC_mindmap_editor.md | Branche `dev_back_refactor` |

---

## SECTION 4.1 — Cahier de recettes (SCÉNARIOS À REMPLIR avec les vrais résultats)

> Les scénarios ci-dessous sont basés sur les tests automatisés existants. Compléter la colonne "Résultat obtenu" après exécution manuelle en préproduction.

| Scénario | Résultat attendu | Résultat obtenu | Statut |
|----------|-----------------|-----------------|--------|
| Inscription → vérification email → connexion | 201 register, email envoyé, token JWT retourné au login, refresh token rotatif | *(À renseigner)* | *(À compléter)* |
| Reset password (token SHA-256) | Email reçu avec token 64 chars, `POST /reset-password` accepte le token, rejette un token incorrect | *(À renseigner)* | *(À compléter)* |
| Connexion avec access token expiré | Intercepteur Axios tente le refresh, si valide → retry transparent, si révoqué → redirect login | *(À renseigner)* | *(À compléter)* |
| Session Leitner complète | Cartes dues affichées, réponse soumise → feedback sémantique + changement de boîte, compteurs mis à jour | *(À renseigner)* | *(À compléter)* |
| Création exercice QCM + soumission | Exercice créé avec options, `POST /submit` retourne score + résultats, TestResult persisté | *(À renseigner)* | *(À compléter)* |
| Rappel BullMQ | Création rappel 30 min avant deadline → email reçu à l'heure, statut → "sent" dans NotificationBell | *(À renseigner)* | *(À compléter)* |
| Accès route privée sans token | 401 retourné, redirection front vers /auth | *(À renseigner)* | *(À compléter)* |
| Accès route admin par étudiant | 403 retourné par requireRole middleware | *(À renseigner)* | *(À compléter)* |
| Upload image mind map | Image uploadée sur S3 (prod) ou locale (dev), URL retournée, nœud redimensionné aux proportions | *(À renseigner)* | *(À compléter)* |
| Rate limiting auth | 6ème tentative de login en 15 min → 429 Too Many Requests | *(À renseigner)* | *(À compléter)* |

---

## SECTION 4.2 — Bugs réels corrigés (PLAN DE CORRECTION RÉEL)

| Référence | Description | Criticité | Correctif appliqué | Statut |
|-----------|-------------|-----------|-------------------|--------|
| BUG-01 | `OnboardingState.findByUserId` utilisait `req.params.id` (undefined) au lieu de `req.user.id` → retournait systématiquement 404 | Haute | `req.params.id` → `req.user.id` dans le controller | Corrigé (2026-06-06) |
| BUG-02 | `LeitnerCard.addCard/updateCard/deleteCard` lisaient `req.user.rights` (jamais défini) → 403 systématique | Haute | Remplacement par `resolveUserRights()` dans le service (requête DB) | Corrigé (2026-06-06) |
| BUG-03 | `Tutorials.create` ignorait silencieusement `subjectId` et `revision_tips` → toujours null en base | Haute | Correction destructuration dans le controller | Corrigé (2026-06-06) |
| BUG-04 | `CalendarPage` — mois 0-indexé (JS) vs mois 1-indexé (API) → events affichés avec 1 mois de décalage | Haute | `parseDateToKey()` soustrait 1 au mois API avant la clé | Corrigé (2026-06-12) |
| BUG-05 | `dotenv.config()` appelé après `require('./models')` → PG_HOST non défini → fallback SQLite involontaire en Docker | Haute | `dotenv.config()` déplacé en première ligne de `server.js` | Corrigé (2026-06-14) |
| BUG-06 | `Question.getQuestionsByTest` : alias Sequelize `as: "test"` manquant → erreur 500 sur `GET /questions/tests/:testId` | Moyenne | Ajout `as: "test"` dans `include` et correction colonne `idTest` → `testId` | Corrigé (2026-06-06) |
| BUG-07 | `OnboardingState.service.js` exportait la classe sans instanciation → `TypeError: X is not a function` en prod | Haute | `module.exports = OnboardingStateService` → `module.exports = new OnboardingStateService()` | Corrigé (2026-06-06) |
| BUG-08 | `SMTP_HOST/SMTP_USER` dans `server_docker_compose` remplacés par des vars `EMAIL_*` inexistantes → emails cassés silencieusement | Haute | Correction du compose serveur avec les vraies variables SMTP_* | Corrigé (2026-06-13) |
| BUG-09 | `router/index.js` vérifait `authStore.user.connectionToken` (jamais défini) → condition toujours fausse, guard partiel | Moyenne | Suppression du dead code, condition simplifiée à `authStore.token` | Corrigé (2026-06-17) |
| BUG-10 | `/calendar` déclarée `private: false` → page avec données personnelles accessible sans authentification | Haute (sécurité) | `private: true` dans `routes.js` | Corrigé (2026-06-17) |
| BUG-11 | `ForgotPasswordPage` et `ResetPasswordPage` utilisaient `.custom-border` et `.formulaire` non définies → mise en page cassée | Basse | Extraction dans `auth-form.css` partagé, import dans les 4 pages | Corrigé (2026-06-16) |
| BUG-12 | Reset password avec code 6 chiffres : entropie insuffisante (900 000 valeurs), stocké en clair | Haute (sécurité) | Migration vers token 64 chars hex, hash SHA-256 en base | Corrigé (2026-06-15) |

---

## SECTION 5 — Documentation technique (TEXTE ENRICHI)

### 5.1 Documentation disponible dans le projet

| Document | Contenu | Emplacement |
|----------|---------|-------------|
| Swagger/OpenAPI | Tous les endpoints documentés avec paramètres, réponses, schémas | `/api-docs` (en ligne), généré depuis `routes/*.routes.js` |
| Schéma BDD (ERD Mermaid) | 21 tables avec types, contraintes FK, index, comportements ON DELETE | `diagrams/schema_bdd.md` |
| Algorithme Leitner | Algo des 5 boîtes, calcul next\_review\_at, règles de session, droits | `diagrams/leitner_algo.md` |
| Règles métier Calendrier | Acteurs, modèle de données, règles récurrence, todo list, cas limites | `diagrams/calendar_rules.md` |
| Documentation éditeur Mind Map | Architecture composants, format JSON, store, helpers, tests | `diagrams/DOC_mindmap_editor.md` |
| RUNBOOK exploitation | Déploiement, mise à jour, rollback, backup/restauration, logs | `docs/RUNBOOK.md` |
| Conventions et décisions techniques | Stack, nommage, patterns, 30+ décisions architecturales justifiées | `.agents/CONVENTIONS.md`, `.agents/DECISIONS.md` |
| Changelog du projet | État de chaque module, fichiers créés/modifiés, hypothèses, dette | `.agents/CHANGELOG_AGENT.md` |

### 5.2 Manuel de déploiement (résumé)

**Prérequis :** Docker 24+, Docker Compose v2, accès SSH VPS, DNS configuré vers le VPS, variables `.env` renseignées.

**Déploiement initial :**
```bash
git clone <repo> && cd MyMemoMaster
cp .env.example .env           # renseigner PG_*, JWT_*, SMTP_*, S3_*, CORS_ORIGIN
docker compose up -d           # démarre 5 services (api, front, postgres, pgadmin, redis)
cd my_memo_master_api
npx sequelize-cli db:migrate   # applique les 23 migrations
npx sequelize-cli db:seed:all  # insère rôles + user admin
# Puis reset des séquences PostgreSQL (voir RUNBOOK.md)
```

**Mise à jour :**
```bash
docker compose pull && docker compose up -d   # met à jour les images
npx sequelize-cli db:migrate                   # applique les nouvelles migrations
```

**Rollback :** revenir au tag d'image précédent sur DockerHub, `docker compose up -d`.

### 5.3 Points de vigilance pour la mise à jour

- Les migrations Sequelize sont cumulatives et irréversibles en production (ne pas jouer `db:migrate:undo:all`)
- `LeitnerBox.intervall` est en secondes (valeurs dev : 5/10/15/20/30s) — à configurer en jours en production (86400, 259200, 604800…)
- Les séquences PostgreSQL doivent être remises à jour après tout `db:seed:all` avec IDs explicites (voir RUNBOOK.md)
- `BullMQ/Redis` : les jobs en attente sont perdus si Redis redémarre sans persistance AOF/RDB — les rappels actifs doivent être recréés

---

## CHECKLIST FINALE (mise à jour)

| Point de contrôle | Fait ? |
|-------------------|--------|
| Erreur Python AI service corrigée partout | ☐ |
| Dates section 3.7 corrigées (2025 → 2026) | ☐ |
| "zod/ajv" remplacé par "express-validator" | ☐ |
| Tests présentés comme livrés (724 back + 130 front) | ☐ |
| Modules manquants ajoutés (Calendrier, Rappels, Planning, RBAC) | ☐ |
| Bugs réels documentés (12 bugs corrigés) | ☐ |
| Documentation existante référencée (Swagger, ERD, RUNBOOK) | ☐ |
| Cahier de recettes rempli après exécution en préprod | ☐ |
| Placeholders et encadrés d'aide supprimés | ☐ |
| Chaque compétence C2.1.1 à C2.4.1 reliée à au moins une preuve concrète | ☐ |
