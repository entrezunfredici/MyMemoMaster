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
| Test / Question / Response | Stable | init |
| Grading | Stable — `dayjs` ajouté comme dépendance | 2026-06-03 |
| LeitnerCard — algo répétition espacée | Stable — M-02.01 implémenté | 2026-06-03 |
| LeitnerSystem / LeitnerCard / LeitnerBox | Stable | init |
| LeitnerSystemsUsers | Stable | init |
| Diagramme (mind maps) | Stable | init |
| Fields / FieldsType | Stable | init |
| Tutorials | Stable | init |
| OnboardingState | Stable | init |
| Kpi | Stable (lecture seule) | init |
| Middlewares (Auth, errorHandler, sanitize, validate) | Stable — couverture logger complète (19/19 controllers) | 2026-06-05 |
| Storage (upload S3, mindmap local) | Stable — fuite error.message corrigée, console.warn → logger | 2026-06-05 |
| Validation entrées (express-validator) | Stable — couverture complète sur toutes les entités | 2026-06-05 |
| Migrations Sequelize CLI | Stable — 23 migrations + migration index FK | 2026-06-05 |
| Seeders Sequelize CLI | Stable — Roles + User admin | 2026-06-05 |
| Jobs (fifo.cron.js) | Stable | init |
| Front — Auth (login, register) | Stable | init |
| Front — HomePage | Stable | init |
| Front — FlashcardsPage | Stable | init |
| Front — ExercisesPage / ExerciseDetailPage | Stable | init |
| Front — MindmapsPage | Stable | init |
| Front — ProfilePage | Stable — nom utilisateur dynamique depuis authStore | 2026-06-03 |
| Front — CalendarPage | Stable | init |
| Front — SettingsPage | Stable | init |
| Front — Stores Pinia (auth, tests, questions, etc.) | Stable | init |

**Modules implémentés et stables :**
- API complète avec 18 entités (routes + controllers + services + models)
- Frontend Vue 3 avec toutes les pages principales
- Authentification JWT complète (register, login, email verification, reset password)
- Système Leitner (cartes mémoire avec boîtes)
- Mind map editor
- Système d'exercices / tests
- Docker Compose (API + Front + PostgreSQL + PgAdmin + Traefik)

**Modules partiellement implémentés :**
- Tests unitaires (dossier `test/` présent, couverture à compléter)

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
- Aucune dette nouvelle introduite.

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
