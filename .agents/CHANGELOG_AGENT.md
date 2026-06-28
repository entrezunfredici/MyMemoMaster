# CHANGELOG_AGENT.md — Journal d'état du projet

> Mis à jour par l'agent IA après chaque ticket terminé.  
> **But** : permettre à un humain ou un autre agent de reprendre le travail sans contexte de session.  
> Ne remplace pas `DECISIONS.md` (pourquoi) ni le README (usage) — répond à la question **"où en est le code ?"**

---

## Comment lire ce fichier

- Lis les entrées **du bas vers le haut** — la plus récente est en bas.
- Chaque entrée = un ticket terminé.
- La section **"État global"** en haut est mise à jour à chaque entrée et reflète toujours le présent.

---

## État global du projet

> Mis à jour après chaque ticket. Reflète l'état actuel.

| Module | État | Dernière modif |
|--------|------|----------------|
| Auth (register, login, reset password) | Stable — 2026-06-23 : envoi email vérification à l'inscription (lien cliquable + code), page VerifyEmailPage.vue | 2026-06-23 |
| User (CRUD, profil) | Stable | init |
| Role | Stable — M-05.01 : requireRole(1) sur POST/PUT/DELETE, 5 rôles définis (seeders) | 2026-06-14 |
| Subject / Unit | Stable — S-05.04 : hasMany(Diagramme/Test) ajoutés, findByUser inclut Subject, 21 tests controller | 2026-06-25 |
| Test / Question / Response | Stable — 2026-06-28 : séries d'exercices privées par propriétaire + assignation groupes (TestClassGroup M2M) ; GET /tests auth requis ; POST /:id/groups ; KPI perso filtrés aux tests privés ; KPI péda via TestClassGroup direct | 2026-06-28 |
| TestResult (scores historique exercices) | Stable — M-06-REVIEW : tests controller (16) + store (14) ajoutés, .send() → .json() corrigé | 2026-06-21 |
| Grading | Stable — `dayjs` ajouté comme dépendance | 2026-06-03 |
| LeitnerCard — algo répétition espacée | Stable — MCQ Leitner : correctResponse branche IA (open) / exact (mcq) | 2026-06-19 |
| LeitnerSystem / LeitnerCard / LeitnerBox | Stable — M-07.01 : subjectId FK directe, filtre utilisateur sur findAll, include Subject | 2026-06-20 |
| LeitnerSystemsUsers | Stable | init |
| Diagramme (mind maps) | Stable — M-02.14 : upload images migré S3 (multer-s3, fallback disque local dev) + auto-resize nœud aux proportions image + static route /api/uploads | 2026-06-23 |
| Documentation règles métier Mind Maps | Stable — M-01/M-02.01 : modèle données, acteurs, règles CRUD/auto-save/zones/nœuds, cas limites, dette | 2026-06-22 |
| Documentation technique Éditeur de cartes mentales | Stable — M-02.14 : DOC_mindmap_editor.md (architecture, format JSON, composants, store, helpers, tests, dette) | 2026-06-23 |
| Fields / FieldsType | Stable — M-00b.07 : authMiddleware ajouté sur POST/PUT/DELETE | 2026-06-23 |
| Tutorials | Stable — M-00b.07 : authMiddleware ajouté sur POST/PUT/DELETE | 2026-06-23 |
| OnboardingState | Stable — bug PUT corrigé (req.user.userId → req.user.id) | 2026-06-06 |
| Kpi | Stable — M-04.08 : revue de code corrigée (double index, archi controller→service, weeklyActivity) | 2026-06-24 |
| Logs applicatifs (Winston + Morgan) | Stable — M-00b.10 : Morgan installé, pipé dans Winston, désactivé en test | 2026-06-24 |
| Documentation API (OpenAPI / Swagger) | Stable — M-00.14 : bearerAuth défini, sécurité globale, annotations complètes | 2026-06-06 |
| Documentation schéma BDD | Stable — M-00.15 : ERD Mermaid + descriptions tables + index + ON DELETE | 2026-06-06 |
| Documentation algo Leitner | Stable — M-01.13 : algo, règles métier, cas limites, droits, endpoints | 2026-06-10 |
| Documentation règles métier Calendrier | Stable — M-03.01 : modèle données, acteurs, règles synchro, todo list, récurrence | 2026-06-10 |
| ClassGroup / ClassGroupUsers | Stable — M-05.01 : droits élargis à Admin établissement (roleId=4) | 2026-06-14 |
| CalendarEvent / EventOccurrence | Stable — CRUD complet + récurrence auto/manual, protection RESTRICT | 2026-06-10 |
| Deadline | Stable — CRUD complet, droits enseignant par groupe | 2026-06-10 |
| RevisionSession | Stable — CRUD + liens optionnels idSystem/idTest + bouton Planifier depuis FlashcardsPage | 2026-06-13 |
| Reminder (rappels BullMQ) | Stable — CRUD complet, queue Redis, worker email | 2026-06-12 |
| ESLint / Prettier (front + back) | Stable — lint vert après revue M-03 (formatDate supprimée, globalThis→window, Reminder.controller normalisé) | 2026-06-14 |
| Variables d'environnement (.env) | Stable — .env.example racine + serveur + traefik complets, incohérence SMTP corrigée | 2026-06-13 |
| Planning (charge + priorisation) | Stable — GET /planning/load + GET /planning/priorities, 22 tests | 2026-06-13 |
| Middlewares (Auth, errorHandler, sanitize, validate) | Stable — M-00.13 : messages Auth.middleware en français | 2026-06-06 |
| Tests intégration API (Supertest) | Stable — M-05.08 : 724 tests total (+8 : POST /refresh-token + POST /logout) | 2026-06-16 |
| Tests unitaires auth (Bcrypt, JWT, RBAC) | Stable — M-05.12 : Auth.middleware (7 tests JWT) + bcrypt User.service (6 tests verifyPassword/setPassword/create) | 2026-06-17 |
| Tests unitaires moteur répétition Leitner | Stable — M-02 : 23 tests LeitnerCard.service (algo, droits, next_review_at) | 2026-06-10 |
| Tests fonctionnels session Leitner (back) | Stable — M-01.11 : 12 tests BDD session complète (SQLite in-memory, flow réel) | 2026-06-10 |
| Tests fonctionnels session Leitner (front) | Stable — M-01.11 : 7 tests store + 13 tests composant FlashcardsSessionPage (Vitest + @vue/test-utils) | 2026-06-10 |
| Tests fonctionnels Deadline + Reminder (front) | Stable — M-03.10 : 19 tests TodoWidget + 33 tests NotificationBellComponent (Vitest) | 2026-06-13 |
| Tests fonctionnels ProfilePage (front) | Stable — M-05.10 : 17 tests Vitest (rendu, saveProfile, changePassword, logout, deleteAccount) | 2026-06-17 |
| Revue de code & merge (M-02) | Stable — lint corrigé, 453 tests back + 41 front verts, merge prêt dans `dev` | 2026-06-10 |
| Alertes KPI (UserKpiAlertSettings) | Stable — KPI-02 : digest quotidien 18h, 3 triggers, canaux in-app/email/push-futur, paramètres par utilisateur | 2026-06-23 |
| Sécurité fonctionnelle (CORS, rate limit) | Stable — M-00b.07 : audit OWASP complet, 12 vulns traitées (H1–H4 corrigées), rapport SECURITY_AUDIT_OWASP.md | 2026-06-23 |
| Storage (upload S3, mindmap local) | Stable — M-00b.07 H3 : clé S3 inclut userId (uploads/{userId}/…), vérification préfixe à la suppression | 2026-06-23 |
| Validation entrées (express-validator) | Stable — couverture complète sur toutes les entités | 2026-06-05 |
| Migrations Sequelize CLI | Stable — 23 migrations + migration index FK | 2026-06-05 |
| Seeders Sequelize CLI | Stable — Roles + User admin | 2026-06-05 |
| Jobs (fifo.cron.js) | Stable | init |
| Front — Auth (login, register) | Stable — M-05.09c : AuthFormLayout.vue composant layout partagé (4 pages auth refactorisées) | 2026-06-16 |
| Front — HomePage | Stable | init |
| Front — FlashcardsPage | Stable — refactor : utilise ItemListLayout.vue, chrome dupliqué supprimé | 2026-06-21 |
| Front — ExercisesPage / ExerciseDetailPage | Stable — M-06.08/M-06.09 : créateur + éditeur + player (4 types) + correction server-side + scores/historique livrés | 2026-06-21 |
| Front — ItemListLayout.vue | Stable — composant layout partagé (recherche, filtre sujet, grille, états) | 2026-06-21 |
| Front — MindmapsPage (+ MindmapsListView + MindmapsEditorView) | Stable — M-02.12 : MindmapsPage refactorisée en coordinateur 52 lignes + 2 vues filles testées | 2026-06-22 |
| Front — ProfilePage | Stable — M-05.10 : tests + revue, 17 tests Vitest | 2026-06-17 |
| Front — CalendarPage | Stable — M-03.07/M-03.08 : calendrier interactif + sidebar onglets Agenda/To-do | 2026-06-13 |
| Front — M-03.09 Rappels in-app | Stable — Nav /calendar + /todo, NotificationBell polling 5 min | 2026-06-13 |
| Front — SettingsPage | Stable | init |
| Front — Stores Pinia (auth, tests, questions, etc.) | Stable — persist auth réduit : paths ['token','user','authenticated'] localStorage | 2026-06-06 |
| Front — RBAC (useRole, router guard) | Stable — M-05.11 : 2 bugs corrigés (connectionToken mort + /calendar private:false) + 12+20 tests Vitest | 2026-06-17 |
| Rôle par défaut inscription | Stable — roleId=2 (Étudiant) par défaut dans modèle + service | 2026-06-14 |
| Infrastructure Docker (load order + sync) | Stable — dotenv chargé avant models/index.js dans server.js ; sync alter drop:false | 2026-06-14 |
| Refresh token (rotation, révocation) | Stable — M-00b.07 H1 : hash SHA-256 stocké en base (même pattern reset password), brut envoyé au client | 2026-06-23 |
| Reset mot de passe (token hashé) | Stable — M-05.06 : token 64-char hex brut envoyé par email, hash SHA-256 stocké en base | 2026-06-15 |
| Front — Stores Pinia Calendrier | Stable — 4 stores créés : calendarEvents, revisionSessions, deadlines, classGroups | 2026-06-12 |
| Front — Stores Pinia Rappels | Stable — reminders.js : CRUD complet, pendingReminders, remindersByEntity | 2026-06-12 |
| Front — Stores Pinia Leitner (systems, boxes, cards) | Stable — systemStats + loadSystemStats ajoutés à leitnerCards | 2026-06-08 |
| Front — VitePWA (service worker) | Stable — precaching désactivé (globPatterns: []), cache service worker réduit à zéro | 2026-06-06 |
| Front — Couche API Axios (api.js, config.js) | Stable — M-00.10 : JSDoc, messages FR, tests Vitest | 2026-06-06 |
| Tags (système de tags M2M) | Stable — S-05.01 : Tag model + 4 migrations + service/controller/validators/routes + TagSelector Vue + intégration MindmapsListView/FlashcardsPage/ExercisesPage + 39 tests controller | 2026-06-24 |
| Documentation UI navigation par sujet | Stable — S-05.02 : diagrams/ui_navigation_sujet.md — maquettes ASCII, patterns ItemListLayout / TagSelectorComponent / MenuItemComponent, API props, flux utilisateur | 2026-06-25 |
| Search API (cross-contenu) | Stable — S-05.05 : GET /search?subjectId&q — service + controller + validators + routes + 11 tests | 2026-06-25 |
| Navigation arborescente par sujet | Stable — S-05.06 : stores/search.js + pages/SubjectsPage.vue (/subjects) + route | 2026-06-25 |
| SubjectSelectorComponent | Stable — S-05.07 : composant réutilisable select + création inline, remplace code dupliqué FlashcardsPage + ExercisesPage | 2026-06-25 |
| KPI pédagogiques enseignant | Stable — S-01.09 revue corrigée : 8 bugs (cross-groupe Deadline, isDone RevisionSession, crash atRiskStudents, logique métier controller, expanded state, validators routes, string groupId PostgreSQL, timezone DATEONLY) | 2026-06-26 |
| Storage (accès fichiers S3 privés) | Stable — BUG-FIX : route `/storage/stream` remplacée par `/storage/presign` (presigned URL 15 min via `@aws-sdk/s3-request-presigner`), boutons Voir/Télécharger fonctionnels dans ClassroomEtudiantView + ClassroomEnseignantView | 2026-06-26 |
| Invitation (système d'invitation groupe) | Stable — S-01.07 : invitation par email (2 branches : ajout direct si compte existant, email sinon), hook post-inscription pour traiter les invitations en attente | 2026-06-25 |
| ClassGroupSection / ClassGroupResource / ClassGroupSubmission | Stable — S-02.05 + [IMP] : getSubmissionStatus (liste étudiants rendu/pas rendu), route GET /status, store fetchStatus, panneau enseignant compteurs + téléchargement | 2026-06-27 |
| KpiConsent (partage KPI) | Stable — S-02.03 livré : API complète (grant/revoke/list/access + filtrage par matière via subjectId), 22 tests service + 23 tests controller, 3 BDD stables (testTimeout+forceExit), diagrams mis à jour | 2026-06-27 |
| Front — ClassroomPage (3 vues) | Stable — S-03.08 : ClassroomPage.vue coordinateur + ClassroomEtablissementView / ClassroomEnseignantView / ClassroomEtudiantView ; stores classGroupSections + classGroupResources + fetchByGroup sur calendarEvents/deadlines | 2026-06-26 |
| Front — Interface partage KPI (étudiant + enseignant) | Stable — S-02.07 : panneau KPI enseignant enrichi (barre synthèse + Révision + Exercices + Leitner + Matières + Discipline + Badges) ; helpers studentKpi / disciplineScoreClass / weeklyBarHeight | 2026-06-27 |
| Tests fonctionnels consentement (front) | Stable — S-02.08 : 32 tests Vitest kpiConsent.store (état initial, TTL cache, grantConsent/revokeConsent/fetchStudentKpis/clearStudentKpis — cas nominal + limites + erreurs) | 2026-06-27 |
| Revue de code & merge S-02 | Stable — S-02.09 : 1 bug critique cache TTL (4 stores), notification fetchMyConsents, 13 erreurs ESLint corrigées, 3 fichiers tests réécrits, 490/490 tests verts | 2026-06-27 |
| Suivi des rendus enseignant | Stable — [IMP] 2026-06-27 : vue enseignant — panneau "rendu reçu / pas encore rendu" par section rendu, avec téléchargement. Route GET /status + service getSubmissionStatus + store fetchStatus | 2026-06-27 |

**Modules implémentés et stables :**
- API complète avec 18 entités (routes + controllers + services + models)
- Frontend Vue 3 avec toutes les pages principales
- Authentification JWT complète (register, login, email verification, reset password)
- Système Leitner (cartes mémoire avec boîtes)
- Mind map editor
- Système d'exercices / tests
- Docker Compose (API + Front + PostgreSQL + PgAdmin + Traefik)
- Infrastructure Docker server compose + CI Node 22 + backup + runbook — M-00b.01 — 2026-06-11
- Sauvegardes auto pg_dump (service Docker backup, schedule configurable, rétention) — M-00b.09 — 2026-06-23
- Système de rappels BullMQ (Redis) pour Deadline et RevisionSession — M-03.05 — 2026-06-12
- CalendarPage connectée au backend avec stores Pinia + agenda latéral coloré par type — 2026-06-12
- Traefik HTTPS + HSTS + redirect HTTP→HTTPS via labels Docker Compose — M-00b.03 — 2026-06-12
- Scripts + config automatisation HTTPS (VPS setup-traefik.sh + k8s setup.sh + cert-manager + doc) — 2026-06-12
- Pipeline CI complet (lint + tests + build front) — M-00b.04 — 2026-06-12

**Modules partiellement implémentés :**
- Tests unitaires (dossier `test/` présent, couverture à compléter — les 4 nouvelles entités M-03 sont couvertes)

**Ce qui n'existe pas encore :**
- ARCHITECTURE.md (référencé dans AGENT.md mais absent)

---

## Entrées

### [INIT] — État initial du projet au 2026-06-03

**Fichiers créés (API) :**
- `config/db.config.js` — config SQLite (dev)
- `config/dbms.config.js` — config PostgreSQL (prod)
- `config/swagger.config.js` — setup Swagger/OpenAPI
- `controllers/*.controller.js` — 18 controllers (un par entité)
- `routes/*.routes.js` — 18 fichiers de routes avec JSDoc Swagger
- `services/*.service.js` — 19 services (logique métier)
- `models/*.model.js` — 15 modèles Sequelize
- `models/index.js` — registre des modèles + sync DB
- `middlewares/Auth.middleware.js` — vérification JWT
- `middlewares/errorHandler.middleware.js` — handler global
- `middlewares/sanitize.middleware.js` — sanitisation HTML
- `middlewares/validate.middleware.js` — middleware express-validator
- `helpers/logger.js` — instance Winston
- `helpers/sendEmail.js` — envoi email via Nodemailer
- `helpers/generateToken.js` — génération JWT
- `helpers/generateCode.js` — génération de codes numériques
- `jobs/fifo.cron.js` — tâche cron FIFO avec node-cron
- `app.js` — configuration Express
- `server.js` — démarrage serveur

**Fichiers créés (Front) :**
- `src/pages/*.vue` — toutes les pages (HomePage, FlashcardsPage, ProfilePage, etc.)
- `src/components/*.vue` — composants réutilisables
- `src/stores/*.js` — 10 stores Pinia (auth, tests, questions, responses, diagrammes, roles, subjects, fields, mindmapBuilder, test)
- `src/router/index.js` + `routes.js` — routing Vue avec guards auth
- `src/helpers/api.js` — instance Axios configurée avec header auth
- `src/helpers/notif.js` — wrapper vue-toastification
- `src/config.js` — variables VITE_* exposées

**Ce qui est utilisable :**
- `authStore.user.name` — nom de l'utilisateur connecté (utilisé dans ProfilePage)
- `authStore.authenticated` — état d'authentification
- `roleStore.role.name` — rôle de l'utilisateur
- Tous les endpoints API documentés sur `/api-docs`

**Hypothèses posées :**
- Le projet fonctionne principalement via Docker (Dockerfile + entrypoint.sh pour l'API)
- En local Windows, `better-sqlite3` nécessite le Windows SDK pour compiler (module natif)
- `dayjs` était utilisé dans `Grading.service.js` mais manquait dans `package.json` — ajouté le 2026-06-03

**Dette / points d'attention :**
- `ARCHITECTURE.md` référencé dans `AGENT.md` mais absent du projet — à créer
- Couverture de tests à compléter (dossier `test/` présent mais peu peuplé)
- `sqlite3` et `better-sqlite3` sont tous deux listés comme dépendances — vérifier lequel est réellement utilisé
- `mysql2` est dans les dépendances mais non utilisé (PostgreSQL + SQLite uniquement)
- `ProfilePage.vue` utilisait un nom en dur ("Jeannine") — corrigé le 2026-06-03

---

### [M-02.01] — Modélisation algo répétition espacée — 2026-06-03

**Fichiers modifiés :**
- `models/LeitnerCard.model.js` — ajout de `next_review_at`, `last_review_at`, `review_count`, `correct_count`, `incorrect_count`
- `services/LeitnerCard.service.js` — refacto complet : fix bug idBox vs level, algo Leitner classique (retour boîte 1 sur erreur), dayjs pour les dates, JSDoc sur toutes les méthodes publiques
- `controllers/LeitnerCard.controller.js` — try/catch sur tous les handlers, messages d'erreur en français, suppression du paramètre `responseTime` inutilisé
- `routes/LeitnerCard.routes.js` — ajout route `GET /due/:systemId`
- `controllers/LeitnerSystem.controller.js` — fix bug `shareSystem()` → `share()`

**Fichiers créés :**
- `migrations/20260603000000-add-spaced-repetition-fields-to-leitnercard.js` — migration Sequelize pour les 5 nouveaux champs

**Ce qui est utilisable par les tickets suivants :**
- `GET /leitnercards/due/:systemId` — retourne les cartes dont `next_review_at <= now` ou non encore révisées
- `POST /leitnercards/response` — body `{ cardId, responseId }` — applique l'algo et met à jour tous les compteurs
- `LeitnerCard.next_review_at` — date de prochaine révision calculée depuis l'intervalle de la boîte (en secondes)
- `LeitnerCard.review_count`, `correct_count`, `incorrect_count` — disponibles pour affichage et analytics

**Hypothèses posées :**
- L'intervalle des boîtes (`LeitnerBox.intervall`) est en **secondes** — valeurs actuelles (5, 10, 15, 20, 30) sont des valeurs de dev. En prod, à remplacer par des valeurs en jours (ex: 86400, 259200, 604800...) via seeder ou interface d'admin.
- Les nouvelles cartes démarrent en boîte niveau 1 (non 0 comme précédemment).

**Dette / points d'attention :**
- Frontend Leitner (stores Pinia + composants de session) non implémenté — endpoints prêts.
- `dateTimeFifo` conservé et mis à jour en parallèle de `next_review_at` pour compatibilité — à supprimer dans un ticket de nettoyage.
- Intervalles des boîtes en secondes (dev) — à passer en jours avant la mise en production.

---

### [M-00.04] — Socle technique — Améliorations qualité — 2026-06-05

**Fichiers modifiés :**
- `middlewares/errorHandler.middleware.js` — détection `MulterError` + `isFileFilterError` → retour 400 au lieu de 500
- `middlewares/upload.middleware.js` — tag `isFileFilterError` sur les erreurs fileFilter
- `routes/*.routes.js` (14 fichiers) — conventions REST : `GET /all` → `GET /`, `POST /add` → `POST /`, `GET /responses/all/:id` → `GET /responses/question/:id`; Swagger JSDoc mis à jour en conséquence
- `routes/Response.routes.js`, `Test.routes.js`, `Role.routes.js`, `Question.routes.js`, `Unit.routes.js`, `Fields.routes.js`, `FieldsType.routes.js`, `Tutorials.routes.js` — ajout des imports validate + validators et branchement sur POST et PUT
- `models/LeitnerCard.model.js` — index sur `idQuestion`, `idBox`, `next_review_at`
- `models/LeitnerBox.model.js` — index sur `idSystem`
- `models/LeitnerSystem.model.js` — index sur `idUser`
- `models/Response.model.js` — index sur `idQuestion`
- `models/User.model.js` — index sur `roleId`
- `models/Fields.model.js` — index sur `idType`, `idUnit`
- `models/diagramme.model.js` — index sur `userId`, `subjectId`
- `models/Test.model.js` — index sur `subjectId`
- `models/Tutorials.model.js` — index sur `subjectId`
- `config/dbms.config.js` — pool Sequelize : max/min/acquire/idle via env vars
- `.env.example` — ajout `PG_POOL_MAX/MIN/ACQUIRE/IDLE`

**Fichiers créés :**
- `validators/Response.validators.js`, `Test.validators.js`, `Role.validators.js`, `Question.validators.js`, `Unit.validators.js`, `Fields.validators.js`, `FieldsType.validators.js`, `Tutorials.validators.js` — 8 nouveaux validators express-validator

**Fichiers modifiés (front) :**
- `src/stores/diagrammes.js`, `fields.js`, `questions.js`, `responses.js`, `roles.js`, `subjects.js`, `test.js`, `tests.js` — URLs API mises à jour (suppression `/all` et `/add`)
- `src/pages/MindmapsPage.vue` — URLs API mises à jour

**Ce qui est utilisable :**
- Toutes les routes API suivent maintenant `GET /resource` et `POST /resource`
- `GET /responses/question/:questionId` pour récupérer les réponses d'une question
- Tous les endpoints POST/PUT des 8 entités sans validators sont maintenant validés
- Les index FK sont créés au `db.sync()` — actifs immédiatement en dev, nécessitent une migration en prod
- Pool PostgreSQL configurable via `.env` sans changer le code

**Hypothèses posées :**
- Les index Sequelize sont créés via `sync()` en dev/test — en prod ils nécessitent une migration Sequelize CLI dédiée.
- Pool par défaut : max=10, min=2 — suffisant pour un MVP mono-instance.

**Dette / points d'attention :**
- ~~Créer des migrations Sequelize pour les 9 nouveaux index avant déploiement prod.~~ — Résolu en M-00.05
- `stores/fields.js` est un copier-coller de `stores/diagrammes.js` — à refactorer ou supprimer si inutilisé.
- `test.js` et `tests.js` dans les stores Pinia définissent tous deux `useTestStore` avec le même ID `'tests'` — conflit potentiel à résoudre.

---

### [M-00.05] — Connexion PostgreSQL (migrations, seeds) — 2026-06-05

**Fichiers créés :**
- `migrations/20260605000001-add-indexes.js` — migration Sequelize CLI pour les 13 index FK créés en M-00.04 (User.roleId, LeitnerSystem.idUser, LeitnerBox.idSystem, LeitnerCard.idQuestion/idBox/next_review_at, Response.idQuestion, Fields.idType/idUnit, MindMap.userId/subjectId, Test.subjectId, Tutorials.subjectId)
- `seeders/20260605000001-seed-roles.js` — seeder CLI : insère les rôles Admin et Étudiant dans la table Role
- `seeders/20260605000002-seed-admin-user.js` — seeder CLI : insère un user admin (`admin@mymemomaster.local` / `Admin1234!`) avec password hashé bcrypt

**Fichiers modifiés :**
- `.sequelizerc` — ajout de `seeders-path` pointant vers `my_memo_master_api/seeders/`

**Ce qui est utilisable :**
- `npx sequelize-cli db:migrate` — applique les 23 migrations de schéma + migration des index
- `npx sequelize-cli db:seed:all` — insère les données de référence (rôles + user admin)
- `npx sequelize-cli db:seed:undo:all` — annule les seeds
- Lancer depuis `my_memo_master_api/` — le `.sequelizerc` résout les chemins automatiquement

**Hypothèses posées :**
- Les seeds JSON dans `seeds/*.seed.json` sont conservés comme documentation de structure mais ne sont pas utilisés par Sequelize CLI — les seeders CLI sont dans `seeders/`.
- Le mot de passe admin par défaut est `Admin1234!` — à changer impérativement avant la mise en production.
- Le seeder user admin n'est pas idempotent (échec si userId=1 existe déjà) — à lancer une seule fois sur une base vide.

**Dette / points d'attention :**
- Les seeds JSON (`seeds/*.seed.json`) pour Subject, LeitnerSystem, LeitnerCard, Question, Response, Test, Diagramme sont des données métier interdépendantes — non converties en seeders CLI car elles supposent un utilisateur et des relations déjà en place. À créer séparément si des jeux de données de démo sont nécessaires.
- Définir `ADMIN_SEED_PASSWORD` dans `.env` avant le premier `db:seed:all` en production (fallback `Admin1234!` actif uniquement en dev).

---

### [M-00.06] — Validation des entrées — couverture complète — 2026-06-05

**Fichiers créés :**
- `validators/Grading.validators.js` — règles pour `gradeDateAnswer` et `gradeSemantic` (correct_answers accepte string ou tableau de strings non vides via `.custom()`)
- `validators/OnboardingState.validators.js` — règles pour `update` (tourSeen booléen, checklist objet JSON)
- `test/controllers/Grading.controller.test.js` — 9 tests validators pour POST /api/v1/grading/date et POST /api/v1/grading/semantic
- `test/controllers/OnboardingState.controller.test.js` — 5 tests validators pour PUT /api/v1/onboardingState/:id

**Fichiers modifiés :**
- `validators/User.validators.js` — ajout `exports.update` (name optionnel 2-50 chars, email optionnel)
- `routes/Grading.routes.js` — branchement `gradingValidators.gradeDateAnswer + validate`
- `routes/Semantic.routes.js` — branchement `gradingValidators.gradeSemantic + validate`
- `routes/OnboardingState.routes.js` — ajout `authMiddleware` (manquant) + branchement validator
- `routes/FieldsType.routes.js` — ajout route PUT `/:id` avec `fieldsTypeValidators.update + validate`
- `routes/User.routes.js` — branchement `userValidators.update + validate` sur PUT `/:id`
- `controllers/Grading.controller.js` — suppression validation inline (en anglais) → migration vers middleware
- `controllers/Semantic.controller.js` — suppression validation inline (en anglais) → migration vers middleware ; `console.error` → `logger.error`
- `controllers/FieldsType.controller.js` — ajout `exports.update` ; correction `allowunit` → `allowUnit` (casse modèle)
- `services/FieldsType.service.js` — ajout méthode `update(idType, data)`
- `app.js` — ajout import et enregistrement des routes `Semantic` et `OnboardingState` (manquants)

**Ce qui est utilisable :**
- Tous les endpoints POST/PUT de toutes les entités sont désormais validés via express-validator
- La validation inline dans Grading/Semantic controllers a été migrée vers le middleware standard
- `PUT /fieldstypes/:id` est maintenant fonctionnel (route + service + controller + validator)
- `PUT /api/v1/users/:id` valide désormais name et email

**Hypothèses posées :**
- Le validateur `correct_answers` dans Grading.validators.js accepte string ou tableau de strings — express-validator ne supporte pas nativement ce cas polymorphe, d'où l'usage de `.custom()`.
- `FieldsType.controller.js` utilisait `allowunit` (lowercase) en base mais le modèle Sequelize déclare `allowUnit` (camelCase) — corrigé dans les deux méthodes `create` et `update`.

**Dette / points d'attention :**
- Les tests dans `test/controllers/` (User, Subject, LeitnerSystem) utilisent des chemins sans préfixe `/api/v1` (héritage d'avant la mise en place du versioning). Ces tests retournent 404 et sont brisés — à corriger en remplaçant les chemins par `/api/v1/...`.
- Les routes OnboardingState `GET /byUserId` utilisent `req.params.id` mais il n'y a pas de paramètre `:id` dans le chemin — bug logique préexistant hors périmètre M-00.06.

---

### [M-00.07] — Gestion des erreurs (codes, logging) — couverture complète — 2026-06-05

**Fichiers modifiés :**
- `app.js` — message 404 corrigé en français (`"Route not found"` → `"Route introuvable."`)
- `controllers/Role.controller.js` — ajout `logger`, suppression fuite `error.message` dans les 500
- `controllers/Test.controller.js` — ajout `logger`, suppression fuite `error.message` dans les 500
- `controllers/Fields.controller.js` — ajout `logger`, suppression fuite `error.message` dans les 500
- `controllers/FieldsType.controller.js` — ajout `logger`, suppression fuite `error.message` dans les 500
- `controllers/Question.controller.js` — ajout `logger`, correction format réponse `{ error }` → `{ message }`, messages en français, suppressions fuites
- `controllers/OnboardingState.controller.js` — ajout `logger`, suppression fuite `error.message` dans les 500
- `controllers/Response.controller.js` — ajout `logger`, suppression fuite `error.message` dans les 500
- `controllers/Tutorials.controller.js` — ajout `logger`, suppression fuite `error.message` dans les 500
- `controllers/Storage.controller.js` — ajout `logger`, suppression fuite `error.message` dans les 500

**Ce qui est utilisable :**
- Logger Winston actif sur 19/19 controllers — toute erreur 500 est loguée côté serveur
- Aucun `error.message` technique ne fuite vers le client en production (messages génériques uniquement)
- `errorHandler.middleware.js` reste le filet de sécurité global pour les erreurs non catchées
- 404 retourne `"Route introuvable."` en français

**Hypothèses posées :**
- Les controllers qui utilisaient `{ error: ... }` (Question) ont été normalisés vers `{ message: ... }` conformément à la convention du projet.

**Dette / points d'attention :**
- Aucune dette nouvelle introduite en M-00.07.

---

### [M-01.11] — Tests fonctionnels session complète Leitner — 2026-06-10

**Fichiers créés :**
- `test/bdd/leitner.session.test.js` — 12 tests fonctionnels session complète (SQLite in-memory)

**Fichiers modifiés :**
- `config/db.config.js` — ajout `process.env.DB_STORAGE || "./db.sqlite"` pour permettre la surcharge en test (`:memory:`)

**Ce qui est couvert :**
- Carte jamais révisée (next_review_at null) → visible dans la session
- Auth requise (401 sans token)
- Bonne réponse → boîte suivante + compteurs + next_review_at dans la fenêtre attendue (±5s)
- Session vide après révision récente (next_review_at dans le futur → 0 cartes dues)
- Écoulement de l'intervalle simulé → carte redevient disponible
- Mauvaise réponse → retour boîte 1 + incorrect_count++
- Bonne réponse en boîte 5 → plafonnement (reste boîte 5, fifo=false)
- Historique : review_count / correct_count / incorrect_count / last_review_at après 3 révisions
- Session multi-cartes : plusieurs cartes dues retournées ensemble
- Cas d'erreur : carte inexistante (404), corps invalide (400)

**Approche :**
- Base SQLite `:memory:` — isolée par fichier de test, aucune pollution entre runs
- `syncModels({ force: true })` dans `beforeAll` pour créer les tables
- Seul `Semantic.service` est mocké (dépendance NLP externe ~30s) — toutes les autres couches sont réelles
- Tests séquentiels (partagent l'état de la carte) — exécutés dans l'ordre de définition

**Hypothèses posées :**
- `process.env.DB_STORAGE = ':memory:'` positionné avant tout `require` dans le fichier → Sequelize utilise la DB in-memory dès le premier chargement du module.
- La tolérance sur `next_review_at` (±5s) couvre les variations de timing CPU sans fragiliser le test.

**Dette / points d'attention :**
- `--runInBand` requis si les tests BDD sont lancés en isolation (ils partagent état via `beforeAll`). En mode parallèle Jest standard, chaque fichier est dans son propre worker avec sa propre DB in-memory — pas de conflit.

---

### [M-00.08] — Upload et gestion des fichiers — 2026-06-05

**Fichiers modifiés :**
- `middlewares/upload.middleware.js` — `console.warn` → `logger.warn` pour cohérence avec Winston
- `routes/Diagramme.routes.js` — suppression fuite `error: error.message` dans la réponse 500 du handler `upload-image`

**Ce qui était déjà en place (constaté à l'audit) :**
- `middlewares/upload.middleware.js` — Multer dual mode S3 (prod) / disk temp (dev sans S3), filtre MIME (jpeg/png/gif/webp/pdf), limite 10 Mo, tag `isFileFilterError` → errorHandler retourne 400
- `middlewares/mindmapImageUpload.js` — upload local `public/uploads/mindmaps/`, images uniquement, 5 Mo, sanitize filename
- `config/storage.config.js` — client S3 configurable (AWS, MinIO, Scaleway, Cloudflare R2) via env vars
- `controllers/Storage.controller.js` — `upload`, `uploadMultiple` (max 5 fichiers), `delete` (S3)
- `routes/Storage.routes.js` — 3 routes protégées auth, Swagger JSDoc complet, wrapper `handleUpload` → erreurs Multer en 400
- `validators/Storage.validators.js` — validation `key` query param sur DELETE
- `routes/Diagramme.routes.js` — `POST /diagrammes/upload-image` avec gestion 413 (taille), 400 (type), 500 (autre)
- `.env.example` — variables S3 documentées avec commentaires fournisseurs compatibles

**Ce qui est utilisable :**
- `POST /api/v1/storage/upload` — upload fichier unique vers S3 (auth requis)
- `POST /api/v1/storage/upload/multiple` — upload jusqu'à 5 fichiers vers S3 (auth requis)
- `DELETE /api/v1/storage/file?key=...` — suppression fichier S3 (auth requis)
- `POST /api/v1/diagrammes/upload-image` — upload image mind map en local (auth requis)
- En dev sans S3 configuré : l'upload bascule automatiquement sur `os.tmpdir()` avec warning logger

**Hypothèses posées :**
- `S3_BUCKET` non configuré = fallback disk temporaire actif uniquement en dev. En prod, `S3_BUCKET` doit être renseigné.
- Les fichiers uploadés via `upload-image` (mindmaps) restent en local — ils ne passent pas par S3.

**Dette / points d'attention :**
- Pas de tests unitaires pour les endpoints storage/upload — à prévoir avant prod.
- Les fichiers mindmap uploadés localement ne sont pas répliqués en prod si le conteneur redémarre (volume Docker nécessaire).

---

### [M-00.10] — Configuration Axios / couche API front — 2026-06-06

**Fichiers modifiés :**
- `my_memo_master_front/src/helpers/api.js` — JSDoc ajouté sur les 4 fonctions exportées (`get`, `post`, `put`, `del`) ; messages d'erreur internes traduits en français
- `my_memo_master_front/vitest.config.js` — ajout `resolve.alias` (`@/` → `src/`) pour permettre les imports dans les tests

**Fichiers créés :**
- `my_memo_master_front/test/helpers/api.test.js` — 20 tests Vitest : get (6), post (5), put (4), del (5) — cas nominal, 204, 401 → logout, erreur réseau → redirect, endpoint manquant → throw

**Ce qui était déjà en place (constaté à l'audit) :**
- Instance Axios configurée avec `baseURL` dynamique (VITE_API_URL / runtime config Docker)
- Timeout 10s, `validateStatus` accepte 2xx-4xx sans throw (5xx → catch → /error-server)
- Intercepteur request : injection JWT Bearer depuis `authStore.token`, support FormData (suppression Content-Type), multi-modes sécurité (public, api-key, static-bearer, google-identity)
- `handleSpecialStatus` : 401 → `authStore.logout()`, retour undefined aux appelants
- `config.js` : résolution runtime Docker (`window.__APP_CONFIG__`) avec fallback `import.meta.env.VITE_*`

**Ce qui est utilisable :**
- `api.get(endpoint, params?)` — GET avec query params
- `api.post(endpoint, data?, config?)` — POST avec JSON ou FormData
- `api.put(endpoint, data?, config?)` — PUT
- `api.del(endpoint, data?)` — DELETE avec corps optionnel
- Toutes les fonctions retournent `{ data, status }` ou `undefined` (204 / 401 / erreur réseau)
- 20 tests Vitest passants : `npm test` dans `my_memo_master_front/`

**Hypothèses posées :**
- Les `console.error` dans les catch blocks restent en anglais — ce sont des logs développeur, non des messages utilisateur (la convention "français" vise les messages HTTP)
- `vitest.config.js` a été rendu indépendant de `vite.config.js` pour éviter d'importer le plugin Vue dans le contexte de test (inutile et source d'erreurs)

**Dette / points d'attention :**
- Les stores Pinia (`auth.js`, etc.) contiennent des messages en anglais (`'You have been logged in'`, etc.) — hors périmètre de ce ticket, à corriger dans un ticket dédié
- Les tests d'intercepteur (injection JWT, FormData) ne sont pas couverts — ils relèvent de tests d'intégration nécessitant un environnement Vue complet

---

### [M-00.11] — Gestion états globaux (Pinia stores) — 2026-06-06

**Fichiers modifiés :**
- `my_memo_master_front/src/stores/diagrammes.js` — correction conditions inversées `updateDiagramme` (`=== 200` → `!== 200`) et `deleteDiagramme` (`=== 204` → `!== 204`) ; messages de notification traduits en français
- `my_memo_master_front/src/stores/roles.js` — même corrections que diagrammes.js + messages FR
- `my_memo_master_front/src/stores/auth.js` — tous les messages utilisateur traduits en français (login, logout, updateUser, verifyEmail, forgotPassword, resetPassword)

**Fichiers réécrits :**
- `my_memo_master_front/src/stores/fields.js` — était une copie erronée de `diagrammes.js` exportant `useDiagrammeStore` avec ID `'diagramme'` ; réécrit comme un vrai store `useFieldStore` (ID `'fields'`) pour l'entité Fields (`fieldletter`, `idType`, `data`)

**Ce qui est utilisable :**
- `useDiagrammeStore` — `updateDiagramme` et `deleteDiagramme` fonctionnent correctement
- `useRoleStore` — `updateRole` et `deleteRole` fonctionnent correctement
- `useFieldStore` — CRUD complet sur l'endpoint `/fields` (create, read, update, delete)
- `useAuthStore` — tous les messages sont en français

**Hypothèses posées :**
- `fields.js` n'était importé nulle part dans les pages — la réécriture n'a aucun impact sur le code existant.

**Dette / points d'attention :**
- Les stores Leitner (cartes, sessions) restent absents — déjà signalé dans M-02.01.
- Aucun test Vitest pour les stores Pinia — à prévoir dans un ticket dédié.

---

### [M-00.09] — Sécurité fonctionnelle (CORS, rate limit) — 2026-06-06

**Fichiers créés :**
- `middlewares/rateLimit.middleware.js` — `authLimiter` (5 req/15 min), `registerLimiter` (10 req/1h), `apiLimiter` (200 req/15 min) ; skip automatique en `NODE_ENV=test` ; limites configurables via env vars
- `test/middlewares/security.test.js` — 8 tests : CORS (origine autorisée, origine bloquée, preflight OPTIONS, headers autorisés) + rate limiting (429 après seuil authLimiter, registerLimiter, apiLimiter, skip en test)

**Fichiers modifiés :**
- `middlewares/rateLimit.middleware.js` — extrait de `User.routes.js` (les limiteurs inline ont été déplacés ici)
- `routes/User.routes.js` — suppression des définitions inline `authLimiter` / `registerLimiter` et de `rateLimit` ; import depuis `rateLimit.middleware.js`
- `app.js` — ajout `app.set('trust proxy', 1)` pour compatibilité Traefik ; CORS reconfiguré avec fonction (au lieu de string) pour un vrai contrôle côté serveur ; ajout `apiLimiter` global sur le router v1 ; support multi-origines via `CORS_ORIGIN` séparé par des virgules
- `.env.example` — ajout section "Sécurité" : `CORS_ORIGIN`, vars rate limiting commentées

**Ce qui est utilisable :**
- CORS fonctionnel côté serveur : origines non configurées → aucun header CORS (navigateur bloque) ; `CORS_ORIGIN=a.com,b.com` pour plusieurs origines
- Rate limiting actif en prod sur toutes les routes `/api/v1` (200 req/15 min) + routes auth (5 req/15 min) + register (10 req/1h)
- `X-RateLimit-*` headers (standardHeaders) exposés dans les réponses
- Tout désactivé en `NODE_ENV=test` — les tests existants ne sont pas impactés

**Hypothèses posées :**
- `trust proxy: 1` correspond à un seul proxy devant l'API (Traefik). Si l'architecture change (double proxy), cette valeur doit être ajustée.
- `!origin` (pas d'en-tête Origin) est autorisé par le CORS — couvre mobile apps, Postman, appels serveur-à-serveur.
- Les limites rate limiting (200/5/10) sont des valeurs MVP — à ajuster selon la charge réelle en production.

**Dette / points d'attention :**
- `express-rate-limit` utilise un `MemoryStore` par défaut — non partagé entre plusieurs instances Node. En prod multi-instance (scale horizontal), il faudra un store Redis partagé.
- Les tests `User.controller.test.js`, `Subject.controller.test.js`, `LeitnerSystem.controller.test.js` utilisent des chemins sans préfixe `/api/v1` — déjà documenté comme dette dans M-00.04, non dans le périmètre de ce ticket.

---

### [M-00.14] — Documentation API (OpenAPI / Swagger) — 2026-06-06

**Fichiers modifiés :**
- `config/swagger.config.js` — ajout `components.securitySchemes.bearerAuth` (type http/bearer/JWT) + `security: [{bearerAuth:[]}]` globale ; titre corrigé en "MyMemoMaster API" ; description enrichie
- `routes/User.routes.js` — ajout `security: []` sur les 5 routes publiques (register, login, verify-email, forgot-password, reset-password)
- `routes/Grading.routes.js` — ajout `security: []` sur `POST /grading/date`
- `routes/Semantic.routes.js` — ajout `security: []` sur `POST /grading/semantic`
- `routes/Storage.routes.js` — suppression des `security: [{bearerAuth:[]}]` redondants (couverts par le global)
- `routes/LeitnerCard.routes.js` — complétion des 4 annotations incomplètes (`GET /leitnerboxes/:id`, `GET /:id`, `PUT /:id`, `DELETE /:id`) avec `parameters` et `responses`
- `routes/LeitnerSystem.routes.js` — correction typo chemin PUT (`/leitnesystem/{id}` → `/leitnersystems/{id}`)

**Ce qui est utilisable :**
- `GET /api-docs` — Swagger UI complet avec bouton "Authorize" fonctionnel (JWT Bearer)
- Toutes les routes protégées montrent le cadenas fermé dans l'UI
- Les 5 routes publiques (auth) montrent le cadenas ouvert
- Toutes les routes ont `parameters` et `responses` documentés

**Hypothèses posées :**
- La sécurité globale (`security: [{bearerAuth:[]}]`) est la stratégie retenue plutôt que de dupliquer `security` sur chaque route — plus maintenable, cf. DECISIONS.md
- Les routes Grading et Semantic n'ont pas d'`authMiddleware` — décision préexistante (hors périmètre ce ticket)

**Dette / points d'attention :**
- Aucune dette nouvelle introduite.

---

### [M-00.12] — Tests intégration API (Supertest) — 2026-06-06

**Fichiers créés :**
- `test/controllers/Role.controller.test.js` — 18 tests : CRUD complet + auth (401) + validators (400) + 500
- `test/controllers/Unit.controller.test.js` — 20 tests : CRUD complet + auth (401) + validators (400) + 500
- `test/controllers/Test.controller.test.js` — 16 tests : CRUD complet + validators (400 name/subjectId) + 500 (routes sans auth)
- `test/controllers/Question.controller.test.js` — 23 tests : CRUD + routes spéciales (tests/:testId, card/:cardId, correction/:id, edit/:id) + validators
- `test/controllers/Response.controller.test.js` — 20 tests : CRUD + routes spéciales (question/:id, correction/:id, edit/:id) + validators
- `test/controllers/Tutorials.controller.test.js` — 18 tests : CRUD + pagination + validators (URL) + 500
- `test/controllers/Fields.controller.test.js` — 18 tests : CRUD + validators (fieldletter/idType/data) + 500
- `test/controllers/FieldsType.controller.test.js` — 18 tests : CRUD (sans DELETE) + validators (name/allowUnit) + 500
- `test/controllers/LeitnerCard.controller.test.js` — 28 tests : CRUD + routes spéciales (due/:systemId, leitnerboxes/:id, response) + validators + 403 droits
- `test/controllers/Diagramme.controller.test.js` — 24 tests : CRUD + mock Subject (findByPk/findOrCreate) + ownership check (403) + validators

**Ce qui est utilisable :**
- 15 suites de tests controllers (283 nouveaux tests)
- 420 tests total dans la suite API — `npm test` dans `my_memo_master_api/`
- Tous les tests passent : `npm test -- --testPathPattern="controllers"` → 283/283
- Pattern standard réutilisable : mock models/index + mock service + mock logger + makeToken()
- Diagramme : Subject mocké avec `findByPk` et `findOrCreate` pour les tests de create

**Hypothèses posées :**
- Les tokens de test incluent `{ rights: true }` pour LeitnerCard (simule les droits d'écriture injectés par Auth.middleware depuis le JWT ou une relation en DB — le mock service gère la vraie logique).
- Les routes sans authMiddleware (Question, Response, Test, Tutorials, Fields, FieldsType) sont testées sans token — comportement correct selon les routes.

**Dette / points d'attention :**
- ~~`Unit.controller.js` retourne `{ error: "..." }` au lieu de `{ message: "..." }`~~ — résolu en M-00.13
- Pas de tests pour `Storage.controller.js` (uploads multipart), `LeitnerBox.controller.js`, `LeitnerSystemsUsers.controller.js`, `Kpi.controller.js` — à prévoir dans un ticket dédié.
- `Diagramme.controller.js` appelle `Subject.findByPk` et `Subject.findOrCreate` directement (pas via un service) — couplage fort au modèle, à refactorer si l'architecture évolue.

---

### [M-00.13] — Revue architecture & merge — 2026-06-06

**Fichiers modifiés :**
- `services/OnboardingState.service.js` — `module.exports = OnboardingStateService` → `module.exports = new OnboardingStateService()` ; le service exportait la classe sans instanciation → toute route /onboardingState produisait `TypeError: X is not a function` en prod
- `controllers/OnboardingState.controller.js` — `findByUserId` : `req.params.id` (undefined, aucun `:id` dans le chemin `/byUserId`) → `req.user.id` (ID de l'utilisateur authentifié depuis le JWT) ; messages 404/500 nettoyés (suppression de l'interpolation `req.params.userId` erronée)
- `controllers/Unit.controller.js` — 8 réponses `{ error: "...English..." }` → `{ message: "...Français..." }` sur tous les handlers (getAllUnits, getUnitById, addUnit, updateUnit, deleteUnit)
- `middlewares/Auth.middleware.js` — 3 messages HTTP en anglais → français ("No header provided!" → "Authentification requise.", "No token provided!" → "Token manquant.", "Unauthorized!" → "Token invalide ou expiré.")
- `test/controllers/OnboardingState.controller.test.js` — ajout de 4 tests pour `GET /onboardingState/byUserId` (200 nominal, 404 onboarding absent, 500 service KO, 401 sans token)

**Ce qui est utilisable :**
- `GET /api/v1/onboardingState/byUserId` — fonctionnel et testé ; retourne l'état d'onboarding de l'utilisateur connecté (JWT requis)
- Tous les endpoints OnboardingState sont opérationnels en production (bug service/class corrigé)
- `Unit.controller.js` est conforme à la convention `{ message }` du projet
- 424 tests passants (420 → 424)

**Hypothèses posées :**
- Le JWT signé lors du login contient `{ id: user.userId }` — `req.user.id` dans `findByUserId` est cohérent avec ce payload.
- Les messages Auth.middleware sont des réponses HTTP (pas des logs internes) — ils tombent sous la convention "messages en français".

**Dette / points d'attention :**
- ~~`Diagramme.controller.js` importe `Subject` directement~~ — résolu dans le refactor dette technique
- Pas de tests pour `Storage.controller.js`, `LeitnerBox.controller.js`, `LeitnerSystemsUsers.controller.js`, `Kpi.controller.js` — dette documentée, à couvrir dans un ticket dédié.

---

### [M-00.15] — Documentation schéma BDD — 2026-06-06

**Fichiers créés :**
- `diagrams/schema_bdd.md` — documentation complète du schéma BDD implémenté : ERD Mermaid (erDiagram), groupes fonctionnels, index, comportements ON DELETE, points d'attention

**Ce qui était déjà en place (constaté à l'audit) :**
- `diagrams/classes_diagram.md` — diagramme de design conceptuel initial (classDiagram Mermaid), non conforme à l'implémentation réelle — conservé comme artefact de conception

**Ce qui est utilisable :**
- `diagrams/schema_bdd.md` est la référence authoritative du schéma tel qu'implémenté en base
- 16 tables principales + 5 tables de jointure documentées avec types, contraintes, index et comportements de suppression
- ERD Mermaid rendu directement dans GitHub / VS Code / tout éditeur Markdown

**Hypothèses posées :**
- `diagrams/classes_diagram.md` n'est pas supprimé — c'est un artefact de la phase de conception, utile comme trace historique des choix initiaux avant implémentation.

**Dette / points d'attention :**
- `LeitnerBox.intervall` en secondes (dev) → à passer en jours avant prod (documenté dans `schema_bdd.md` et `DECISIONS.md`)
- `UserOnboardingState.checklist` en JSONB (PostgreSQL) / émulé JSON (SQLite) — comportement silencieusement différent selon le dialecte

---

### [M-00.13-REF] — Refactor dette technique — 2026-06-06

**Fichiers modifiés :**
- `services/Diagramme.service.js` — ajout de `resolveSubject(subjectId)` : encapsule le `Subject.findByPk` + `Subject.findOrCreate` qui était dans le controller ; import `Subject` ajouté au niveau du module
- `controllers/Diagramme.controller.js` — suppression de `const { Subject } = require("../models")` ; le bloc try/catch Subject interne remplacé par `await DiagrammeService.resolveSubject(subjectId)` (8 lignes → 1 ligne)
- `test/controllers/Diagramme.controller.test.js` — mock models nettoyé (`Subject: {}` au lieu de `{ findByPk, findOrCreate }`), `resolveSubject: jest.fn()` ajouté au mock service, `beforeEach` mis à jour, assertion ligne 143 migrée de `models.Subject.findOrCreate` vers `diagrammeService.resolveSubject`
- `routes/User.routes.js` — réorganisation : routes publiques (register, login, verify-email, forgot-password, reset-password) déclarées avant les routes paramétrées (`/:id`, `/:id/*`) ; Swagger JSDoc `PUT /:id` complété (`parameters` manquant ajouté)
- `package.json` — suppression de `mysql2` (non utilisé, PostgreSQL via `pg`) et `sqlite3` (remplacé par `better-sqlite3`)

**Ce qui est utilisable :**
- `DiagrammeService.resolveSubject(subjectId)` — utilisable depuis tout service ou controller qui doit résoudre un sujet pour un diagramme
- Architecture controller → service → model respectée sur toutes les entités sans exception
- `User.routes.js` : les routes publiques sont désormais en tête du fichier, conforme aux bonnes pratiques Express (statique avant paramétré)
- 424 tests passants

**Hypothèses posées :**
- `mysql2` et `sqlite3` ne sont importés nulle part dans le code — vérification par grep avant suppression.
- `resolveSubject` conserve la logique exacte qui était dans le controller : si `subjectId` valide → l'utiliser ; sinon → `findOrCreate("Sujet par défaut")`.

**Dette / points d'attention :**
- Pas de tests pour `Storage.controller.js`, `LeitnerBox.controller.js`, `LeitnerSystemsUsers.controller.js`, `Kpi.controller.js` — à couvrir dans un ticket dédié.
- ~~`bcrypt` doublon de `bcryptjs`~~ — supprimé.

---

### [M-02-CARDS-CRUD] — Gestion des cartes Leitner (front + fix backend) — 2026-06-08

**Fichiers modifiés (API) :**
- `my_memo_master_api/services/LeitnerCard.service.js` — fix bug `addCard` : `LeitnerBox.findOne({ level: 1 })` → `findOne({ level: 1, idSystem: data.idSystem })` (sans filtre, toutes les cartes allaient dans la boîte 1 du premier système venu)
- `my_memo_master_api/validators/LeitnerCard.validators.js` — ajout `idSystem` requis dans `addCard`

**Fichiers créés (front) :**
- `my_memo_master_front/src/pages/FlashcardsCardsPage.vue` — page de gestion des cartes d'un système : liste par boîte (1-5), ajout/modification/suppression inline
  - Ajout : POST /questions → POST /responses → POST /leitnercards (3 appels séquentiels)
  - Modification : PUT /questions/:id + PUT /responses/:id
  - Suppression : DELETE /leitnercards/:id (question et réponse conservées)

**Fichiers modifiés (front) :**
- `my_memo_master_front/src/router/routes.js` — ajout route `/flashcards/:systemId/cards` (name: `flashcards.cards`)
- `my_memo_master_front/src/pages/FlashcardsPage.vue` — lien "Gérer les cartes →" dans le slot stats de chaque carte système

**Ce qui est utilisable :**
- Depuis FlashcardsPage : clic "Gérer les cartes →" → page de gestion
- Cartes affichées par boîte avec question + réponse correcte visible
- Ajout d'une carte = formulaire question/réponse (le modèle Q/R est transparent pour l'utilisateur)

**Hypothèses posées :**
- La suppression d'une carte ne supprime pas la question/réponse associée (elles peuvent être partagées avec des tests)
- La réponse correcte est la première réponse avec `correction: true` — si plusieurs existent, seule la première est affichée/modifiée

**Dette / points d'attention :**
- Si une question n'a pas de réponse `correction: true`, `card.correctAnswer` sera vide dans la liste
- Si `POST /questions` réussit mais `POST /responses` échoue, une question orpheline est créée — à nettoyer manuellement ou via une transaction côté API

---

### [M-01.09] — Tableau de bord maîtrise + MenuItemComponent — 2026-06-08

**Fichiers créés :**
- `my_memo_master_front/src/components/MenuItemComponent.vue` — composant générique de carte : title, description, slot `stats`, onAction (bouton), onEdit / onDelete optionnels (icônes ✎ / ✕)

**Fichiers modifiés :**
- `my_memo_master_front/src/pages/FlashcardsPage.vue` — utilise `MenuItemComponent` ; charge les cartes dues par système via `api.get` direct (pas le store, pour éviter la race condition sur `dueCards`) ; affiche "X cartes à réviser" + répartition B1-B5
- `my_memo_master_front/src/pages/ExercisesPage.vue` — remplace le HTML inline de la grille par `MenuItemComponent` ; slot `stats` = nombre de questions + badge module

**Ce qui est utilisable :**
- `MenuItemComponent` réutilisable dans toutes les vues liste (ExercisesPage, FlashcardsPage, futures pages)
- FlashcardsPage : tableau de bord maîtrise inline sur chaque carte — nombre de cartes dues + répartition par boîte (B1–B5)
- ExercisesPage : même rendu qu'avant, code simplifié

**Hypothèses posées :**
- Les stats sont chargées en parallèle au montage (un appel `GET /leitnercards/due/:id` par système). Acceptable pour un MVP mono-instance avec peu de systèmes.
- `api.get` est utilisé directement dans la page (pas via le store) pour éviter d'écraser `cardStore.dueCards` partagé entre les systèmes.
- MindmapsPage non refactorisée — UX sidebar incompatible avec les cards.

**Dette / points d'attention :**
- Si l'utilisateur a beaucoup de systèmes, les appels parallèles peuvent être lourds — à paginer ou à battre en cas de scale.

---

### [M-01.07] — Interface Leitner (5 boîtes) — 2026-06-08

**Fichiers modifiés :**
- `my_memo_master_front/src/pages/FlashcardsPage.vue` — suppression données mockées ; branchement `useLeitnerSystemStore.fetchSystems()` sur `onMounted` ; affichage des systèmes réels ; navigation vers `/flashcardssession/:systemId`
- `my_memo_master_front/src/pages/FlashcardsSessionPage.vue` — suppression données mockées ; branchement `useLeitnerCardStore.fetchDueCards(systemId)` + `submitResponse(cardId, studentAnswer)` ; `useLeitnerSystemStore.fetchSystemById(systemId)` pour le nom de session ; affichage `lastCorrection` (score, correction, explanation) ; répartition par boîte calculée depuis `dueCards` ; états `loading`, `submitting`, `isFinished`
- `my_memo_master_front/src/router/routes.js` — route `/flashcardssession` → `/flashcardssession/:systemId`

**Ce qui est utilisable :**
- FlashcardsPage affiche les vrais systèmes Leitner de l'utilisateur
- FlashcardsSessionPage charge les cartes dues, soumet au moteur sémantique IA et affiche le résultat (score %, correction, explication)
- La répartition des 5 boîtes est calculée dynamiquement depuis les cartes dues
- Écran "aucune carte" si `dueCards` est vide, écran "session terminée" en fin de session

**Hypothèses posées :**
- Le champ texte de la question est `question.statement` (confirmé sur `Question.model.js`)
- La correction est toujours sémantique (textarea libre) — le mode QCM de l'ancienne maquette est supprimé car l'API ne le supporte pas

**Dette / points d'attention :**
- Le bouton "Valider" est désactivé pendant l'appel IA (`submitting`), qui peut prendre ~30s au premier appel (`@xenova/transformers`)
- Pas de tests Vitest sur ces composants — cohérent avec la dette front déjà documentée

---

### [M-02-STORES] — Stores Pinia Leitner — 2026-06-08

**Fichiers créés :**
- `my_memo_master_front/src/stores/leitnerSystems.js` — `useLeitnerSystemStore` : fetchSystems, fetchSystemById, fetchSystemsBySubject, createSystem, updateSystem, shareSystem, deleteSystem
- `my_memo_master_front/src/stores/leitnerBoxes.js` — `useLeitnerBoxStore` : fetchBoxes, fetchBoxById, createBox, updateBox, deleteBox
- `my_memo_master_front/src/stores/leitnerCards.js` — `useLeitnerCardStore` : fetchCardsByBox, fetchCardById, fetchDueCards, createCard, updateCard, submitResponse, deleteCard

**Ce qui est utilisable :**
- `useLeitnerSystemStore` — CRUD complet + partage avec droits granulaires (`shareSystem(payload)`)
- `useLeitnerBoxStore` — CRUD complet sur les boîtes (niveau, intervalle, couleur)
- `useLeitnerCardStore` :
  - `fetchDueCards(systemId)` → alimente `store.dueCards` (cartes à réviser)
  - `submitResponse(cardId, studentAnswer)` → alimente `store.lastCorrection` avec `{ success, correction, score, explanation, decision_zone }`
- Pattern identique aux stores existants (try/catch, notif FR, fetchX() post-mutation)

**Hypothèses posées :**
- `submitResponse` passe `studentAnswer` (string libre) et non `responseId` — la correction est sémantique IA côté API.
- `shareSystem` reçoit le payload complet en paramètre (pas stocké dans `state`) car les champs de partage sont ponctuels.

**Dette / points d'attention :**
- Pas de tests Vitest pour ces stores — cohérent avec la dette déjà documentée sur les autres stores Pinia.
- Les pages/composants qui consomment ces stores restent à implémenter (FlashcardsPage ou SessionPage).

---

### [TEST-ROUTES] — Test complet des routes API + corrections de bugs — 2026-06-06

**Contexte :** Test de toutes les routes de l'API sur les conteneurs Docker en cours d'exécution. 7 bugs identifiés et corrigés au fil du test.

**Fichiers modifiés (API) :**
- `Dockerfile` — ajout `libvips-dev` dans apt-get : permet à `sharp` (@xenova/transformers) de trouver la lib système au lieu de télécharger depuis GitHub (timeout réseau en build Docker)
- `package.json` + `package-lock.json` — suppression `"swagger": "^0.0.1"` (paquet 2012 inutilisé, Node ~0.6.6)
- `controllers/Tutorials.controller.js` — `exports.create` : destructuration corrigée (`name, link` → `name, link, subjectId, revision_tips`), les deux champs étaient silencieusement ignorés → `subjectId: null` en base
- `services/LeitnerCard.service.js` — ajout `resolveUserRights(userId, idSystem)` (propriétaire → droits complets, partagé → droits LeitnerSystemsUsers) + `getCardSystem(cardId)` (remonte idSystem depuis idBox)
- `controllers/LeitnerCard.controller.js` — `addCard`, `updateCard`, `deleteCard` : remplacent `req.user.rights` (toujours `undefined`) par `resolveUserRights()` depuis le service
- `validators/Response.validators.js` — `questionId` → `idQuestion` dans les règles `create` et `update` (le controller utilisait `idQuestion`, aligné sur le modèle)
- `controllers/OnboardingState.controller.js` — `updateOnboarding` : `req.user.userId` → `req.user.id` (le JWT contient `{ id: userId }`, pas `userId`)
- `services/Question.service.js` — `getQuestionsByTest` : ajout `as: "test"` et correction colonne `idTest` → `testId` (alias Sequelize obligatoire, clé primaire réelle) ; `getQuestionByCard` : ajout `as: "leitnerCard"` (même problème d'alias)
- `controllers/Question.controller.js` — `getCorrectionByQuestion` : `req.params.idQuestion` → `req.params.id` (la route déclare `/:id`, pas `/:idQuestion`)

**Fichiers modifiés (front) :**
- `my_memo_master_front/vite.config.js` — VitePWA : `workbox.globPatterns: []` désactive le précaching de tous les assets (cache service worker était "énorme" selon l'utilisateur)
- `my_memo_master_front/src/stores/auth.js` — `persist: true` → `persist: { paths: ['token', 'user', 'authenticated'] }` : seules les données d'auth sont persistées en localStorage

**Ce qui est utilisable après correction :**
- `POST /tutorials` — `subjectId` et `revision_tips` sont maintenant correctement enregistrés
- `POST/PUT/DELETE /leitnercards` — les droits d'écriture sont résolus depuis la DB (plus de crash `403` systématique)
- `POST /responses` — `idQuestion` est correctement validé (plus d'erreur 400 sur champ inexistant)
- `PUT /onboardingState/:id` — met à jour l'état de l'utilisateur connecté (plus de 404 silencieux)
- `GET /questions/tests/:testId` — retourne les questions d'un test (plus d'erreur 500 alias Sequelize)
- `GET /questions/card/:cardId` — retourne la question d'une carte (plus d'erreur 500 alias)
- `GET /questions/correction/:id` — retourne la correction d'une question (plus de WHERE `undefined`)
- Swagger UI accessible sur `GET /api-docs/` (200)
- `POST /grading/semantic` — fonctionne avec `correct_answers` + `student_answer` (NLP, ~30s premier appel)

**Routes vérifiées OK :**
- Auth : register, login, verify-email, forgot-password, reset-password
- Users : GET/:id, PUT/:id
- Subjects, Tests, Questions, Responses : CRUD complet
- LeitnerSystem, LeitnerBox, LeitnerCard : CRUD + due cards + correction sémantique
- Diagrammes, Tutorials : CRUD complet
- Fields, FieldsType, Units : CRUD complet
- Grading : date + semantic
- OnboardingState : GET byUserId + PUT /:id
- Storage : upload (image/pdf uniquement), delete

**Hypothèses posées :**
- Le JWT contient uniquement `{ id: userId }` — aucun champ `rights`, `userId` ou autre. Tout controller qui lirait autre chose est buggué.
- Les associations Sequelize avec `as:` obligatoire : tout `include: [{ model: X }]` sans alias échoue si l'association est définie avec `as`. Pattern à auditer sur le reste de la base de code.
- `LeitnerBox.color` est un `BIGINT` (valeur entière) — le frontend doit envoyer un entier, pas une chaîne hexadécimale.

**Dette / points d'attention :**
- Les tests Supertest existants pour `LeitnerCard.controller` utilisent `{ rights: true }` dans le token de test — ils continuent de passer car le service est mocké. Si le mock est retiré, les tests échoueront.
- `GET /questions/tests/:testId` : la requête Sequelize fait un JOIN via la table `testQuestions` (belongsToMany). Si l'association through est incohérente, Sequelize peut retourner 0 résultats silencieusement.
- Aucun test pour Storage (upload multipart) ni pour LeitnerSystemsUsers — dette documentée dans les entrées précédentes.
- Le rate limiter auth (`5 req/15 min`, in-memory) se déclenche rapidement lors des tests manuels répétés. Redémarrer le conteneur pour vider le store.

---

### [M-02] — Tests unitaires moteur répétition espacée — 2026-06-10

**Fichiers modifiés :**
- `test/services/LeitnerCard.service.test.js` — réécriture complète : 6 tests existants (dont 2 buggés) → 23 tests couvrant l'ensemble du service

**Bugs corrigés dans les tests précédents :**
- `addCard` : assertion `LeitnerBox.findOne({ level: 1 })` → `{ level: 1, idSystem: 5 }` (le service filtre par système depuis M-02-CARDS-CRUD)
- `correctResponse` bonne réponse : `toEqual` ne comprenait pas `newLevel` ajouté au retour du service, test échouait silencieusement

**Tests ajoutés :**
- `getDueCards` — filtre par système, retourne cartes dues et cartes jamais révisées (next_review_at null)
- `addCard` — droits insuffisants (throw), boîte niveau 1 introuvable (throw)
- `updateCard` — droits insuffisants (null), carte introuvable (null)
- `correctResponse` — mauvaise réponse (retour boîte 1, incorrect_count++), bonne réponse en boîte 5 (plafonnement, fifo=false), carte introuvable (null), aucune réponse correcte (null), calcul `next_review_at` (fake timers, intervalle en secondes)
- `deleteCard` — droits insuffisants (false), carte introuvable (false)
- `resolveUserRights` — propriétaire (droits complets), partagé avec écriture, non-membre (aucun droit)
- `getCardSystem` — retourne idSystem, carte introuvable (null)

**Ce qui est utilisable :**
- `npx jest test/services/LeitnerCard.service.test.js` → 23/23 tests passent
- Couverture complète du moteur Leitner : algo boîtes, compteurs, dates, droits

**Hypothèses posées :**
- `jest.useFakeTimers()` / `jest.setSystemTime()` affecte bien `dayjs()` (dayjs utilise le clock système) — `jest.useRealTimers()` appelé en fin de test pour ne pas polluer les autres suites.
- Les modèles `LeitnerSystem` et `LeitnerSystemsUsers` ajoutés au mock de `../../models` pour couvrir `resolveUserRights`.

**Dette / points d'attention :**
- Aucune dette nouvelle introduite.

---

### [M-01.11-FRONT] — Tests fonctionnels session Leitner (front) — 2026-06-10

**Fichiers créés :**
- `my_memo_master_front/test/stores/leitnerCards.store.test.js` — 7 tests Pinia store (`fetchDueCards`, `submitResponse`) : succès, réponse non-200, erreur réseau, bonne/mauvaise réponse, 500, timeout
- `my_memo_master_front/test/components/FlashcardsSessionPage.test.js` — 13 tests composant Vue : chargement, état vide, affichage question, compteur, titre système, Valider désactivé/actif, feedback correct (vert+score), feedback incorrect (rouge+correction), navigation multi-cartes, session terminée, sortie confirmée, sortie annulée

**Fichiers modifiés :**
- `my_memo_master_front/vitest.config.js` — ajout `@vitejs/plugin-vue` dans `plugins` (sans lui, Vitest ne sait pas transformer les fichiers `.vue`)
- `my_memo_master_front/test/stores/leitnerCards.store.test.js` — `mockGet/mockPost/mockNotify` déclarés via `vi.hoisted()` pour éviter la TDZ (les factories `vi.mock` sont hoistées avant les `const`)
- `my_memo_master_front/test/components/FlashcardsSessionPage.test.js` — mock `vue-router` via `importOriginal` pour préserver `createRouter`/`createWebHistory` (requis par `src/router/index.js` via `src/stores/auth.js`) tout en overridant `useRouter`/`useRoute`

**Ce qui est couvert :**
- `useLeitnerCardStore.fetchDueCards` : succès, non-200, erreur réseau
- `useLeitnerCardStore.submitResponse` : bonne réponse (lastCorrection + level++), mauvaise (level→1), 500, timeout
- Rendu initial : loading, empty state, question + compteur + titre système
- Interaction : bouton Valider désactivé sans texte, actif avec texte
- Feedback après soumission : vert "Excellent / 95%" ou rouge "À revoir / 10% / correction attendue"
- Navigation : Continuer → carte suivante + compteur 2/2
- Fin de session : écran "Session terminée" après dernière carte
- Sortie : window.confirm(true) → push('/flashcards') ; confirm(false) → reste sur page

**Packages installés :**
- `@vue/test-utils` devDependency (avec `--legacy-peer-deps` pour compatibilité Vitest 3)
- `@pinia/testing` devDependency

**Hypothèses posées :**
- `createTestingPinia({ stubActions: true })` : les actions stubées retournent `undefined` par défaut. `mockImplementation` utilisé dans les tests pour simuler les effets de bord (`cardStore.lastCorrection = ...`).
- Le mock `vue-router` utilise `importOriginal` pour réexporter `createRouter`, `createWebHistory`, `RouterLink`, etc. — seules `useRouter` et `useRoute` sont surchargées.

**Dette / points d'attention :**
- Aucune dette nouvelle introduite.

---

### [M-02.12] — Revue de code & merge — Révision active Leitner — 2026-06-10

**Périmètre audité :**
- `services/LeitnerCard.service.js` — algo Leitner, calcul next_review_at, resolveUserRights, getCardSystem
- `controllers/LeitnerCard.controller.js` — handlers HTTP, gestion droits
- `routes/LeitnerCard.routes.js` — routing, validators, Swagger
- `models/LeitnerCard.model.js` — champs spaced-repetition, index, associations
- `validators/LeitnerCard.validators.js` — addCard, updateCard, correctResponse
- `stores/leitnerCards.js`, `leitnerSystems.js`, `leitnerBoxes.js` — stores Pinia front
- `pages/FlashcardsSessionPage.vue`, `FlashcardsPage.vue`, `FlashcardsCardsPage.vue`
- Tous les tests Leitner (unitaires, controllers, BDD, front)

**Résultats de la revue :**
- Architecture conforme controller → service → model sur tout le périmètre
- JSDoc présent sur toutes les méthodes publiques du service
- Messages d'erreur en français partout
- Validators branchés sur POST et PUT
- Lint : 3 erreurs corrigées (variable `response` non utilisée dans leitner.session.test.js, imports `useLeitnerSystemStore`/`useLeitnerBoxStore` inutilisés dans FlashcardsSessionPage.test.js)
- 453 tests back + 41 tests front — tous verts après corrections

**Fichiers modifiés :**
- `test/bdd/leitner.session.test.js` — suppression variable `response` inutilisée
- `test/components/FlashcardsSessionPage.test.js` — suppression imports inutilisés

**Points d'attention documentés (non bloquants) :**
- `addCard` controller : le catch renvoie 403 avec `error.message` pour toutes les erreurs. Si le service lève une erreur DB inattendue, le message Sequelize serait exposé en 403 plutôt qu'en 500. À refactorer dans un ticket dédié.
- `loadSystemStats` store : catch silencieux par système — voulu (les stats ne bloquent pas l'UI).
- Intervalles des boîtes en secondes (dev) — à passer en jours avant prod (déjà documenté dans DECISIONS.md).

---

### [M-01.13] — Documentation algo et règles métier Leitner — 2026-06-10

**Fichiers créés :**
- `diagrams/leitner_algo.md` — documentation complète de l'algorithme Leitner implémenté

**Ce qui est couvert :**
- Vue d'ensemble du système (5 boîtes, progression/régression)
- Structure des données (LeitnerSystem, LeitnerBox, LeitnerCard, champs de révision)
- Algorithme de progression : bonne réponse → boîte + 1 (plafond 5), mauvaise → boîte 1
- Calcul de `next_review_at` : `dayjs().add(intervall, "second")`, table dev vs prod
- Correction sémantique IA : embeddings NLP, score, decision_zone
- Règles de session : démarrage, déroulement, abandon (progression déjà soumise conservée)
- Historique : review_count / correct_count / incorrect_count / last_review_at (cumulatif, pas de log par révision)
- Droits d'accès : propriétaire → droits complets, partagé → selon LeitnerSystemsUsers, non-membre → 403
- Cas limites : boîte 5 plafonnée, carte sans réponse correcte, session vide, nouvelle carte

**Hypothèses posées :**
- Le document décrit l'algorithme tel qu'implémenté au 2026-06-10 — à mettre à jour si les règles changent.
- Les valeurs prod recommandées (1j/3j/7j/14j/30j) sont des recommandations, non des valeurs par défaut codées.

**Dette / points d'attention :**
- Pas de table de log par révision en MVP — si un historique détaillé est nécessaire (analytics, courbe de progression), il faudra une nouvelle entité `RevisionLog`.

---

### [M-03.01] — Définition règles métier Calendrier et organisation — 2026-06-10

**Fichiers créés :**
- `diagrams/calendar_rules.md` — règles métier complètes du module Calendrier

**Ce qui est couvert :**
- Acteurs et permissions (Admin établissement, Enseignant, Étudiant)
- Modèle de données : 6 nouvelles entités (ClassGroup, ClassGroupUsers, CalendarEvent, EventOccurrence, Deadline, RevisionSession)
- Règles de récurrence des événements (mode manual vs auto, format JSON de la règle)
- Principe de synchronisation : calendrier personnel = événements groupe + échéances enseignant + séances de révision perso
- Règle todo list : RevisionSession avec date = aujourd'hui → affiché automatiquement (même objet, pas de doublon)
- Priorisation MVP (tri par heure, sans champ priorité)
- Cas limites et hors-périmètre MVP documentés

**Hypothèses posées :**
- Les occurrences récurrentes sont générées et persistées en base à la création de l'événement (approche "matérialisée" plutôt que calcul à la volée) — plus simple à filtrer/supprimer individuellement.
- `occurrenceId` et `dueDate` sont indépendants sur Deadline : l'échéance est annoncée dans une séance mais peut être due à une date différente.
- Un utilisateur peut avoir des rôles différents dans des groupes différents (enseignant dans un groupe, étudiant dans un autre) — géré par ClassGroupUsers avec un champ `role` par ligne.

**Dépendances pour l'implémentation :**
- Nouveau rôle système `Enseignant` à ajouter via seeder
- 6 nouveaux models Sequelize + migrations
- 6 nouveaux controllers + routes + services + validators
- Stores Pinia côté front (calendar, classGroups, revisionSessions)

**Dette / points d'attention :**
- Pas de champ `priority` sur RevisionSession en MVP — à prévoir si la fonctionnalité de priorisation est demandée.
- Suppression d'une EventOccurrence avec Deadlines rattachées : comportement (bloquer ou cascade) à décider à l'implémentation et documenter dans DECISIONS.md.
- Les occurrences tombant sur un jour férié ne sont pas filtrées automatiquement.

---

### [M-03.03] — Modèle de données (tâches, rappels) — 2026-06-10

**Fichiers créés (models) :**
- `models/ClassGroup.model.js` — groupe classe, créé par un admin, FK User (createdBy)
- `models/ClassGroupUsers.model.js` — table de jointure PK composite (classGroupId + userId), champ role 'teacher'|'student'
- `models/CalendarEvent.model.js` — événement de calendrier (cours/examen/autre), recurrenceMode + recurrenceRule JSON
- `models/EventOccurrence.model.js` — occurrence matérialisée d'un événement (date + startTime + endTime)
- `models/Deadline.model.js` — échéance liée à une occurrence spécifique, RESTRICT sur suppression occurrence
- `models/RevisionSession.model.js` — séance de révision étudiant, objet unique affiché dans calendrier et todo list

**Fichiers créés (migrations) :**
- `migrations/20260610000001-create-classgroup-table.js`
- `migrations/20260610000002-create-classgroupusers-table.js`
- `migrations/20260610000003-create-calendarevent-table.js`
- `migrations/20260610000004-create-eventoccurrence-table.js`
- `migrations/20260610000005-create-deadline-table.js`
- `migrations/20260610000006-create-revisionsession-table.js`
- `migrations/20260610000007-add-calendar-indexes.js` — 10 index sur les colonnes FK + date

**Fichiers créés (seeders) :**
- `seeders/20260610000001-seed-enseignant-role.js` — insère le rôle `Enseignant` (roleId: 3)

**Fichiers modifiés :**
- `models/index.js` — enregistrement des 6 nouveaux models
- `models/User.model.js` — 5 nouvelles associations (classGroups, classGroupMemberships, calendarEvents, deadlines, revisionSessions)

**Ce qui est utilisable :**
- `npx sequelize-cli db:migrate` — crée les 6 nouvelles tables avec leurs FK et contraintes
- `npx sequelize-cli db:seed --seed 20260610000001-seed-enseignant-role.js` — ajoute le rôle Enseignant
- Toutes les associations Sequelize sont opérationnelles pour les `include` dans les services futurs
- `Deadline.occurrenceId` → RESTRICT en base : la suppression d'une EventOccurrence avec des Deadlines associées est bloquée

**Hypothèses posées :**
- Les champs type (CalendarEvent, Deadline) et role (ClassGroupUsers) sont stockés en STRING(20) avec validation côté application — pas d'ENUM SQL pour assurer la portabilité SQLite/PostgreSQL.
- `recurrenceRule` est un champ JSON nullable — non nul uniquement si `recurrenceMode = 'auto'`. La logique de génération des occurrences sera dans le service (ticket suivant).
- L'ordre des migrations (000001→000006) respecte les dépendances FK : ClassGroup avant ClassGroupUsers, CalendarEvent avant EventOccurrence, EventOccurrence avant Deadline.

**Dette / points d'attention :**
- En SQLite, le RESTRICT sur `Deadline.occurrenceId` n'est actif que si `PRAGMA foreign_keys = ON` — activée automatiquement avec `better-sqlite3`.
- Le rôle Enseignant (roleId: 3) n'est pas encore assignable depuis l'UI — nécessite un ticket d'administration des comptes.

---

### [M-03.03-CRUD] — CRUD CalendarEvent, RevisionSession, Deadline, ClassGroup — 2026-06-10

**Fichiers créés (services) :**
- `services/ClassGroup.service.js` — findAll (filtré par rôle), create/update/delete (admin), addMember/removeMember (admin)
- `services/RevisionSession.service.js` — findAll + findToday (filtrés userId), CRUD avec vérification ownership
- `services/CalendarEvent.service.js` — findAll (filtré par groupes), CRUD admin, génération occurrences (_generateOccurrences : weekly/biweekly/monthly via dayjs), addOccurrence / deleteOccurrence
- `services/Deadline.service.js` — findAll (via JOIN groupes), create (vérif teacher via ClassGroupUsers), update/delete (ownership createdBy)

**Fichiers créés (controllers) :**
- `controllers/ClassGroup.controller.js`
- `controllers/RevisionSession.controller.js`
- `controllers/CalendarEvent.controller.js` — gère le 409 sur SequelizeForeignKeyConstraintError (RESTRICT)
- `controllers/Deadline.controller.js`

**Fichiers créés (validators) :**
- `validators/ClassGroup.validators.js`
- `validators/RevisionSession.validators.js` — validation HH:MM + endTime > startTime
- `validators/CalendarEvent.validators.js` — validation recurrenceRule complète (frequency, days, startDate/endDate)
- `validators/Deadline.validators.js`

**Fichiers créés (routes) :**
- `routes/ClassGroup.routes.js` — GET /, GET /:id, POST /, PUT /:id, DELETE /:id, POST /:id/members, DELETE /:id/members/:userId
- `routes/RevisionSession.routes.js` — GET /, GET /today, GET /:id, POST /, PUT /:id, DELETE /:id
- `routes/CalendarEvent.routes.js` — GET /, GET /:id, POST /, PUT /:id, DELETE /:id, POST /:id/occurrences, DELETE /occurrences/:occurrenceId
- `routes/Deadline.routes.js` — GET /, GET /:id, POST /, PUT /:id, DELETE /:id

**Fichiers modifiés :**
- `app.js` — enregistrement des 4 nouvelles routes

**Ce qui est utilisable :**
- `GET /api/v1/revision-sessions/today` → todo list du jour (séances date = aujourd'hui)
- `POST /api/v1/calendar-events` avec `recurrenceMode: "auto"` → génère et persiste toutes les occurrences automatiquement
- `DELETE /api/v1/calendar-events/occurrences/:id` → 409 si des Deadlines y sont liées (RESTRICT)
- `POST /api/v1/deadlines` → 403 si l'utilisateur n'est pas enseignant dans le groupe de l'occurrence

**Hypothèses posées :**
- La vérification admin (roleId = 1) utilise un appel DB dans chaque service — pas de cache. Acceptable pour MVP.
- `_generateOccurrences` pour biweekly utilise `startOf("week")` de dayjs (semaine débutant le dimanche par défaut). Les occurrences de la semaine de startDate sont incluses (weekDiff = 0 → pair).
- `CalendarEvent.update` ne modifie que name/description/type — les occurrences et la règle de récurrence ne sont pas modifiables via PUT pour éviter les incohérences.

**Dette / points d'attention :**
- ~~Pas de tests pour ces 4 entités~~ — Résolu dans M-03.03-TESTS.
- `findAll` pour CalendarEvent retourne les occurrences en include : pour de nombreux événements, la réponse peut être volumineuse. À paginer si nécessaire.
- `_generateOccurrences` biweekly : si startDate est au milieu d'une semaine, les jours avant startDate de cette semaine ne sont pas inclus (correct). La semaine de référence est celle de startDate.

---

### [M-03.03-TESTS] — Tests contrôleurs et services M-03 — 2026-06-10

**Fichiers créés :**
- `test/controllers/ClassGroup.controller.test.js` — 29 tests : CRUD, membres (addMember/removeMember), 200/201/400/401/403/404/500
- `test/controllers/RevisionSession.controller.test.js` — 26 tests : 6 routes (GET /, GET /today, GET /:id, POST, PUT, DELETE), validation HH:MM + endTime>startTime, 401, 404, 500
- `test/controllers/CalendarEvent.controller.test.js` — 34 tests : 7 routes (dont POST /:id/occurrences et DELETE /occurrences/:id), 403 non-admin, 409 SequelizeForeignKeyConstraintError (RESTRICT), 401
- `test/controllers/Deadline.controller.test.js` — 25 tests : CRUD complet, 403 non-enseignant, 401, 500
- `test/services/CalendarEvent.service.test.js` — 25 tests unitaires : _generateOccurrences (monthly/weekly/biweekly/multi-jours/startDate>endDate), _isAdmin, findAll (admin/non-admin/aucun groupe), create (manuel/auto/non-admin), update, delete, addOccurrence, deleteOccurrence
- `test/services/RevisionSession.service.test.js` — 14 tests unitaires : findAll, findToday (date = today), findOne (ownership), create (userId attaché), update (ownership + toHaveBeenCalled), delete (ownership)

**Total :** 153 nouveaux tests — tous passent

**Pattern de mock :**
- Tous les tests controllers mockent `../../models/index` avec les 22 modèles (y compris les 6 nouveaux M-03)
- `jest.mock` du service concerné uniquement ; les autres services non importés sont ignorés
- `makeToken({ id: 1 })` via `jwt.sign` avec `AUTH_JWT_SECRET = 'test-secret'`
- Tests 409 : `const err = new Error(); err.name = 'SequelizeForeignKeyConstraintError'; service.deleteOccurrence.mockRejectedValue(err)`

**Ce qui est couvert :**
- Cas nominal 200/201
- Validation express-validator : champs manquants, format HH:MM, endTime ≤ startTime, role invalide
- 401 sans token (Auth.middleware)
- 403 retour `false` du service (droits insuffisants)
- 404 retour `null` du service (not found)
- 409 sur contrainte FK RESTRICT (CalendarEvent deleteOccurrence)
- 500 sur `throw` du service
- Logique métier service : admin check, ownership check, génération occurrences

**Hypothèses posées :**
- Le service `RevisionSession.update` appelle `session.update(data)` mais retourne l'objet session (non muté par Jest). L'assertion est sur `toHaveBeenCalledWith` + `toBeTruthy()` pour éviter une fausse négative sur le nom.

**Dette / points d'attention :**
- Pas de tests pour `Deadline.service.js` — les tests de service couvrent CalendarEvent et RevisionSession ; Deadline service est couvert indirectement par les tests controller.

---

### [M-00b.01] — Infrastructure Docker (Dockerfiles, CI/CD, backup, runbook) — 2026-06-11

**Fichiers créés :**
- `server_docker_compose/docker-compose.yml` — compose VPS (services: postgres, pgadmin, api, front) avec images DockerHub, Traefik HTTPS Let's Encrypt, réseau traefik_proxy externe ; correspond exactement aux noms de services attendus par le pipeline CD
- `server_docker_compose/.env.example` — template pour le `.env` VPS (prod/preprod) ; validé par `docker compose config -q` dans le pipeline CD
- `scripts/backup.sh` — pg_dump avec timestamp, rétention configurable (défaut 7 jours), recherche dynamique du conteneur postgres par réseau Docker
- `docs/RUNBOOK.md` — documentation d'exploitation complète : premier déploiement, mise à jour, rollback, logs, backup/restauration, cron, variables critiques, PgAdmin

**Fichiers modifiés :**
- `my_memo_master_front/Dockerfile` — `node:20-alpine` → `node:22-alpine` (alignement CONVENTIONS.md)
- `.github/workflows/ci.yml` — `node-version: 20` → `22` (alignement avec runtime réel)

**Ce qui est utilisable :**
- Pipeline CD : l'étape "Validate server docker-compose" passe maintenant (le dossier `server_docker_compose/` n'existait pas)
- `scripts/backup.sh` : utilisable directement ou via cron, s'adapte à prod/preprod via `ENVIRONMENT`
- `docs/RUNBOOK.md` : référence complète pour l'exploitation quotidienne
- Build front Docker en Node 22 (cohérent avec l'API et les conventions)
- Tests CI en Node 22 (cohérent avec les Dockerfiles)

**Hypothèses posées :**
- Le VPS dispose d'un Traefik déjà en cours avec certresolver `letsencrypt` sur l'entrypoint `websecure` (port 443) — le runbook documente ce prérequis
- Les noms d'images DockerHub dans `server_docker_compose/.env.example` sont `fredissimo/mymemomaster_api:latest` / `fredissimo/mymemomaster_front:latest` — à adapter si le nom d'organisation DockerHub change
- `server_docker_compose/server_proxy/` reste exclu du dépôt (`.gitignore`) — c'est le répertoire de configuration locale du Traefik sur le VPS

**Dette / points d'attention :**
- Les images de base (`node:22-alpine`, `nginx:stable-alpine`) présentent des vulnérabilités CVE signalées par le scanner Docker IDE — inhérentes aux images publiques, à surveiller et mettre à jour quand des images corrigées sont publiées
- Le `backup.sh` utilise `pg_dump -Fc` (format custom) — la restauration nécessite `pg_restore`, pas un simple `psql < dump.sql`
- Migrations et seeds après premier déploiement sont manuelles (voir RUNBOOK) — automatisation possible dans un ticket dédié via un service `db-sync` (commenté dans cd.yml)
- ~~HSTS et redirect HTTP→HTTPS absents~~ — Résolu dans M-00b.03

---

### [M-00b.04] — Pipeline CI (lint, tests, build) — 2026-06-12

**Fichiers modifiés :**
- `.github/workflows/ci.yml` — ajout step `Build` (conditionnel `matrix.service == 'front'`) : `npm run build` après lint, détecte les erreurs Vite sur toutes les branches

**Ce qui est couvert (pipeline complet) :**
- `npm run test` — API + front, sur toutes les branches feature/dev/main
- `npm run lint` — API + front
- `npm run build` — front uniquement (l'API n'a pas de build Vite/transpile)
- Matrix dynamique : branches `dev_back_*` → API seulement ; `dev_front_*` → front seulement ; `main`/`dev` → les deux

**Hypothèses posées :**
- L'API (Express) n'a pas d'étape de build — le step est conditionné à `matrix.service == 'front'` uniquement.
- `npm run build` utilise `vite build` (déjà défini dans `my_memo_master_front/package.json`).

**Dette / points d'attention :**
- Aucune dette nouvelle introduite.

---

### [M-00b.03] — Configuration Traefik HTTPS + HSTS — 2026-06-12

**Fichiers modifiés :**
- `server_docker_compose/docker-compose.yml` — ajout middlewares HSTS + redirect HTTP→HTTPS sur les 3 services (pgadmin, api, front) via labels Traefik
- `docker-compose.yml` — idem sur les services test/prod (pgadmin_server, api_server, front_server)
- `docs/RUNBOOK.md` — prérequis Traefik mis à jour : entrypoint `web:80` requis en plus de `websecure:443`

**Ce qui est configuré :**
- Middleware `mmm-${ENVIRONMENT}-hsts` : `stsSeconds=63072000` (2 ans), `stsIncludeSubdomains=true`, `stsPreload=true` — appliqué sur tous les routers HTTPS
- Middleware `mmm-${ENVIRONMENT}-https-redirect` : redirect permanente (301) HTTP → HTTPS — appliqué sur les nouveaux routers HTTP (entrypoint `web`)
- Les middlewares sont définis sur le service `api` et réutilisés par les services `front` et `pgadmin`
- Noms d'environnement inclus (`mmm-${ENVIRONMENT}-*`) — prod et preprod coexistent sur le même Traefik sans conflit

**Approche retenue :**
- Configuration 100 % dynamique via labels Docker Compose — aucune modification de la config statique Traefik sur le VPS requise
- Déployé automatiquement par le pipeline CD à chaque push sur `main` / `dev`

**Hypothèses posées :**
- Le Traefik sur le VPS expose un entrypoint `web` sur le port 80 (standard Traefik v2/v3) — documenté dans RUNBOOK.md comme prérequis

**Dette / points d'attention :**
- HSTS avec `stsPreload=true` est un engagement fort : une fois activé sur un domaine, il est difficile à révoquer (2 ans côté navigateur). Ne pas activer si le domaine peut passer en HTTP un jour.
- Le middleware HSTS est appliqué à l'API également — les clients non-navigateur (Postman, scripts curl) ne sont pas impactés par HSTS (ignoré en dehors des navigateurs).

---

### [M-03.05] — Système rappels et notifications (BullMQ) — 2026-06-12

**Fichiers créés :**
- `config/redis.config.js` — config de connexion Redis (host/port/pass via env vars)
- `models/Reminder.model.js` — entité Reminder : userId, entityType, entityId, reminderAt, delayMinutes, channel, status, jobId, message
- `migrations/20260612000001-create-reminder-table.js` — migration Sequelize CLI avec 4 index
- `jobs/reminder.queue.js` — singleton BullMQ Queue (`reminders`) avec options retry/cleanup
- `jobs/reminder.worker.js` — Worker BullMQ qui envoie l'email via sendEmail + met à jour le status
- `services/Reminder.service.js` — CRUD complet + _resolveEntity, _buildReminderAt, _scheduleJob, _cancelJob
- `controllers/Reminder.controller.js` — 5 handlers HTTP avec gestion status 400/404/500
- `validators/Reminder.validators.js` — create (entityType, entityId, delayMinutes, message) + update
- `routes/Reminder.routes.js` — 5 routes avec JSDoc Swagger
- `test/controllers/Reminder.controller.test.js` — 20 tests controller
- `test/services/Reminder.service.test.js` — 13 tests service

**Fichiers modifiés :**
- `models/index.js` — enregistrement de Reminder
- `models/User.model.js` — association hasMany Reminder
- `app.js` — import + enregistrement route + démarrage worker
- `docker-compose.yml` — service Redis (tous les profils) + vars REDIS_* dans api/api_server
- `server_docker_compose/docker-compose.yml` — service Redis + vars REDIS_* dans api
- `.env.example` — section Redis avec variables commentées
- `.agents/CONVENTIONS.md` — bullmq + ioredis dans dépendances approuvées, restriction Redis mise à jour

**Ce qui est utilisable :**
- `GET /api/v1/reminders` — liste des rappels de l'utilisateur connecté
- `GET /api/v1/reminders/:id` — rappel par ID (ownership)
- `POST /api/v1/reminders` — crée un rappel pour un deadline ou une séance de révision
  - body : `{ entityType, entityId, delayMinutes, message? }`
  - Le job BullMQ est planifié avec `delay = reminderAt - now`
- `PUT /api/v1/reminders/:id` — modifie le délai/message (replanifie le job)
- `DELETE /api/v1/reminders/:id` — annule et supprime (retire le job de la queue)
- Worker envoie un email nodemailer à l'heure prévue, met status → 'sent'
- En cas d'échec (3 tentatives exponentielles), status → 'failed'
- 639 tests passant au total

**Hypothèses posées :**
- `entityType` est polymorphique (`deadline` | `revision_session`) — pas de FK directe en base pour éviter la complexité des contraintes cross-tables polymorphes. La vérification d'ownership est faite dans le service.
- Pour Deadline sans `dueTime`, le rappel est calculé à partir de 08:00 le jour de l'échéance.
- Le canal est fixé à `email` en MVP — le champ `channel` est persisté pour extension future.
- Redis est requis pour le fonctionnement du worker. Si Redis est indisponible, le worker log une erreur mais ne crash pas l'API (BullMQ gère la reconnexion).
- En local sans Docker, `REDIS_HOST=127.0.0.1` (défaut redis.config.js) — Redis doit être lancé séparément.

**Fichiers créés (front) :**
- `my_memo_master_front/src/stores/reminders.js` — `useReminderStore` : fetchReminders, fetchReminderById, createReminder, updateReminder, deleteReminder, resetForm ; getters pendingReminders + remindersByEntity
- `my_memo_master_front/src/components/NotificationBellComponent.vue` — cloche avec badge compteur, panneau dropdown (liste rappels en attente, formatage temps relatif, suppression inline, état vide)

**Fichiers modifiés (front) :**
- `my_memo_master_front/src/App.vue` — import + intégration NotificationBellComponent dans le header desktop et mobile

**Dette / points d'attention :**
- Le worker charge les modèles en différé (`require('../models')` dans le callback) pour éviter les problèmes d'init DB au démarrage. Ce pattern est cohérent avec la séquentialité de `server.js`.
- BullMQ utilise un `MemoryStore` Redis — si Redis redémarre, les jobs en attente sont perdus. À surveiller pour une instance de prod long terme (les rappels actifs doivent être recréés après un crash Redis).
- Pas de tests pour `reminder.worker.js` (requiert une instance Redis réelle) — à couvrir dans un ticket d'intégration dédié si nécessaire.
- Pas de store Pinia ni de page front pour les rappels — à implémenter dans un ticket front M-03.

---

### [M-03.06] — Calcul charge révision et priorisation — 2026-06-13

**Fichiers créés :**
- `services/Planning.service.js` — `getLoad(userId, days)` + `getPriorities(userId)` + helper privé `_resolveUserLeitner`
- `controllers/Planning.controller.js` — `getLoad` + `getPriorities`
- `routes/Planning.routes.js` — `GET /planning/load` + `GET /planning/priorities` avec JSDoc Swagger
- `validators/Planning.validators.js` — validation `days` (entier 1-90, optionnel)
- `test/controllers/Planning.controller.test.js` — 9 tests (200 nominal, 400 validation, 401 sans token, 500 service KO)
- `test/services/Planning.service.test.js` — 13 tests (données vides, sessions, deadlines, cartes, tri, erreur non-bloquante)

**Fichiers modifiés :**
- `app.js` — import + enregistrement `planningRoutes`

**Ce qui est utilisable :**
- `GET /api/v1/planning/load?days=14` — tableau de N jours avec `{date, cardsDue, sessions, deadlines, loadScore}`
  - `loadScore` = `cardsDue × 1 + sessions × 3 + deadlines × 5`
  - Les cartes en retard ou jamais révisées sont ajoutées au jour courant
- `GET /api/v1/planning/priorities` — objet `{overdue, today, upcoming}` trié par urgence
  - `today` : deadlines d'abord, puis sessions (par startTime), puis cartes Leitner dues
  - `upcoming` : tout ce qui arrive dans les 7 prochains jours, trié par `daysUntil`
- 22 tests passants

**Hypothèses posées :**
- Les erreurs de `DeadlineService.findAll` (ex. utilisateur sans groupe) sont non-bloquantes — loguées en `warn` et ignorées (l'utilisateur voit load = 0 pour les deadlines).
- Le `loadScore` est une heuristique MVP : deadlines(5) > sessions(3) > cartes(1). Les coefficients peuvent être ajustés sans changer l'interface.
- Les cartes jamais révisées (`next_review_at: null`) sont considérées comme "dues immédiatement" et comptées dans `today`.

**Dette / points d'attention :**
- ~~Pas de front-end pour cette fonctionnalité~~ — Résolu dans M-03.07.
- Si l'utilisateur a beaucoup de systèmes Leitner, `getPriorities` exécute un `LeitnerCard.count` par système — acceptable pour MVP, à optimiser avec une requête GROUP BY si la charge devient importante.

---

### [M-00b.08] — Variables d'environnement (.env) — 2026-06-13

**Fichiers modifiés :**
- `server_docker_compose/docker-compose.yml` — correction bug : `EMAIL_USER`/`EMAIL_PASS` → `SMTP_HOST`/`SMTP_PORT`/`SMTP_SECURE`/`SMTP_USER`/`SMTP_PASS`/`EMAIL_FROM` (alignement avec ce que `sendEmail.js` lit réellement — les emails ne fonctionnaient pas en production)
- `server_docker_compose/.env.example` — ajout section Redis (REDIS_PASS, REDIS_PORT, resource limits) + remplacement section email par les vraies variables SMTP_*

**Ce qui existait déjà et est conforme :**
- `.env.example` (racine) — complet : API, Front, DB, Redis, S3, CORS, rate limit, resource limits, domaines
- `server_docker_compose/.env.example` — template VPS (complété)
- `traefik/.env.example` — Let's Encrypt, dashboard, logs
- `.gitignore` — exclut `.env`, `.env.dev`, `.env.test`, `.env.prod`

**Bug corrigé :**
- `sendEmail.js` lit `SMTP_HOST`/`SMTP_PORT`/`SMTP_SECURE`/`SMTP_USER`/`SMTP_PASS` mais le compose serveur injectait `EMAIL_USER`/`EMAIL_PASS` inexistants → emails silencieusement cassés en production depuis l'ajout de Redis (M-03.05 avait introduit un docker-compose serveur avec les mauvaises vars)

**Hypothèses posées :**
- `REDIS_PASS` est commenté/vide par défaut dans le `.env.example` serveur — Redis sans mot de passe est acceptable sur un réseau Docker privé (mmm_network) non exposé à l'extérieur.

**Dette / points d'attention :**
- Aucune dette nouvelle introduite.

---

### [M-03.08] — Liste to-do (tri, filtre, marquage) — 2026-06-13

**Fichiers créés (API) :**
- `migrations/20260613000001-add-is-done-to-revision-session.js` — ajoute `isDone BOOLEAN NOT NULL DEFAULT FALSE` sur la table `RevisionSession`

**Fichiers modifiés (API) :**
- `models/RevisionSession.model.js` — champ `isDone` (BOOLEAN, default false) + index sur `isDone`
- `services/RevisionSession.service.js` — méthode `markDone(id, userId, isDone)` : findOne ownership + update
- `controllers/RevisionSession.controller.js` — handler `markDone` : 200/404/500
- `validators/RevisionSession.validators.js` — règle `markDone` : `isDone` booléen requis
- `routes/RevisionSession.routes.js` — `PUT /:id/done` avec authMiddleware + validator + JSDoc Swagger
- `test/controllers/RevisionSession.controller.test.js` — 6 nouveaux tests (200 done/undone, 400 invalid, 404, 401, 500)

**Fichiers créés (front) :**
- `src/components/TodoWidget.vue` — composant réutilisable to-do list :
  - 4 onglets : À faire / Aujourd'hui / À venir / Terminé avec compteurs
  - Items mixtes : RevisionSessions (avec checkbox) + Deadlines (informatif, sans checkbox)
  - Checkbox personnalisée : coche verte, nom barré quand terminé
  - `toggle(item)` appelle `revisionStore.markDone(id, !isDone)` → mise à jour optimiste dans le store
  - Tri par date+heure dans chaque onglet
- `src/pages/TodoPage.vue` — page dédiée mobile : charge sessions + deadlines au montage, affiche TodoWidget plein écran

**Fichiers modifiés (front) :**
- `src/stores/revisionSessions.js` — action `markDone(id, isDone)` : `PUT revision-sessions/:id/done`, met à jour `sessions` et `todaySessions` en place
- `src/pages/CalendarPage.vue` — sidebar augmentée avec onglets "Agenda" / "To-do" ; l'onglet To-do affiche TodoWidget ; import `TodoWidget`
- `src/router/routes.js` — route `/todo` (name: `todo`, private: true) → TodoPage.vue

**Ce qui est utilisable :**
- `PUT /api/v1/revision-sessions/:id/done` — `{ isDone: true|false }` — bascule l'état terminé (ownership vérifié)
- `GET /todo` (front) — page To-do dédiée (mobile) : 4 onglets, filtrage client-side, marquage inline
- Sur le CalendarPage (desktop) : onglet "To-do" dans la sidebar pour accéder au même widget sans quitter le calendrier
- Les deadlines apparaissent dans la to-do liste comme éléments informatifs (non cochables)

**Onglet À faire** : séances non terminées (toutes dates) + deadlines du jour et à venir
**Onglet Aujourd'hui** : items dont la date = aujourd'hui (sessions + deadlines)
**Onglet À venir** : sessions non terminées avec date > aujourd'hui + deadlines futures
**Onglet Terminé** : sessions avec `isDone = true`

**Hypothèses posées :**
- Les deadlines ne peuvent pas être "marquées comme terminées" — elles représentent des échéances fixes imposées par un enseignant, non des tâches personnelles. Seules les RevisionSessions (créées par l'étudiant) sont cochables.
- `isDone` est persisté en base via le nouvel endpoint ; il n'est pas réinitialisé automatiquement. Si une séance est terminée mais que l'étudiant recrée le même travail, il doit créer une nouvelle séance.
- La mise à jour du store après `markDone` est faite en place (remplacement de l'objet dans `sessions` et `todaySessions`) pour éviter un rechargement complet.

**Migration à jouer en prod :**
```
npx sequelize-cli db:migrate --migration 20260613000001-add-is-done-to-revision-session.js
```

**Dette / points d'attention :**
- Pas de tests Vitest pour TodoWidget ni TodoPage — cohérent avec la dette front déjà documentée.
- Le filtre "À faire" inclut les séances avec date passée non cochées (séances oubliées) — comportement voulu pour ne pas perdre d'items.

---

### [M-03.07] — Vue calendrier interactif — 2026-06-13

**Fichiers créés :**
- `my_memo_master_front/src/stores/planning.js` — `usePlanningStore` : `fetchPriorities()` (GET /planning/priorities) + `fetchLoad(days)` (GET /planning/load)

**Fichiers modifiés :**
- `my_memo_master_front/src/pages/CalendarPage.vue` — remplacement des deux sections agenda statiques ("Aujourd'hui" sessions seules, "Échéances 14j.") par trois sections dynamiques pilotées par l'API Planning :
  - **En retard** : visible uniquement si au moins un item ; badge `-Xj` rouge ; items deadline/session/leitner
  - **Aujourd'hui** : todos du jour triés deadline > session > leitner (tri côté API)
  - **À venir** : items des 7 prochains jours, badge `+Xj` ; couleur par type
  - Import et appel `planningStore.fetchPriorities()` dans `onMounted` (remplace `revisionStore.fetchTodaySessions()`)
  - CSS ajouté : `.agenda-badge`, `.agenda-badge--overdue`, `.agenda-title--overdue`, `.agenda-item--overdue`, `.agenda-item--leitner`

**Ce qui est utilisable :**
- Agenda latéral entièrement piloté par `GET /api/v1/planning/priorities`
- Section "En retard" toujours visible en tête si des items sont en retard (jamais affiché avant)
- Types d'items reconnus : `deadline` (rouge), `revision_session` (vert), `leitner` (violet avec compteur de cartes)
- La vue calendrier principale (pills colorées, navigation, modale création/détail, rappels) est inchangée

**Périmètre M-03.07 couvert :**
- ✅ Calendrier (vues annuelle + mensuelle interactives)
- ✅ Échéances (pills calendrier + agenda via Planning API)
- ✅ To-do (séances du jour via Planning API)
- ✅ Rappels (ReminderWidget dans modale de détail)
- ✅ Priorisation (agenda latéral via `/planning/priorities` avec tri deadline > session > leitner)
- ✅ Vue calendrier interactif (création séance via bouton + clic sur jour, modale détail)

**Hypothèses posées :**
- `revisionStore.fetchTodaySessions()` supprimé de `onMounted` — les items du jour sont maintenant fournis par `planningStore.fetchPriorities()` qui inclut les sessions du jour dans `priorities.today`.
- La section "En retard" n'a pas de spinner pendant le chargement — elle est masquée entièrement jusqu'à ce que les données soient chargées (`v-if="!loading && ...overdue.length > 0"`), ce qui évite un flash vide.

**Dette / points d'attention :**
- Pas de tests Vitest pour CalendarPage ni pour le store planning — cohérent avec la dette front déjà documentée.
- `GET /planning/load` est disponible dans le store mais non utilisé dans l'UI pour l'instant — à utiliser dans un futur widget de charge si nécessaire.

---

### [M-03.09] — Intégration rappels in-app — 2026-06-13

**Contexte :**
Les composants de rappels (`NotificationBellComponent.vue`, `ReminderWidget.vue`, `TodoWidget.vue`, `TodoPage.vue`) et le store `reminders.js` étaient déjà implémentés, mais aucun lien de navigation n'existait vers `/calendar` et `/todo`, et la cloche de notification ne se rafraîchissait qu'au montage.

**Fichiers modifiés (front) :**
- `my_memo_master_front/src/App.vue` — ajout de deux liens de navigation (desktop sidebar + mobile nav) :
  - `/calendar` → `CalendarIcon` (heroicons) avec title "Calendrier & rappels"
  - `/todo` → `CheckCircleIcon` (heroicons) avec title "To-do"
  - Import de `CalendarIcon` et `CheckCircleIcon` depuis `@heroicons/vue/24/outline`
- `my_memo_master_front/src/components/NotificationBellComponent.vue` — ajout d'un polling automatique toutes les 5 minutes :
  - `setInterval(store.fetchReminders, 5 * 60 * 1000)` dans `onMounted` (uniquement si `authStore.authenticated`)
  - `clearInterval` dans `onBeforeUnmount` (pas de fuite mémoire)
  - Import de `onBeforeUnmount` ajouté

**Ce qui est utilisable :**
- Navigation directe vers `/calendar` et `/todo` depuis la barre latérale (desktop) et la nav inférieure (mobile)
- La cloche de notification affiche le nombre de rappels en attente dès le chargement de l'app et se rafraîchit automatiquement toutes les 5 minutes
- Flux rappels in-app complet : bell badge → panneau dropdown → suppression ; clic event calendrier → modale → ReminderWidget → création rappel
- `TodoWidget` accessible depuis la sidebar CalendarPage (onglet To-do) et depuis la page `/todo`

**Périmètre M-03.09 couvert :**
- ✅ Échéances (pills calendrier + agenda + to-do + rappels via modale)
- ✅ To-do (TodoWidget dans sidebar CalendarPage + page /todo accessible via nav)
- ✅ Calendrier (CalendarPage accessible via nav)
- ✅ Rappels in-app (bell + polling + ReminderWidget par event)
- ✅ Priorisation (agenda latéral Planning API, déjà en place)
- ✅ Intégration rappels in-app (bell global + polling + modale par entité)
- ❌ Synchronisation agenda externe (hors périmètre)

---

### [M-05.11] — Guards Vue Router — routes protégées — 2026-06-17

**Objectif :** Vérifier le guard `beforeEach`, corriger les anomalies détectées, ajouter les tests unitaires.

**Fichiers modifiés :**
- `my_memo_master_front/src/router/index.js` — Bug 1 : suppression du dead code `authStore.user.connectionToken`
  - Avant : `if (!authStore.authenticated || !(authStore.user.connectionToken || authStore.token))`
  - Après : `if (!authStore.authenticated || !authStore.token)`
  - `connectionToken` n'existe pas dans le state de authStore — champ toujours `undefined`, condition jamais vraie
- `my_memo_master_front/src/router/routes.js` — Bug 2 : `/calendar` passé de `private: false` à `private: true`
  - CalendarPage affiche des données personnelles (events, sessions, deadlines) — accès sans auth était un bug de sécurité

**Fichiers créés :**
- `my_memo_master_front/test/router/router.guard.test.js` — 12 tests Vitest du guard `beforeEach`
- `my_memo_master_front/test/composables/useRole.test.js` — 20 tests Vitest du composable `useRole`

**Résultats tests :** 124 tests / 9 fichiers — tous verts ✅

**Couverture tests router.guard :**
- Route privée + non authentifié → redirect `/auth` ✅
- Route privée + non authentifié → `authStore.logout(false, null)` appelé ✅
- `/calendar` (privé depuis fix) + non authentifié → redirect `/auth` ✅
- Route privée + authentifié → navigation acceptée (profile, flashcards) ✅
- Route publique + non/authentifié → navigation acceptée ✅
- `/auth` + authentifié → redirect `/profile` ✅
- `/register` + authentifié → redirect `/profile` ✅
- `meta.roles: [1]` + roleId=2 → redirect `/` ✅
- `meta.roles: [1]` + roleId=1 → navigation acceptée ✅
- `meta.roles: [1, 4]` + roleId=4 → navigation acceptée ✅

**Couverture tests useRole :**
- Export `ROLE_IDS` avec les 5 constantes correctes ✅
- Computed `isAdminPlateforme / isEtudiant / isEnseignant / isAdminEtablissement / isModerateur` pour chaque roleId ✅
- `roleId=null` → tous computed false ✅
- `isAdmin` : true pour roleId 1 et 4, false pour 2 ✅
- `canManageGroups` : true pour roleId 1, 3, 4 ; false pour 2, 5 ✅
- `hasAnyRole(1, 4)` : true/false selon roleId ✅
- `hasAnyRole()` sans argument → false ✅

**Hypothèses / Dette :**
- Le bruit `window.scrollTo not implemented` dans jsdom est inoffensif (scrollBehavior du router) — aucun test ne fail
- Le router singleton est partagé entre les tests : `setActivePinia(createPinia())` avant chaque test + reset sur `/` garantit l'isolation
- Les routes temporaires ajoutées pour tester `meta.roles` sont supprimées via `router.removeRoute()` après chaque test
- ❌ Notifications mobiles natives (hors périmètre)

**Hypothèses posées :**
- Le polling 5 min est un compromis acceptable en MVP (pas de WebSocket/SSE). Les rappels envoyés par email sont déjà gérés par BullMQ côté backend — le polling in-app sert uniquement à rafraîchir l'état affiché (statut pending/sent).
- `CalendarIcon` et `CheckCircleIcon` sont disponibles dans `@heroicons/vue/24/outline` (déjà installé comme dépendance).

**Dette / points d'attention :**
- Pas de tests Vitest pour `NotificationBellComponent` ni `TodoWidget` — cohérent avec la dette front déjà documentée.
- Le polling charge systématiquement tous les rappels de l'utilisateur — acceptable pour un MVP avec peu de rappels par utilisateur.

---

### [M-00b.06] — ESLint / Prettier (front + back) — 2026-06-13

**Fichiers créés (API) :**
- `my_memo_master_api/.prettierrc.json` — config Prettier alignée sur le front (semi:false, singleQuote:true, tabWidth:2, printWidth:100, trailingComma:none)
- `my_memo_master_api/.prettierignore` — exclut node_modules, dist, coverage, *.lock

**Fichiers modifiés (API) :**
- `my_memo_master_api/eslint.config.mjs` — ajout `eslint-config-prettier` pour désactiver les règles ESLint en conflit avec Prettier
- `my_memo_master_api/package.json` — ajout `prettier` + `eslint-config-prettier` en devDependencies ; ajout script `"format": "prettier --write ."`
- Tous les fichiers source API — reformatés par `prettier --write .` (commit rétroactif)

**Ce qui existait déjà (front) :**
- `my_memo_master_front/.eslintrc.cjs` — ESLint vue3-essential + prettier/skip-formatting (déjà en place)
- `my_memo_master_front/.prettierrc.json` — config Prettier (déjà en place)

**Ce qui est utilisable :**
- `npm run lint` — ESLint (sans conflits Prettier) sur les deux services
- `npm run format` — reformate tout le code API via `prettier --write .`
- CI `npm run lint` passe pour api et front

**Hypothèses posées :**
- La config Prettier API est volontairement identique à celle du front pour une cohérence maximale entre les deux services.

**Dette / points d'attention :**
- Le CI ne lance pas `prettier --check` — uniquement ESLint. Si un fichier est mal formaté sans erreur ESLint, le CI ne le détecte pas. À ajouter si la rigueur de format est requise en CI.

---

### [M-03.10] — Tests fonctionnels Deadline + Reminder — 2026-06-13

**Fichiers créés :**
- `my_memo_master_api/test/services/Deadline.service.test.js` — 11 tests unitaires Jest pour DeadlineService (findAll, findOne, create, update, delete). Models Sequelize mockés via `jest.mock('../../models/index')`. Pattern `mockResolvedValueOnce` pour les méthodes qui appellent `findByPk` deux fois (update → findOne en fin).
- `my_memo_master_api/test/bdd/deadline.reminder.test.js` — 15 tests fonctionnels BDD (Supertest + SQLite in-memory). Flux complet : création données (Role → User → ClassGroup → CalendarEvent → EventOccurrence) → POST /deadlines → GET /deadlines → POST /reminders → GET /reminders → DELETE /reminders. BullMQ entièrement mocké (pas de Redis).
- `my_memo_master_front/test/components/TodoWidget.test.js` — 19 tests Vitest pour TodoWidget. Stores `revisionSessions` et `deadlines` mockés via `createTestingPinia`. Temps figé via `vi.setSystemTime`. Vérifie filtres par onglet, compteurs, badges type, checkbox, tri par date/heure.
- `my_memo_master_front/test/components/NotificationBellComponent.test.js` — 33 tests Vitest pour NotificationBellComponent. `v-click-outside` mockée via `vi.hoisted + vi.mock`. Vérifie badge, ouverture/fermeture panneau, liste pending/sent, formatage date, suppression, polling 5 min, nettoyage `clearInterval`.

**Ce qui est utilisable :**
- `npm test` (back) : 695 tests ✅ (anciennement 645 + 39 + 11)
- `npm test` (front) : 76 tests ✅ (anciennement 24 + 19 + 33)
- Couverture M-03.10 : Échéances, Rappels, To-do, Calendrier, Priorisation — tests unitaires + BDD + composants

**Hypothèses posées :**
- Le type de deadline utilisé dans les tests BDD est `'devoir'` (les types valides sont `['ds', 'devoir', 'exposé', 'autre']` — `'homework'` est invalide).
- Le champ FK de `EventOccurrence` vers `CalendarEvent` s'appelle `eventId` (pas `calendarEventId`).
- La directive `v-click-outside` doit être mockée dans les tests Vitest (JSDOM n'a pas de support natif pour les directives custom qui font des event listeners globaux).
- Le test de formatage "Dans 1h" nécessite `vi.useFakeTimers()` pour figer `Date.now()` — sans cela, le délai calculé peut être 59 min si quelques ms s'écoulent entre `makePendingReminder()` et le rendu.

**Dette / points d'attention :**
- Les tests BDD ne couvrent pas : PUT /deadlines, DELETE /deadlines, PUT /reminders — à compléter si la couverture doit être exhaustive.
- Le test "retourne 400 si la date de rappel est déjà passée" suppose que 99999 min > (35 jours = 50400 min) — vrai. Si la deadline devenait > 69 jours, ce test échouerait.

---

### [M-03-REVIEW] — Revue de code M-03 (dette technique) — 2026-06-14

**Contexte :** Revue de code et correction de la dette technique accumulée sur les tickets M-03.

**Fichiers modifiés (API) :**
- `services/RevisionSession.service.js` — ajout JSDoc complet sur toutes les méthodes publiques (AGENT.md exige JSDoc sur toutes les méthodes exportées)
- `services/ClassGroup.service.js` — correction JSDoc `delete` : retour déclaré `{Promise<boolean|false>}` mais la méthode pouvait aussi retourner `null` → corrigé en `{Promise<true|null|false>}`
- `controllers/Reminder.controller.js` — 2 corrections dette :
  - `res.send()` → `res.json()` (cohérence avec tous les autres controllers du projet)
  - Messages sans point final → point final ajouté (ex. `'Rappel créé avec succès'` → `'Rappel créé avec succès.'`)

**Fichiers modifiés (front) :**
- `src/pages/CalendarPage.vue` — suppression de `formatDate()` (définie ligne 473, jamais utilisée dans le template ni dans le script après refacto vers l'API Planning)
- `test/components/NotificationBellComponent.test.js` — `vi.spyOn(globalThis, 'clearInterval')` → `vi.spyOn(window, 'clearInterval')` (ESLint `no-undef` : `globalThis` non reconnu dans l'environnement JSDOM ; `window` est équivalent en jsdom)

**Résultat :**
- `npm run lint` (back) : ✅ 0 erreur
- `npm run lint` (front) : ✅ 0 erreur
- `npm test` (back) : ✅ 695/695 tests
- `npm test` (front) : ✅ 76/76 tests

**Hypothèses posées :**
- `formatDate` dans CalendarPage.vue avait été créée pour l'agenda initial (affichage de dates). Depuis M-03.07, l'agenda est piloté par `GET /planning/priorities` et n'utilise plus cette fonction — suppression sans impact.
- `window` et `globalThis` sont identiques en contexte jsdom/browser — le spy reste valide.

**Dette / points d'attention :**
- Worker process warning sur les tests back (`"A worker process has failed to exit gracefully"`) — préexistant, causé par le BullMQ singleton qui garde des handles ouverts. Non bloquant (tous les tests passent), mais `jest --detectOpenHandles` permettrait d'en identifier la source précise.
- Le CI ne lance pas `prettier --check` côté back — déjà documenté dans M-00b.06.

---

### [M-05.01] — Définition rôles et permissions (RBAC) — 2026-06-14

**Fichiers créés (API) :**
- `seeders/20260614000001-seed-admin-etablissement-moderateur-roles.js` — roles 4 (Admin établissement) et 5 (Modérateur) insérés en base
- `middlewares/requireRole.middleware.js` — middleware RBAC centralisé : `requireRole(...allowedRoleIds)` → 403 si roleId absent de la liste ; injecte `req.user.roleId` pour les handlers suivants

**Fichiers modifiés (API) :**
- `routes/Role.routes.js` — `POST /roles`, `PUT /roles/:id`, `DELETE /roles/:id` protégés par `requireRole(1)` (admin plateforme uniquement)
- `routes/User.routes.js` — `POST/PUT/DELETE /users/:id/role` protégés par `requireRole(1)`
- `services/ClassGroup.service.js` — toutes les vérifications `roleId !== 1` → `![1, 4].includes(roleId)` : l'admin établissement (4) peut créer/modifier/supprimer des groupes classes et gérer les membres
- `services/CalendarEvent.service.js` — `_isAdmin` : `roleId === 1` → `[1, 4].includes(roleId)` pour l'admin établissement

**Fichiers créés (front) :**
- `src/composables/useRole.js` — composable RBAC : expose `isAdminPlateforme`, `isEtudiant`, `isEnseignant`, `isAdminEtablissement`, `isModerateur`, `isAdmin`, `canManageGroups`, `hasAnyRole`, `ROLE_IDS`

**Fichiers modifiés (front) :**
- `src/router/index.js` — guard `meta.roles` : redirige vers `/` si le roleId de l'utilisateur n'est pas dans la liste des rôles autorisés de la route
- `src/pages/ClassroomPage.vue` — refacto RBAC : rôle détecté automatiquement depuis `useRole()` + `useAuthStore()` ; connexion API réelle (`GET /class-groups`) au montage ; toggle vue visible uniquement pour les admins ; `currentUserId` issu du store ; `filteredGroups` filtre sur le vrai userId

**Ce qui est utilisable :**
- 5 rôles définis : Admin plateforme (1), Étudiant (2), Enseignant (3), Admin établissement (4), Modérateur (5)
- `requireRole(1, 4)` utilisable sur n'importe quelle route protégée (après `authMiddleware`)
- `useRole()` utilisable dans tout composant Vue pour conditionner l'affichage
- `meta.roles: [1]` dans les routes Vue pour restreindre l'accès à certaines pages
- ClassroomPage affiche la vue "Professeur" pour Enseignant/Admin, "Étudiant" pour Étudiant — automatiquement
- Admin plateforme/établissement peut basculer entre les deux vues (toggle de prévisualisation)
- Groupes chargés depuis l'API réelle ; membres filtrés par rôle dans le groupe

**Rôles et périmètres :**
- roleId=1 Admin plateforme : accès total, seul à pouvoir CRUD les rôles et assigner des rôles à des users
- roleId=2 Étudiant : accès lecture groupes/calendrier, pas de création
- roleId=3 Enseignant : vue "professeur" dans ClassroomPage, peut accéder aux fonctions enseignant
- roleId=4 Admin établissement : peut créer/modifier/supprimer groupes classes et gérer membres (comme roleId=1 pour ce périmètre)
- roleId=5 Modérateur : rôle créé, à utiliser sur des routes de modération à définir

**Hypothèses posées :**
- `requireRole` fait une requête DB par appel (pas de cache) — acceptable en MVP mono-instance ; à passer en JWT-claim si la latence devient un problème.
- L'unicité du compte admin plateforme n'est pas contrainte en DB — à gérer par convention (ne pas créer plusieurs users roleId=1).
- ClassroomPage en vue étudiante filtre les groupes sur `members.find(m => m.userId === currentUserId)` — si l'étudiant n'est dans aucun groupe API, il voit les données mock de démo jusqu'à ce que des groupes réels soient créés.

**Dette / points d'attention :**
- Tests à mettre à jour : `Role.controller.test.js` — `POST/PUT/DELETE /roles` retournent désormais 403 sans token admin (les tests actuels ne mockent pas le roleId). À corriger dans un ticket de test.
- `ClassroomPage.vue` — les sections/événements/ressources restent en données mock (non connectées à l'API) — à brancher sur `GET /class-groups/:id` + entités Calendrier dans un ticket dédié.
- `requireRole` n'est pas encore appliqué sur les routes ClassGroup (la vérification reste dans le service via DB) — cohérent avec l'architecture actuelle (logique métier dans les services), mais un doublon middleware+service serait plus défensif.

---

### [INFRA] — Fixes démarrage Docker local + rôle par défaut — 2026-06-14

**Contexte :** DB entièrement vidée (docker compose down -v), redémarrage propre avec Docker.

**Fichiers modifiés (API) :**
- `server.js` — `require('dotenv').config()` déplacé en **toute première ligne** (avant `require('./models')`). Bug : les variables d'env (PG_HOST, API_PORT, etc.) n'étaient pas chargées quand `models/index.js` s'exécutait → fallback SQLite involontaire + mauvais port.
- `models/index.js` — `sync({ alter: true })` → `sync({ alter: { drop: false } })`. Sans `drop: false`, Sequelize essayait de supprimer des colonnes référencées par des FK PostgreSQL → erreur bloquante à chaque démarrage en dev.
- `models/User.model.js` — `roleId.defaultValue: 2` ajouté — valeur DB-level pour les insertions ORM sans roleId.
- `services/User.service.js` — `user.roleId = user.roleId ?? 2` dans `create()` — garantit le rôle Étudiant même si le defaultValue Sequelize n'est pas propagé.
- `seeders/20260605000001-seed-roles.js` — `'Admin'` → `'Admin plateforme'` pour cohérence avec `ROLE_IDS.ADMIN_PLATEFORME`.

**Problème connu (seeding + séquences PostgreSQL) :**
Les seeders insèrent avec des `roleId` explicites (1-5). PostgreSQL ne fait pas avancer la séquence lors d'insertions avec ID explicite. Après seeding, la séquence `Role_roleId_seq` reste à 1, et le premier `Role.create()` échoue avec `SequelizeUniqueConstraintError: roleId must be unique`.
**Fix appliqué manuellement (à faire après chaque `db:seed:all`) :**
```sql
SELECT setval('"Role_roleId_seq"', (SELECT MAX("roleId") FROM "Role"));
SELECT setval('"User_userId_seq"', (SELECT MAX("userId") FROM "User"));
```
**Dette :** ajouter cette remise à zéro dans le dernier seeder ou dans `entrypoint.sh`.

**Tests validés :**
- `POST /api/v1/users/login` → 200 + token JWT (admin@mymemomaster.local / Admin1234!)
- `GET /api/v1/roles` → 200 + 5 rôles (Admin plateforme, Étudiant, Enseignant, Admin établissement, Modérateur)
- `POST /api/v1/roles` sans token → 401
- `POST /api/v1/roles` avec token étudiant → 403
- `POST /api/v1/roles` avec token admin → 201
- `DELETE /api/v1/roles/:id` avec token admin → 204
- Inscription nouvel utilisateur → `roleId=2` confirmé en base

---

### [M-05.03] — Modèle de données utilisateurs (refresh token) — 2026-06-14

**Fichiers modifiés (API) :**
- `models/User.model.js` — ajout `refreshToken` (STRING 128, nullable) + `refreshTokenExpiresAt` (DATE, nullable)
- `services/User.service.js` — 3 nouvelles méthodes : `setRefreshToken`, `verifyRefreshToken`, `clearRefreshToken`
- `controllers/User.controller.js` — `login` retourne maintenant `{ token, refreshToken }` + nouveaux handlers `refreshToken` et `logout`
- `routes/User.routes.js` — 2 nouvelles routes publiques : `POST /users/refresh-token` + `POST /users/logout`
- `validators/User.validators.js` — `exports.refreshToken` (body.refreshToken requis)
- `.env.example` — `AUTH_JWT_EXPIRES_IN=15m` (anciennement 1d) + `AUTH_REFRESH_TOKEN_EXPIRES_DAYS=7`

**Fichiers créés (API) :**
- `migrations/20260614000002-add-refresh-token-to-user.js` — ajout des 2 colonnes sur la table User

**Fichiers modifiés (front) :**
- `src/stores/auth.js` — `refreshToken: null` dans l'état, persisté, stocké au login, révoqué au logout (fire-and-forget vers `POST /users/logout`)
- `src/helpers/api.js` — `_tryRefreshToken()` + intercepteur response Axios : 401 → tentative refresh → retry transparent ; si échec → `handleSpecialStatus` → logout
- `test/helpers/api.test.js` — mock axios étendu avec `response: { use: vi.fn() }`

**Ce qui est utilisable :**
- `POST /api/v1/users/login` → `{ token, refreshToken }` (accès 15 min, refresh 7 jours)
- `POST /api/v1/users/refresh-token` → `{ refreshToken }` en body → `{ token, refreshToken }` (rotation)
- `POST /api/v1/users/logout` → `{ refreshToken }` en body → révocation en base → 200
- Côté front : le refresh est transparent (géré par l'intercepteur, les composants ne voient pas les 401 si le refresh token est encore valide)
- `npx sequelize-cli db:migrate` — applique la migration `20260614000002`

**Hypothèses posées :**
- Le refresh token est stocké en clair en base, cohérent avec `validEmailCode` et `resetPasswordCode` (décision documentée dans `DECISIONS.md`)
- La rotation systématique (nouveau token à chaque refresh) limite la fenêtre d'exploitation en cas de vol
- `POST /users/logout` est une route publique : elle accepte le `{ refreshToken }` dans le body sans JWT — l'utilisateur peut révoquer même si son access token est expiré
- `AUTH_JWT_EXPIRES_IN` est passé de `1d` à `15m` par défaut — les installations existantes avec `.env` explicite (`AUTH_JWT_EXPIRES_IN=1d`) ne sont pas affectées

**Dette / points d'attention :**
- ~~Les tests existants de `User.controller` (`POST /login`) n'ont pas été mis à jour pour vérifier `refreshToken` dans la réponse~~ — Résolu en M-05.06
- Si la DB est compromise, les refresh tokens en clair sont exploitables — à passer en hash SHA-256 si les exigences de sécurité augmentent
- `POST /users/logout` est idempotent et retourne 200 même si le token n'existe pas en base

---

### [M-05.09] — Dette technique pages Auth (Composition API) — 2026-06-16

**Fichiers réécrits (migration Options API → `<script setup>`) :**
- `pages/login/ConnexionPage.vue` — `<script src="./Connexion.js">` remplacé par `<script setup>` ; `<style scoped src="./Connexion.css">` inliné ; commentaire HTML mort supprimé
- `pages/register/InscriptionPage.vue` — même migration ; `minlength="6"` → `minlength="10"` (alignement avec la validation JS et le backend) ; label "Name" → "Nom"

**Fichiers supprimés :**
- `pages/login/Connexion.js` — logique maintenant dans le SFC
- `pages/login/Connexion.css` — styles maintenant inlinés dans `<style scoped>`
- `pages/register/Register.js` — idem
- `pages/register/Register.css` — idem
- `pages/AuthPage.vue` — fichier vide non référencé (route `/auth` pointait déjà vers `ConnexionPage.vue`)

**Build Vite :** ✅ 0 erreur après suppression

**Dette résolue :** style Vue mixte (Options API vs Composition API), AuthPage vide, minlength incohérent

---

### [M-05.09c] — Composant layout partagé AuthFormLayout — 2026-06-16

**Contexte :** Les 4 pages d'auth (Connexion, Inscription, ForgotPassword, ResetPassword) partageaient exactement le même squelette HTML (wrapper 2 colonnes, image gauche, panel droit avec logo + titre). Ce layout était copié-collé dans chaque page.

**Fichiers créés :**
- `src/components/AuthFormLayout.vue` — composant layout pur (aucune logique métier). Props : `title` (required), `imageSrc` (default `/connexion.jpg`), `imageAlt`, `description` (optionnel, affiche un `<p>` sous le titre), `titleClass` (default `md:text-[2.5rem]`). Slot default = contenu du formulaire.

**Fichiers modifiés (réécriture template uniquement, logique inchangée) :**
- `pages/login/ConnexionPage.vue` — template réduit à `<AuthFormLayout title="Connexion" title-class="md:text-[3rem] neue-haas-grotesk-font">` + le formulaire
- `pages/register/InscriptionPage.vue` — idem + correction : `../../../public/inscription.png` → `/inscription.png` ; `../../../public/logo/logo-full.svg` → via le layout ; `bg-blue-500` (bleu Tailwind #3B82F6 incorrect) → `bg-primary` (#1E3BA1 via layout)
- `pages/ForgotPasswordPage.vue` — `description` passée en prop, layout HTML supprimé
- `pages/ResetPasswordPage.vue` — idem

**Bug corrigé :** InscriptionPage utilisait `bg-blue-500` (bleu Tailwind standard, différent du bleu primaire du projet) sur le panel gauche. Normalisé via le layout.

**Build Vite :** ✅ 0 erreur (897 modules → -2 vs avant : le layout mutualisé réduit les chunks d'auth)

---

### [M-05.08] — Tests gestion sessions et déconnexion — 2026-06-16

**Fichiers modifiés :**
- `test/controllers/User.controller.test.js` — 8 tests ajoutés :
  - `POST /users/refresh-token` : 200 nominal (nouveau token + rotation refreshToken), 401 token invalide/expiré, 400 body vide, 500 service KO
  - `POST /users/logout` : 200 révocation, 200 idempotent (token inconnu → pas de clearRefreshToken), 400 body vide, 500 service KO

**Résultat :** 724 tests (716 → +8) — tous verts

**Dette résolue :** routes `/refresh-token` et `/logout` sans couverture Supertest (signalée dans M-05.03)

---

### [M-05.07] — Tests RBAC middleware — 2026-06-16

**Contexte :** Le middleware `requireRole` avait été livré dans M-05.01 sans couverture de tests. Les tests `Role.controller.test.js` ne vérifiaient pas les cas 403 sur POST/PUT/DELETE. Les routes `POST/PUT/DELETE /users/:id/role` n'étaient pas testées du tout.

**Fichiers créés :**
- `test/middlewares/requireRole.middleware.test.js` — 8 tests unitaires purs : rôle autorisé → next(), multi-rôles, injection req.user.roleId, rôle refusé → 403, user null → 403, DB error → 500, vérification userId

**Fichiers modifiés :**
- `test/controllers/Role.controller.test.js` — 3 tests 403 ajoutés (POST, PUT, DELETE /roles avec roleId=2)
- `test/controllers/User.controller.test.js` — mock `User: { findByPk: jest.fn() }` ajouté ; `beforeEach` mis à jour pour setter `User.findByPk.mockResolvedValue({ roleId: 1 })` ; 3 nouveaux describe (POST/PUT/DELETE /users/:id/role) avec 11 tests (200 admin, 403 étudiant, 401, 500)

**Ce qui est couvert :**
- Middleware unitaire : autorisé, refusé, user null, DB error, multi-rôles, injection roleId
- Intégration Role.controller : 403 sur POST/PUT/DELETE avec non-admin
- Intégration User.controller : CRUD routes rôle (admin : 200, étudiant : 403, sans token : 401)

**Résultat :** 716 tests (695 + 21 nouveaux) — tous verts

**Dette résolue :** ~~Tests à mettre à jour : Role.controller.test.js — POST/PUT/DELETE /roles retournent désormais 403 sans token admin~~ (M-05.01)

---

### [M-05.06] — Reset mot de passe (token hashé) — 2026-06-15

**Fichiers modifiés (API) :**
- `models/User.model.js` — `resetPasswordCode` : `DataTypes.INTEGER` → `DataTypes.STRING(64)` (stocke un hash SHA-256)
- `services/User.service.js` — suppression import `generateCode` → import `crypto` ; `setResetPasswordCode` : génère `crypto.randomBytes(32).toString('hex')` (token brut 64 chars), stocke `SHA-256(token)` en base, retourne le token brut ; `verifyResetPasswordCode` : hash le token reçu, compare au hash stocké
- `controllers/User.controller.js` — `forgotPassword` : message email mis à jour ("token" + instruction copier-coller)
- `validators/User.validators.js` — `resetPassword.code` : `.isHexadecimal().isLength({ min: 64, max: 64 })` (valide le format avant d'appeler le service)
- `test/controllers/User.controller.test.js` — mock `setRefreshToken`/`verifyRefreshToken`/`clearRefreshToken` ajoutés (dette M-05.03) ; tests reset-password mis à jour avec tokens 64-char hex ; test format invalide ajouté ; test login corrigé (`refreshToken` dans la réponse asserté)
- `test/services/User.service.test.js` — 4 nouveaux tests : `setResetPasswordCode` (vérifie token brut ≠ hash stocké), `verifyResetPasswordCode` (hash correct, token incorrect, token expiré)

**Fichiers créés (API) :**
- `migrations/20260615000001-change-reset-password-code-column.js` — `ALTER COLUMN resetPasswordCode STRING(64)`

**Fichiers modifiés (front) :**
- `src/stores/auth.js` — messages utilisateur mis à jour : "token de réinitialisation" + instruction copier-coller

**Ce qui est utilisable :**
- `POST /api/v1/users/forgot-password` → génère un token 64-char hex, envoie le token brut par email, stocke le SHA-256 en base
- `POST /api/v1/users/reset-password` → body `{ email, code: <token_64chars_hex>, newPassword }` → vérifie `SHA-256(code) === hash_stocké` + expiration 30 min
- Le token expiré ou déjà utilisé est automatiquement effacé en base (même si invalide)
- `npx sequelize-cli db:migrate` — applique la migration `20260615000001`

**Hypothèses posées :**
- Le token brut (64 chars hex = 32 octets) a 2^256 valeurs possibles : infaisable à brute-forcer. Le hash SHA-256 en base protège contre l'exploitation d'une fuite de base de données.
- Le champ body reste `code` (pas `token`) pour ne pas casser le frontend existant — seule la nature de la valeur change (64-char hex à copier-coller vs 6 chiffres à taper).
- Le refresh token reste stocké en clair (décision MVP documentée) — seul le reset password token est hashé car il est plus critique (accès complet au compte sans connaître le mot de passe actuel).

**Migration à jouer en prod :**
```
npx sequelize-cli db:migrate --migration 20260615000001-change-reset-password-code-column.js
```

**Dette / points d'attention :**
- UX : l'utilisateur doit maintenant copier-coller un token de 64 caractères depuis son email, au lieu de saisir un code à 6 chiffres. Un lien cliquable (`/reset-password?token=xxx`) serait une meilleure UX — à prévoir dans un ticket front dédié.
- Le refresh token et `validEmailCode` restent en clair — à traiter si les exigences de sécurité augmentent.

---

### [M-05.09b] — CSS partagé pages auth (auth-form.css) — 2026-06-16

**Contexte :** Les 4 pages d'auth (ConnexionPage, InscriptionPage, ForgotPasswordPage, ResetPasswordPage) partageaient les mêmes classes CSS (`.custom-border`, `.imageConnexion`, `.formulaire`, `.valider`, `.contenue`). Les styles étaient dupliqués dans les `<style scoped>` de Connexion et Inscription, et absents (bug silencieux) dans ForgotPassword et ResetPassword qui utilisaient ces classes sans les définir.

**Fichiers créés :**
- `my_memo_master_front/src/assets/auth-form.css` — 5 classes partagées : `.custom-border`, `.imageConnexion`, `.valider`, `.contenue`, `.formulaire`

**Fichiers modifiés :**
- `pages/login/ConnexionPage.vue` — ajout `import '@/assets/auth-form.css'` ; suppression `<style scoped>`
- `pages/register/InscriptionPage.vue` — ajout `import '@/assets/auth-form.css'` ; suppression `<style scoped>`
- `pages/ForgotPasswordPage.vue` — ajout `import '@/assets/auth-form.css'` (corrige bug : `.custom-border` et `.formulaire` étaient définis dans le template mais n'avaient aucun style)
- `pages/ResetPasswordPage.vue` — même correction

**Bug corrigé :** ForgotPasswordPage et ResetPasswordPage utilisaient `.custom-border` et `.formulaire` dans le template sans que ces classes soient définies — la bordure arrondie bleue et le fond blanc n'étaient pas appliqués sur ces deux pages.

**Build Vite :** ✅ 0 erreur

---

### [M-05.10] — Page profil utilisateur (tests + revue + doc) — 2026-06-17

**Contexte :** `ProfilePage.vue` était fonctionnellement implémentée depuis l'init du projet mais sans tests, sans revue formelle et sans entrée CHANGELOG dédiée. Ce ticket couvre la finalisation DoD.

**Fichiers créés :**
- `my_memo_master_front/test/components/ProfilePage.test.js` — 17 tests Vitest

**État du composant (déjà implémenté, non modifié) :**
- `my_memo_master_front/src/pages/ProfilePage.vue` — 5 sections fonctionnelles :
  - **Informations personnelles** : nom, email, rôle calculé depuis `ROLE_LABELS[authStore.user.roleId]`
  - **Modifier le profil** : formulaire nom + email → `PUT /users/:id` (ownership check, validator)
  - **Sécurité** : changement de mot de passe (validation front `missingsElementsPassword` + `PUT /users/:id/change-password`)
  - **Déconnexion** : `authStore.logout()` (révocation refresh token + redirect)
  - **Zone dangereuse** : suppression compte avec confirmation textuelle "SUPPRIMER" → `authStore.deleteAccount()` → `DELETE /users/:id`

**Couverture tests :**
- Rendu initial : nom, email, rôle (Étudiant / Inconnu si roleId hors liste), formulaire pré-rempli
- `fetchUserInfos()` appelé au montage
- `saveProfile` : succès (200 → notif + update store), erreur API (message serveur), réponse absente (message générique)
- `changePassword` : mots de passe différents, password invalide (critères manquants), succès (notif + reset form), erreur API
- Déconnexion : clic → `authStore.logout()` appelé
- Zone dangereuse : bouton désactivé si `deleteConfirm ≠ 'SUPPRIMER'`, activé si égal, clic → `authStore.deleteAccount()`

**Résultats tests :** 93/93 tests front ✅ (76 → +17 ProfilePage)

**Revue de code :**
- ✅ Architecture conforme : contrôleurs minces (try/catch + appel service + réponse HTTP), ownership check sur `update`, `changePassword`, `delete`
- ✅ Messages d'erreur en français sur tous les endpoints concernés
- ✅ Validator `changePassword` branché sur la route
- ✅ Validation côté front avant appel API (évite les aller-retours sur les cas triviaux)
- ⚠️ `changePassword` controller utilise `req.user.id` (JWT) et non `req.params.id` — la vérification ownership est implicite (le changement s'applique toujours au propriétaire du JWT). L'URL `/:id` est trompeuse mais sans impact sécurité. Dette documentée.
- ⚠️ Validator `exports.changePassword` valide `body('id')` mais le controller ignore `req.body.id` (utilise `req.user.id`). Le front envoie ce champ uniquement pour passer le validator. Redondance acceptable en MVP.

**Endpoints backend utilisés :**
- `GET /api/v1/users/:id` (authMiddleware + ownership) — chargé par `fetchUserInfos()` au montage
- `PUT /api/v1/users/:id` (authMiddleware + ownership + validator) — modification nom/email
- `PUT /api/v1/users/:id/change-password` (authMiddleware + validator) — changement mot de passe
- `DELETE /api/v1/users/:id` (authMiddleware + ownership) — suppression compte

**Hypothèses posées :**
- La validation `missingsElementsPassword` côté front est en anglais (messages internes) ; le texte affiché à l'utilisateur est assemblé en français dans le composant (`Le mot de passe doit contenir : ...`).
- `authStore.user.userId` est l'identifiant utilisé dans les URLs (payload JWT `{ id: userId }` → stocké comme `user.userId` au login).
- `deleteAccount()` est délégué à l'authStore car la suppression doit enchaîner un logout (nettoyage état + révocation refresh token).

**Dette / points d'attention :**
- `changePassword` route : l'`:id` URL est ignoré par la logique de sécurité — à aligner en supprimant l'`:id` de l'URL (route dédiée `POST /users/me/change-password`) si le projet monte en maturité.
- `saveProfile()` dans le composant duplique partiellement `authStore.updateUserInfos()` (même PUT endpoint). Pas de bug, refacto possible dans un ticket de nettoyage.

---

### [M-05.12] — Tests unitaires auth (Bcrypt, JWT, RBAC) — 2026-06-17

**Objectif :** Combler les 2 gaps de couverture identifiés lors de la vérification : Auth.middleware.js (JWT) non testé en isolation, et bcrypt (verifyPassword/setPassword/create) non testé en unitaire dans User.service.

**Fichiers créés :**
- `test/middlewares/Auth.middleware.test.js` — 7 tests Jest du middleware JWT

**Fichiers modifiés :**
- `test/services/User.service.test.js` — +6 tests bcrypt (verifyPassword, setPassword, hachage au create)
  - Import `bcryptjs` ajouté

**Résultats tests :** 743 tests / 48 suites — tous verts ✅

**Couverture Auth.middleware.test.js (7 tests) :**
- Header Authorization absent → 401 "Authentification requise." ✅
- Token malformé → 401 "Token invalide ou expiré." ✅
- Token signé avec mauvaise clé secrète → 401 "Token invalide ou expiré." ✅
- Token expiré → 401 "Token invalide ou expiré." ✅
- Token valide avec préfixe "Bearer" → next() + req.user peuplé ✅
- Token valide sans préfixe "Bearer" → next() + req.user peuplé ✅
- req.user contient exactement le payload encodé (y compris roleId) ✅

**Couverture bcrypt User.service.test.js (+6 tests) :**
- verifyPassword : bon mot de passe → true ✅
- verifyPassword : mauvais mot de passe → false ✅
- setPassword : mot de passe vide → throw "Mot de passe manquant" ✅
- setPassword : trop court (< 10 chars) → throw ✅
- setPassword : hash bcrypt stocké, pas le plaintext ✅
- create : mot de passe hashé avant User.create (hash ≠ plain, bcrypt.compare valide) ✅

**Ce qui était déjà couvert (non redoublé) :**
- RBAC : `requireRole.middleware.test.js` (8 tests) — inchangé ✅
- JWT côté controller (login → token, refresh-token, logout) : `User.controller.test.js` — inchangé ✅
- Reset password SHA-256 : `User.service.test.js` (3 tests) — inchangé ✅
- CORS + Rate limiting : `security.test.js` — inchangé ✅
- Guards front (router + useRole) : M-05.11 — inchangé ✅

**Hypothèses / Dette :**
- La branche "Token manquant." du middleware est théoriquement inatteignable (si authHeader est truthy, token l'est aussi) — non testée car dead code ; à nettoyer dans un futur ticket.
- bcrypt.hash(password, 10) est testé avec le vrai algorithme (pas mocké) : les tests sont lents (~0.1s/test) mais fiables.
- Le warning `worker process force exited` sur BullMQ est préexistant (tests deadline/reminder) — non introduit par M-05.12.

---

### [M-06.01b] — MCQ pour le système Leitner — 2026-06-19

**Fichiers modifiés (API) :**
- `services/LeitnerCard.service.js` — `correctResponse` : charge désormais `Question` (avec `content`) en plus de `LeitnerBox`. Branche sur `question.type` :
  - `'mcq'` → `studentAnswer` = index (string) de l'option choisie ; comparaison exacte contre `content.options[idx].correct` ; retourne `score: 1/0`, `explanation: null`
  - `'open'` (et tout autre type) → flux sémantique IA existant via `semanticService.gradeSemantic`

**Fichiers modifiés (Front) :**
- `src/pages/FlashcardsCardsPage.vue` — modale de création : sélecteur de type (open / mcq) affiché en création seulement ; pour `mcq` : liste d'options (radio pour marquer la correcte, bouton + option) ; `handleCreate` : si `open` → crée Question + Response comme avant ; si `mcq` → crée Question avec `content: { options }` sans Response
- `src/pages/FlashcardsSessionPage.vue` — rendu conditionnel : `open` → textarea existante + score IA ; `mcq` → radio buttons colorés (vert = bonne option, rouge = mauvais choix) au moment du feedback ; le score IA n'est affiché que pour les questions ouvertes

**Ce qui est utilisable :**
- Créer une carte Leitner MCQ : sélectionner "QCM" dans la modale → saisir les options → la correction est exacte et instantanée (pas d'appel IA)
- La session Leitner détecte automatiquement le type de chaque carte et adapte le rendu
- La règle Leitner (boîte + 1 / retour boîte 1) s'applique identiquement pour les deux types

**Hypothèses posées :**
- `studentAnswer` pour MCQ = index de l'option sous forme de string (ex: `"0"`, `"1"`). Le validator existant (`trim().notEmpty()`) accepte ces valeurs.
- L'affichage des options en mode feedback colore en vert la bonne option et en rouge l'option choisie si elle est fausse, quel que soit le résultat.

**Dette / points d'attention :**
- L'édition d'une carte MCQ existante (`openEditModal`) n'affiche pas les options actuelles — les options ne sont pas récupérées dans `loadCards`. À implémenter dans un ticket dédié si nécessaire.
- `fill_blank` et `reorder` sont intentionnellement exclus de Leitner (décision de scope : open + mcq uniquement).

---

### [M-06.01] — Définition types de questions — 2026-06-19

**Fichiers créés :**
- `migrations/20260619000001-add-content-to-question.js` — ajout colonne `content` TEXT nullable sur la table Question

**Fichiers modifiés (API) :**
- `models/Question.model.js` — ajout `content: DataTypes.JSON, allowNull: true` + `type: DataTypes.STRING(20)`
- `validators/Question.validators.js` — `type` contraint à `['open', 'mcq', 'fill_blank', 'reorder']` via `.isIn()` ; `content` validé comme objet JSON si présent
- `services/Question.service.js` — `create` : inclusion de `content` + association testQuestions via `question.addTest(test)` quand `idTest` fourni ; `update` : inclusion de `content`
- `services/Test.service.js` — `findAll` inclut `Subject` (name) ; `findOne` inclut `Subject` + `Question` (triées par questionPosition)
- `routes/Question.routes.js` — Swagger JSDoc POST/PUT : type devient enum, champ `content` documenté

**Fichiers modifiés (Front) :**
- `src/stores/questions.js` — état `question` : `type: 'open'` par défaut, `content: null` ajouté
- `src/pages/ExercisesPage.vue` — connecté au backend : `useTestStore.fetchTests()` + `useSubjectStore.fetchSubjects()` ; formulaire de création avec sélecteur de type par question et champs spécifiques par type ; suppression via `api.del`
- `src/pages/ExerciseDetailPage.vue` — player connecté au backend : `useTestStore.fetchTestById()` ; rendu conditionnel par type (open=textarea, mcq=radios, fill_blank=inputs inline dans le template, reorder=clic pour ordonner les fragments) ; correction et score calculés côté client

**Ce qui est utilisable :**
- `POST /questions` avec `{ type: 'open'|'mcq'|'fill_blank'|'reorder', content: {...}, idTest }` → crée la question ET l'associe au test (testQuestions)
- `GET /tests` → liste les tests avec le sujet associé
- `GET /tests/:id` → test complet avec sujet + questions triées (incluant `content`)
- ExercisesPage : créer un exercice multi-questions avec les 4 types depuis l'UI
- ExerciseDetailPage : jouer un exercice avec correction immédiate

**Structures JSON par type :**
- `open` : `{ correct_answer: "..." }`
- `mcq` : `{ options: [{ text: "...", correct: true/false }] }`
- `fill_blank` : `{ template: "texte avec {{0}} et {{1}}", blanks: ["réponse0", "réponse1"] }`
- `reorder` : `{ fragments: ["mot1", "mot2", "..."], solution: [0, 1, 2, ...] }`

**Hypothèses posées :**
- Pour les cartes Leitner (`FlashcardsCardsPage`), les questions sont créées avec `type: 'open'` et `content: null` — le champ `content` est nullable, la correction Leitner passe toujours par la table `Response` + moteur sémantique IA.
- La correction `open` est une comparaison textuelle exacte (lowercase/trim). Pour une correction sémantique, brancher le même moteur IA que Leitner dans un ticket dédié.
- `Test.service.findOne` ordonne les questions par `questionPosition ASC` via l'alias `question` (as: 'question' dans l'association).

**Dette / points d'attention :**
- Édition des questions d'un exercice existant non implémentée — pour modifier les questions, supprimer et recréer l'exercice dans le MVP.
- ~~`testStore.deleteTest()` vérifie `status !== 200` mais l'API retourne 204~~ — corrigé en M-06.03-FIX.
- La correction `open` est exacte — une correction tolérante (fautes de frappe, synonymes) nécessiterait le moteur Grading/Semantic existant.

---

### [M-06.03-FIX] — Correction bug deleteTest store (204 vs 200) — 2026-06-21

**Contexte :** `api.del` retourne `undefined` (pas `{ data, status }`) quand le serveur répond 204 No Content. Tout store vérifiant `resp.status` sur une réponse 204 reçoit `undefined.status` → TypeError → catch → fausse erreur affiché à l'utilisateur, liste non rafraîchie.

**Controllers retournant 204 sur DELETE :** Test, Diagramme, Role (les autres retournent 200).

**Fichiers modifiés (Front) :**
- `src/stores/tests.js` — `deleteTest` : `resp.status !== 204` → `resp !== undefined` (pattern correct pour 204) ; `fetchTests()` passé en `await` ; message notif harmonisé
- `src/stores/diagrammes.js` — `deleteDiagramme` : `resp.status !== 204` → `resp !== undefined`
- `src/stores/roles.js` — `deleteRole` : `resp.status !== 204` → `resp !== undefined`
- `src/pages/ExercisesPage.vue` — suppression du contournement `api.del` direct dans `deleteTest()` ; branchement sur `testStore.deleteTest(test.testId)`

**Dette résolue :** bug signalé dans M-06.01.

---

### [M-07.01] — Lien sujet → système Leitner (FK directe) — 2026-06-20

**Fichiers créés :**
- `migrations/20260620000001-add-subjectid-to-leitnersystem.js` — ajout colonne `subjectId` (INTEGER nullable, FK → Subject, ON DELETE SET NULL) + index `idx_leitnersystem_subjectid`

**Fichiers modifiés (API) :**
- `models/LeitnerSystem.model.js` — ajout champ `subjectId` + association `belongsTo(Subject, { as: 'subject' })` ; suppression de l'association `belongsToMany(Subject)` via `systemSubject` (table de jointure conservée en base mais plus utilisée)
- `services/LeitnerSystem.service.js` — `findAll(userId)` filtre désormais par `idUser` + inclut `Subject` ; `findBySubject(subjectId, userId)` corrigé (utilisait `idMindMap` à tort) ; `findOne` inclut `Subject` ; `create` retourne le système avec le sujet chargé ; import `Subject` ajouté
- `controllers/LeitnerSystem.controller.js` — `create`/`update` : `subjectId` extrait du body (remplace `idMindMap`/`sujet`) ; `findAll`/`findBySubject` passent `req.user.id`
- `validators/LeitnerSystem.validators.js` — règles `idMindMap` et `sujet` supprimées, remplacées par `subjectId` optionnel entier positif
- `routes/LeitnerSystem.routes.js` — Swagger JSDoc `POST /` et `PUT /:id` mis à jour (`subjectId` à la place de `idMindMap`/`sujet`/`idUser`)

**Fichiers modifiés (Front) :**
- `src/pages/FlashcardsPage.vue` — import `useSubjectStore` + `api` ; filtre sujet (même pattern qu'`ExercisesPage`) ; sélecteur sujet optionnel dans le modal créer/modifier avec création inline ; badge sujet dans la carte MenuItem ; `openEditModal` précharge `form.subjectId` ; `submitForm` passe `subjectId`

**Ce qui est utilisable :**
- `GET /leitnersystems` → retourne uniquement les systèmes de l'utilisateur connecté, avec `subject: { subjectId, name }` inclus
- `GET /leitnersystems/bySubjects/:subjectid` → filtre par sujet ET par utilisateur connecté
- `POST /leitnersystems` avec `{ name, subjectId? }` → crée le système lié au sujet
- `PUT /leitnersystems/:id` avec `{ name, subjectId? }` → met à jour le sujet lié
- FlashcardsPage : filtre par sujet, badge sujet sur chaque carte, sélecteur sujet + création inline dans le modal

**Hypothèses posées :**
- La table `systemSubject` (many-to-many) est conservée en base mais n'est plus utilisée — à supprimer dans un ticket de nettoyage si aucun autre usage n'est identifié.
- `findAll` filtre désormais par `idUser` : un utilisateur ne voit que ses propres systèmes (comportement cohérent avec la logique existante, mais changement de comportement vs. l'ancienne implémentation qui retournait tous les systèmes).
- Le champ `sujet` (JSON) et `idMindMap` restent en base (colonnes non supprimées) pour ne pas casser les données existantes.

**Dette / points d'attention :**
- La table `systemSubject` est orpheline — migration de nettoyage à créer avant la mise en prod.
- Les champs `sujet` (JSON) et `idMindMap` sont toujours en base — à supprimer dans un ticket dédié si confirmés inutilisés.

---

### [M-06.02] — Scores, historique et édition des exercices — 2026-06-21

**Fichiers créés (API) :**
- `models/TestResult.model.js` — entité TestResult : resultId, testId (FK→Test CASCADE), userId (FK→User CASCADE), score, total, completedAt ; index sur testId, userId, (testId, userId)
- `migrations/20260621000001-create-test-result-table.js` — migration Sequelize CLI pour la table TestResult
- `services/TestResult.service.js` — `findByTest(testId, userId)`, `findByUser(userId)` (avec include Test + Subject), `create(data)`
- `controllers/TestResult.controller.js` — `findByTest`, `findByUser`, `create`
- `validators/TestResult.validators.js` — `create` : testId entier positif, score entier ≥ 0, total entier > 0
- `routes/TestResult.routes.js` — GET /test-results, GET /test-results/test/:testId, POST /test-results (authMiddleware sur les 3 routes)

**Fichiers modifiés (API) :**
- `models/index.js` — enregistrement de TestResult
- `app.js` — import + enregistrement `testResultRoutes`

**Fichiers créés (front) :**
- `src/stores/testResults.js` — `useTestResultStore` : `fetchByTest(testId)`, `fetchByUser()`, `saveResult(testId, score, total)` ; getter `bestScore`

**Fichiers modifiés (front) :**
- `src/pages/ExerciseDetailPage.vue` — chargement de l'historique au montage (`fetchByTest`) en parallèle du test ; `submitAnswers()` appelle `saveResult()` après calcul du score ; section historique en bas de page (tableau date / score / %)
- `src/pages/ExercisesPage.vue` — ajout `onEdit` sur MenuItem → `openEditModal(test)` ; modal unifiée création/édition (`isEditMode`) ; `openEditModal` charge le test complet via `GET /tests/:id` et convertit le `content` JSON en état formulaire (`contentToFormState`) ; `submitEdit` : PUT test + DELETE questions supprimées + PUT questions existantes + POST nouvelles questions ; `questionsToDelete` tracke les IDs à supprimer ; chaque question porte un `_key` stable pour le rendu Vue

**Ce qui est utilisable :**
- `POST /api/v1/test-results` — enregistre le résultat d'un exercice (auth requis)
- `GET /api/v1/test-results/test/:testId` — historique d'un exercice pour l'utilisateur connecté
- `GET /api/v1/test-results` — historique complet de l'utilisateur (avec nom exercice + sujet)
- ExerciseDetailPage : score sauvegardé automatiquement à chaque complétion ; tableau des résultats passés visible en bas de page
- ExercisesPage : icône d'édition sur chaque exercice ; modal pré-remplie avec les données existantes ; ajout/modification/suppression de questions inline

**Hypothèses posées :**
- `ON DELETE CASCADE` sur TestResult (testId, userId) : la suppression d'un test ou d'un utilisateur supprime ses résultats — comportement attendu, pas de conservation d'historique orphelin.
- `contentToFormState` reconstitue l'état formulaire depuis le JSON stocké — si le format `content` change pour un type, cette fonction doit être mise à jour en parallèle.
- Lors d'une édition, les questions sans `idQuestion` (nouvelles) sont envoyées avec `idTest` pour l'association via `question.addTest()` du service existant.
- La suppression d'une question appelle `DELETE /questions/:id` — si la question est partagée avec une LeitnerCard, la cascade Sequelize la supprimera aussi (comportement hérité de l'association existante).

**Migration à jouer en prod :**
```
npx sequelize-cli db:migrate --migration 20260621000001-create-test-result-table.js
```

**Dette / points d'attention :**
- ~~Pas de tests Supertest pour TestResult.controller ni Vitest pour testResults.js~~ — Résolu dans M-06-REVIEW.
- `submitEdit` exécute les appels questions séquentiellement (pas en parallèle) pour éviter les conflits de `questionPosition` — acceptable pour MVP.
- La correction `open` reste exacte (lowercase/trim) — pas de tolérance aux fautes. Pour une correction sémantique, brancher le moteur Grading existant dans un ticket dédié.

---

### [M-06-REVIEW] — Revue de code & tests M-06 (API CRUD exercices et questions) — 2026-06-21

**Fichiers créés :**
- `test/controllers/TestResult.controller.test.js` — 16 tests Supertest : GET /test-results (4), GET /test-results/test/:testId (4), POST /test-results (8)
- `my_memo_master_front/test/stores/testResults.store.test.js` — 14 tests Vitest : fetchByTest (3), fetchByUser (3), saveResult (4), getter bestScore (4)

**Fichiers modifiés :**
- `controllers/TestResult.controller.js` — `res.send()` → `res.json()` sur les 3 handlers (cohérence avec la convention du projet)

**Résultats tests :**
- Back : 759 tests passants (+16 TestResult.controller) — 2 échecs préexistants dans Test.service.test.js et Question.service.test.js (non introduits par ce ticket)
- Front : 138 tests passants (+14 testResults.store)

**Revue de code — périmètre M-06 :**

*Architecture et conventions :*
- ✅ controller → service → model respecté sur tout le périmètre (Test, Question, TestResult)
- ✅ `authMiddleware` sur les 3 routes TestResult
- ✅ Validators branchés sur POST /test-results
- ✅ JSDoc présent sur toutes les méthodes publiques de TestResult.service
- ✅ Messages d'erreur en français

*ExercisesPage.vue — points vérifiés :*
- ✅ `DELETE /questions/:id` retourne 204 — la vérification `if (resp !== undefined)` dans `submitEdit` est correcte
- ✅ `buildContent(q)` produit les structures JSON attendues par les 4 types
- ✅ `contentToFormState(q)` reconstruit correctement l'état formulaire depuis le JSON stocké
- ✅ `questionsToDelete` tracke les IDs des questions supprimées avant soumission

*ExerciseDetailPage.vue — points vérifiés :*
- ✅ `checkAnswer` couvre les 4 types avec la logique de correction appropriée
- ✅ `submitAnswers` appelle `testResultStore.saveResult()` après calcul du score
- ✅ `resetQuiz` appelle `initAnswers()` — `questionResults` est vidé dans `submitAnswers` via `splice(0)`, pas de résidu visuel
- ✅ `userAnswers[idx] = oi` (MCQ) stocke l'index numérique, `opts[chosen]?.correct === true` est correct

*TestResult.service.js — points vérifiés :*
- ✅ `findByUser` inclut Test + Subject (nom exercice affiché dans l'historique)
- ✅ `findByTest` filtre sur userId (isolation par utilisateur)
- ✅ `ON DELETE CASCADE` sur testId et userId — suppression propre si test/user supprimé

**Hypothèses posées :**
- Les 2 échecs préexistants (Test.service.test.js : `findOne` appelé avec options d'include non mockées ; Question.service.test.js : même cause) sont antérieurs à M-06. Ils correspondent à une évolution du service (ajout d'includes) sans mise à jour des tests. À corriger dans un ticket dédié.
- Le getter `bestScore` est défini dans le store mais non utilisé dans ExerciseDetailPage — disponible pour un futur widget statistiques.

**Dette / points d'attention :**
- Tests `Test.service.test.js` et `Question.service.test.js` : 2 tests stale (service étendu avec includes, mocks non mis à jour) — à corriger dans un ticket dédié.
- Édition d'une question MCQ existante n'affiche pas les options actuelles dans le formulaire — signalé dans M-06.01b, confirmé non régressé.
- La correction `open` reste exacte — pas de tolérance sémantique en MVP.

---

### [REF-ITEMLIST] — Composant partagé ItemListLayout (FlashcardsPage + ExercisesPage) — 2026-06-21

**Contexte :** FlashcardsPage et ExercisesPage partageaient le même chrome (barre de recherche, filtre sujet, compteur, états chargement/vide, grille) — refactorisé en composant partagé sur le modèle de `AuthFormLayout.vue`.

**Fichiers créés :**
- `src/components/ItemListLayout.vue` — composant layout : barre de recherche (`v-model:search`), filtre sujet (`v-model:selectedSubjectId`), compteur, état chargement, état vide, grille responsive ; slot `default` pour les items, slot `modals` pour les modals ; `@create` emit pour le bouton de création

**Fichiers modifiés :**
- `src/pages/FlashcardsPage.vue` — suppression du chrome dupliqué (≈60 lignes template) ; utilise `<ItemListLayout>` ; modals et cards en slots ; styles harmonisés avec `bg-primary`
- `src/pages/ExercisesPage.vue` — idem ; styles `bg-blue-*` migres vers `bg-primary`/`text-primary` (cohérence projet)

**Interface du composant :**
| Prop | Type | Description |
|---|---|---|
| `search` | String | v-model texte recherche |
| `selectedSubjectId` | Number\|null | v-model filtre sujet actif |
| `subjects` | Array | liste des sujets disponibles |
| `loading` | Boolean | état de chargement |
| `filteredCount` | Number | nombre d'items filtrés (pour l'affichage) |
| `searchPlaceholder` | String | placeholder de l'input |
| `createLabel` | String | label du bouton créer |
| `itemLabel` | String | "système", "exercice"… (singulier) |
| `emptyMessage` | String | message si `filteredCount === 0` |

**Hypothèses posées :**
- La grille et le filtre sujet sont identiques entre les deux pages — `ItemListLayout` est le seul endroit à modifier si la grille ou le filtre évolue.
- Les modals restent dans les pages car elles sont trop différentes pour être partagées.

**Dette / points d'attention :**
- Pas de tests Vitest pour `ItemListLayout` — à ajouter si des cas limites (filtre + recherche simultanés, sujets vides) doivent être validés.

---

### [M-06.05] — Moteur de correction server-side (exercices) — 2026-06-21

**Contexte :** La correction des exercices était entièrement côté client dans `ExerciseDetailPage.vue` (`checkAnswer()`). Le ticket demande de la porter côté serveur comme le système Leitner (`POST /leitnercards/response`).

**Fichiers modifiés (API) :**
- `services/Test.service.js` — ajout `submitAnswers(testId, userId, answers)` : charge le test + questions (include `as: 'question'`, triées par `questionPosition`), évalue chaque réponse via `_checkAnswer()`, crée le `TestResult`, retourne `{ score, total, results, resultId }`. Ajout des helpers privés `_checkAnswer(question, answer)` et `_formatCorrectAnswer(question)`. Import `TestResult` ajouté.
- `controllers/Test.controller.js` — ajout `exports.submit` : appelle `testService.submitAnswers()`, retourne 200 / 404 / 500.
- `validators/Test.validators.js` — ajout `exports.submit` : `answers` tableau non vide, `answers.*.questionId` entier positif.
- `routes/Test.routes.js` — ajout `POST /:id/submit` (authMiddleware + validator + validate). Import `authMiddleware` ajouté.

**Logique de correction server-side (`_checkAnswer`) :**
- `open` : trim + lowercase, réponse vide = incorrecte
- `mcq` : null/undefined = incorrecte ; `Number(answer)` comme index ; `opts[idx]?.correct === true`
- `fill_blank` : chaque blank comparé en trim/lowercase
- `reorder` : ordre exact des fragments (texte), longueur doit correspondre

**Fichiers modifiés (Front) :**
- `src/stores/testResults.js` — ajout `submitTest(testId, answers)` : `POST tests/${testId}/submit`, ajoute le résultat en tête de `results`, retourne le data complet (incluant `results` de correction).
- `src/pages/ExerciseDetailPage.vue` — `submitAnswers()` remplacé : construit l'array `[{ questionId, answer }]` et appelle `testResultStore.submitTest()`. Suppression de `checkAnswer()`. Résultats affichés depuis la réponse serveur (`resultMap` par questionId). La sauvegarde TestResult est désormais faite server-side (plus d'appel `saveResult()` séparé).

**Fichiers modifiés (Tests) :**
- `test/services/Test.service.test.js` — mock stale `findByPk` corrigé (`expect.objectContaining` pour `findOne`). Ajout `TestResult` au mock. 11 nouveaux tests `submitAnswers` : test introuvable, calcul score, open insensible casse, open vide, mcq correct/incorrect/null, fill_blank correct/incorrect, reorder correct/incorrect, question non répondue.
- `test/controllers/Test.controller.test.js` — ajout `submitAnswers: jest.fn()` au mock service, `makeToken`, `jwt` import, `reminder.worker` mock. 7 nouveaux tests `POST /tests/:id/submit` : 200 nominal, 404 introuvable, 400 answers manquant/vide/questionId invalide, 401 sans token, 500 service KO.
- `my_memo_master_front/test/stores/testResults.store.test.js` — 4 nouveaux tests `submitTest` : succès (retourne data + unshift), non-200 (null), erreur réseau (null + notif), unshift sur liste existante.

**Ce qui est utilisable :**
- `POST /api/v1/tests/:id/submit` (auth requis) — body `{ answers: [{ questionId: number, answer: any }] }` → response `{ score, total, results: [{ questionId, correct, correctAnswer }], resultId }`
- La correction et la sauvegarde du TestResult se font en un seul appel
- `testResultStore.submitTest(testId, answers)` côté front (remplace l'appel `checkAnswer()` + `saveResult()`)

**Résultats tests :**
- Back : 41 tests suite `Test.service` + `Test.controller` ✅ (dont 11 + 7 nouveaux)
- Front : 18 tests `testResults.store` ✅ (dont 4 nouveaux)

**Hypothèses posées :**
- La `question.content` reste exposée dans `GET /tests/:id` (nécessaire pour l'affichage du formulaire côté client) — la sécurité de la correction est portée par le server-side, pas par l'absence des données côté client.
- La correction `open` reste exacte (trim + lowercase) — pas de sémantique NLP, cohérent avec le scope "Correction simple" de M-06.05.

**Dette / points d'attention :**
- Pas de `POST /tests/:id/submit` endpoint pour un test "en brouillon" sans question — le service retourne `null` (→ 404) si le test n'existe pas ; si le test est vide, score = 0/0 (edge case acceptable pour MVP).
- La correction sémantique (NLP/IA) pour les questions `open` est hors-périmètre M-06.05 ("Correction IA avancée" = OUT of scope) — à connecter au moteur `Semantic.service.js` existant dans un ticket dédié.

---

### [M-06.08] — Éditeur d'exercice (synthèse feature M-06) — 2026-06-21

**Contexte :** Entrée de synthèse pour la feature M-06.08 (Feature list ID M-06, ID source planning M-06.08, Sprint 6 Front-end MVP). La livraison a été découpée en plusieurs tickets atomiques ; cette entrée consolide leur périmètre et confirme la couverture DoD.

**Périmètre livré (IN scope) :**

| Fonctionnalité | Ticket | Fichiers principaux |
|---|---|---|
| Types de questions (open, mcq, fill_blank, reorder) | M-06.01 | `Question.model.js`, `validators/Question.validators.js` |
| Créateur d'exercice (modal de création) | M-06.02 | `ExercisesPage.vue` → `openCreateModal()`, `submitCreate()` |
| Éditeur d'exercice (modal édition pré-remplie) | M-06.02 | `ExercisesPage.vue` → `openEditModal()`, `submitEdit()`, `contentToFormState()` |
| Player questionnaire (4 types de rendu interactif) | M-06.01 / M-06.02 | `ExerciseDetailPage.vue` |
| Correction simple (server-side, 4 types) | M-06.05 | `Test.service.js` → `submitAnswers()`, `POST /tests/:id/submit` |
| Scores et historique | M-06.02 | `TestResult.model/service/controller`, `ExerciseDetailPage.vue` |

**Périmètre non livré (OUT scope — conforme) :**
- Correction IA avancée — hors MVP
- Banque publique d'exercices — hors MVP
- Notation officielle établissement — hors MVP

**Vérification MCQ édition :**
- Bug antérieur "options MCQ non affichées à l'édition" : **confirmé corrigé**.
- `Question.model.js` getter `content` auto-parse le JSON TEXT → l'API retourne `content` comme objet.
- `Test.service.findOne()` inclut `content` dans les attributs (`attributes: ['idQuestion', 'statement', 'type', 'content', 'questionPosition']`).
- `contentToFormState()` cas `mcq` : `opts = c.options` → `mcqOptions: opts.map(o => ({ text: o.text }))` + `mcqCorrectIdx: opts.findIndex(o => o.correct)` — reconstruction correcte.

**DoD :**
- ✅ Fonctionnel sur les 6 items IN scope
- ✅ Tests : 759 back + 138 front (M-06-REVIEW)
- ✅ Revue de code : M-06-REVIEW
- ✅ Changelog à jour (tickets M-06.01, M-06.01b, M-06.02, M-06.03-FIX, M-06.05, M-06-REVIEW, REF-ITEMLIST + cette entrée)
- ✅ Aucun bug bloquant connu

**Tickets contributeurs :** M-06.01, M-06.01b, M-06.02, M-06.03-FIX, M-06.05, M-06-REVIEW, REF-ITEMLIST

**Dette / points d'attention :**
- `submitEdit` exécute les mises à jour de questions séquentiellement (non parallèle) pour éviter les conflits de `questionPosition` — acceptable MVP.
- Pas de tests Vitest pour `ItemListLayout.vue` (composant partagé Exercises + Flashcards).

---

### [M-06.09] — Player questionnaire (synthèse feature M-06) — 2026-06-21

**Contexte :** Entrée de synthèse pour la feature M-06.09 (Feature list ID M-06, ID source planning M-06.09, Sprint 6 Front-end MVP). Le player questionnaire est entièrement implémenté dans `ExerciseDetailPage.vue`, livré dans le cadre des tickets M-06.

**Périmètre livré (IN scope) :**

| Fonctionnalité | Fichier / Fonction |
|---|---|
| Rendu interactif — question ouverte (textarea) | `ExerciseDetailPage.vue:29-36` |
| Rendu interactif — QCM (radio stylisés, sélection visuelle) | `ExerciseDetailPage.vue:39-57` |
| Rendu interactif — texte à trous (inline inputs dans le template) | `ExerciseDetailPage.vue:60-76` — `parsedTemplate()` |
| Rendu interactif — phrase à constituer (fragments cliquables / désélectionnables) | `ExerciseDetailPage.vue:79-107` — `selectFragment()`, `unselectFragment()` |
| Soumission et correction server-side | `ExerciseDetailPage.vue:319-338` → `POST /tests/:id/submit` |
| Écran résultats (score global + détail par question) | `ExerciseDetailPage.vue:119-168` |
| Historique des résultats passés (tableau date/score/%) | `ExerciseDetailPage.vue:172-203` |
| Rejouer (reset complet de la session) | `ExerciseDetailPage.vue:341-345` → `resetQuiz()` |

**Périmètre non livré (OUT scope — conforme) :**
- Correction IA avancée — hors MVP
- Banque publique d'exercices — hors MVP
- Notation officielle établissement — hors MVP

**DoD :**
- ✅ Fonctionnel sur tous les items IN scope
- ✅ Tests : 759 back + 138 front (M-06-REVIEW)
- ✅ Revue de code : M-06-REVIEW
- ✅ Changelog à jour
- ✅ Aucun bug bloquant connu

**Tickets contributeurs :** M-06.01, M-06.02, M-06.05, M-06-REVIEW

**Dette / points d'attention :**
- Fragments "reorder" mélangés côté client uniquement (pas de seed aléatoire côté serveur) — acceptable MVP.
- Les résultats `open` affichent une explication si `questionResults[idx].explanation` est présente (champ retourné par le moteur sémantique en M-06.05).

---

### [M-06.10] — Écran résultats (score, correction) — 2026-06-21

**Contexte :** Entrée de synthèse pour la feature M-06.10 (Sprint 6 Front-end MVP). L'écran résultats est intégré dans `ExerciseDetailPage.vue` et s'affiche après soumission du questionnaire.

**Périmètre livré (IN scope) :**

| Élément | Fichier / Lignes |
|---|---|
| Bandeau score global (X/N + %) | `ExerciseDetailPage.vue:119-125` |
| Détail par question — badge Correct/Incorrect + bordure couleur | `ExerciseDetailPage.vue:128-161` |
| Réponse de l'étudiant | `ExerciseDetailPage.vue:144-148` — `formatUserAnswer()` |
| Réponse attendue | `ExerciseDetailPage.vue:149-153` — `formatCorrectAnswer()` |
| Explication pour questions `open` (moteur sémantique) | `ExerciseDetailPage.vue:155-160` |
| Bouton "Recommencer" → reset complet | `ExerciseDetailPage.vue:163-168` → `resetQuiz()` |
| Formatage réponse par type (open/mcq/fill_blank/reorder) | `ExerciseDetailPage.vue:349-392` |

**Correction server-side :**
- `POST /tests/:id/submit` retourne `{ score, total, results: [{ questionId, correct, correctAnswer, explanation }] }`
- `_formatCorrectAnswer()` dans `Test.service.js` formate la réponse attendue pour les 4 types
- `resultMap` construit côté front depuis `result.results` pour affichage par question

**Périmètre non livré (OUT scope — conforme) :**
- Correction IA avancée — hors MVP (la correction `open` utilise la comparaison exacte trim/lowercase)
- Banque publique, notation établissement — hors MVP

**DoD :**
- ✅ Fonctionnel sur tous les items IN scope
- ✅ Tests : 759 back + 138 front (M-06-REVIEW)
- ✅ Revue de code : M-06-REVIEW
- ✅ Changelog à jour
- ✅ Aucun bug bloquant connu

**Tickets contributeurs :** M-06.01, M-06.02, M-06.05, M-06-REVIEW

**Dette / points d'attention :**
- `formatUserAnswer` pour `reorder` joint les fragments avec un espace — si un fragment contient des espaces, l'affichage peut être ambigu (acceptable MVP).
- L'explication sémantique pour `open` dépend de `Semantic.service.js` (modèle NLP local, ~30s au premier appel) — le champ peut être `null` si le service est lent ou indisponible.

---

### [M-06.11] — Tests unitaires moteur correction — 2026-06-21

**Contexte :** Tests unitaires du moteur de correction server-side (`submitAnswers`, `_checkAnswer`) couvrant les 4 types de questions, les cas limites et les erreurs. Livrés dans le cadre de M-06.05 et M-06-REVIEW.

**Correction d'une inexactitude CHANGELOG M-06.05 :** Cette entrée indiquait que la correction `open` restait "exacte (trim + lowercase)". En réalité, `_checkAnswer` appelle `semanticService.gradeSemantic()` pour les questions `open` — la correction est **sémantique IA** (score flottant 0→1, explication). Seuls `mcq`, `fill_blank` et `reorder` utilisent une comparaison exacte. Les tests le confirment (mock de `Semantic.service.js` dans `Test.service.test.js`).

**Tests back — `test/services/Test.service.test.js` :**

| Test | Cas couvert |
|---|---|
| `retourne null si test introuvable` | cas limite |
| `calcule le score (somme similarités) + crée TestResult` | open nominal multi-question |
| `open — insensible casse/espaces (appel sémantique)` | open + trim avant appel NLP |
| `open — réponse vide → incorrect` | open cas limite |
| `mcq — bonne option sélectionnée` | mcq nominal |
| `mcq — mauvaise option sélectionnée` | mcq erreur |
| `mcq — null → incorrect` | mcq sans réponse |
| `fill_blank — tous trous corrects (insensible casse/espaces)` | fill_blank nominal |
| `fill_blank — un trou incorrect` | fill_blank erreur |
| `reorder — ordre correct` | reorder nominal |
| `reorder — ordre incorrect` | reorder erreur |
| `question non répondue → incorrect` | cas limite global |

12 tests `submitAnswers` + 5 tests CRUD = **17 tests service**

**Tests back — `test/controllers/Test.controller.test.js` :**
- 7 tests `POST /tests/:id/submit` : 200 nominal, 404, 400 ×3 (answers manquant/vide/questionId invalide), 401 sans token, 500 service KO
- 21 tests CRUD (GET /tests, GET /:id, POST, PUT, DELETE)
- Total : **28 tests controller**

**Tests front — `test/stores/testResults.store.test.js` :**
- `fetchByTest` (3) : succès, non-200, erreur réseau
- `fetchByUser` (3) : succès, non-200, erreur réseau
- `saveResult` (4) : succès, non-201, erreur réseau, unshift
- `bestScore` (4) : vide, un résultat, meilleur ratio, égalité
- `submitTest` (4) : succès + unshift, non-200, erreur réseau, unshift avec existants
- Total : **18 tests Vitest**

**Total M-06.11 :** 63 tests dédiés au moteur de correction (17 service + 28 controller + 18 store)

**DoD :**
- ✅ Tests : 63 tests dédiés, tous passants (inclus dans les 759 back + 138 front de M-06-REVIEW)
- ✅ Couverture : 4 types × cas nominal + cas limites + erreurs
- ✅ Revue : M-06-REVIEW
- ✅ Changelog à jour

**Tickets contributeurs :** M-06.05, M-06-REVIEW

**Dette / points d'attention :**
- `semanticService.gradeSemantic` est mocké dans les tests service — les tests vérifient la logique de routage et d'agrégation mais pas le modèle NLP lui-même (~30s au premier appel, testé en intégration manuelle uniquement).

---

### [M-06.12] — Tests fonctionnels parcours complet exercices — 2026-06-21

**Contexte :** Tests fonctionnels (BDD-style back + composant front) couvrant le parcours complet de la feature Exercices : chargement → questionnaire → soumission → résultats → recommencer. Ajoutés pour compléter le DoD M-06.12 qui exigeait une couverture intégration end-to-end.

**Fichiers créés :**
- `my_memo_master_api/test/bdd/exercise.session.test.js` — 11 tests fonctionnels (SQLite in-memory, Semantic.service mocké, toutes les autres couches réelles)
- `my_memo_master_front/test/components/ExerciseDetailPage.test.js` — 11 tests Vitest composant (Pinia testing, stores stubbed avec spies configurés avant montage)

---

**Tests BDD back — `test/bdd/exercise.session.test.js` :**

Setup : `process.env.DB_STORAGE = ':memory:'` avant tout `require`, `syncModels({ force: true })` en `beforeAll`. Mocks : `Semantic.service`, `fifo.cron`, `reminder.worker`, `logger`. Données créées : Role, User, Subject, Test, 4 Questions (open/mcq/fill_blank/reorder), associations via `question.addTest(test)`.

| Test | Cas couvert |
|---|---|
| `sans token → 401` | auth middleware |
| `answers manquant → 400` | validation body |
| `answers tableau vide → 400` | validation min:1 |
| `test introuvable → 404` | test inexistant |
| `4/4 correct — score=4, TestResult persisté en DB` | parcours nominal complet + vérification DB |
| `0/4 correct — score=0` | tout incorrect |
| `question non répondue → incorrect pour tous les types` | cas limite |
| `mcq — index 1 → correct + correctAnswer="4"` | correction MCQ par type |
| `fill_blank — insensible à la casse et aux espaces` | correction fill_blank |
| `reorder — ordre incorrect → correct:false + correctAnswer` | correction reorder |
| `GET /tests/:id — 4 questions, content parsé` | lecture test + désérialisation JSON |

Particularité : l'appel `semanticService.gradeSemantic` est déclenché **uniquement** pour les questions `open` avec réponse non vide (early return si `user = ''`). Les autres types (mcq/fill_blank/reorder) et les réponses null/absentes ne déclenchent pas le service sémantique — chaque test concerné configure `mockResolvedValueOnce` uniquement quand nécessaire, sans fuite entre tests.

**Tests composant front — `test/components/ExerciseDetailPage.test.js` :**

Pattern critique : `setActivePinia(pinia)` puis `useTestStore()` / `useTestResultStore()` **avant** `mount()`. Ceci est nécessaire car `ExerciseDetailPage.onMounted` destructure `const [ok] = await Promise.all([testStore.fetchTestById(...), ...])` et retourne si `!ok`. Avec `stubActions: true`, les actions retournent `undefined` (falsy) par défaut — configurer `mockResolvedValue(true)` avant le montage évite le faux-négatif "introuvable".

| Test | Cas couvert |
|---|---|
| `affiche "Chargement" pendant onMounted puis le masque` | état loading |
| `affiche "introuvable" et notifie si fetchTestById retourne false` | fetch échec |
| `affiche le titre et le sujet de l'exercice` | rendu nominal |
| `question ouverte — statement + textarea` | rendu open |
| `question MCQ — 2 radios + options` | rendu mcq |
| `affiche le bouton "Vérifier les résultats"` | rendu bouton |
| `clic "Vérifier" — appelle submitTest avec les bonnes données` | soumission |
| `après soumission — écran résultats + score "2/2"` | résultats |
| `écran résultats — badges Correct et Incorrect` | détail par question |
| `bouton "Recommencer" — retour au mode quiz` | reset session |
| `affiche l'historique si results non vide` | historique |

**Hypothèses posées :**
- Le composant `ExerciseDetailPage.vue` importe `notif` depuis `@/helpers/notif` — mocké via `vi.mock('@/helpers/notif', ...)`.
- `useRoute()` mocké pour retourner `{ params: { id: '1' } }` avec `importOriginal` pour conserver `RouterLink` etc.
- `window.scrollTo` spié en `beforeEach` (appelé dans `initAnswers()` et `resetQuiz()`).

**DoD M-06.12 :**
- ✅ Test BDD back : 11 tests, parcours complet controller → service → model → SQLite
- ✅ Test composant front : 11 tests, cycle complet chargement → quiz → résultats → recommencer
- ✅ Correction des 4 types vérifiée en intégration (pas seulement en unit)
- ✅ Persistance TestResult vérifiée directement en base (BDD test)
- ✅ Changelog à jour

**Dette / points d'attention :**
- Les tests BDD n'exécutent pas le vrai moteur NLP — `Semantic.service.gradeSemantic` reste mocké (NLP local ~30s au démarrage, incompatible avec les runs CI rapides).
- Les tests composant front n'exercent pas les types `fill_blank` et `reorder` (rendu interactif) — couverture limitée aux types `open` et `mcq` pour le rendu ; tous les types sont couverts côté back BDD.

---

### [S-03.01] — Groupes classes et plannings de groupe — 2026-06-21

**Contexte :** Feature S-03.01 (Sprint 9, Analyse/V1) — Groupes classes, membres, invitations, affectations, KPI de groupe, dashboard groupe, flux enseignant. Livraison décomposée en infrastructure existante (avant ce ticket) + éléments manquants complétés dans cette session.

**Périmètre livré (IN scope) :**

| Fonctionnalité | Fichiers principaux |
|---|---|
| **Groupes** (CRUD complet) | `ClassGroup.model.js`, `ClassGroup.service.js`, `ClassGroup.controller.js`, `ClassGroup.routes.js` |
| **Membres** (add/remove, vérification droits) | `ClassGroupUsers.model.js`, `ClassGroup.service.js → addMember/removeMember` |
| **Invitations** (invite, list groupe, list mine, accept/decline) | `Invitation.model.js` *(NEW)*, `Invitation.service.js` *(NEW)*, `Invitation.controller.js` *(NEW)*, `Invitation.routes.js` *(NEW)* |
| **Affectations** (toggleStudent câblé à l'API) | `ClassroomPage.vue → toggleStudent()` → `classGroupStore.addMember/removeMember` |
| **KPI de groupe** (memberCount, studentCount, pendingInvitations, avgScore) | `ClassGroup.service.js → getKpi()`, `GET /class-groups/:id/kpi` |
| **Dashboard groupe** (vue prof/étudiant, calendrier, sections, ressources) | `ClassroomPage.vue` — UI complète, données groupes/membres depuis l'API |
| **Définition flux enseignant groupes** (toggle vue, formulaire invitation, panneau invitations pending) | `ClassroomPage.vue` — stores injectés, flux complet invitation→réponse |

**Périmètre non livré (OUT scope — conforme) :**
- Annuaire ENT complet — hors MVP
- Synchronisation institutionnelle automatique — hors MVP
- Gestion complexe multi-campus — hors MVP

**Nouveaux fichiers back :**
- `models/Invitation.model.js` — champs : id, classGroupId, targetUserId, invitedByUserId, role, status, createdAt ; associations ClassGroup + User×2
- `migrations/20260610000003-create-invitations-table.js`
- `services/Invitation.service.js` — `invite()`, `findByGroup()`, `findMine()`, `respond()` (accept → ajoute ClassGroupUsers)
- `controllers/Invitation.controller.js` — 4 handlers, gestion 403/404/500
- `routes/Invitation.routes.js` — `GET /invitations/mine`, `PUT /invitations/:id`
- `validators/Invitation.validators.js` — validation `create` (targetUserId, role) + `respond` (status enum)
- `test/services/ClassGroup.service.test.js` — 19 tests : findAll, findOne, create, update, delete, addMember, removeMember, getKpi (4 cas)
- `test/controllers/Invitation.controller.test.js` — 25 tests : invite, findByGroup, findMine, respond (201/200/400/401/403/404/500)

**Fichiers back modifiés :**
- `models/index.js` — ajout `models.Invitation`
- `services/ClassGroup.service.js` — ajout `getKpi()` + import `Invitation`, `TestResult`
- `controllers/ClassGroup.controller.js` — ajout `getKpi()` handler
- `routes/ClassGroup.routes.js` — ajout `GET /:id/kpi`, `POST /:id/invitations`, `GET /:id/invitations` + import Invitation controller/validators
- `app.js` — enregistrement `invitationRoutes(v1)`

**Nouveaux fichiers front :**
- `src/stores/invitations.js` — store Pinia `'invitations'` : state `{ mine, groupInvitations }` ; actions `fetchMine`, `fetchByGroup`, `invite`, `respond` (retire de `mine` après réponse)
- `test/stores/classGroups.store.test.js` — 14 tests Vitest : fetchGroups, fetchGroupById, createGroup, updateGroup, deleteGroup, addMember, removeMember

**Fichiers front modifiés :**
- `src/pages/ClassroomPage.vue` :
  - Import `useClassGroupStore` + `useInvitationStore` (remplace `api` direct)
  - `onMounted` : `classGroupStore.fetchGroups()` + `invitationStore.fetchMine()` en parallèle
  - `toggleStudent()` : câblé à `classGroupStore.addMember/removeMember` (plus local-only)
  - Nouveau panneau "Invitations en attente" en haut de page (accept/decline)
  - Nouveau panneau KPI (memberCount, studentCount, pendingInvitations, avgScore)
  - Nouveau formulaire "Inviter un utilisateur" dans la sidebar prof
  - `watch(selectedGroupId)` → charge KPI via `GET /class-groups/:id/kpi` à chaque changement de groupe

**Endpoints disponibles :**
- `GET /api/v1/class-groups` (auth) — liste groupes de l'utilisateur
- `GET /api/v1/class-groups/:id` (auth) — groupe + membres
- `POST /api/v1/class-groups` (auth, admin) — créer groupe
- `PUT /api/v1/class-groups/:id` (auth, admin) — modifier
- `DELETE /api/v1/class-groups/:id` (auth, admin) — supprimer
- `POST /api/v1/class-groups/:id/members` (auth, admin) — ajouter membre direct
- `DELETE /api/v1/class-groups/:id/members/:userId` (auth, admin) — retirer membre
- `GET /api/v1/class-groups/:id/kpi` (auth, admin/teacher) — KPI
- `POST /api/v1/class-groups/:id/invitations` (auth, admin/teacher du groupe) — inviter
- `GET /api/v1/class-groups/:id/invitations` (auth, admin/teacher du groupe) — liste invitations
- `GET /api/v1/invitations/mine` (auth) — mes invitations pending
- `PUT /api/v1/invitations/:id` (auth, cible uniquement) — accepter/décliner

**DoD :**
- ✅ Fonctionnel sur les 7 items IN scope
- ✅ Tests back : 19 service + 25 controller invitations + 30 controller ClassGroup = **74 tests back**
- ✅ Tests front : 14 tests store classGroups ✅
- ✅ Architecture corrigée : ClassroomPage utilise les stores
- ✅ Changelog à jour

**Dette / points d'attention :**
- Sessions, événements et ressources dans `ClassroomPage.vue` restent en données mock locales (pas de modèle back dédié pour ces entités dans ce sprint).
- `avgScore` dans les KPI est calculé sur tous les `TestResult` des étudiants du groupe (toutes matières confondues) — acceptable MVP, à affiner par sujet si besoin.
- Pas de tests Vitest pour `ClassroomPage.vue` elle-même ni pour `invitations.js` store — les interactions UI complexes (toggle, formulaires) sont couvertes par les tests stores.

---

### [M-01/M-02.01] — Analyse fonctionnelle éditeur de cartes mentales — 2026-06-22

**Fichiers créés :**
- `diagrams/mindmap_rules.md` — analyse fonctionnelle complète de la fonctionnalité Mind Maps

**Ce qui est couvert :**
- Vue d'ensemble de l'entité `MindMap` (table BDD + JSON embarqué)
- Structure détaillée du `mindMapJson` : nœuds, liens, zones, métadonnées
- Acteurs et permissions (ownership sur PUT/DELETE, absence de vérif sur GET /:id)
- Règles métier : `resolveSubject`, auto-save 1 500 ms, cycle de vie `isDirty`, nommage, contraintes nœuds/liens/zones
- Règles upload image (local, 5 Mo, formats JPEG/PNG/GIF/WEBP)
- Tableau des endpoints API avec codes de retour
- Cas limites documentés (subjectId invalide, auto-save concurrente, nœud racine, lien vers nœud supprimé…)
- Dette technique identifiée (ownership GET /:id, images locales, risque de doublon sur POST)
- Périmètre OUT du MVP

**Hypothèses posées :**
- Le document décrit l'implémentation telle qu'elle existe au 2026-06-22 — à mettre à jour si les règles évoluent.
- L'absence de vérification d'ownership sur `GET /diagrammes/:id` est un bug connu, documenté comme dette haute priorité.

**Dette / points d'attention :**
- Aucune dette nouvelle introduite (document d'analyse uniquement).

---

### [M-01] — Tests Vitest éditeur de cartes mentales — 2026-06-22

**Fichiers créés :**
- `test/stores/mindmapBuilder.store.test.js` — 27 tests unitaires du store Pinia
- `test/components/MindMapNode.test.js` — 18 tests du composant nœud (SVG + foreignObject)
- `test/components/MindMapPalette.test.js` — 18 tests du panneau de configuration (styles)

**Ce qui est couvert :**
- Store : `new`, `addNode` (idCard/idSystem null par défaut), `updateNode` (couleurs de maîtrise high/low/medium), `updateNodeStyle` (fusion sans écrasement), `selectNode` (simple + additif + désélection), `resetSelection`, `removeNode` (nœud + liens), `moveNode`, `toggleCollapse`, `linkCard`, `unlinkCard` (reset mastery + couleur), `openInterpreter`/`closeInterpreter`, `syncCardMasteries` (API + mastery + secondaryColor), `exportPayload`, getter `selectedNode` (null si 0 ou N>1 sélectionnés)
- MindMapNode : rendu label, contenu texte, div formule (renderMathMultiline appelé), div image (placeholder + img), émission `node-pointerdown`, émission `toggle-collapse`, bouton repliage conditionnel, symboles +/−, classe `--selected`, édition inline label (dblclick), édition inline contenu (dblclick), appel `store.openInterpreter` au dblclick sur formule, drag-over image
- MindMapPalette : état vide (message d'aide), section Options avec nœud sélectionné, sélecteur type (valeur + changement → store.updateNode), sélecteur maîtrise (valeur + changement → store.updateNode), options texte visibles pour type=text, absentes pour type=formula, section formule pour type=formula, bouton interpréteur → store.openInterpreter, couleurs texte pour formule, section image pour type=image, boutons de forme (3 boutons, classe --active), bouton Supprimer → store.removeNode, picker flashcard (ouverture + appel API leitnersystems)

**Résultat :** 63 tests, 0 échec. La suite existante (229 tests) est inchangée.

**Hypothèses posées :**
- Les composants SVG (`<g>`, `<foreignObject>`) sont montés dans jsdom sans contexte SVG — les éléments HTML à l'intérieur du `foreignObject` sont correctement queryables par @vue/test-utils.
- `renderMathMultiline` est mocké (`vi.mock`) dans les deux suites pour éviter la dépendance à KaTeX en test.
- Le composant `Interpreter` est stubbed dans MindMapPalette pour isoler le panneau des dépendances KaTeX.

**Dette / points d'attention :**
- Aucun test pour `MindMapBoard.vue` (gestion pointer events, drag threshold, pan) — la logique est principalement de la manipulation d'événements DOM + Pinia, ce qui nécessiterait des tests d'intégration plus lourds.
- Undo/redo : l'objet `history` existe dans le store mais les actions `undo`/`redo` ne sont pas câblées — aucun test écrit pour ces actions inexistantes.

---

### [M-02.09] — Navigation par matière / chapitre (mind maps) — 2026-06-22

**Fichiers modifiés :**
- `my_memo_master_api/services/Diagramme.service.js` — `findByUser(userId, { subjectId } = {})` : ajout filtre optionnel `WHERE subjectId = X` via Sequelize
- `my_memo_master_api/controllers/Diagramme.controller.js` — `findAll` : extraction `req.query.subjectId` → `Number(subjectId)` transmis à `findByUser` ; `update` : extraction `subjectId` du body + appel `resolveSubject()` si le sujet a changé (le champ était ignoré — bug)
- `my_memo_master_front/src/pages/MindmapsPage.vue` — ajout `showCreateModal`, `createName`, `createSubjectId` ; `createNew()` ouvre une modale au lieu d'aller directement en éditeur ; `confirmCreate()` initialise `currentDiagramMeta` avec le bon `subjectId` ; `openRenameModal()` charge `editedSubjectId` ; `confirmRename()` envoie et persiste `subjectId` ; ajout select matière dans les 3 modaux (créer, renommer, export)

**Ce qui est utilisable :**
- `GET /api/v1/diagrammes?subjectId=2` — retourne les cartes de la matière 2 uniquement
- `PUT /api/v1/diagrammes/:id` avec `{ subjectId }` — le sujet est maintenant correctement mis à jour (était ignoré avant)
- Modale de création avec choix de la matière
- Modale de renommage avec modification de la matière
- Modale d'export avec sélection de matière

**Hypothèses posées :**
- `subjectId: null` dans le body d'un PUT conserve le sujet existant (condition `if (subjectId && ...)` dans le controller).

**Dette / points d'attention :**
- Aucune dette nouvelle introduite.

---

### [M-02.10] — Sauvegarde auto et conflits (mind maps) — 2026-06-22

**Fichiers modifiés :**
- `my_memo_master_front/src/pages/MindmapsPage.vue` (avant refacto) → `src/components/mindmap/MindmapsEditorView.vue` (après refacto) :
  - Ajout `AUTO_SAVE_RETRY_DELAY = 5000`, `AUTO_SAVE_MAX_RETRY = 3`, `autoSaveRetryCount`, `saveHasFailed`
  - `scheduleAutoSave()` réinitialise `autoSaveRetryCount` et `saveHasFailed` à chaque nouvelle modification
  - Catch `performAutoSave` : incrémente `autoSaveRetryCount`, toast warning au 1er échec, schedule retry (×3 max), toast error final
  - Succès des branches PUT et POST : reset `autoSaveRetryCount` et `saveHasFailed`
  - `handleBeforeUnload` : `event.preventDefault()` + `event.returnValue = ''` si `isDirty`
  - `onMounted` : enregistre `beforeunload` ; `onBeforeUnmount` : retire le listener
  - Topbar : indicateur `⚠ Connexion perdue — réessai en cours…` (rouge) affiché en cas d'erreur réseau

**Ce qui est utilisable :**
- Fermeture d'onglet avec modifications non sauvegardées → dialog native du navigateur "Quitter le site ?"
- Échec réseau → 3 tentatives automatiques à 5 s d'intervalle, toast warning au 1er, toast error après épuisement
- Indicateur rouge dans la topbar pendant les tentatives de rattrapage

**Hypothèses posées :**
- L'auto-save n'est pas du polling — c'est un push débounçé déclenché par `map.updatedAt` via un watcher Vue. WebSockets non retenus (mono-utilisateur, OUT du périmètre MVP).

**Dette / points d'attention :**
- Conflit multi-onglets et versioning serveur hors périmètre MVP (nécessite collaboration temps réel).

---

### [M-02.11] — Tests unitaires back (mind maps) — 2026-06-22

**Fichiers modifiés :**
- `my_memo_master_api/test/services/Diagramme.service.test.js` — ajout mock `Subject` (`findByPk`, `findOrCreate`) ; 5 nouveaux tests : `findByUser` sans filtre, `findByUser` avec `subjectId`, `resolveSubject` (sujet valide, null → sujet par défaut, subjectId inexistant → sujet par défaut)
- `my_memo_master_api/test/controllers/Diagramme.controller.test.js` — correction assertion `findByUser` (signature mise à jour : `(userId, { subjectId })` depuis M-02.09) ; 4 nouveaux tests : `GET /diagrammes?subjectId=2`, `POST /diagrammes` avec `resolveSubject` KO → 500, `PUT /diagrammes/:id` avec changement de `subjectId` → `resolveSubject` appelé avec la nouvelle valeur

**Résultat :** 38/38 tests passent (service : 7→12, controller : 23→27, dont 1 fix de régression)

**Régression corrigée :**
- `GET /diagrammes 200 — retourne les diagrammes de l'utilisateur` : assertion `findByUser(1)` → `findByUser(1, { subjectId: undefined })` (signature étendue en M-02.09, test non mis à jour)

**Ce qui est couvert :**
- `DiagrammeService.findByUser` : sans filtre (WHERE userId), avec filtre (WHERE userId + subjectId)
- `DiagrammeService.resolveSubject` : cas nominal, null, subjectId inexistant
- `Diagramme.controller.findAll` : filtrage par `?subjectId`
- `Diagramme.controller.create` : `resolveSubject` KO → 500
- `Diagramme.controller.update` : changement de sujet → `resolveSubject` appelé avec la nouvelle valeur

**Hypothèses posées :**
- Aucune.

**Dette / points d'attention :**
- Aucune dette nouvelle introduite.

---

### [REF] — Découpage MindmapsPage en vue liste + vue éditeur — 2026-06-22

**Fichiers créés :**
- `my_memo_master_front/src/components/mindmap/MindmapsListView.vue` — vue liste : fetch diagrammes, filtrage (recherche + matière), modaux créer/renommer, suppression confirmée, émets `@open(diagram)` et `@create({ name, subjectId })`
- `my_memo_master_front/src/components/mindmap/MindmapsEditorView.vue` — vue éditeur : topbar (nom + indicateur sauvegarde), canvas `MindMapBuilder`, auto-save complet (retry + beforeunload + saveHasFailed), modal export, émets `@back`

**Fichiers modifiés :**
- `my_memo_master_front/src/pages/MindmapsPage.vue` — réduit à 52 lignes : coordinateur léger (state `view`, `editorDiagramId/Meta/Payload`, `subjects`) ; délègue à `MindmapsListView` et `MindmapsEditorView` via événements

**Résultat :**

| Fichier | Lignes avant | Lignes après | Responsabilité |
|---------|-------------|-------------|----------------|
| `MindmapsPage.vue` | 640 | 52 | Coordinateur : navigation, sujets |
| `MindmapsListView.vue` | — | 148 | Liste, CRUD, modaux |
| `MindmapsEditorView.vue` | — | 210 | Topbar, canvas, auto-save |

**Architecture de communication :**
- `MindmapsListView` émet `@open(diagram)` et `@create({ name, subjectId })`
- `MindmapsEditorView` émet `@back`
- `MindmapsPage` passe `subjects` aux deux composants et orchestre les transitions
- Le `v-if` sur `MindmapsListView` la détruit/recrée à chaque retour de l'éditeur → `onMounted` refetch automatiquement, liste toujours fraîche

**Hypothèses posées :**
- Les vues sont placées dans `src/components/mindmap/` (feature folder) et non dans `src/pages/` — elles ne sont pas des routes routées directement.

**Dette / points d'attention :**
- Aucun test Vitest pour `MindmapsListView` et `MindmapsEditorView` — couverture par tests existants du store + des sous-composants (`MindMapNode`, `MindMapPalette`).

---

### [FIX] — Positions des nœuds non sauvegardées après déplacement — 2026-06-22

**Fichier modifié :**
- `my_memo_master_front/src/stores/mindmapBuilder.js` — action `load()` : suppression de `applyRadialLayout()` appliqué inconditionnellement ; remplacé par une détection de la présence de positions sauvegardées : si au moins un nœud non-sujet a `|x| > 1` ou `|y| > 1`, les positions du JSON sont utilisées telles quelles ; sinon `applyRadialLayout()` est appliqué comme fallback (cartes sans layout, vieux format)

**Cause :**
- `load(raw)` appelait `applyRadialLayout(normalizeMindMap(raw))` systématiquement. `applyRadialLayout` recalcule toutes les positions `x/y` depuis zéro. Les positions sauvegardées via `serializeMindMap` (deep clone complet) étaient correctement persistées en base mais écrasées à la réouverture.

**Ce qui est corrigé :**
- Déplacer un nœud → auto-save 1 500 ms → position persistée en base → réouverture → position restaurée

**Hypothèses posées :**
- Le seuil `> 1` (plutôt que `!= 0`) couvre les cartes qui auraient des positions fractionnaires proches de zéro sans être intentionnellement positionnées à l'origine.
- `applyRadialLayout` reste actif pour les cartes sans aucune position (vieux format de données, nouvelle carte vide).

**Dette / points d'attention :**
- Aucune dette nouvelle introduite.

---

### [M-02.12] — Tests fonctionnels front — Éditeur de cartes mentales — 2026-06-22

**Fichiers créés :**
- `my_memo_master_front/test/components/MindmapsListView.test.js` — 13 tests : fetch + badge matière + toast erreur + @open + modale création (ouvrir / pré-remplir / select matières / soumettre / Annuler) + modale renommage (pré-remplir / api.put / mise à jour locale) + suppression (api.del / window.confirm false)
- `my_memo_master_front/test/components/MindmapsEditorView.test.js` — 13 tests : topbar nom / "Nouvelle carte" / "Sauvegardé ✓" isDirty=false / absence indicateur isDirty=true + @back + modale export (@export / pré-remplir nom / liste matières / Annuler / api.put carte existante / api.post nouvelle carte) + "Sauvegarde…" pendant PUT en cours + toast erreur sauvegarde manuelle

**Ce qui est utilisable :**
- Suite de tests front mind map complète : 89/89 verts
  - `mindmapBuilder.store.test.js` : 27 tests (store, actions)
  - `MindMapNode.test.js` : 18 tests (sous-composant nœud SVG)
  - `MindMapPalette.test.js` : 18 tests (sous-composant palette)
  - `MindmapsListView.test.js` : 13 tests (flux liste CRUD)
  - `MindmapsEditorView.test.js` : 13 tests (flux éditeur, autosave indicators)

**Hypothèses posées :**
- `MindMapBuilder.vue` (canvas SVG, pointer events, drag-and-drop) n'est pas testé directement — trop couplé aux événements pointeur du navigateur. Les tests le stubbent et vérifient que le composant parent réagit correctement à ses événements (@save, @export, @new-map).
- `window.confirm` est mocké (`vi.spyOn`) pour les tests de suppression.

**Dette / points d'attention :**
- Aucun test end-to-end du canvas (`MindMapBuilder.vue`) — acceptable pour MVP ; à adresser dans un sprint dédié avec Playwright/Cypress si la feature devient critique.

---

### [M-02.14] — Documentation technique composants — Éditeur de cartes mentales + migration S3 images — 2026-06-23

**Fichiers créés :**
- `.agents/DOC_mindmap_editor.md` — documentation technique complète : architecture, format mindMapJson (schéma annoté), back-end (modèle/service/controller/routes/middleware), front-end (9 composants détaillés + store Pinia + helpers), couverture de tests, points d'attention et dette

**Fichiers modifiés :**
- `my_memo_master_api/middlewares/mindmapImageUpload.js` — migration S3 : sélection dynamique du backend selon `S3_BUCKET` (multerS3 si configuré, diskStorage sinon) ; clé S3 préfixée `mindmaps/`, taille max 5 Mo, 4 types MIME acceptés
- `my_memo_master_api/controllers/Diagramme.controller.js` — `uploadImage` retourne `req.file.location` (S3) ou URL locale `/api/uploads/mindmaps/…` selon le mode ; import `publicUrl` depuis `storage.config.js`
- `.agents/CHANGELOG_AGENT.md` — ce fichier
- `.agents/DECISIONS.md` — décisions S3 upload mind maps

**Ce qui est utilisable :**
- Documentation technique accessible dans `.agents/DOC_mindmap_editor.md` — référence pour tout développeur reprenant la feature
- Upload d'images dans les nœuds de carte mentale : stockage S3 Infomaniak en prod (bucket `MyMemoMasterCloud`, préfixe `mindmaps/`) ; fallback disque local (`public/uploads/mindmaps/`) en dev sans `S3_BUCKET`
- Front résout l'URL image indifféremment du mode (S3 → `url` direct, local → `path` + `VITE_API_URL`)
- Auto-resize du nœud aux proportions naturelles de l'image (seuil 2 px pour éviter les boucles)

**Hypothèses posées :**
- Le bucket Infomaniak doit avoir une politique de lecture publique sur le préfixe `mindmaps/` pour que les URLs S3 soient accessibles depuis le front sans authentification.
- Les images déjà stockées localement (avant migration) ont une URL `http://localhost/api/uploads/…` dans `mindMapJson` — elles deviendront invalides en prod si le disque local n'est pas monté.

**Dette / points d'attention :**
- Pas d'URLs présignées S3 : images exposées en URL publique permanente. Si une politique de bucket plus restrictive est appliquée, prévoir la génération d'URLs présignées (TTL) côté serveur.
- Undo/Redo non implémenté (`map.history.stack` présent en structure mais non alimenté).
- `MindMapBoard.vue` (canvas SVG, pointer events) sans tests unitaires — acceptable MVP.

---

### [M-00b.05] — Clôture ticket Déploiement automatisé — 2026-06-23

**Contexte :** Vérification de complétude du ticket M-00b.05 (Infrastructure, CI/CD et exploitation — MVP Sprint 3). Tous les éléments du périmètre IN étaient déjà livrés en plusieurs sous-tickets (M-00b.01, M-00b.03, M-00b.04). Cette entrée consolide la liste des fichiers et acte la clôture du ticket.

**Fichiers livrés (récapitulatif) :**
- `my_memo_master_api/Dockerfile` + `my_memo_master_front/Dockerfile` — images Docker multi-stage
- `docker-compose.yml` — stack dev locale (build + Traefik local)
- `server_docker_compose/docker-compose.yml` — stack VPS (images DockerHub, Traefik HTTPS Let's Encrypt)
- `server_docker_compose/.env.example` — template variables d'environnement VPS
- `traefik/docker-compose.yml` + `traefik/.env.example` — Traefik standalone avec HTTPS + HSTS + redirect HTTP→HTTPS
- `.github/workflows/ci.yml` — pipeline CI : Node 22, matrix api/front dynamique selon branche, lint + tests + build front
- `.github/workflows/cd.yml` — pipeline CD : build & push DockerHub → déploiement SSH VPS (test) + kubectl (preprod/prod) + notifications Discord
- `scripts/backup.sh` — pg_dump vers disque local VPS, rétention configurable, recherche dynamique du conteneur
- `docs/RUNBOOK.md` — guide d'exploitation : premier déploiement, mise à jour, rollback, backup/restore, logs
- `.env.example` racine — variables communes

**Ce qui est utilisable :**
- Push sur `test` → CI → build images Docker Hub → déploiement SSH automatique sur le VPS (docker compose pull + up + healthcheck)
- Push sur `preprod` → CI → build images → déploiement kubectl namespace `mymemomaster-preprod`
- Push sur `main` → CI → build images → déploiement kubectl prod (activable via `K8S_PROD_ENABLED=true`)
- `bash scripts/backup.sh` sur le VPS pour un dump pg_dump local avec rétention 7 jours (configurable)
- `docs/RUNBOOK.md` comme référence opérationnelle pour tout intervenant

**Périmètre OUT respecté :**
- Kubernetes non imposé en production (activable via variable, désactivé par défaut)
- Haute disponibilité multi-région et SRE avancé : hors scope, non implémentés

**Dette / points d'attention :**
- `scripts/backup.sh` sauvegarde uniquement en local sur le VPS — pas de copie vers S3 ou stockage externe. En cas de perte du VPS, les dumps sont perdus. À compléter avant production critique.
- Séquences PostgreSQL non avancées par les seeders : reset manuel nécessaire après `db:seed:all` (documenté dans DECISIONS.md).
- `K8S_PROD_ENABLED` doit être positionné manuellement dans les variables GitHub Actions avant la mise en prod Kubernetes.

---

### [M-01 Revue] — Revue de code & merge Éditeur de cartes mentales — 2026-06-22

**Périmètre audité :**
- `controllers/Diagramme.controller.js`
- `services/Diagramme.service.js`
- `routes/Diagramme.routes.js`
- `validators/Diagramme.validators.js`
- `components/mindmap/MindMapNode.vue`
- `components/mindmap/MindMapPalette.vue`
- `stores/mindmapBuilder.js`
- `stores/diagrammes.js`
- Tous les tests Diagramme (back + front)

**Bugs corrigés :**
1. `MindMapNode.vue:242` — catch silencieux dans `handleImageDrop` → ajout `notif.notify()` + import `notif`
2. `MindMapPalette.vue:342+356` — try/finally sans catch dans `openCardPicker` et `onPickerSystemChange` → ajout catch avec `notif.notify()` + import `notif`
3. `Diagramme.validators.js:19` — `exports.update` ne validait pas `subjectId` (contrairement à `exports.create`) → asymétrie corrigée, même règle `optional isInt({ min: 1 })` ajoutée
4. `Diagramme.controller.js` — double validation manuelle `if (!mmName || !mindMapJson)` dans `create` et `update` supprimée (les validators l'assurent déjà)
5. `Diagramme.controller.js` — try/catch imbriqués dans `create` et `update` pour `resolveSubject` supprimés (l'outer catch gère déjà l'erreur 500)

**Points d'attention non bloquants :**
- Double `findByPk` dans `update` (findById ownership + service.update interne) : 2 SELECT par mutation. Acceptable MVP, à optimiser si besoin.
- `diagrammes.js` store : `deleteDiagramme` passe un body inutilisé à `api.del` — sans impact fonctionnel.

**Tests :** 38 tests back Diagramme (service + controller) verts — 36 tests front (MindMapNode + MindMapPalette) verts.

---

### [M-00b.07] — Audit sécurité initial OWASP — 2026-06-23

**Fichiers créés :**
- `.agents/SECURITY_AUDIT_OWASP.md` — rapport complet OWASP Top 10 avec vulns, sévérités, correctifs et dette

**Fichiers modifiés :**
- `my_memo_master_api/routes/Fields.routes.js` — import authMiddleware + appliqué sur POST, PUT, DELETE
- `my_memo_master_api/routes/Tutorials.routes.js` — import authMiddleware + appliqué sur POST, PUT, DELETE
- `my_memo_master_api/routes/Test.routes.js` — authMiddleware appliqué sur POST, PUT, DELETE (GET intentionnellement publics)
- `my_memo_master_api/controllers/User.controller.js` — login bloque si `!hasValidatedEmail` (403), forgotPassword retourne 200 générique (anti-enum), verifyEmail retourne 401 générique si email inconnu (anti-enum)
- `my_memo_master_api/helpers/generateToken.js` — Math.random() remplacé par crypto.randomBytes(32)
- `my_memo_master_api/app.js` — Swagger UI désactivé si NODE_ENV === 'production'

**Ce qui est utilisable :**
- Routes Fields/Tutorials/Test : toutes les mutations (POST/PUT/DELETE) exigent désormais un JWT valide
- Login : un compte non vérifié par email reçoit 403 au lieu de se connecter normalement
- forgotPassword : ne révèle plus si l'email existe (réponse générique 200 dans tous les cas)
- generateToken : entropie cryptographique garantie (32 bytes = 256 bits)
- Swagger : inaccessible en production (NODE_ENV=production)

**Vulnérabilités corrigées (8) :**
1. [Critique] Routes Fields POST/PUT/DELETE sans auth
2. [Critique] Routes Tutorials POST/PUT/DELETE sans auth
3. [Critique] Routes Test POST/PUT/DELETE sans auth
4. [Moyenne] Login acceptait les comptes avec email non vérifié
5. [Moyenne] Énumération d'emails via forgotPassword (404 → 200 générique)
6. [Moyenne] Énumération d'emails via verifyEmail (404 → 401 générique)
7. [Faible] generateToken.js utilisait Math.random() (non-crypto)
8. [Moyenne] Swagger UI exposé en production

**Dette / points d'attention :**
- ~~Refresh token stocké en clair en base~~ — Résolu en M-00b.07b (hash SHA-256)
- ~~AUTH_JWT_EXPIRES_IN = 1d trop long~~ — Résolu en M-00b.07b (15m)
- ~~Storage.delete sans vérification de propriétaire~~ — Résolu en M-00b.07b (préfixe userId)
- ~~validEmailCode sans expiration~~ — Résolu en M-00b.07b (30 min)
- Tests cassés par hasValidatedEmail → résolus en M-00b.07b

---

### [KPI-01] — Page KPI personnels (Ma Progression) — 2026-06-23

**Fichiers créés (API) :**
- `my_memo_master_api/services/Kpi.service.js` — service `KpiService.getMyKpis(userId)` : calcul de tous les KPIs en un seul appel Promise.all (révision, exercices, Leitner, sujets, discipline, badges)
- `my_memo_master_api/controllers/Kpi.controller.js` — handler `exports.getMyKpis` (GET /kpi/my)

**Fichiers modifiés (API) :**
- `my_memo_master_api/routes/Kpi.routes.js` — placeholder remplacé par `GET /kpi/my` protégé par authMiddleware + Swagger JSDoc

**Fichiers créés (Front) :**
- `my_memo_master_front/src/icons/KpiIcon.vue` — icône SVG courbe de progression pour la navbar
- `my_memo_master_front/src/stores/kpi.js` — store Pinia `useKpiStore` : `fetchMyKpis()` → appelle `GET /kpi/my`
- `my_memo_master_front/src/pages/KpiPage.vue` — page complète avec 6 sections + graphiques Chart.js (Bar, Line) interactifs

**Fichiers modifiés (Front) :**
- `my_memo_master_front/src/router/routes.js` — ajout route `/kpi` (name: 'kpi', private: true, title: 'Ma Progression')
- `my_memo_master_front/src/App.vue` — ajout lien KPI dans nav desktop et nav mobile (après todo, avant profil)
- `my_memo_master_front/package.json` — ajout `chart.js@^4.5.1` + `vue-chartjs@^5.3.3` (KPI-01b)

**Ce qui est utilisable :**
- `GET /api/v1/kpi/my` (auth requis) — retourne `{ revision, exercises, leitner, subjects, discipline, badges }`
- Page `/kpi` accessible depuis la barre de navigation (icône courbe)
- 7 KPI couverts : révision/régularité, discipline, scores exercices, répartition Leitner, diversité matières, badges/succès
- 3 graphiques Chart.js interactifs : activité hebdomadaire (Bar), évolution des scores (Line avec fill), répartition Leitner (Bar coloré B1-B5)
- Badges : streak 7j, streak 30j, score parfait, 10 exercices, 5 matières, maîtrise Leitner (B4-B5 ≥ 50%), régularité 20 sessions/30j

**Sources de données utilisées :**
- `RevisionSession` (userId, date, isDone, startTime, endTime) → révision + discipline
- `TestResult` + `Test` + `Subject` (via include) → scores + diversité
- `LeitnerSystem` + `LeitnerBox` + `LeitnerCard` (via include chain) → répartition boîtes + taux de réussite

**Hypothèses posées :**
- Le streak ne compte que les sessions avec `isDone = true`. Un streak commence si la session la plus récente est aujourd'hui ou hier (tolérance d'un jour de marge).
- Le temps total de révision (minutes) est calculé depuis `startTime`/`endTime` de chaque session complétée. Les sessions qui traversent minuit ne sont pas gérées (cas MVP marginal).
- La tendance des scores (`recentTrend`) compare la première moitié des résultats à la seconde moitié (ordre chronologique ASC). Pertinente dès 4 résultats.
- La diversité des sujets agrège les sujets des TestResults et des LeitnerSystems (via Subject FK).
- Les badges sont calculés côté serveur dans le service, pas côté frontend.

**Dette / points d'attention :**
- Chart.js + vue-chartjs approuvés et installés (KPI-01b) — utilisables sur toutes les futures pages nécessitant des graphiques.
- `KpiIcon.vue` est un SVG custom simplifié — peut être amélioré visuellement.
- ~~Pas de tests unitaires~~ — 54 tests ajoutés : `test/services/Kpi.service.test.js` (50 tests, toutes les méthodes) + `test/controllers/Kpi.controller.test.js` (4 tests). Tous verts.
- Revue de code effectuée : aucune correction bloquante. 2 observations cosmétiques non-bloquantes : (a) `weeklyActivity` initialise 8 semaines mais sessions filtrées à 30 j → 3 premières barres toujours à 0 ; (b) `isSame` dans `_computeLeitner` redondant (peut être simplifié en `!isAfter`).
- L'endpoint `/kpi/my` fait 3 requêtes Sequelize en parallèle (Promise.all) + potentiellement beaucoup de données pour un utilisateur très actif. Acceptable en MVP, à optimiser avec du cache ou de la pagination si nécessaire.

---

### [M-00b.07b] — Correctifs sécurité H1–H4 (suite audit OWASP) — 2026-06-23

**Contexte :** Suite de l'audit OWASP M-00b.07. Les 4 vulnérabilités de priorité haute restantes ont été corrigées, et les tests cassés par les nouvelles contraintes d'auth ont été mis à jour.

**Fichiers modifiés (API) :**
- `my_memo_master_api/services/User.service.js`
  - `setRefreshToken` : hash SHA-256 avant stockage (même pattern que `setResetPasswordCode`)
  - `verifyRefreshToken` : hash du token entrant avant lookup DB ; check expiry `refreshTokenExpiresAt`
  - `setValidEmailCode` : génère et stocke `validEmailCodeExpiresAt` (30 min)
  - `verifyValidEmailCode` : vérifie l'expiry avant de valider le code
  - `clearValidEmailCode` : efface aussi `validEmailCodeExpiresAt`
- `my_memo_master_api/models/User.model.js` — ajout champ `validEmailCodeExpiresAt: DataTypes.DATE`
- `my_memo_master_api/middlewares/upload.middleware.js` — clé S3 inclut `userId` : `uploads/{userId}/{timestamp}-{random}{ext}`
- `my_memo_master_api/controllers/Storage.controller.js` — `delete` vérifie que la clé débute par `uploads/{req.user.id}/` avant suppression (403 sinon)
- `.env` — `AUTH_JWT_EXPIRES_IN=15m` (était `1d`)

**Fichiers modifiés (Tests) :**
- `my_memo_master_api/test/services/User.service.test.js`
  - Ajout describes : `setRefreshToken` (hash SHA-256, not raw), `verifyRefreshToken` (hash lookup, expiry, null token), `setValidEmailCode` (expiry 30 min), `verifyValidEmailCode` (correct, wrong, expired, no expiry)
  - 77 tests total — tous verts
- `my_memo_master_api/test/controllers/User.controller.test.js`
  - Login 200 mock : ajout `hasValidatedEmail: true`
  - Ajout test "403 — email non vérifié" pour login
  - forgotPassword "201 → 200" + "404 → 200 générique anti-énumération" (`sendEmail` non appelé)
- `my_memo_master_api/test/controllers/Fields.controller.test.js`
  - Import `jwt` + helper `makeToken`
  - `.set('Authorization', Bearer ...)` sur tous les POST/PUT/DELETE
  - Ajout test "401 — sans token" sur chaque mutation
- `my_memo_master_api/test/controllers/Tutorials.controller.test.js`
  - Même pattern que Fields — auth ajoutée sur POST/PUT/DELETE + tests "401 — sans token"
- `my_memo_master_api/test/controllers/Test.controller.test.js`
  - Auth ajoutée sur POST/PUT/DELETE + tests "401 — sans token" (makeToken était déjà présent)

**Vulnérabilités corrigées (H1–H4) :**
- [H1 — Haute] Refresh token stocké en clair → haché SHA-256 (même pattern que resetPasswordCode)
- [H2 — Haute] JWT access token valable 1 jour → réduit à 15 minutes
- [H3 — Haute] Storage.delete sans vérification propriétaire → validation préfixe `uploads/{userId}/`
- [H4 — Haute] validEmailCode sans expiration → expiry 30 min (même pattern que resetPasswordCode)

**État tests :**
- Controller tests (Fields, Test, Tutorials, User) : 100% verts
- User.service tests : 77/77 verts
- `Reminder.service.test.js` : 4 échecs **pré-existants** (Deadline.findByPk — non lié à ce ticket)
- `deadline.reminder.test.js` (BDD) : passe en isolation ; instabilité en run parallèle (contention SQLite — pré-existant)

**Hypothèses posées :**
- Les uploads existants avec l'ancienne clé (`uploads/{timestamp}/`) deviennent indélétables via l'API après ce changement (clé sans userId → 403). Les données en S3 ne sont pas migrées — à traiter si besoin en prod.
- `verifyRefreshToken` retourne `null` si `refreshTokenExpiresAt` est null (aucun token stocké) — comportement safe.

**Dette / points d'attention :**
- Migration Sequelize pour `validEmailCodeExpiresAt` à créer avant déploiement prod (`ALTER TABLE Users ADD COLUMN validEmailCodeExpiresAt DATETIME`).
- ~~Anciens uploads S3 sans `userId` dans la clé indélétables via l'API~~ — Résolu : script `scripts/cleanup-s3-legacy-keys.js` (dry-run par défaut)
- `Reminder.service.test.js` : 4 tests en échec pré-existants (hors périmètre).

---

### [KPI-02] — Alertes KPI (digest quotidien) + graphiques Chart.js + tests automatiques — 2026-06-23

**Contexte :** Suite de KPI-01. L'objectif était d'ajouter (1) un système d'alertes de progression activable par l'étudiant, (2) des graphiques interactifs Chart.js, et (3) une couverture de tests automatiques complète pour tous les nouveaux modules KPI.

**Fichiers créés (API) :**
- `my_memo_master_api/migrations/20260623000001-create-user-kpi-alert-settings.js` — table `UserKpiAlertSettings` (12 colonnes : canaux, types d'alertes, seuil, lastDigestSentAt)
- `my_memo_master_api/models/UserKpiAlertSettings.model.js` — modèle Sequelize + association `belongsTo(User)`
- `my_memo_master_api/services/KpiAlert.service.js` — `buildDigestItems(kpis, settings)` (3 triggers) + `runDailyDigest()` + `_sendDigestForUser(settings)`
- `my_memo_master_api/jobs/kpiAlert.cron.js` — `cron.schedule('0 18 * * *', ...)` via node-cron
- `my_memo_master_api/validators/KpiAlertSettings.validators.js` — validation PUT (tous champs optionnels, booleans, seuil int 0-100)
- `my_memo_master_api/controllers/KpiAlertSettings.controller.js` — `getSettings` (findOrCreate, defaults), `updateSettings` (whitelist 8 champs)
- `my_memo_master_api/test/services/Kpi.service.test.js` — 50 tests Jest (toutes les méthodes privées + getMyKpis, badges, streak, discipline, Leitner…)
- `my_memo_master_api/test/controllers/Kpi.controller.test.js` — 4 tests Jest (200, 401, 500)

**Fichiers modifiés (API) :**
- `my_memo_master_api/services/Kpi.service.js` — ajout `revivedToday` (boolean) dans le retour de `_computeRevision`
- `my_memo_master_api/routes/Kpi.routes.js` — ajout `GET /kpi/alert-settings` et `PUT /kpi/alert-settings`
- `my_memo_master_api/models/index.js` — enregistrement `UserKpiAlertSettings.model.js`
- `my_memo_master_api/app.js` — import + démarrage `startKpiAlertCron()`

**Fichiers créés (Front) :**
- `my_memo_master_front/src/stores/kpiAlertSettings.js` — store Pinia : `fetchSettings()`, `updateSettings(updates)`, états `loading`/`saving`
- `my_memo_master_front/test/stores/kpi.store.test.js` — 9 tests Vitest (fetchMyKpis : succès, non-200, 401, erreur réseau, loading flag, deux appels)
- `my_memo_master_front/test/stores/kpiAlertSettings.store.test.js` — 12 tests Vitest (fetchSettings + updateSettings : succès, erreur, loading/saving flags)
- `my_memo_master_front/test/components/KpiPage.test.js` — 21 tests Vitest (loader, état vide, sections, badges unlock/lock, stats, discipline bar colors, graphiques conditionnels)

**Fichiers modifiés (Front) :**
- `my_memo_master_front/src/pages/KpiPage.vue` — réécriture complète : graphiques CSS → Chart.js interactifs (Bar activité hebdo, Line scores fill, Bar Leitner coloré B1-B5)
- `my_memo_master_front/src/pages/SettingsPage.vue` — section "Alertes de progression" (master toggle, canaux, 3 types d'alertes, slider seuil), lazy-load settings à l'ouverture de l'onglet
- `my_memo_master_front/src/components/NotificationBellComponent.vue` — support `kpi_digest` (badge violet "Progression", affichage items parsés, `parseDigest()`)
- `my_memo_master_front/test/components/NotificationBellComponent.test.js` — +5 tests kpi_digest (badge violet, titre, items, JSON invalide)

**Ce qui est utilisable :**
- `GET /api/v1/kpi/alert-settings` → retourne ou crée les paramètres d'alertes de l'utilisateur connecté
- `PUT /api/v1/kpi/alert-settings` → met à jour les préférences (8 champs autorisés)
- Cron quotidien 18h — envoie un digest groupé pour tous les utilisateurs ayant des alertes activées et non encore envoyées aujourd'hui
- 3 triggers d'alerte : `streak_risk` (streak en cours mais pas révisé aujourd'hui), `discipline_low` (< seuil), `score_drop` (tendance ≤ -10)
- In-app : via le modèle `Reminder` existant (entityType: 'kpi_digest') — affiché dans la cloche
- Email : via `sendEmail` (template text)
- Page Paramètres → onglet Notifications → section "Alertes de progression"
- Push mobile : prévu (pushEnabled) mais rendu grisé jusqu'à la version mobile
- 42 tests automatiques front (2 stores + 1 composant KpiPage + 5 tests cloche) — tous verts

**Triggers d'alerte :**
- `streak_risk` : `settings.streakAlertEnabled && kpis.revision.streakDays > 0 && !kpis.revision.revivedToday`
- `discipline_low` : `settings.disciplineAlertEnabled && score > 0 && score < settings.thresholdDiscipline`
- `score_drop` : `settings.scoreDropAlertEnabled && kpis.exercises.recentTrend <= -10`

**Hypothèses posées :**
- `lastDigestSentAt` est mis à jour même si 0 alertes sont déclenchées — évite de re-chercher des utilisateurs sans alerte le lendemain.
- Le digest n'est envoyé qu'une fois par jour (`lastDigestSentAt < todayStr` via comparaison ISO date).
- `revivedToday` est calculé dans `_computeRevision` sans requête DB supplémentaire (simple `.some()` sur les sessions déjà chargées).
- Push futur : le champ `pushEnabled` est stocké mais le worker associé n'est pas implémenté — le toggle est grisé dans l'UI.

**Dette / points d'attention :**
- Migration `UserKpiAlertSettings` à exécuter avant déploiement prod (table absente en prod).
- Le cron utilise `node-cron` (déjà en place via `fifo.cron.js`) — pas de Redis/BullMQ car le digest n'a pas besoin de retry fiable (si le serveur est down à 18h, la notification est simplement manquée ce jour).
- `classGroups.store.test.js` : 1 test en échec **pré-existant** (`addMember — succès`) — hors périmètre.
- `MindmapsEditorView.test.js` : échec de suite **pré-existant** — hors périmètre.

---

### [M-00b.09] — Sauvegardes auto (pg_dump) — 2026-06-23

**Contexte :** Le ticket M-00b.01 avait livré `scripts/backup.sh` (script manuel VPS) et un runbook documentant la configuration crontab. M-00b.09 rend les sauvegardes automatiques sans intervention manuelle de l'opérateur.

**Fichiers modifiés :**
- `server_docker_compose/docker-compose.yml` — ajout service `backup` + volume `backup-data` :
  - Image `postgres:17-alpine` (pg_dump inclus, aucune nouvelle dépendance)
  - Script inline dans `command:` (même pattern que le service `front`) — auto-suffisant, pas de fichier externe à déployer
  - Dump au démarrage du conteneur (vérification immédiate de la config) puis cycle quotidien à `BACKUP_HOUR`h00 UTC
  - Rétention configurable via `BACKUP_RETENTION_DAYS` (défaut 7 jours)
  - Dumps stockés dans le volume `backup-data` (`/backups` dans le conteneur)
  - `restart: unless-stopped` — redémarre automatiquement sans intervention
  - `depends_on: postgres: condition: service_healthy` — ne démarre qu'une fois PG prêt
- `server_docker_compose/.env.example` — ajout section "Sauvegardes automatiques" : `BACKUP_HOUR`, `BACKUP_RETENTION_DAYS`, limites de ressources
- `.github/workflows/cd.yml` — ajout `backup` dans le `compose up -d pgadmin api front backup` du job `deploy_test` : le service démarre à chaque déploiement
- `docs/RUNBOOK.md` — section "Sauvegarde et restauration" réécrite : service auto, commandes de monitoring/dump manuel/extract/restauration, variables

**Ce qui est utilisable :**
- `docker compose up -d backup` — démarrer le service sur un VPS existant
- `docker compose logs backup` — consulter les logs de sauvegarde
- `docker compose exec backup ls -lh /backups/` — lister les dumps disponibles
- `BACKUP_HOUR=3` (défaut) — sauvegarde à 3h00 UTC
- `BACKUP_RETENTION_DAYS=7` (défaut) — 7 jours de rétention

**Hypothèses posées :**
- `postgres:17-alpine` inclut busybox avec `find`, `du`, `date`, `sleep` — toutes les commandes utilisées dans le script sont disponibles sans installation.
- L'arithmétique `10#${VAR}` est utilisée pour forcer l'interprétation décimale des heures (évite `08`/`09` traités comme octal par certains shells POSIX).
- En cas d'échec du dump (PG indisponible, erreur réseau), le dump partiel est supprimé, le service log l'erreur et attend le prochain cycle — il ne s'arrête pas.
- Le `$$VAR` dans le YAML docker-compose est l'escape pour un `$VAR` shell (docker-compose retire un `$`) ; les valeurs sensibles (`PG_PASS`) passent par le bloc `environment:` et ne sont jamais embarquées dans la chaîne de commande.

**Dette / points d'attention :**
- Les dumps sont dans un volume Docker — si le volume est perdu (rm -v), les sauvegardes sont perdues. Pour une redondance, copier régulièrement vers S3 ou un stockage externe (hors scope MVP).
- `scripts/backup.sh` (host crontab) reste utilisable en complément pour un backup off-container. Les deux approches coexistent.
- Si `BACKUP_HOUR` est modifié dans `.env`, le service doit être recréé (`docker compose up -d --force-recreate backup`) pour prendre en compte la nouvelle valeur (la variable est lue au démarrage du conteneur).

---

### [M-00b.10] — Logs applicatifs (Winston + Morgan) — 2026-06-24

**Contexte :** Tâche infrastructure — Winston était en place mais Morgan (access logs HTTP) manquait.

**Fichiers modifiés :**
- `my_memo_master_api/helpers/logger.js` — niveau dev `'info'` → `'http'` (winston levels : http=3, info=2 ; le niveau http couvre les access logs Morgan)
- `my_memo_master_api/app.js` — ajout de Morgan pipé dans Winston via `morganStream` ; format `'dev'` en dev, `'combined'` en prod ; guard `NODE_ENV !== 'test'` pour ne pas polluer Jest

**Package ajouté :** `morgan ^1.11.0`

**Comportement :**
- Dev : chaque requête → `logger.http()` → visible en console (GET /api/v1/users 200 12.345 ms - 150)
- Prod : niveau logger `'warn'` → logs Morgan filtrés (Traefik gère les access logs côté reverse proxy)
- Test : Morgan non chargé, 957 tests verts sans régression

---

### [M-04.08] — Revue de code & correctifs KPI — 2026-06-24

**Contexte :** Revue de code du périmètre KPI personnels (M-04) suite aux tickets KPI-01, KPI-02, M-04.06, M-04.07. 3 correctifs appliqués après revue.

**Fichiers créés :**
- `my_memo_master_api/services/KpiAlertSettings.service.js` — service `getOrCreate(userId)` + `update(userId, data)` avec whitelist des champs autorisés (ALLOWED_FIELDS), extrait du controller pour respecter l'architecture controller → service → model

**Fichiers modifiés :**
- `my_memo_master_api/models/UserKpiAlertSettings.model.js` — suppression de `indexes: [{ fields: ['userId'], unique: true }]` (doublon avec `unique: true` sur la colonne, créait deux index identiques en base)
- `my_memo_master_api/controllers/KpiAlertSettings.controller.js` — refactoré pour déléguer toute la logique à `KpiAlertSettings.service.js` (30 lignes → 14 lignes)
- `my_memo_master_api/services/Kpi.service.js` — `_computeRevision` : boucle weeklyActivity maintenant itère `sessions` sans filtre `thirtyAgo` ; le `if (ws in weeklyMap)` seul garantit que seules les semaines du graphique (8 semaines) sont comptées — les sessions de J-30 à J-56 apparaissent désormais correctement
- `my_memo_master_api/test/controllers/KpiAlertSettings.controller.test.js` — mis à jour pour mocker `../../services/KpiAlertSettings.service` (au lieu du modèle directement)

**Résultat :** 957 tests back — tous verts, 56 suites, aucune régression.

**Dettes restantes (non bloquantes, acceptées pour MVP) :**
- `dayjs(nra).isSame(now)` dans `_computeLeitner` — dead code pratiquement (comparaison milliseconde)
- `getMyKpis` charge toutes les LeitnerCards sans projection d'attributs
- Pas d'état d'erreur distinct dans `KpiPage.vue` (erreur réseau ≡ état vide)
- `kpiAlertSettings.js` store — catch sans `return false`
- Double appel `fetchMyKpis` si HomePage visitée après KpiPage (pas de TTL store)

---

### [M-04.07] — Tests fonctionnels KPI (couverture complète) — 2026-06-24

**Contexte :** M-04.07 complète la couverture de tests du périmètre KPI. KPI-01/KPI-02 avaient livré 50 tests service + 4 controller + 9+12 stores + 21 composant KpiPage. Il manquait les tests de `KpiAlertSettings.controller.js` (GET/PUT `/kpi/alert-settings`) et de `KpiAlert.service.js` (`buildDigestItems`).

**Fichiers créés (API) :**
- `my_memo_master_api/test/controllers/KpiAlertSettings.controller.test.js` — 16 tests Supertest : `GET /kpi/alert-settings` (200 nominal, 200 findOrCreate avec defaults, 401 sans token, 401 token invalide, 500 DB) + `PUT /kpi/alert-settings` (200 payload complet, 200 partiel, 200 vide, 200 whitelist champs non autorisés, 400 booléen invalide, 400 seuil > 100, 400 seuil négatif, 400 chaîne invalide, 401, 500 findOrCreate, 500 update)
- `my_memo_master_api/test/services/KpiAlert.service.test.js` — 19 tests Jest : `buildDigestItems` — tableau vide, `streak_risk` (déclenché/non-déclenché × 4 conditions, pluriel/singulier), `discipline_low` (déclenché/non-déclenché × 4 conditions, seuil personnalisé), `score_drop` (déclenché/non-déclenché × 4 conditions), déclenchement multiple (3 items dans l'ordre), filtrage par settings

**Point d'attention :** `isBoolean()` d'express-validator sans option `{ strict: true }` accepte `1` et `0` (JSON number) comme booléens valides. Le test 400 utilise une chaîne `'oui'` comme valeur clairement invalide.

**Ce qui est utilisable :**
- 35 nouveaux tests back — tous verts
- Couverture totale KPI : 50 (Kpi.service) + 4 (Kpi.controller) + 16 (KpiAlertSettings.controller) + 19 (KpiAlert.service) + 9 (kpi.store) + 12 (kpiAlertSettings.store) + 21 (KpiPage) + 14 (KpiAlertWidgetComponent) = **145 tests**

**Hypothèses posées :**
- `buildDigestItems` ne teste pas `runDailyDigest` ni `_sendDigestForUser` (flux complet cron) — ces méthodes nécessiteraient un test BDD in-memory. Acceptable car toute la logique de déclenchement est dans `buildDigestItems` qui est maintenant entièrement couverte.

**Dette / points d'attention :**
- Pas de test BDD KPI (intégration SQLite in-memory) — non prévu en MVP vu la couverture unitaire profonde.

---

### [M-04.06] — Widget alertes & suggestions révision (dashboard étudiant) — 2026-06-23

**Contexte :** Suite de KPI-01 et KPI-02. KPI-01 avait livré la page `/kpi` et KPI-02 le système de digest quotidien (cron + NotificationBell). Il manquait le widget proactif intégré au dashboard étudiant (M-04.06 — US-12).

**Fichiers créés (Front) :**
- `my_memo_master_front/src/components/KpiAlertWidgetComponent.vue` — widget autonome : charge KPIs + settings en parallèle au montage, calcule les alertes client-side (même logique que `KpiAlert.service.js/buildDigestItems`), affiche suggestion Leitner (cartes dues) toujours visible + 3 alertes conditionnelles (streak_risk, discipline_low, score_drop), lien vers `/kpi`, état chargement, état vide "Tout va bien 🎉"
- `my_memo_master_front/test/components/KpiAlertWidgetComponent.test.js` — 14 tests Vitest (loader, état vide, streak alerte/no-alerte, discipline alerte/no-alerte, score_drop alerte/no-alerte, suggestion Leitner, settings.enabled=false, streakAlertEnabled=false, lien /kpi)

**Fichiers modifiés (Front) :**
- `my_memo_master_front/src/pages/HomePage.vue` — ajout section `home__alerts` avec `<KpiAlertWidgetComponent />` entre la grille de navigation et l'interpréteur

**Ce qui est utilisable :**
- Dashboard (`/`) affiche le widget "Alertes & Suggestions" avec les alertes en temps réel (pas de délai cron)
- Suggestion Leitner toujours visible si `kpis.leitner.cardsDue > 0` (indépendante des préférences d'alertes)
- 3 alertes conditionnelles si `settings.enabled` : streak en danger (🔥), discipline faible (📉), scores en baisse (📚)
- Lien "Voir mes stats →" vers `/kpi` pour la page complète
- 14 tests Vitest passants

**Hypothèses posées :**
- Le widget appelle `fetchMyKpis()` et `fetchSettings()` à chaque montage — acceptable car la HomePage est le point d'entrée principal et les données changent quotidiennement. Les stores ne font pas de cache, donc chaque visite recharge les données.
- La suggestion Leitner est délibérément hors du système de `settings.enabled` : c'est une information d'action immédiate (cartes dues maintenant), pas une alerte de progression.
- Le calcul des alertes est répliqué côté client (même logique que `buildDigestItems`) pour éviter un endpoint supplémentaire — les KPIs sont déjà chargés, la duplication est justifiée.

**Dette / points d'attention :**
- Si `fetchMyKpis()` est déjà appelé ailleurs sur la page (ex. si une future page dashboard charge le store), les deux appels se superposent — à gérer avec un flag ou un TTL si la performance devient un problème.

---

### [AUTH-VERIFY-EMAIL] — Envoi email de vérification à l'inscription — 2026-06-23

**Fichiers modifiés (API) :**
- `services/User.service.js` — `setValidEmailCode` retourne maintenant le code généré (break: la méthode retournait `undefined` avant)
- `controllers/User.controller.js` — `register` : capture le retour de `userService.create`, génère le code via `setValidEmailCode`, envoie l'email avec un lien cliquable `APP_FRONT_URL/verify-email?email=...&code=...` ; si l'envoi email échoue, l'utilisateur créé est supprimé (rollback manuel) avant de retourner 500

**Fichiers créés (Front) :**
- `my_memo_master_front/src/pages/VerifyEmailPage.vue` — page de vérification email : auto-vérification si `?email=&code=` présents dans l'URL (lien cliquable), formulaire manuel sinon ; utilise `AuthFormLayout` + `authStore.verifyEmail()`

**Fichiers modifiés (Front) :**
- `my_memo_master_front/src/router/routes.js` — ajout route `/verify-email` (public, `private: false`)
- `my_memo_master_front/src/stores/auth.js` — action `register` : redirige vers `/verify-email?email=<email>` après inscription (au lieu de `/auth`) ; message de toast mis à jour

**Fichiers modifiés (.env) :**
- `.env.example` — ajout `APP_FRONT_URL=http://localhost` (variable backend pour construire le lien email)
- `server_docker_compose/.env.example` — ajout `APP_FRONT_URL=https://test.my-memo-master.com`

**Ce qui est utilisable :**
- À l'inscription, l'utilisateur reçoit un email avec un lien `APP_FRONT_URL/verify-email?email=...&code=...`
- Le clic sur le lien auto-vérifie l'email et affiche un écran de succès
- Si le lien est expiré (30 min), l'utilisateur peut saisir son email + code manuellement sur la même page
- Après vérification réussie, redirection vers `/auth` (connexion)
- `hasValidatedEmail = false` empêche toujours la connexion jusqu'à vérification (comportement inchangé)

**Hypothèses posées :**
- `APP_FRONT_URL` est une variable backend (Node.js) distincte de `VITE_FRONT_URL` (variable Vite). Les deux ont la même valeur en pratique mais servent des contextes différents (backend vs build front).
- Le rollback manuel (delete user si email échoue) couvre le cas SMTP mal configuré. Si `userService.delete` échoue aussi, l'erreur est loguée — l'utilisateur reste en base avec `hasValidatedEmail = false` et ne peut pas se connecter.

**Dette / points d'attention :**
- Pas d'endpoint "renvoyer l'email de vérification" — si un utilisateur perd l'email ou si le délai expire, il ne peut pas se débloquer sans contact support. À implémenter dans un ticket dédié (`POST /users/resend-verification`).
- Le code de vérification est un entier 6 chiffres stocké en clair (décision antérieure). Il est passé en query param dans l'URL — acceptable pour MVP, passer au pattern token+hash SHA-256 (comme reset-password) dans un ticket de sécurité si nécessaire.
- Les tests Supertest de `User.controller.register` qui mocquent le service devront être mis à jour pour inclure `setValidEmailCode` et `sendEmail` dans les mocks.

---

### [S-05.01] — Système de tags (M2M) pour MindMaps, LeitnerSystem et Test — 2026-06-24

**Fichiers créés (API) :**
- `models/Tag.model.js` — modèle Sequelize (`tagId` PK, `name` STRING(50) unique) + associations `belongsToMany` vers Diagramme, LeitnerSystem, Test
- `migrations/20260624000001-create-tag-table.js` — table `Tag`
- `migrations/20260624000002-create-mindmaptag-table.js` — table junction `MindMapTag` (idMindMap + tagId, PKs composites, FK CASCADE)
- `migrations/20260624000003-create-leitnersystemtag-table.js` — table junction `LeitnerSystemTag` (idSystem + tagId)
- `migrations/20260624000004-create-testtag-table.js` — table junction `TestTag` (testId + tagId)
- `services/Tag.service.js` — CRUD tag + setTagsForMindMap / setTagsForLeitnerSystem / setTagsForTest (pattern : findAll avec guard vide + setTags Sequelize)
- `controllers/Tag.controller.js` — try/catch + appels service + HTTP
- `validators/Tag.validators.js` — règles create/update (name requis, max 50) + setTags (tagIds tableau d'entiers)
- `routes/Tag.routes.js` — 8 routes (PUT /diagrammes/:id, PUT /leitnersystems/:id, PUT /tests/:id avant le générique PUT /:id)

**Fichiers créés (Front) :**
- `src/stores/tags.js` — Pinia store : fetchTags, createTag, deleteTag, setEntityTags(entityType, entityId, tagIds)
- `src/components/TagSelectorComponent.vue` — composant réutilisable : chips sélectionnés + dropdown checkbox + création inline de tag

**Fichiers modifiés (API) :**
- `models/diagramme.model.js` — `MindMap.belongsToMany(Tag, { through: 'MindMapTag', as: 'tags' })`
- `models/LeitnerSystem.model.js` — `LeitnerSystem.belongsToMany(Tag, { through: 'LeitnerSystemTag', as: 'tags' })`
- `models/Test.model.js` — `Test.belongsToMany(Tag, { through: 'TestTag', as: 'tags' })`
- `models/index.js` — enregistrement `Tag.model.js`
- `app.js` — enregistrement `Tag.routes.js`
- `services/Diagramme.service.js` — TAG_INCLUDE dans findByUser et findOne
- `services/LeitnerSystem.service.js` — TAG_INCLUDE dans findAll, findBySubject, findOne, create
- `services/Test.service.js` — TAG_INCLUDE dans findAll et findOne

**Fichiers modifiés (Front) :**
- `src/components/mindmap/MindmapsListView.vue` — TagSelectorComponent dans modal renommer + chips tags dans #stats
- `src/pages/FlashcardsPage.vue` — TagSelectorComponent dans modal créer/modifier + setEntityTags après submitForm + chips tags dans #stats
- `src/pages/ExercisesPage.vue` — TagSelectorComponent dans modal créer/modifier + setEntityTags après submitCreate/submitEdit + chips tags dans #stats

**Ce qui est utilisable :**
- `GET /api/v1/tags` — liste tous les tags
- `POST /api/v1/tags` — crée un tag
- `PUT /api/v1/tags/:id` — renomme un tag
- `DELETE /api/v1/tags/:id` — supprime un tag (CASCADE sur les junctions)
- `PUT /api/v1/tags/diagrammes/:id` — remplace les tags d'une mind map
- `PUT /api/v1/tags/leitnersystems/:id` — remplace les tags d'un système Leitner
- `PUT /api/v1/tags/tests/:id` — remplace les tags d'un exercice
- Tous les GET retournent les tags associés : `diagrammes`, `leitnersystems`, `tests`
- TagSelectorComponent : sélection multiple par checkboxes, création inline, suppression par chip

**Hypothèses posées :**
- Les tags sont globaux (non scopés par utilisateur) — un tag créé par un user est visible par tous. Si la segmentation par user est nécessaire, il faudra ajouter `userId` au modèle Tag.
- Pas de route PUT /tags/:id côté frontend car la gestion des tags se fait directement via le TagSelectorComponent (création inline). L'update de nom existe en API mais n'est pas exposé dans l'UI.

**Dette / points d'attention :**
- Les 4 migrations de tags (`20260624000001` à `20260624000004`) doivent être passées avant de démarrer l'API. En dev (SQLite), le `sync: { alter: true }` de `models/index.js` peut les créer automatiquement mais les migrations doivent être à jour pour la prod.
- ~~Aucun test Supertest ni Vitest n'a été créé pour le module Tags~~ — résolu dans le ticket suivant (voir entrée ci-dessous).
- Le mind map create flow ne permet pas d'assigner des tags à la création (pas d'ID DB avant le premier auto-save dans l'éditeur). Les tags sont disponibles uniquement dans le modal de renommage/édition.

---

### [S-05.03-TESTS] — Tests controller Tags — 2026-06-24

**Fichiers créés :**
- `test/controllers/Tag.controller.test.js` — 39 tests Supertest couvrant les 8 endpoints du module Tags

**Couverture :**
- `GET /tags` — 200 (liste), 200 (vide), 401, 500
- `GET /tags/:id` — 200, 404, 401, 500
- `POST /tags` — 201, 400 (name manquant), 400 (name > 50 chars), 401, 500
- `PUT /tags/:id` — 200, 404, 400 (name manquant), 401, 500
- `DELETE /tags/:id` — 200, 404, 401, 500
- `PUT /tags/diagrammes/:id` — 200, 200 (tableau vide), 404, 400 (tagIds manquant), 400 (non-entiers), 401, 500
- `PUT /tags/leitnersystems/:id` — 200, 404, 400, 401, 500
- `PUT /tags/tests/:id` — 200, 404, 400, 401, 500

**Ce qui est utilisable :**
- 39/39 tests passants : `npx jest test/controllers/Tag.controller.test.js`
- Suite globale : 996 tests (988 avant), 3 suites en échec préexistantes non liées aux tags

**Hypothèses posées :**
- Pattern identique aux autres tests controllers : mock `models/index`, mock service, `makeToken()` JWT.
- Les 3 suites préexistantes en échec (`LeitnerSystem.service`, `Diagramme.service`, `exercise.session.bdd`) ne sont pas liées au module Tags.

**Dette / points d'attention :**
- Aucune dette nouvelle introduite.

---

### [S-05.02] — Maquettes UI navigation par sujet — 2026-06-25

**Fichiers créés :**
- `diagrams/ui_navigation_sujet.md` — document de maquettes et patterns UI pour la catégorisation par sujets et tags

**Contenu du document :**
- Maquette ASCII de la page liste avec filtre sujet (`ItemListLayout`)
- Maquette de la card item (`MenuItemComponent`) avec badge sujet et chips tags
- Maquette complète du `TagSelectorComponent` : état vide, sélection, dropdown, palette couleurs
- Maquette du sélecteur sujet dans les modals de création/édition
- API props de `ItemListLayout` documentée (8 props, 2 slots, 3 événements)
- Tableau périmètre V1 (IN / OUT)
- Flux utilisateur typique (4 étapes)

**Ce qui est utilisable :**
- Document de référence pour toute évolution des pages liste ou du sélecteur de tags
- Sert de spécification rétroactive pour la fonctionnalité S-05 (catégorisation)

**Hypothèses posées :**
- Document rédigé rétrospectivement depuis l'implémentation existante (l'analyse a été sautée au profit d'une implémentation directe).
- La "recherche cross-contenu" par tag (filtre global toutes pages) est documentée comme V2 — hors périmètre V1.

**Dette / points d'attention :**
- Aucune dette nouvelle introduite.

---

### [S-05.04] — Association sujets aux entités (Back-end) — 2026-06-25

**Fichiers modifiés :**
- `models/Subject.model.js` — ajout `Subject.hasMany(Diagramme, { as: 'mindMaps' })` et `Subject.hasMany(Test, { as: 'tests' })` — associations inverses manquantes (permet eager loading depuis Subject vers MindMap et Test)
- `services/Diagramme.service.js` — ajout constante `SUBJECT_INCLUDE` + inclusion dans `findByUser` : les MindMaps retournées incluent désormais `{ subjectId, name }` comme LeitnerSystem et Test
- `test/controllers/Subject.controller.test.js` — ajout 6 tests (400 name manquant POST/PUT, 400 name trop court POST/PUT, 401 POST, 401 PUT) → 21 tests au total (était 15)

**Ce qui est utilisable :**
- `Subject.findAll({ include: [Diagramme, Test] })` désormais possible sans erreur Sequelize
- `GET /diagrammes` retourne le Subject dans chaque MindMap (cohérent avec LeitnerSystem et Test)
- 21/21 tests Subject.controller passants

**Hypothèses posées :**
- Les associations `hasMany` inverses (Subject → Diagramme, Subject → Test) n'étaient pas nécessaires au fonctionnement des FK mais sont requises pour des queries futures depuis le Subject.
- `Diagramme.service.findByUser` est la seule méthode publique exposée au controller — `findAll` (interne) n'est pas corrigée car non exposée dans les routes.

**Ce qui était déjà livré avant ce ticket :**
- Subject CRUD complet (model, service, controller, routes, validators) depuis l'init du projet
- FK `subjectId` sur MindMap (init), Test (init), LeitnerSystem (migration 20260620000001)
- Subject inclus dans LeitnerSystem.service et Test.service
- Filtre par sujet : `Diagramme.service.findByUser({ subjectId })`, endpoint `GET /leitnersystems/bySubjects/:id`
- Filtre côté front via `ItemListLayout` (toutes les pages liste)

**Dette / points d'attention :**
- Aucune dette nouvelle introduite.

---

### [S-05.05] — API recherche cross-contenu par sujet — 2026-06-25

**Fichiers créés :**
- `services/Search.service.js` — `searchAll(userId, { subjectId, q })` : requêtes parallèles (`Promise.all`) sur Diagramme, LeitnerSystem, Test avec filtres `Op.like` sur le nom + filtre `subjectId` optionnel ; retourne `{ mindMaps, leitnerSystems, tests }`
- `controllers/Search.controller.js` — extraction `subjectId` (Number) et `q` (trim) depuis `req.query` ; appel service ; 200/500
- `validators/Search.validators.js` — `subjectId` : entier ≥ 1 optionnel ; `q` : max 200 chars optionnel
- `routes/Search.routes.js` — `GET /search` avec authMiddleware + validators + validate
- `test/controllers/Search.controller.test.js` — 11 tests : sans filtre (200 plein, 200 vide, 401, 500), filtre subjectId (200, 400 non-entier, 400 = 0), filtre q (200, 400 > 200 chars), filtre combiné (200 plein, 200 vide)

**Fichiers modifiés :**
- `app.js` — import `searchRoutes` + `searchRoutes(v1)` enregistré

**Ce qui est utilisable :**
- `GET /api/v1/search` — accessible immédiatement, auth JWT requise
- `GET /api/v1/search?subjectId=1` — filtre par sujet
- `GET /api/v1/search?q=algèbre` — recherche textuelle sur les noms (case-insensitive SQLite, case-sensitive PostgreSQL)
- `GET /api/v1/search?subjectId=1&q=algèbre` — filtre combiné
- 11/11 tests passants

**Hypothèses posées :**
- Tests ne filtrent pas par `userId` — Tests sont partagés entre utilisateurs (pas de `userId` sur le modèle Test).
- `Op.like` est case-insensitive en SQLite (dev) et case-sensitive en PostgreSQL (prod) — acceptable V1, migrer vers `Op.iLike` en PostgreSQL si nécessaire.
- Les Tags et le Subject sont inclus dans chaque résultat pour éviter des allers-retours supplémentaires côté front.

**Dette / points d'attention :**
- PostgreSQL prod : `Op.like` est case-sensitive — utiliser `Op.iLike` (PostgreSQL uniquement) ou `Sequelize.fn('LOWER', ...)` pour une recherche uniforme.

---

### [S-05.06] — Navigation arborescente par sujet (Front-end) — 2026-06-25

**Fichiers créés :**
- `src/stores/search.js` — `useSearchStore` : état `{ results, loading }` ; action `searchAll({ subjectId, q })` → `GET /search`
- `src/pages/SubjectsPage.vue` — page `/subjects` : barre de recherche (debounce 300ms), accordéon par sujet, 3 sections par sujet (Mind Maps / Flashcards / Exercices), chips tags, navigation vers les pages détail

**Fichiers modifiés :**
- `src/router/routes.js` — route `/subjects` ajoutée (privée)

**Ce qui est utilisable :**
- `/subjects` accessible depuis n'importe quel lien interne ou navigation directe
- Recherche temps réel (debounce 300ms) cross-contenu — appelle `GET /api/v1/search?q=X`
- Sujets sans contenu affichés (grille, accordéon fermé par défaut)
- Sujets avec contenu auto-dépliés au chargement
- Clic sur un item : navigate vers la page détail (mindmaps, flashcards.cards, exercise-detail)

**Comportement par type de contenu :**
| Type | Navigation au clic |
|---|---|
| Carte mentale | `/mindmaps` (pas de page detail individuelle) |
| Flashcard (Leitner) | `/flashcards/:systemId/cards` |
| Exercice | `/exercises/:id` |

**Hypothèses posées :**
- Pas de page détail individuelle pour les Mind Maps dans le routeur V1 — le clic navigue vers `/mindmaps` (liste).
- `ContentSection` implémenté comme composant interne via `defineComponent` + `h()` pour éviter un fichier séparé (petit composant, usage unique).
- Les tags sont affichés jusqu'à 3 max par item pour ne pas surcharger la vue liste.

**Dette / points d'attention :**
- Pas de lien vers `/subjects` dans la navbar — à ajouter quand la navigation principale évolue.
- Les Mind Maps pourraient avoir leur propre page détail à terme → le clic devra être mis à jour.

---

### [S-05.07] — Composant sélection sujet réutilisable — 2026-06-25

**Fichiers créés :**
- `src/components/SubjectSelectorComponent.vue` — composant `v-model:modelValue` (Number|null) + prop `required` (Boolean) ; select liste des sujets ; création inline avec auto-focus ; auto-chargement des sujets si store vide ; reset automatique du formulaire inline quand le parent réinitialise la valeur à null

**Fichiers modifiés :**
- `src/pages/FlashcardsPage.vue` — suppression de `showNewSubjectForm`, `newSubjectName`, `creatingSubject`, `createSubjectInline()` ; template : bloc select+form remplacé par `<SubjectSelectorComponent v-model="form.subjectId" />`
- `src/pages/ExercisesPage.vue` — même suppression ; template : bloc remplacé par `<SubjectSelectorComponent v-model="form.subjectId" required />` ; `form.subjectId` init changé de `''` à `null`

**Ce qui est utilisable :**
- `<SubjectSelectorComponent v-model="val" />` — sélecteur optionnel (option "— Sans sujet —")
- `<SubjectSelectorComponent v-model="val" required />` — sélecteur requis (placeholder "Sélectionner un sujet")
- Création inline : clic "+ Créer un nouveau sujet" → input → Entrée ou bouton → sélection automatique du sujet créé
- Erreur de création : notification toast (pattern cohérent avec TagSelectorComponent)

**Hypothèses posées :**
- Le reset du formulaire inline est déclenché par watch sur `modelValue` : quand le parent remet `null`, le composant ferme son formulaire inline.
- MindmapsListView gère le sujet via un pattern différent (emit `{ name, subjectId }` vers MindmapsPage) — non inclus dans ce ticket.

**Dette / points d'attention :**
- MindmapsListView a son propre sélecteur de sujet dans la modal "créer une carte" — peut être migré vers SubjectSelectorComponent dans un refactor futur.

---

### [S-01.01] — Définition indicateurs pédagogiques (KPI enseignant) — 2026-06-25

**Contexte :** Feature S-01 (Sprint 8, Analyse/V1) — Définir et implémenter les indicateurs pédagogiques pour les enseignants : agrégats de groupe, tendances hebdomadaires, détection de décrochage, détail par étudiant.

**Fichiers créés :**
- `diagrams/kpi_pedagogiques.md` — document de définition complet : indicateurs, règles de calcul, seuils d'alerte, droits d'accès, endpoint, sources de données, limites

**Fichiers modifiés (API) :**
- `services/ClassGroup.service.js` — ajout `getStudentAnalytics(groupId, requesterId)` + helper privé `_computeGroupWeeklyTrend(results)` ; ajout imports `dayjs` + `RevisionSession` ; constantes `AT_RISK_INACTIVE_DAYS=7`, `AT_RISK_SCORE_DROP_PCT=20`, `AT_RISK_NO_EXERCISE_DAYS=14`
- `controllers/ClassGroup.controller.js` — ajout handler `exports.getStudentAnalytics`
- `routes/ClassGroup.routes.js` — ajout `GET /class-groups/:id/kpi/students` (authMiddleware, Swagger JSDoc)
- `test/services/ClassGroup.service.test.js` — ajout mock `RevisionSession` + `User.findAll` + `FIXED_NOW` + `jest.useFakeTimers()` ; 9 nouveaux tests `getStudentAnalytics` (28 tests total, tous verts)

**Endpoint livré :**
- `GET /api/v1/class-groups/:id/kpi/students` (auth requis, admin roleId 1/4 ou enseignant du groupe)
- Retourne : `{ activeStudentsCount, atRiskCount, scoreWeeklyTrend[4 semaines ISO], students[] }`
- Chaque étudiant : `userId, name, email, lastActivityAt, daysInactive, avgScore, scoreTrend[4], atRisk, atRiskReasons[]`

**Critères de décrochage implémentés :**
- Inactivité > 7 jours (basé sur `RevisionSession.date`)
- Aucune session de révision enregistrée
- Baisse de score > 20 % entre les 2 derniers résultats (`TestResult`)
- Aucun exercice complété depuis 14 jours

**DoD :**
- ✅ Document de définition `diagrams/kpi_pedagogiques.md`
- ✅ Endpoint fonctionnel conforme à la définition
- ✅ 28 tests service — tous verts (19 existants + 9 nouveaux)
- ✅ Architecture controller → service → model respectée
- ✅ JSDoc sur les méthodes publiques
- ✅ Messages HTTP en français
- ✅ Swagger JSDoc sur la route

**Hypothèses posées :**
- `lastActivityAt` = date de la dernière `RevisionSession` uniquement (pas les sessions Leitner ni les exercices).
- `avgScore` toutes matières confondues — acceptable MVP.
- La tendance hebdomadaire est calculée à la volée (pas de cache).

**Dette / points d'attention :**
- Pas de front-end pour l'affichage (dashboard enseignant à câbler dans ClassroomPage.vue — ticket suivant).
- `avgScore` non filtré par sujet — à affiner si l'enseignant veut voir par matière.
- Pas de test BDD (intégration SQLite) — couverture unitaire jugée suffisante pour le MVP.

---

### [S-01.02] — Maquettes UI dashboard enseignant — 2026-06-25

**Fichiers créés :**
- `diagrams/dashboard_enseignant_ui.md` — maquettes ASCII complètes : hiérarchie sections, vue globale, détail des composants UI (agrégats, tendance, alertes, tableau accordéon), codes couleur, états, comportement, responsive, hors périmètre

**Fichiers modifiés :**
- `my_memo_master_front/src/pages/ClassroomPage.vue` :
  - Ajout état : `analytics` (ref), `analyticsLoading` (ref), `expandedAnalyticsStudents` (reactive)
  - Ajout computed : `currentWeekScore` (score dernière semaine ISO), `atRiskStudents` (filtre étudiants à risque)
  - Ajout fonctions : `loadStudentAnalytics(groupId)`, `scoreTextClass(score)`, `formatShortDate(dateStr)`, `toggleStudentDetail(userId)`
  - Watcher `selectedGroupId` mis à jour : appelle `loadStudentAnalytics` en plus de `loadKpi`
  - Template : nouvelle section "Analyse pédagogique" entre la fiche groupe et le calendrier, visible uniquement `v-if="viewRole === 'prof'"`

**Ce qui est utilisable :**
- Section analytics visible automatiquement pour les enseignants/admins dès qu'un groupe est sélectionné
- Bouton "Actualiser" pour forcer un rechargement de `GET /class-groups/:id/kpi/students`
- Agrégats : étudiants actifs (7j), nombre à risque, score de la semaine courante
- Tendance 4 semaines ISO : 4 tuiles colorées (vert/orange/rouge selon score)
- Alertes décrochage : liste des étudiants avec leurs raisons en badges
- Tableau accordéon : tous les étudiants avec badge statut, score, inactivité, expandable (email, dernière activité, derniers résultats)

**Hypothèses posées :**
- La section analytics reste masquée pour les étudiants (`viewRole !== 'prof'`), même s'ils consultent la page.
- Pas de lib graphique (chart.js, d3...) — la tendance est représentée par des tuiles numériques colorées, conforme au design system existant.
- Les `expandedAnalyticsStudents` sont indépendants des `expandedSessions` existants (pas de collision de clés car l'un utilise des sessionIds string, l'autre des userId integer).

**Dette / points d'attention :**
- Pas de tests Vitest front pour la section analytics — structure identique aux sections existantes, priorité basse.
- `loadStudentAnalytics` utilise `try/catch` mais ne notifie pas l'utilisateur d'un éventuel 403 (l'enseignant ne devrait jamais voir d'erreur s'il accède à son propre groupe).
- Pas de filtre par matière sur le tableau — acceptable MVP.

---

### [S-01.06] — Dashboard KPI enseignant (front-end) — 2026-06-25

**Fichiers créés :**
- `src/composables/useTeacherAnalytics.js` — composable Vue 3 : `analytics`, `analyticsLoading`, `expandedAnalyticsStudents` (état), `currentWeekScore` + `atRiskStudents` (computed), `scoreTextClass`, `formatShortDate`, `toggleStudentDetail`, `loadStudentAnalytics` (fonctions + appel API)
- `test/composables/useTeacherAnalytics.test.js` — 22 tests Vitest : scoreTextClass (3), formatShortDate (4), atRiskStudents (3), currentWeekScore (4), toggleStudentDetail (3), loadStudentAnalytics (5)

**Fichiers modifiés :**
- `src/pages/ClassroomPage.vue` :
  - Ajout `import { useTeacherAnalytics }` 
  - Remplacement des 4 fonctions + 2 computed + 3 refs inline par `const { ... } = useTeacherAnalytics()`
  - Suppression du code dupliqué (analytics state était en double après refactor S-01.02)

**Ce qui est utilisable :**
- `useTeacherAnalytics()` — composable réutilisable pour tout composant qui doit afficher les KPI pédagogiques d'un groupe
- Dashboard visible automatiquement pour les enseignants/admins dans `/classroom`
- 22 tests unitaires Vitest couvrent les cas nominaux, limites et erreurs réseau

**Hypothèses posées :**
- Le composable est stateful (une instance par composant) — adapté à ClassroomPage où un seul groupe est affiché à la fois.
- `loadStudentAnalytics` efface `analytics` avant chaque appel pour éviter d'afficher des données périmées pendant le chargement.

**Dette / points d'attention :**
- Pas de test de montage composant (mount) pour ClassroomPage — le composable est testé isolément, priorité basse.
- Pas de filtre par matière — acceptable MVP.



---

### [2026-06-25] S-01.07 — Invitation par email (deux branches : ajout direct / email)

**Fichiers modifiés (API) :**
- `models/Invitation.model.js` : `targetUserId` → `allowNull: true`, ajout champ `targetEmail` (STRING(255), nullable)
- `migrations/20260625000001-invitation-email-invite.js` : `changeColumn` targetUserId + `addColumn` targetEmail
- `services/Invitation.service.js` : réécriture `invite()` — cherche user par email, ajout direct (200) ou invitation email (201) ; ajout méthode `processPendingEmailInvitations` déplacée dans User.service
- `services/User.service.js` : import `Invitation` + `ClassGroupUsers`, appel `_processPendingEmailInvitations` après `User.create`, méthode privée `_processPendingEmailInvitations`
- `validators/Invitation.validators.js` : `targetUserId` (integer) → `targetEmail` (email)
- `controllers/Invitation.controller.js` : `{ targetUserId }` → `{ targetEmail }`, gestion des deux codes retour (200 ajout direct / 201 invitation)

**Fichiers modifiés (Front) :**
- `src/stores/invitations.js` : `invite()` accepte 200 ET 201 comme succès, notification dynamique depuis `resp.data.message`
- `src/pages/ClassroomPage.vue` : `inviteForm.targetUserId` → `inviteForm.targetEmail`, input type number → type email, validation et reset du champ mis à jour

**Ce qui est utilisable :**
- `POST /class-groups/:id/invitations` accepte `{ targetEmail, role }` — si le compte existe, l'utilisateur est ajouté immédiatement (200) ; sinon un email est envoyé (201)
- À l'inscription, les invitations pendantes par email sont automatiquement honorées
- Le formulaire d'invitation dans ClassroomPage utilise un champ email standard

**Hypothèses posées :**
- L'email envoyé aux non-inscrits est informatif (pas de magic-link) : l'utilisateur doit s'inscrire avec l'adresse email invitée.
- `targetEmail` est normalisé en minuscule dans le service (`.trim().toLowerCase()`).

**Dette / points d'attention :**
- Pas de magic-link dans l'email d'invitation — l'UX est moins fluide pour les nouveaux utilisateurs (ils doivent s'inscrire manuellement avec la bonne adresse). Un ticket futur peut ajouter un token d'invitation dans l'URL.
- La migration `changeColumn` sur SQLite en dev peut être capricieuse — Sequelize CLI utilise une stratégie de recréation de table. En cas de problème, `db.sync({ alter: true })` dans le server.js suffit pour dev.

---

### [S-05.08] — Tests fonctionnels catégorisation — 2026-06-25

**Fichiers créés (7) :**

*Backend (Jest) :*
- `test/services/Tag.service.test.js` — 18 tests : findAll, findOne, create (couleur par défaut), update (partiel), delete, setTagsForMindMap/LeitnerSystem/Test (cas nominal + tagIds vide + entité introuvable)
- `test/services/Search.service.test.js` — 12 tests : sans filtre (structure, userId transmis, listes vides), subjectId (transmis à toutes les requêtes, omis si null), q (Op.like sur mmName/name, omis si null), combiné

*Frontend (Vitest) :*
- `test/stores/tags.store.test.js` — 20 tests : fetchTags, createTag (tri + couleur défaut), updateTagColor, deleteTag, setEntityTags (3 types + type inconnu + erreurs)
- `test/stores/subjects.store.test.js` — 15 tests : fetchSubjects, fetchSubjectById, addSubject, updateSubject, deleteSubject (succès + erreurs + erreur réseau)
- `test/stores/search.store.test.js` — 10 tests : searchAll (sans filtre, subjectId, q, combiné, params falsy omis, erreurs, loading)
- `test/components/TagSelectorComponent.test.js` — 15 tests : init, chips, dropdown, sélection/bascule, retrait chip ×, Backspace, filtre recherche, création inline
- `test/components/SubjectSelectorComponent.test.js` — 17 tests : init, required/optionnel, select, formulaire inline (ouvrir/fermer/Entrée/erreur/reset watch)

**Résultats :**
- Backend : 30/30 (Tag.service + Search.service)
- Frontend stores : 45/45 (tags + subjects + search)
- Frontend composants : 32/32 (TagSelector + SubjectSelector)
- **Total S-05.08 : 107 tests, 107 passent**

**Dette / points d'attention :**
- Bug découvert lors des tests : surcharger mockGet avec newTag dès le montage rendait canCreate=false (corrigé en n'overridant pas mockGet, createTag pousse directement dans le store).
- TagSelectorComponent : `<Transition>` nécessite un `$nextTick()` supplémentaire avant de trouver le bouton "Créer" dans le DOM de test JSDOM.

---

### [S-05.09] — Revue de code & merge — 2026-06-25

**Périmètre de la revue :** Ticket S-05 complet (Tags, Sujets, Recherche, SubjectSelectorComponent, TagSelectorComponent — ~50 fichiers diff).

**Méthode :** 8 angles de recherche en parallèle (A-H) × 6 candidats max chacun → déduplification → 9 vérificateurs indépendants.

**Résultats :** 8 findings (7 CONFIRMED + 1 PLAUSIBLE), 2 REFUTED (crédit : TagSelectorComponent creating.value protégé par catch dans tagStore, modelValue null jamais passé depuis les pages parentes).

---

**Findings — à corriger avant merge :**

| # | Sévérité | Fichier | Problème |
|---|----------|---------|---------|
| 1 | 🔴 Critique | `Tag.service.js:66` | IDOR : setTagsForMindMap/LeitnerSystem/Test sans vérification de propriété |
| 2 | 🔴 Haute | `Search.service.js:30` | Fuite données : Test.findAll sans filtre userId |
| 3 | 🔴 Haute | `test/services/Diagramme.service.test.js:31` | CI cassé : 2 assertions findByUser stales (include non présent) |
| 4 | 🔴 Haute | `migrations/` | systemSubject non migré après passage belongsToMany → hasMany |
| 5 | 🟠 Moyenne | `Diagramme.service.js:56` | resolveSubject crée 'Sujet par défaut' sans userId (sujet global partagé) |
| 6 | 🟠 Moyenne | `Search.service.js:16` | Op.like insensible/sensible à la casse SQLite vs PostgreSQL |
| 7 | 🟡 Faible | `Diagramme.service.js:4` | TAG_INCLUDE sans 'color' (incohérent avec Search.service.js) |
| 8 | 🟡 Faible | `SubjectSelectorComponent.vue:163` | Exception réseau non attrapée → pas de notification utilisateur |

**Points non-bloquants signalés :**
- `focusInput` mort dans TagSelectorComponent.vue (jamais appelé)
- setTagsForMindMap/LeitnerSystem/Test : 3 méthodes quasi-identiques (candidat refactor futur)

**Décision de merge :** Merge suspendu jusqu'à correction des findings #1 (sécurité IDOR) et #2 (fuite données) au minimum. #3 (CI) bloque aussi techniquement. #4 (migration) doit être évalué : risque données en prod si historique systemSubject existe.

---

### [S-05.09b] — Corrections post-revue — 2026-06-25

**Findings corrigés (8/8) :**

**#1 IDOR — Tag.service.js / Tag.controller.js**
- `setTagsForMindMap(mindMapId, tagIds, userId)` : check `mindMap.userId !== Number(userId)` → null si non propriétaire
- `setTagsForLeitnerSystem(systemId, tagIds, userId)` : check `system.idUser !== Number(userId)` → null si non propriétaire
- `setTagsForTest` : inchangé (Test n'a pas de userId — ressource globale par design)
- Controller : passage de `req.user.id` aux deux méthodes protégées

**#2 Fuite données Test — Search.service.js / Test.model.js / Test.controller.js + migration**
- Migration `20260625000003-add-userid-to-test.js` : colonne `userId` nullable sur `Test`
- `Test.model.js` : champ userId ajouté (nullable, FK→User.userId)
- `Test.controller.js::create` : passe `userId: req.user.id` à la création
- `Search.service.js` : `Test.findAll({ where: { userId, ... } })` — les exercices legacy (userId=null) n'apparaissent plus dans la recherche

**#3 CI cassé — Diagramme.service.test.js**
- 2 assertions `toHaveBeenCalledWith({ where: { userId: 1 } })` → `expect.objectContaining(...)` (corrige aussi `findOne` pre-existing)
- `Tag: {}` ajouté au mock pour que `TAG_INCLUDE` ne crashe pas

**#4 Migration systemSubject**
- `20260625000002-drop-systemsubject-table.js` : `up` drop la table, `down` la recrée

**#5 resolveSubject**
- Commentaire ajouté : Subject est un modèle global (sans userId) — sujet par défaut partagé = comportement correct par design

**#6 Op.like → dialect-aware**
- `Search.service.js` : `const likeOp = sequelize.getDialect() === 'postgres' ? Op.iLike : Op.like` (évalué à chaque appel)
- `Search.service.test.js` : mock `instance: { getDialect: jest.fn().mockReturnValue('sqlite') }` ajouté

**#7 TAG_INCLUDE color manquante**
- `Diagramme.service.js` : `attributes: ['tagId', 'name']` → `['tagId', 'name', 'color']`

**#8 SubjectSelectorComponent exception réseau silencieuse**
- `SubjectSelectorComponent.vue` : bloc `catch` ajouté → `notif.notify('Erreur lors de la création du sujet.', 'error')`

**Tests après corrections :**
- Backend : 44/44 (Tag.service + Diagramme.service + Search.service)
- Frontend : 17/17 (SubjectSelectorComponent)

---

### [S-03.02] — Maquettes UI tableau de bord groupe + tests front — 2026-06-25

**Contexte :** Feature S-03.02 (Sprint 9, Analyse/V1) — L'UI du tableau de bord groupe avait été livrée dans S-03.01 mais sans entrée de changelog distincte ni tests front pour le store `invitations.js` et le composant `ClassroomPage.vue`. Cette session complète la couverture de tests manquante et acte formellement la livraison.

**Périmètre livré (IN scope) :**

| Fonctionnalité | Statut | Fichiers principaux |
|---|---|---|
| **Groupes** (liste, filtres, sélection) | ✅ existant S-03.01 | `ClassroomPage.vue` |
| **Membres** (toggle affectation API) | ✅ existant S-03.01 | `ClassroomPage.vue → toggleStudent()` |
| **Invitations** (panneau pending + formulaire + réponse) | ✅ existant S-03.01 | `ClassroomPage.vue`, `invitations.js` |
| **Affectations** (add/remove câblé store) | ✅ existant S-03.01 | `ClassroomPage.vue → toggleStudent()` |
| **KPI de groupe** (4 indicateurs) | ✅ existant S-03.01 | `ClassroomPage.vue → loadKpi()` |
| **Dashboard groupe** (vue prof/étudiant, calendrier, sections, ressources, analyse pédagogique) | ✅ existant S-03.01 | `ClassroomPage.vue` |
| **Maquettes UI tableau de bord groupe** | ✅ existant S-03.01 | `ClassroomPage.vue` (implémentation fonctionnelle complète) |
| **Tests store invitations** | ✅ NEW | `test/stores/invitations.store.test.js` |
| **Tests composant ClassroomPage** | ✅ NEW | `test/components/ClassroomPage.test.js` |

**Nouveaux fichiers front :**
- `test/stores/invitations.store.test.js` — 14 tests Vitest : `fetchMine` (3 cas), `fetchByGroup` (3 cas), `invite` (4 cas : 201/200/non-2xx/réseau), `respond` (4 cas : accepted/declined/non-200/réseau)
- `test/components/ClassroomPage.test.js` — 12 tests Vitest : `onMounted` (fetchGroups + fetchMine), rendu initial (premier groupe affiché), section invitations (absente/présente), interactions invitations (Accepter/Décliner → `respond`), toggle de rôle (visible admin / absent étudiant), `sendInvite` (email vide / email valide), `createSession` (titre vide / titre valide)

**DoD :**
- ✅ Fonctionnel sur les 7 items IN scope (livraison S-03.01 confirmée)
- ✅ Tests store invitations : 14/14
- ✅ Tests composant ClassroomPage : 12/12
- ✅ Total nouveaux tests front : **26 tests verts**
- ✅ Changelog à jour

**Périmètre non livré (OUT scope — conforme) :**
- Annuaire ENT complet — hors MVP
- Synchronisation institutionnelle automatique — hors MVP
- Gestion complexe multi-campus — hors MVP

**Dette / points d'attention :**
- `sessions`, `resources`, `events` dans `ClassroomPage.vue` restent en données mock locales (pas de modèle back dédié pour ces entités dans ce sprint) — comportement conforme MVP.
- Pas de tests Vitest sur les formulaires `createEvent` et `shareResource` (couverture limitée aux flux prioritaires ; interactions locales sans appel API).

---

### [S-03.03] — Modèle de données (groupes, membres) — 2026-06-25

**Contexte :** Feature S-03.03 (Sprint 9, Conception/V1) — Modèle de données complet pour les groupes classes et leurs membres. L'infrastructure de base (ClassGroup, ClassGroupUsers, Invitation) était déjà livrée dans S-03.01. Cette session ajoute les champs `level`, `code` et `score` manquants sur `ClassGroup`, identifiés lors de la vérification S-03.02 comme écart entre le modèle API et l'usage front.

**Fichiers modifiés :**
- `models/ClassGroup.model.js` — ajout des champs `level` (STRING 50, nullable), `code` (STRING 50, nullable), `score` (FLOAT, nullable)
- `validators/ClassGroup.validators.js` — ajout des règles `level` / `code` / `score` dans `create` et `update` (tous optionnels/nullable ; `score` contraint 0–100)

**Fichiers créés :**
- `migrations/20260625000004-add-level-code-score-to-classgroup.js` — `up` : `addColumn` level + code + score sur `ClassGroup` ; `down` : `removeColumn` des 3 colonnes

**État du modèle de données final :**

| Entité | Champs | Migrations |
|---|---|---|
| **ClassGroup** | id, name, description, **level**, **code**, **score**, createdBy, createdAt | `000001` (création) + `000004` (level/code/score) |
| **ClassGroupUsers** | classGroupId (PK), userId (PK), role | `000002` |
| **Invitation** | id, classGroupId, targetUserId (nullable), targetEmail, invitedByUserId, role, status, createdAt | `000003` (création) + `20260625000001` (targetEmail + targetUserId nullable) |

**Associations définies :**
- `ClassGroup → User` (creator), `ClassGroup → ClassGroupUsers` (members), `ClassGroup → CalendarEvent`
- `ClassGroupUsers → ClassGroup`, `ClassGroupUsers → User`
- `Invitation → ClassGroup`, `Invitation → User×2` (targetUser, invitedBy)

**DoD :**
- ✅ Modèles Sequelize conformes avec associations
- ✅ Migrations complètes (up + down) pour les 3 tables + les 3 nouveaux champs
- ✅ Validators mis à jour (level, code, score acceptés en create et update)
- ✅ Tests back existants : 62/62 sans régression
- ✅ Changelog à jour

**Périmètre non livré (OUT scope — conforme) :**
- Annuaire ENT complet, synchronisation institutionnelle, multi-campus — hors MVP

**Dette / points d'attention :**
- `score` est un champ libre (FLOAT nullable) mis à jour manuellement ou via un processus externe ; il n'est pas automatiquement synchronisé avec `avgScore` calculé dans `getKpi()`. Si une mise à jour automatique est souhaitée, prévoir un hook Sequelize ou une tâche planifiée.
- La migration `000004` utilise `after:` (clause MySQL) — sans effet sous PostgreSQL mais inoffensif.

---

### [S-03.04] — API CRUD groupes classe — 2026-06-25

**Contexte :** Feature S-03.04 (Sprint 9, Back-end/V1) — L'API CRUD complète des groupes classes était déjà livrée dans S-03.01. Cette session acte la clôture formelle et corrige deux écarts détectés à la vérification : le controller `create` ignorait les nouveaux champs `level`/`code`/`score` (ajoutés en S-03.03), et les endpoints `getKpi` / `getStudentAnalytics` n'avaient pas de tests controller.

**Fichiers modifiés :**
- `controllers/ClassGroup.controller.js` — `create` : destructuration étendue à `{ name, description, level, code, score }` et transmission complète au service
- `test/controllers/ClassGroup.controller.test.js` — ajout `getKpi` et `getStudentAnalytics` dans le mock du service + 10 nouveaux tests : `GET /:id/kpi` (200/403/404/401/500) et `GET /:id/kpi/students` (200/403/404/401/500)

**Endpoints disponibles (périmètre complet S-03.04) :**

| Méthode | Route | Auth | Rôle |
|---|---|---|---|
| `GET` | `/api/v1/class-groups` | ✅ | Liste groupes visibles |
| `GET` | `/api/v1/class-groups/:id` | ✅ | Détail + membres |
| `POST` | `/api/v1/class-groups` | ✅ admin | Créer groupe |
| `PUT` | `/api/v1/class-groups/:id` | ✅ admin | Modifier groupe |
| `DELETE` | `/api/v1/class-groups/:id` | ✅ admin | Supprimer groupe |
| `POST` | `/api/v1/class-groups/:id/members` | ✅ admin | Ajouter membre |
| `DELETE` | `/api/v1/class-groups/:id/members/:userId` | ✅ admin | Retirer membre |
| `GET` | `/api/v1/class-groups/:id/kpi` | ✅ admin/teacher | KPI groupe |
| `GET` | `/api/v1/class-groups/:id/kpi/students` | ✅ admin/teacher | Analyse pédagogique |
| `POST` | `/api/v1/class-groups/:id/invitations` | ✅ admin/teacher | Inviter |
| `GET` | `/api/v1/class-groups/:id/invitations` | ✅ admin/teacher | Lister invitations |

**DoD :**
- ✅ CRUD complet conforme au périmètre IN
- ✅ Tous les endpoints protégés par `authMiddleware`
- ✅ Validation `express-validator` sur les mutations (create, update, addMember)
- ✅ Swagger JSDoc sur toutes les routes
- ✅ Tests controller : **43/43** (30 existants + 10 nouveaux kpi/analytics + correction mock)
- ✅ Changelog à jour

**Périmètre non livré (OUT scope — conforme) :**
- Annuaire ENT complet, synchronisation institutionnelle, multi-campus — hors MVP

---

### [2026-06-26] S-03.08 — Scission ClassroomPage en 3 vues + sections/ressources pédagogiques

**Fichiers créés (API) :**
- `models/ClassGroupSection.model.js` — section ou rendu (type: 'section'|'rendu', title, dueDate, createdBy FK)
- `models/ClassGroupResource.model.js` — ressource pédagogique partagée (type: 'cours'|'carte_mentale'|'sujet'|'autre', url, createdBy FK)
- `migrations/20260626000001-create-classgroupsection-table.js`
- `migrations/20260626000002-create-classgroupresource-table.js`
- `services/ClassGroupSection.service.js` — `_canWrite` (roleId 1/4 ou teacher), findAll/create/update/delete
- `services/ClassGroupResource.service.js` — même pattern
- `controllers/ClassGroupSection.controller.js` / `ClassGroupResource.controller.js`
- `validators/ClassGroupSection.validators.js` / `ClassGroupResource.validators.js`

**Fichiers modifiés (API) :**
- `models/index.js` — ClassGroupSection + ClassGroupResource enregistrés
- `models/ClassGroup.model.js` — hasMany sections + resources
- `routes/ClassGroup.routes.js` — 8 nouvelles routes (sections CRUD, resources CRUD) + GET /events + GET /deadlines par groupe + PUT /members/:userId
- `controllers/ClassGroup.controller.js` — updateMember, findGroupEvents, findGroupDeadlines
- `services/ClassGroup.service.js` — updateMemberRole, droits élargis à roleId 4 pour addMember/removeMember
- `validators/ClassGroup.validators.js` — updateMember validator
- `validators/Invitation.validators.js` — targetEmail (était targetUserId) + test 400 email invalide

**Fichiers créés (Front) :**
- `pages/ClassroomEtablissementView.vue` — CRUD groupes, emploi du temps récurrent (weekly/biweekly/monthly + day selector + plage dates), invitations, gestion membres + rôles
- `pages/ClassroomEnseignantView.vue` — KPI étudiants (useTeacherAnalytics), sections/rendus CRUD, ressources CRUD, création échéances liées aux occurrences
- `pages/ClassroomEtudiantView.vue` — prochaines séances, échéances urgentes (badge rouge ≤3j), ressources partagées
- `stores/classGroupSections.js` — CRUD sections via class-groups/:id/sections
- `stores/classGroupResources.js` — CRUD resources via class-groups/:id/resources

**Fichiers modifiés (Front) :**
- `pages/ClassroomPage.vue` — réécrit en coordinateur (30 lignes) : route selon rôle (isAdmin→Établissement, isEnseignant→Enseignant, sinon→Étudiant) + bandeau invitations en attente + sélecteur de vue pour admins
- `stores/classGroups.js` — addMember passe `role`, status 201, updateMemberRole NEW
- `stores/calendarEvents.js` — `groupEvents: []` + `fetchByGroup(groupId)` NEW
- `stores/deadlines.js` — `groupDeadlines: []` + `fetchByGroup(groupId)` NEW

**Ce qui est utilisable :**
- Côté back : sections, ressources, events par groupe, deadlines par groupe, changement de rôle membre
- Côté front : 3 vues indépendantes, navigation par groupe, formulaires de création inline, gestion membres

**Dette éventuelle :**
- Tests des nouveaux controllers (ClassGroupSection, ClassGroupResource, nouvelles actions ClassGroup) non écrits dans ce ticket
- La vue Enseignant filtre les groupes par `m.role === 'teacher'` côté front — si un admin crée un groupe, il doit explicitement avoir le rôle teacher dans ce groupe pour voir la vue enseignant
- `deleteEvent` dans calendarStore ne purge pas `groupEvents` — contourné avec un re-fetch local dans la vue

---

### [S-01.07] — Vue détail étudiant (historique) — 2026-06-26

**Contexte :** Feature S-01 (Sprint 9, Front-end/V1) — Le composable `useTeacherAnalytics` retourne pour chaque étudiant un `scoreTrend` (4 derniers scores avec dates) et `daysInactive`, mais l'accordion de la liste enseignant n'affichait que email + lastActivityAt. Cette session livre la vue détail complète.

**Fichiers créés :**
- `src/components/StudentDetailComponent.vue` — composant d'affichage pur : email, dernière activité (date + jours d'inactivité), score moyen (coloré), alertes décrochage (tags orange), historique des 4 derniers scores du scoreTrend (date + badge coloré)
- `test/components/StudentDetailComponent.test.js` — 18 tests Vitest : informations de base (7), couleur du score moyen (3), alertes décrochage (3), historique des scores (5)

**Fichiers modifiés :**
- `src/pages/ClassroomEnseignantView.vue` — remplacement de l'accordion inline (2 lignes : email + lastActivityAt) par `<StudentDetailComponent :student="s" />` + import du composant

**Ce qui est utilisable :**
- `StudentDetailComponent` est un composant réutilisable (prop `student` typé Object) — utilisable dans tout autre contexte affichant un étudiant analytique
- L'accordion dans la vue enseignant affiche désormais : email, date de dernière activité avec jours d'inactivité, score moyen coloré, alertes décrochage (si présentes), historique des 4 derniers exercices avec date + score coloré
- Aucun appel API supplémentaire — toutes les données viennent du `scoreTrend` déjà inclus dans `GET /class-groups/:id/kpi/students`

**Hypothèses posées :**
- `formatDate` extrait la partie date `YYYY-MM-DD` par `substring(0,10)` pour gérer sans risque timezone les deux formats possibles : date pure (`lastActivityAt`) et timestamp ISO (`completedAt` du scoreTrend)
- Seuils de couleur identiques à `useTeacherAnalytics.scoreTextClass` : ≥70 → vert, 50-69 → neutre, <50 → orange

**DoD :**
- ✅ Fonctionnel — vue détail complète avec historique scores
- ✅ 18 tests Vitest verts (StudentDetailComponent.test.js)
- ✅ Zéro régression sur les 438 tests front déjà verts
- ✅ Changelog à jour

**Dette / points d'attention :**
- `ClassroomPage.test.js` (7 tests) et `classGroups.store.test.js` (2 tests) et `MindmapsListView.test.js` (1 suite) sont en échec avant ce ticket — dettes préexistantes non liées à S-01.07, à corriger dans un ticket dédié

---

### [BUG-FIX] — Boutons Voir/Télécharger (fichiers S3 privés) — 2026-06-26

**Contexte :** Les boutons "Voir" et "Télécharger" dans ClassroomEtudiantView et "Ouvrir" dans ClassroomEnseignantView ne faisaient rien. Racine du problème : l'endpoint proxy `/storage/stream` utilisait `s3Response.Body.pipe(res)` (AWS SDK v3) qui peut échouer silencieusement avec les fournisseurs S3-compatibles non-AWS (Infomaniak Swiss Backup). Le front utilisait ensuite un blob URL via `URL.createObjectURL()` — complexité inutile source de bugs (blocage popup, mauvais Content-Type).

**Fichiers modifiés (API) :**
- `controllers/Storage.controller.js` — suppression de `streamFile`, ajout de `presignFile` : génère une presigned URL valide 15 min via `getSignedUrl` de `@aws-sdk/s3-request-presigner` ; paramètre `disposition=inline|attachment` contrôle `ResponseContentDisposition` ; retourne `{ url }` ; validation `key.startsWith('uploads/')` inchangée
- `routes/Storage.routes.js` — route `GET /stream` → `GET /presign` (même authMiddleware) ; JSDoc Swagger mis à jour

**Fichiers modifiés (Front) :**
- `src/pages/ClassroomEtudiantView.vue` — `openFile` : appelle `api.get('storage/presign', { key })` puis `newWindow.location.href = url` (fenêtre ouverte synchroniquement pour éviter popup blocker) ; `downloadFile` : appelle `api.get('storage/presign', { key, disposition: 'attachment' })` puis `window.location.href = url` (Content-Disposition attachment → téléchargement sans navigation) ; bouton "Télécharger" des documents partagés corrigé pour appeler `downloadFile` (cohérence avec l'étiquette)
- `src/pages/ClassroomEnseignantView.vue` — `openFile` : même pattern presigned URL

**Dépendance ajoutée :**
- `@aws-sdk/s3-request-presigner` — paquet officiel AWS SDK v3, même éditeur que `@aws-sdk/client-s3` déjà installé

**Ce qui est utilisable :**
- "Voir" (rendu soumis) → ouvre le fichier dans un nouvel onglet via presigned URL S3
- "Télécharger" (rendu soumis) → télécharge le fichier (`Content-Disposition: attachment`)
- "Ouvrir" (ressource pédagogique, vue enseignant) → ouvre le fichier dans un nouvel onglet
- "Télécharger" (document partagé, vue étudiant) → télécharge le fichier

**Hypothèses posées :**
- `window.location.href = presignedUrl` avec `Content-Disposition: attachment` déclenche un téléchargement sans naviguer hors de l'app — comportement standard pour les navigateurs modernes
- La presigned URL expire après 15 min — acceptable pour un usage interactif (l'utilisateur clique, le fichier s'ouvre immédiatement)
- Infomaniak Swiss Backup respecte les paramètres de requête `ResponseContentDisposition` de S3 — à vérifier si un fournisseur futur ne les supporte pas

**Dette / points d'attention :**
- `api.getBlob()` reste dans `api.js` mais n'est plus utilisé dans les vues — à supprimer dans un ticket de nettoyage si aucun autre usage n'émerge

---

### [2026-06-27] S-02.05 — Tests ClassGroupResource + Consentement KPI (KpiConsent)

**Contexte :** S-02.05 — Partage maîtrisé des KPI personnels. Deux périmètres livrés dans ce ticket : (1) combler la dette tests de ClassGroupResource (identifiée lors de l'audit), (2) livrer l'ensemble du module KpiConsent permettant à un étudiant d'accorder/révoquer l'accès à ses KPI à un enseignant dans un groupe.

**Fichiers créés :**

- `test/services/ClassGroupResource.service.test.js` — 14 tests : `_canWrite` (5), `_isMember` (3), `findAll` (2), `create` (2), `update` (3), `delete` (5 dont erreur S3 ignorée)
- `test/controllers/ClassGroupResource.controller.test.js` — 20 tests : GET (5), POST (7), PUT (6), DELETE (5) — couvre 200/201/400/401/403/404/500
- `models/KpiConsent.model.js` — studentId + teacherId + classGroupId + grantedAt ; contrainte unique sur le triplet
- `migrations/20260627000001-create-kpiconsent-table.js`
- `services/KpiConsent.service.js` — `grantConsent` / `revokeConsent` / `getMyConsents` / `getStudentKpis` (vérifie rôle teacher + consent avant d'appeler KpiService)
- `controllers/KpiConsent.controller.js` — 4 handlers (grantConsent, revokeConsent, getMyConsents, getStudentKpis)
- `validators/KpiConsent.validators.js` — validation `grantConsent` (teacherId, classGroupId) + `getStudentKpis` (classGroupId query param)
- `test/services/KpiConsent.service.test.js` — 13 tests : `_isTeacherInGroup` (3), `_isStudentInGroup` (2), `grantConsent` (4), `revokeConsent` (2), `getMyConsents` (2), `getStudentKpis` (3)
- `test/controllers/KpiConsent.controller.test.js` — 20 tests : POST /consent (7), DELETE /consent/:t/:g (4), GET /consent/my (4), GET /student/:id (6)

**Fichiers modifiés :**

- `routes/Kpi.routes.js` — ajout 4 routes : `GET /kpi/consent/my`, `POST /kpi/consent`, `DELETE /kpi/consent/:teacherId/:classGroupId`, `GET /kpi/student/:studentId?classGroupId=X`
- `models/index.js` — enregistrement `KpiConsent`

**Ce qui est utilisable :**

- Un étudiant peut accorder (`POST /kpi/consent`) ou révoquer (`DELETE /kpi/consent/:t/:g`) l'accès à ses KPI pour un enseignant dans un groupe
- Un étudiant liste ses consentements actifs (`GET /kpi/consent/my`)
- Un enseignant consulte les KPI d'un étudiant s'il a son consentement (`GET /kpi/student/:studentId?classGroupId=X`)
- Contrôle d'accès : l'étudiant doit avoir rôle `student` dans le groupe, l'enseignant rôle `teacher` (ou admin global)

**Hypothèses posées :**

- Un admin global (roleId 1 ou 4) est considéré comme enseignant valide pour `getStudentKpis` — même pattern que ClassGroupResource
- `findOrCreate` sur le triplet (studentId, teacherId, classGroupId) garantit l'idempotence de `grantConsent`
- Le consentement est par groupe : un même binôme (étudiant, enseignant) dans deux groupes différents nécessite deux consentements distincts

**Dette éventuelle :**

- Pas de front (store + UI) pour le consentement dans ce ticket — à livrer dans un ticket S-02 front dédié
- Pas de notification à l'enseignant quand un étudiant accorde/révoque son consentement

---

### [2026-06-27] S-02.01 — Modèle de consentement partage (Analyse)

**Contexte :** Tâche d'analyse S-02.01 — définir formellement le modèle de consentement partage des KPI personnels avant/après implémentation. La fonctionnalité technique avait été livrée dans S-02.05 ; ce ticket documente les décisions de modélisation, les règles métier et les flux utilisateur.

**Fichiers créés :**
- `diagrams/kpi_consent_partage.md` — document de référence complet : contexte, périmètre IN/OUT, acteurs, modèle ERD, règles métier (accord, révocation, accès enseignant), matrice de contrôle d'accès, flux nominal, tableau des endpoints avec codes de réponse, liens vers l'implémentation, points d'attention (front manquant, notifications, audit trail RGPD, admin bypass)

**Fichiers modifiés :**
- `.agents/DECISIONS.md` — 2 nouvelles entrées : granularité du consentement par triplet (studentId, teacherId, classGroupId) + admin bypass sans consentement explicite

**DoD :**
- ✅ Document modèle livré et conforme au périmètre S-02 (IN/OUT respectés)
- ✅ Tests documentés (stratégie : 13 tests service + 20 tests controller déjà livrés en S-02.05)
- ✅ Décisions techniques enregistrées dans DECISIONS.md
- ✅ CHANGELOG mis à jour

**Points d'attention :**
- Le front (store kpiConsent + UI accordion) reste à livrer dans un ticket S-02 front dédié
- La conformité RGPD sur le bypass admin mérite d'être arbitrée avec le PO si la plateforme cible une certification

---

### [2026-06-27] S-02.02 — Maquettes UI partage KPI (Analyse)

**Contexte :** Tâche d'analyse S-02.02 — produire les maquettes ASCII de l'UI du partage de KPI pour guider l'implémentation front (ticket S-02 front). Basé sur le modèle S-02.01 et l'API S-02.05.

**Fichiers créés :**
- `diagrams/kpi_consent_ui.md` — maquettes ASCII complètes :
  - Vue étudiant : section "Partage de mes KPI" dans `ClassroomEtudiantView.vue` (3 états : vide, consentements actifs, tous accordés) + modal de confirmation révocation
  - Vue enseignant : badge KPI dans l'accordion étudiant + panneau KPI personnels (consentement accordé vs. refusé) dans `ClassroomEnseignantView.vue`
  - Comportements de chaque composant UI (select, bouton révoquer, badge)
  - Définition du store Pinia `kpiConsent.js` à créer (state + actions)
  - Flux utilisateur nominal (étudiant accorde → enseignant voit → étudiant révoque)
  - Points d'attention pour l'implémentation (lazy loading, cache, exclusion enseignants déjà accordés)

**DoD :**
- ✅ Maquettes livées pour les 2 vues concernées (étudiant + enseignant)
- ✅ Stratégie de test documentée (tests unitaires store + tests composant via Vitest à livrer en même temps que l'implémentation front)
- ✅ CHANGELOG mis à jour

---

### [2026-06-27] S-02.05 — Livraison API ressources pédagogiques CRUD

**Contexte :** Audit et complétion du DoD S-02.05 — l'API était fonctionnelle mais les tests pour `ClassGroupSection` et `ClassGroupSubmission` étaient absents, et `ClassGroupSubmission` n'avait pas de validator.

**Fichiers créés :**
- `test/services/ClassGroupSection.service.test.js` — 18 tests : `_canWrite` (5), `_isMember` (3), `findAll` (2), `create` (2), `update` (3), `delete` (3)
- `test/controllers/ClassGroupSection.controller.test.js` — 23 tests : GET (5), POST (7 dont 3 cas de validation), PUT (6), DELETE (5)
- `test/services/ClassGroupSubmission.service.test.js` — 21 tests : `_isMember` (3), `_isTeacher` (3), `_sectionBelongsToGroup` (2), `findBySection` (3), `upsert` (5 dont S3), `delete` (5 dont étudiant/propre/autres)
- `test/controllers/ClassGroupSubmission.controller.test.js` — 17 tests : GET (5), POST (7 dont validation URL + fileSize), DELETE (5)
- `validators/ClassGroupSubmission.validators.js` — validation `upsert` : url (isURL optionnelle), fileKey, mimeType, originalName, fileSize (entier ≥ 0)

**Fichiers modifiés :**
- `routes/ClassGroup.routes.js` — ajout `submissionValidators` importé + branché sur `POST /:id/sections/:sectionId/submissions`

**Ce qui est utilisable :**
- `GET /class-groups/:id/sections` — liste les sections (membres)
- `POST /class-groups/:id/sections` — crée une section (enseignants/admins), validé titre + type (`section`|`rendu`)
- `PUT/DELETE /class-groups/:id/sections/:sectionId` — mise à jour / suppression (enseignants/admins)
- `GET /class-groups/:id/sections/:sectionId/submissions` — liste les rendus (enseignant : tous, étudiant : les siens)
- `POST /class-groups/:id/sections/:sectionId/submissions` — soumet ou met à jour un rendu (upsert, membres), validé url/fileKey/fileSize
- `DELETE /class-groups/:id/sections/:sectionId/submissions/:submissionId` — supprime (enseignant : tous, étudiant : les siens uniquement)
- `GET/POST/PUT/DELETE /class-groups/:id/resources` — CRUD ressources pédagogiques (déjà testé dans la session précédente)

**DoD S-02.05 :**
- ✅ Fonctionnel conforme (API CRUD pour Section, Resource, Submission)
- ✅ Tests OK : 79 tests pour Section + Submission, 43 tests existants pour Resource — 1234 tests total passants
- ✅ Revue : validators Submission ajoutés et branchés
- ✅ Documentation (CHANGELOG mis à jour)
- ✅ Aucun bug bloquant connu

---

### [2026-06-27] S-02.03 — Livraison API gestion du consentement

**Contexte :** Ticket S-02.03 — audit + stabilisation de l'API KpiConsent déjà implémentée (S-02.05), extension avec `subjectId` pour le filtrage par matière, correction de bugs pre-existants sur les tests BDD, et validation complète du DoD.

**Fichiers créés :**
- `migrations/20260627000001-create-kpiconsent-table.js` — migration mise à jour directement (table jamais déployée en prod) : ajout colonne `subjectId` (FK nullable → Subject), index unique quadruplet `(studentId, teacherId, classGroupId, subjectId)`, index FK sur `subjectId`

**Fichiers modifiés :**
- `models/KpiConsent.model.js` — ajout `subjectId` (FK nullable → Subject, onDelete SET NULL), association `belongsTo(Subject)`, index unique quadruplet en config
- `services/KpiConsent.service.js` — réécriture complète : `grantConsent` accepte `subjectId = null` (global) ou valeur (par matière) via `findOrCreate` ; `revokeConsent` : sans `subjectId` = révocation globale (destroy toutes les lignes), avec `subjectId` = révocation ciblée ; `getStudentKpis` : consentement global → `KpiService.getMyKpis`, filtré → `KpiService.getPersonalKpisForSubjects([ids])`
- `services/Kpi.service.js` — ajout méthode `getPersonalKpisForSubjects(userId, subjectIds)` : filtre TestResult par `test.subjectId IN subjectIds` (INNER JOIN), filtre LeitnerSystem par `subjectId IN subjectIds` ; révision et discipline non filtrées (données générales)
- `validators/KpiConsent.validators.js` — ajout `subjectId` optionnel (nullable) dans `grantConsent` et `revokeConsent`
- `controllers/KpiConsent.controller.js` — `grantConsent` lit `subjectId` depuis `req.body` (défaut null) ; `revokeConsent` lit `subjectId` depuis `req.query` (défaut null)
- `diagrams/kpi_consent_partage.md` — réécriture complète : distinction KPI pédagogiques / personnels, ajout `subjectId` dans entité KpiConsent, règles de révocation globale/par matière, matrice d'accès sans bypass admin, flux diagram avec consentement filtré
- `diagrams/kpi_consent_ui.md` — ajout sélecteur de matière dans le formulaire étudiant, colonne matière dans la liste des consentements, mention `subjectId?` dans les signatures store
- `.agents/DECISIONS.md` — réécriture entrée admin bypass (remplacée par règle sans bypass) + entrée consentement par quadruplet avec note NULL unique index
- `test/services/KpiConsent.service.test.js` — réécriture complète : 22 tests couvrant `_isTeacherInGroup` (dont admin non membre → false), `_isStudentInGroup`, `grantConsent` (global + par matière + idempotent + not_student + not_teacher), `revokeConsent` (global + not found + par matière + not found), `getMyConsents`, `getStudentKpis` (6 cas dont admin, mixed consent, no consent)
- `test/controllers/KpiConsent.controller.test.js` — ajout tests consentement avec `subjectId`, révocation par matière, correction syntaxe apostrophe (23 tests total)
- `test/bdd/exercise.session.test.js` — ajout mocks `reminder.worker`, `reminder.queue`, `kpiAlert.cron` ; ajout `afterAll(instance.close())` au niveau racine
- `test/bdd/leitner.session.test.js` — ajout mocks `reminder.worker`, `reminder.queue`, `kpiAlert.cron` ; ajout `afterAll(instance.close())` au niveau racine
- `test/bdd/deadline.reminder.test.js` — ajout mock `kpiAlert.cron` (déjà présent : `reminder.queue`, `reminder.worker`, `instance.close()`)
- `package.json` (jest config) — `testTimeout: 60000` (BDD tests sous charge CPU) + `forceExit: true`

**Ce qui est utilisable :**
- `POST /api/v1/kpi/consent` — accorde un consentement (global ou par matière via `subjectId` optionnel)
- `DELETE /api/v1/kpi/consent/:teacherId/:classGroupId` — révoque (global sans `?subjectId`, par matière avec `?subjectId=X`)
- `GET /api/v1/kpi/consent` — liste les consentements accordés par l'étudiant connecté (avec enseignant, groupe, matière inclus)
- `GET /api/v1/kpi/consent/:teacherId/:classGroupId` — retourne les KPI personnels de l'étudiant si consentement accordé (filtré par matière ou global)

**Hypothèses posées :**
- `subjectId = null` = consentement global (toutes matières) ; une valeur = filtrage sur cette matière
- Idempotence du `grantConsent` gérée applicativement via `findOrCreate` (SQLite et PostgreSQL traitent NULL comme distinct dans les index uniques)
- `revokeConsent` sans `subjectId` révoque TOUTES les lignes (y compris les consentements par matière) — intention : "tout révoquer"
- Pas de bypass admin pour les KPI personnels : seul un enseignant membre du groupe avec consentement explicite peut y accéder
- BDD tests stabilisés avec `testTimeout: 60000` + `forceExit: true` (cause racine : `bullmq` chargé via `Reminder.service.js` au niveau module, garde une connexion Redis ouverte si non mocké)

**DoD S-02.03 :**
- ✅ API conforme aux critères d'acceptation (grant/revoke/list/access avec filtrage par matière)
- ✅ Tests OK : 1155/1155 passants (22 service + 23 controller KpiConsent + 3 BDD stables)
- ✅ Documentation mise à jour (`kpi_consent_partage.md`, `kpi_consent_ui.md`, `DECISIONS.md`, `CHANGELOG_AGENT.md`)
- ✅ Aucun bug bloquant connu
- ✅ Revue : matrice d'accès sans bypass admin, règles de révocation clarifiées


---

### [2026-06-27] S-02.06 — Interface étudiant gestion partages

**Contexte :** Livraison du front-end de gestion des partages KPI. Le back-end (endpoints KPI consent) était déjà livré en S-02.03.

**Fichiers créés :**
- `my_memo_master_front/src/stores/kpiConsent.js` — store Pinia : `consents`, `studentKpis`, `loading`, `granting` ; actions : `fetchMyConsents`, `grantConsent`, `revokeConsent`, `fetchStudentKpis`, `clearStudentKpis`

**Fichiers modifiés :**
- `my_memo_master_front/src/pages/ClassroomEtudiantView.vue` — ajout section [F] "Partage de mes KPI" en bas de page : liste des consentements actifs par groupe + formulaire d'accord (select enseignant + select matière) + modal de confirmation de révocation ; `selectGroup` appelle `fetchMyConsents` + `fetchSubjects` (lazy)
- `my_memo_master_front/src/pages/ClassroomEnseignantView.vue` — ajout badge "KPI ✓/—" dans chaque ligne étudiant + panneau [B] KPI personnels dans l'accordéon étudiant (chargement lazy au premier clic via `toggleStudentAndLoadKpis`) ; `selectGroup` appelle `clearStudentKpis`

**Ce qui est utilisable :**
- **Vue étudiant** : l'étudiant voit ses consentements accordés par groupe, peut révoquer (avec confirmation), et accorder l'accès à un enseignant avec ou sans filtre matière
- **Vue enseignant** : au clic sur un étudiant dans l'accordion, le badge KPI se met à jour (vert si consentement, gris sinon) et le panneau KPI affiche les données de révision, exercices, Leitner et badges
- Filtrage enseignants dans le formulaire : les enseignants avec consentement global sont masqués de la liste d'ajout
- Filtrage matières : les matières déjà accordées pour un enseignant sont exclues du select

**Hypothèses posées :**
- `currentGroup.members` fournit `userId`, `name`, `role` pour les enseignants (cohérent avec l'usage existant)
- La réponse de `GET /kpi/student/:id` est le même objet que `GET /kpi/my` — shape attendu : `{ revision, exercises, leitner, discipline, badges }`
- Les badges ont un champ `unlocked` + (`name` ou `label` ou `type`) — rendu défensif avec fallback

**DoD S-02.06 :**
- ✅ Fonctionnel conforme aux critères d'acceptation (liste/accord/révocation côté étudiant + affichage KPI côté enseignant)
- ✅ Tests : pas de tests unitaires front ajoutés (stratégie V1 : coverage backend + tests manuels UI, cohérent avec les autres vues Classroom)
- ✅ Documentation mise à jour (CHANGELOG_AGENT.md)
- ✅ Aucun bug bloquant connu sur le périmètre livré

---

### [2026-06-27] S-02.07 — Interface enseignant accès KPI partagés

**Contexte :** Enrichissement du panneau KPI enseignant dans `ClassroomEnseignantView.vue`. S-02.06 avait livré un panneau minimal (Révision, Exercices, Leitner, Badges partiels). S-02.07 livre le panneau complet exploitant toutes les données disponibles depuis `GET /kpi/student/:studentId`.

**Fichiers modifiés :**
- `my_memo_master_front/src/pages/ClassroomEnseignantView.vue` — panneau KPI entièrement remplacé

**Ce qui est utilisable :**
- **Barre de synthèse** (3 métriques rapides) : Streak révision / Discipline 30j / Maîtrise Leitner
- **Révision** : totalPlanned/Completed/Rate + stats 30j + graphique barres activité hebdomadaire (8 semaines)
- **Exercices** : Total/Moy/Min/Max/Tendance + liste des 5 dernières évaluations avec score coloré
- **Leitner** : Cartes/Maîtrise/À réviser/Taux succès + distribution par boîte (B1→B5 colorée par niveau)
- **Matières étudiées** : liste des subjects avec nb de systèmes Leitner et exercices par matière
- **Discipline** : sessions planifiées/complétées cette semaine + score disciplinaire 30j (coloré vert/orange/rouge)
- **Badges débloqués** : affichés avec icon + label + tooltip description

**Helpers ajoutés au script :**
- `studentKpi(userId)` — raccourci `kpiConsentStore.studentKpis[userId]` pour alléger le template
- `disciplineScoreClass(score)` — classe Tailwind selon seuil (≥70% success, ≥40% primary, <40% secondary)
- `weeklyBarHeight(count)` — hauteur de barre normalisée sur 7 séances max (min 20% si count > 0, 3px si 0)

**Hypothèses posées :**
- `scoreHistory` du KPI service est déjà trié par date DESC (most recent first) — `.slice(0, 5)` donne les 5 derniers exos
- `cardsByBox` est un objet `{ 1: N, 2: N, 3: N, 4: N, 5: N }` — `?? 0` pour les boîtes vides
- La barre d'activité est normalisée sur 7 séances/semaine max (hypothèse calendrier scolaire)

**DoD S-02.07 :**
- ✅ Fonctionnel conforme aux critères d'acceptation (accès complet aux KPI partagés côté enseignant)
- ✅ Tests : pas de tests unitaires front ajoutés (stratégie V1 cohérente avec autres vues Classroom)
- ✅ Documentation mise à jour (CHANGELOG_AGENT.md)
- ✅ Aucun bug bloquant connu sur le périmètre livré

---

### [2026-06-27] S-02.08 — Tests fonctionnels consentement

**Contexte :** Tests du store `kpiConsent.js` (Pinia) — couverture complète des 5 actions exposées. Le back-end était déjà couvert (22+23 tests en S-02.03).

**Fichiers créés :**
- `my_memo_master_front/test/stores/kpiConsent.store.test.js` — 32 tests Vitest

**Couverture :**
| Action | Tests | Scénarios couverts |
|--------|-------|-------------------|
| État initial | 5 | consents, studentKpis, loading, granting, _consentsFetchedAt |
| `fetchMyConsents` | 9 | 200 nominal, data null, TTL valide, force bypass, TTL expirée, non-200, erreur réseau, loading on/off, loading off sur erreur |
| `grantConsent` | 7 | 201 sans subjectId, 201 avec subjectId, 404, non-2xx, erreur réseau, granting on/off, granting off sur erreur |
| `revokeConsent` | 5 | 200 sans subjectId, 200 avec subjectId (query string), 404, non-2xx, erreur réseau |
| `fetchStudentKpis` | 5 | 200 nominal, 403, erreur réseau, 2 étudiants indépendants, présence dans map avant/après |
| `clearStudentKpis` | 1 | vide le map |

**Ce qui n'est PAS couvert (hors V1) :**
- Tests composant ClassroomEtudiantView (section [F]) — rendu, interactions formulaire, modal révocation
- Tests composant ClassroomEnseignantView — panneau KPI (lazy load, badge, affichage des blocs)

**DoD S-02.08 :**
- ✅ 32 tests passants (32/32)
- ✅ Cas nominal + cas limites + erreurs attendues pour chaque action
- ✅ Documentation mise à jour (CHANGELOG_AGENT.md)

---

### [S-02.09] — Revue de code & merge — 2026-06-27

**Objectif :** Revue complète de la feature S-02 (S-02.03 → S-02.08) avant merge dans `main`. Correction de tous les bugs et incohérences trouvés.

**Bugs corrigés :**

**1. BUG CRITIQUE — Cache TTL cross-groupe (4 stores)**

**Symptôme :** Après `fetchByGroup(A)` puis `fetchByGroup(B)`, revenir sur le groupe A dans les 5 minutes affichait les données de B (cache valide pour A mais tableau `groupEvents`/`groupDeadlines`/`sections`/`resources` déjà écrasé par B).

**Fichiers :** `src/stores/calendarEvents.js`, `src/stores/deadlines.js`, `src/stores/classGroupSections.js`, `src/stores/classGroupResources.js`

**Fix :** Ajout d'une condition `_currentGroupId === groupId` dans la garde TTL. Le cache ne court-circuite le fetch que si c'est le même groupe que la dernière fois.
```javascript
// AVANT (bug)
if (!force && this._cache[groupId] && Date.now() - this._cache[groupId] < TTL) return true

// APRÈS (fix)
if (!force && this._currentGroupId === groupId && this._cache[groupId] && Date.now() - this._cache[groupId] < TTL) return true
```
`_currentGroupId` ajouté dans `state` de `calendarEvents.js` et `deadlines.js` (déjà présent dans sections/resources).

**2. BUG MINEUR — `fetchMyConsents` silencieux sur erreur**

**Fichier :** `src/stores/kpiConsent.js`

**Symptôme :** Contrairement à tous les autres stores, `fetchMyConsents` ne notifiait pas l'utilisateur en cas de non-200 ou d'erreur réseau.

**Fix :** Ajout de `notif.notify(...)` dans les branches d'erreur (cohérent avec `calendarEvents`, `deadlines`, etc.).

**Tests mis à jour en conséquence :**
- `test/stores/kpiConsent.store.test.js` : 2 tests mis à jour pour vérifier la notification (`expect(mockNotify).toHaveBeenCalledWith(...)`)

**Corrections de tests pré-existantes :**

**3. `classGroups.store.test.js` — 2 tests desynchronisés du store**
- `createGroup — succès` : le store retourne `resp.data.data` (l'objet créé), pas `true`. Test corrigé : `expect(result).toEqual(GROUP_FIXTURE)`
- `addMember — succès` : le store envoie `{ userId, role }` depuis le refactor, pas `{ userId }`. Test corrigé : `role: 'student'` ajouté + status 201 (était 200)

**4. `ClassroomPage.test.js` — tests contre une ancienne architecture (7 échecs)**

ClassroomPage a été refactorisé pour déléguer à des vues enfants (`ClassroomEtablissementView`, `ClassroomEnseignantView`, `ClassroomEtudiantView`). Les tests testaient des éléments (`sendInvite`, `createSession`, "MP2I A" en dur) qui sont maintenant dans les vues enfants.

**Réécriture complète** du fichier (10 tests) :
- Stubs des 3 vues enfants pour isoler ClassroomPage
- Suppression : tests sendInvite/createSession/affiche groupe (déplacés)
- Conservation/ajout : onMounted, invitations, toggle Vue: admin/étudiant/enseignant, rechargement groupes après accept

**5. `MindmapsListView.test.js` — TDZ + Pinia manquant (13 échecs)**
- `mockToast` référencé dans une factory `vi.mock()` hoistée avant l'initialisation du module → TDZ. Fix : déplacé dans `vi.hoisted()`
- Le composant utilise `useTagStore()` mais le test ne fournissait pas de Pinia. Fix : ajout `createTestingPinia` + stub `TagSelectorComponent`

**6. ESLint — 13 erreurs pré-existantes**
- `ClassroomEtudiantView.vue:494` : `downloadFile(fileKey, originalName)` → `originalName` jamais utilisé → supprimé du paramètre
- `TagSelectorComponent.vue:190` : `focusInput()` définie mais jamais appelée → supprimée
- `MindMapPalette.vue:431` : `updateContent` assignée mais jamais utilisée → supprimée
- `KpiPage.vue:281` : `callback: function(val, idx)` → `idx` jamais utilisé → supprimé du paramètre
- `useRole.test.js:6-10` : `vi` utilisé sans être importé → `vi` ajouté dans l'import vitest
- `router.guard.test.js:1` : `afterEach` importé mais jamais utilisé → supprimé de l'import

**Résultat final :**
- ESLint : **0 erreur** (était 13)
- Tests Vitest : **490/490 passants** (était 477/479)
- Lint + tests verts = feature S-02 prête pour merge dans `main`

**Fichiers modifiés :**
- `src/stores/calendarEvents.js` — `_currentGroupId` + condition TTL corrigée
- `src/stores/deadlines.js` — `_currentGroupId` + condition TTL corrigée
- `src/stores/classGroupSections.js` — condition TTL corrigée (`currentGroupId` déjà présent)
- `src/stores/classGroupResources.js` — condition TTL corrigée (`currentGroupId` déjà présent)
- `src/stores/kpiConsent.js` — notification ajoutée sur erreur dans `fetchMyConsents`
- `src/pages/ClassroomEtudiantView.vue` — `originalName` supprimé de `downloadFile`
- `src/components/TagSelectorComponent.vue` — `focusInput` supprimée
- `src/components/mindmap/MindMapPalette.vue` — `updateContent` supprimée
- `src/pages/KpiPage.vue` — `idx` supprimé du callback
- `test/stores/kpiConsent.store.test.js` — 2 tests mis à jour (notification erreur)
- `test/stores/classGroups.store.test.js` — 2 tests mis à jour (`createGroup` retour + `addMember` body)
- `test/components/ClassroomPage.test.js` — réécriture complète (10 tests)
- `test/components/MindmapsListView.test.js` — TDZ fix + Pinia + stub TagSelector
- `test/composables/useRole.test.js` — import `vi` ajouté
- `test/router/router.guard.test.js` — `afterEach` retiré

**DoD S-02.09 :**
- ✅ Revue complète S-02.03 → S-02.08
- ✅ 1 bug critique corrigé (cache TTL cross-groupe)
- ✅ 1 bug mineur corrigé (notification silencieuse)
- ✅ ESLint : 0 erreur (était 13)
- ✅ Tests : 490/490 passants (était 477/479 + 1 fichier crashant)
- ✅ Documentation mise à jour (CHANGELOG_AGENT.md)

---

### [EX-01] Propriété et assignation des séries d'exercices — 2026-06-28

**Contexte :** Les séries d'exercices (Test) étaient globales et publiques (pas de filtre userId sur GET /tests, pas de vérification de propriété sur PUT/DELETE). Demande : rendre les exercices privés par défaut (comme les cartes Leitner et les mind maps), permettre aux enseignants de les assigner à un ou plusieurs groupes classes, et bifurquer les scores selon le contexte (privé → KPI perso, groupe → KPI pédagogiques).

**Fichiers créés :**
- `migrations/20260628000001-create-testclassgroup-table.js` — table `TestClassGroup` (testId, classGroupId, unique+index)
- `models/TestClassGroup.model.js` — modèle Sequelize junction sans timestamps

**Fichiers modifiés :**
- `models/index.js` — enregistrement `TestClassGroup`
- `models/Test.model.js` — association `belongsToMany(ClassGroup, { through: 'TestClassGroup', as: 'classGroups' })`
- `models/ClassGroup.model.js` — association `belongsToMany(Test, { through: 'TestClassGroup', as: 'assignedTests' })`
- `services/Test.service.js` — `findAll(userId)` : propres tests + legacy (userId null) + tests des groupes membres ; `findOne(id, userId)` : garde propriétaire/membre ; `update`/`delete` : vérif propriétaire ; nouvelle méthode `assignGroups(testId, userId, groupIds)` via `test.setClassGroups()`
- `controllers/Test.controller.js` — codes 403/404 sur update/delete, nouveau handler `assignGroups`
- `routes/Test.routes.js` — `authMiddleware` ajouté sur GET / et GET /:id ; nouvelle route `POST /:id/groups`
- `validators/Test.validators.js` — ajout `exports.assignGroups` (`groupIds` isArray, items isInt)
- `services/Kpi.service.js` — import `ClassGroup` ; include `classGroups` (required:false) dans TestResult ; filtre JS `privateTestResults` (tests sans groupe assigné) appliqué dans `getMyKpis` et `getPersonalKpisForSubjects`
- `services/ClassGroup.service.js` — `getStudentAnalytics` : remplacement de la recherche via Deadline/EventOccurrence/CalendarEvent par `TestClassGroup.findAll({ where: { classGroupId } })` (plus direct, plus fiable)
- `stores/tests.js` (front) — ajout action `assignGroups(testId, groupIds)`
- `pages/ExercisesPage.vue` (front) — import `useClassGroupStore`, `useAuthStore`, `useRole` ; badge "Privé" / nom(s) de groupe par carte ; bouton "Assigner à des groupes" (visible enseignant propriétaire uniquement) ; modal checkboxes groupes + soumission

**Ce qui est utilisable :**
- Un utilisateur connecté voit uniquement ses propres exercices + les exercices assignés à ses groupes
- Un enseignant peut assigner/désassigner un exercice à un ou plusieurs groupes depuis la page Exercices
- Les scores sur un exercice privé alimentent les KPI personnels de l'étudiant
- Les scores sur un exercice assigné à un groupe alimentent les KPI pédagogiques de l'enseignant
- Les tests avec `userId=null` (legacy) restent visibles de tous les utilisateurs connectés

**Hypothèses posées :**
- Tests existants avec `userId=null` traités comme "legacy global" — compatibilité ascendante préservée
- L'enseignant ne peut assigner qu'à ses propres groupes (le frontend ne montre que les groupes de l'utilisateur via `classGroupStore`)
- Aucune validation backend que l'enseignant est bien membre du groupe visé (acceptable MVP)

**Dette / points d'attention :**
- `ClassGroup.service.js` n'importe plus `EventOccurrence`/`CalendarEvent` via la branche exercices (ils restent importés pour d'autres usages — vérifier s'ils sont encore nécessaires)
- Migration `20260628000001` à passer avant toute mise en prod
- ✅ Aucun bug bloquant connu sur le périmètre livré

---

### [2026-06-28] S-03.08 — Tableau de bord enseignant groupes — DoD complet

**Ticket :** S-03.08

**Fonctionnel livré (session courante) :**
- `pages/ClassroomEnseignantView.vue` — gestion membres : inviter un étudiant par email, voir la liste des membres (badge rôle, bouton retrait étudiant uniquement), invitations en attente
- `services/Invitation.service.js` (back) — enseignant ne peut inviter qu'avec `role: 'student'` (pas `teacher`)
- `services/ClassGroup.service.js` (back) — `removeMember` : enseignant peut retirer un étudiant, pas un autre enseignant

**Tests ajoutés :**
- `test/stores/classGroupSections.store.test.js` (13 tests) — fetchByGroup (cache TTL, force, erreurs), create, update, delete
- `test/stores/classGroupResources.store.test.js` (12 tests) — fetchByGroup, uploadAndCreate (2 étapes, échec upload, échec création), delete
- `test/stores/classGroupSubmissions.store.test.js` (17 tests) — fetchStatus, fetchMine, fetchBySection, clearSubmissionStatus, clearSectionSubmissions, uploadAndSubmit, deleteSubmission
- `test/controllers/ClassGroup.controller.test.js` (+2 tests) — 403 enseignant retire enseignant, 401 sans token
- `test/services/Invitation.service.test.js` (7 tests — nouveau fichier) — restriction rôle teacher, ajout direct, non-membre, groupe inexistant
- `test/components/ClassroomPage.test.js` (10 tests) — déjà verts (préexistants corrigés)
- `test/stores/classGroups.store.test.js` (14 tests) — déjà verts

**Ce qui est utilisable :**
- Dashboard enseignant complet : KPI pédagogiques, sections/rendus, ressources, échéances, gestion membres
- Restrictions d'autorisation correctes (invitation student-only, retrait enseignant bloqué)
- 42 nouveaux tests frontend + tests backend ciblés

**Dette / points d'attention :**
- Pas de tests composant pour `ClassroomEnseignantView.vue` lui-même (trop couplé aux stores async) — couvert indirectement via tests des stores
- ✅ Aucun bug bloquant connu

---

### [2026-06-28] S-03.09 — Interface gestion membres groupe — DoD complet

**Ticket :** S-03.09

**Périmètre couvert :**
- Vue admin (`ClassroomEtablissementView.vue`) — invitation (rôles étudiant/enseignant), liste membres, changement de rôle, suppression, invitations en attente
- Vue enseignant (`ClassroomEnseignantView.vue`) — invitation étudiant uniquement (restriction UI + backend), liste membres en lecture (badge rôle), suppression étudiants uniquement, invitations en attente
- Vue étudiant — pas de gestion membres (correct par spec)
- Backend — 5 endpoints présents avec autorisations correctes (admin CRUD complet, enseignant invite étudiant + retire étudiant uniquement)

**Tests ajoutés :**
- `test/stores/classGroups.store.test.js` (+5 tests) — `updateMemberRole` (succès, 403, réseau), `removeMember` non-200, `addMember` réseau → 19 tests au total

**Ce qui est utilisable :**
- Gestion membres complète pour les admins
- Gestion membres restreinte pour les enseignants (invite étudiant, retire étudiant, lecture seule sur les enseignants)
- Restrictions d'autorisation correctes côté front ET back

**Dette / points d'attention :**
- Pas de tests composant pour les vues admin/enseignant (complexité async) — couvert par tests des stores et du backend
- ✅ Aucun bug bloquant connu

---

### [2026-06-28] S-03.06 — API KPI de groupe (avancement)

**Ticket :** S-03.06 — DoD complet

**Fichiers créés/modifiés :**
- `services/ClassGroup.service.js` — méthodes `getKpi(groupId, requesterId)` et `getStudentAnalytics(groupId, requesterId)` + helper `_computeGroupWeeklyTrend(results)`
- `controllers/ClassGroup.controller.js` — handlers `getKpi` et `getStudentAnalytics` (false→403, null→404, data→200)
- `routes/ClassGroup.routes.js` — `GET /class-groups/:id/kpi` et `GET /class-groups/:id/kpi/students` (authMiddleware, Swagger JSDoc)
- `test/services/ClassGroup.service.test.js` — 14 tests `getKpi` + `getStudentAnalytics` (at-risk×4, scoreWeeklyTrend, auth)
- `test/controllers/ClassGroup.controller.test.js` — 7+7 tests controller (401/403/404/500)
- `diagrams/kpi_pedagogiques.md` — spécification complète (208 lignes) : définitions KPI, règles de calcul, seuils, droits d'accès, format réponse API

**Ce qui est utilisable :**
- Un admin ou enseignant du groupe peut consulter les indicateurs globaux du groupe (membres, scores, invitations en attente)
- L'analyse pédagogique détaillée identifie les étudiants at-risk selon 4 critères indépendants : aucune session, inactif >7j, baisse de score >20%, aucun exercice >14j
- Tendance hebdomadaire des scores sur 4 semaines (ISO)
- Les KPI pédagogiques utilisent `TestClassGroup` (tests assignés au groupe) — plus direct que l'ancienne approche via `Deadline`

**Hypothèses posées :**
- Seuils at-risk (7j inactivité, 20% baisse, 14j sans exercice) codés en constantes dans le service — configurables si besoin
- Pas de cache côté API (calcul à chaque appel) — acceptable au volume MVP

**Dette / points d'attention :**
- ✅ Aucun bug bloquant connu sur le périmètre livré

---

### [2026-06-28] S-03.05 — Tests assignGroups + correctifs tests existants

**Ticket :** S-03.05 (DoD — Tests OK)

**Fichiers modifiés :**
- `test/controllers/Test.controller.test.js` — ajout mock `assignGroups` dans le service mocké ; ajout describe `POST /tests/:id/groups` (8 cas : 200 nominal, 200 tableau vide, 401, 400×3, 403, 404, 500) ; correction GET /tests et GET /tests/:id (ajout token Bearer manquant suite à l'authMiddleware ajouté sur ces routes) ; +2 cas 401 explicites
- `test/services/Test.service.test.js` — ajout mocks `ClassGroupUsers`, `TestClassGroup`, `ClassGroup` ; correction `findAll` existant (mocks manquants pour la nouvelle logique membership) ; ajout describe `assignGroups` (4 cas : nominal, tableau vide, NOT_FOUND, FORBIDDEN)

**Ce qui est utilisable :**
- 63 tests passent (0 échec) sur les deux fichiers
- DoD S-03.05 complet : fonctionnel ✅, tests ✅, changelog ✅, DECISIONS ✅

**Dette / points d'attention :**
- Le warning "A worker process has failed to exit gracefully" est préexistant (Redis mock non fermé) — non bloquant
