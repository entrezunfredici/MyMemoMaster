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
| Auth (register, login, reset password) | Stable | init |
| User (CRUD, profil) | Stable | init |
| Role | Stable | init |
| Subject / Unit | Stable | init |
| Test / Question / Response | Stable — 4 bugs corrigés (alias Sequelize, params route, champ validateur) | 2026-06-06 |
| Grading | Stable — `dayjs` ajouté comme dépendance | 2026-06-03 |
| LeitnerCard — algo répétition espacée | Stable — droits résolus depuis DB (req.user.rights → service) | 2026-06-06 |
| LeitnerSystem / LeitnerCard / LeitnerBox | Stable | init |
| LeitnerSystemsUsers | Stable | init |
| Diagramme (mind maps) | Stable — couplage Subject déplacé vers DiagrammeService.resolveSubject() | 2026-06-06 |
| Fields / FieldsType | Stable | init |
| Tutorials | Stable — bug create corrigé (subjectId + revision_tips ignorés) | 2026-06-06 |
| OnboardingState | Stable — bug PUT corrigé (req.user.userId → req.user.id) | 2026-06-06 |
| Kpi | Stable (lecture seule) | init |
| Documentation API (OpenAPI / Swagger) | Stable — M-00.14 : bearerAuth défini, sécurité globale, annotations complètes | 2026-06-06 |
| Documentation schéma BDD | Stable — M-00.15 : ERD Mermaid + descriptions tables + index + ON DELETE | 2026-06-06 |
| Documentation algo Leitner | Stable — M-01.13 : algo, règles métier, cas limites, droits, endpoints | 2026-06-10 |
| Documentation règles métier Calendrier | Stable — M-03.01 : modèle données, acteurs, règles synchro, todo list, récurrence | 2026-06-10 |
| ClassGroup / ClassGroupUsers | Stable — CRUD complet + gestion membres, droits admin | 2026-06-10 |
| CalendarEvent / EventOccurrence | Stable — CRUD complet + récurrence auto/manual, protection RESTRICT | 2026-06-10 |
| Deadline | Stable — CRUD complet, droits enseignant par groupe | 2026-06-10 |
| RevisionSession | Stable — CRUD complet + GET /today (todo list) | 2026-06-10 |
| Middlewares (Auth, errorHandler, sanitize, validate) | Stable — M-00.13 : messages Auth.middleware en français | 2026-06-06 |
| Tests intégration API (Supertest) | Stable — M-03 : 606 tests total (153 nouveaux pour ClassGroup, CalendarEvent, Deadline, RevisionSession) | 2026-06-10 |
| Tests unitaires moteur répétition Leitner | Stable — M-02 : 23 tests LeitnerCard.service (algo, droits, next_review_at) | 2026-06-10 |
| Tests fonctionnels session Leitner (back) | Stable — M-01.11 : 12 tests BDD session complète (SQLite in-memory, flow réel) | 2026-06-10 |
| Tests fonctionnels session Leitner (front) | Stable — M-01.11 : 7 tests store + 13 tests composant FlashcardsSessionPage (Vitest + @vue/test-utils) | 2026-06-10 |
| Revue de code & merge (M-02) | Stable — lint corrigé, 453 tests back + 41 front verts, merge prêt dans `dev` | 2026-06-10 |
| Sécurité fonctionnelle (CORS, rate limit) | Stable — M-00.09 implémenté | 2026-06-06 |
| Storage (upload S3, mindmap local) | Stable — fuite error.message corrigée, console.warn → logger | 2026-06-05 |
| Validation entrées (express-validator) | Stable — couverture complète sur toutes les entités | 2026-06-05 |
| Migrations Sequelize CLI | Stable — 23 migrations + migration index FK | 2026-06-05 |
| Seeders Sequelize CLI | Stable — Roles + User admin | 2026-06-05 |
| Jobs (fifo.cron.js) | Stable | init |
| Front — Auth (login, register) | Stable | init |
| Front — HomePage | Stable | init |
| Front — FlashcardsPage | Stable — CRUD systèmes, MenuItemComponent, stats via cardStore.loadSystemStats | 2026-06-08 |
| Front — ExercisesPage / ExerciseDetailPage | Stable | init |
| Front — MindmapsPage | Stable | init |
| Front — ProfilePage | Stable — nom utilisateur dynamique depuis authStore | 2026-06-03 |
| Front — CalendarPage | Stable | init |
| Front — SettingsPage | Stable | init |
| Front — Stores Pinia (auth, tests, questions, etc.) | Stable — persist auth réduit : paths ['token','user','authenticated'] localStorage | 2026-06-06 |
| Front — Stores Pinia Leitner (systems, boxes, cards) | Stable — systemStats + loadSystemStats ajoutés à leitnerCards | 2026-06-08 |
| Front — VitePWA (service worker) | Stable — precaching désactivé (globPatterns: []), cache service worker réduit à zéro | 2026-06-06 |
| Front — Couche API Axios (api.js, config.js) | Stable — M-00.10 : JSDoc, messages FR, tests Vitest | 2026-06-06 |

**Modules implémentés et stables :**
- API complète avec 18 entités (routes + controllers + services + models)
- Frontend Vue 3 avec toutes les pages principales
- Authentification JWT complète (register, login, email verification, reset password)
- Système Leitner (cartes mémoire avec boîtes)
- Mind map editor
- Système d'exercices / tests
- Docker Compose (API + Front + PostgreSQL + PgAdmin + Traefik)

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
