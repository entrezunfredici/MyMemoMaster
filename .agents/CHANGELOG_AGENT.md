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
| Middlewares (Auth, errorHandler, sanitize, validate) | Stable | init |
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
