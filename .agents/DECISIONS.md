# DECISIONS.md — Journal des décisions techniques

> Rempli par l'agent IA au fil du projet, pour chaque choix structurant.  
> Objectif : permettre de comprendre "pourquoi" le code est comme il est, 2 mois plus tard.

---

## Format

```markdown
### [YYYY-MM-DD] [Titre court]
**Contexte** : Quel problème / besoin a motivé cette décision.
**Décision** : Ce qui a été choisi.
**Alternative écartée** : Ce qui a été considéré mais rejeté, et pourquoi.
**Conséquences** : Ce que ça implique (contraintes, dette, dépendances).
```

---

## Décisions

### [2026-06-03] SQLite en dev, PostgreSQL en prod
**Contexte** : Le projet doit tourner facilement en local sans installer PostgreSQL, mais être robuste en production.  
**Décision** : Utiliser SQLite (via `better-sqlite3`) en développement local et PostgreSQL en production/Docker. La sélection se fait automatiquement selon la présence de `PG_HOST` dans les variables d'environnement.  
**Alternative écartée** : PostgreSQL uniquement — trop lourd à installer localement ; SQLite uniquement — pas adapté à la production multi-utilisateurs.  
**Conséquences** : Sequelize doit être compatible avec les deux dialectes. Les migrations doivent être testées sur les deux. `better-sqlite3` est un module natif qui nécessite des outils de compilation (Windows SDK sur Windows, python3/make/g++ sur Linux).

---

### [2026-06-03] better-sqlite3 plutôt que sqlite3
**Contexte** : Le projet avait initialement `sqlite3` comme dépendance. `better-sqlite3` a été introduit pour les performances et l'API synchrone.  
**Décision** : Utiliser `better-sqlite3` comme driver SQLite principal.  
**Alternative écartée** : `sqlite3` (api asynchrone, moins performant) — conservé dans `package.json` par précaution mais potentiellement inutilisé.  
**Conséquences** : `better-sqlite3` est un module natif (compilation C++) — problématique sur Windows sans Windows SDK. L'image Docker Alpine compile nativement lors du build.

---

### [2026-06-03] Architecture en couches Controller → Service → Model
**Contexte** : Besoin de séparer les responsabilités pour faciliter les tests et la maintenance.  
**Décision** : Architecture stricte en 3 couches : les routes/controllers gèrent HTTP, les services contiennent toute la logique métier, les models définissent les entités Sequelize.  
**Alternative écartée** : Logique dans les controllers — plus simple mais non testable unitairement.  
**Conséquences** : Toute modification métier passe par le service. Les controllers sont minces (try/catch + appel service + réponse HTTP). Les services sont testables en isolation.

---

### [2026-06-03] Pinia avec persistence localStorage (front)
**Contexte** : L'utilisateur doit rester connecté après un refresh de page.  
**Décision** : Utiliser Pinia avec le plugin de persistence. L'état du store `auth` (token, user) est persisté en localStorage.  
**Alternative écartée** : Cookies — plus sécurisé mais plus complexe à mettre en place avec l'API Express actuelle.  
**Conséquences** : Le token JWT est stocké en localStorage (sensible aux attaques XSS). À surveiller si les exigences de sécurité augmentent.

---

### [2026-06-03] Swagger JSDoc sur les routes (pas sur les controllers)
**Contexte** : La documentation API doit être maintenue à jour et générée automatiquement.  
**Décision** : Les annotations `@swagger` sont posées directement sur les fichiers de routes, pas sur les controllers ni les services.  
**Alternative écartée** : Fichier YAML séparé — risque de désynchronisation avec le code.  
**Conséquences** : Les fichiers de routes sont verbeux mais auto-documentés. L'UI Swagger est accessible sur `/api-docs`.

---

### [2026-06-05] Conventions REST : suppression des suffixes /add et /all

**Contexte** : Les routes utilisaient `POST /entities/add` et `GET /entities/all` au lieu des standards REST `POST /entities` et `GET /entities`.
**Décision** : Normaliser toutes les routes vers `POST /` et `GET /` sans suffixe. Exception : `GET /responses/all/:questionId` renommé en `GET /responses/question/:questionId` pour éviter un conflit avec `GET /responses/:id`.
**Alternative écartée** : Garder les suffixes — plus explicite mais non standard, interdit par `CONVENTIONS.md`.
**Conséquences** : Le frontend (9 fichiers stores/pages) a été mis à jour en même temps. Tout nouveau endpoint doit respecter cette convention.

---

### [2026-06-05] Index Sequelize via options de modèle

**Contexte** : Aucun index n'était défini sur les clés étrangères, risque de scan complet sur les jointures en prod.
**Décision** : Ajouter les indexes directement dans les options `indexes: []` des modèles Sequelize. Séléction : FKs les plus utilisées en lecture (idQuestion, idBox, idSystem, idUser, subjectId, etc.) + `next_review_at` pour le cron FIFO.
**Alternative écartée** : Migrations SQL dédiées — plus propre en prod mais inutile pour le dev ; à faire avant prod.
**Conséquences** : Les index sont créés automatiquement lors du `db.sync()` en dev/test. En prod, il faudra des migrations Sequelize CLI car le `sync()` est désactivé.

---

### [2026-06-05] Pool PostgreSQL configurable via env vars

**Contexte** : Sequelize utilisait les valeurs par défaut du pool (max=5) sans possibilité de les ajuster sans modifier le code.
**Décision** : Exposer `PG_POOL_MAX`, `PG_POOL_MIN`, `PG_POOL_ACQUIRE`, `PG_POOL_IDLE` dans `.env` avec des valeurs par défaut raisonnables (max=10, min=2).
**Alternative écartée** : Valeurs hardcodées — pas de flexibilité selon l'environnement (Docker Compose vs prod).
**Conséquences** : Documenté dans `.env.example`. À tuner selon la charge réelle en production.

---

### [2026-06-05] Seeders CLI séparés des seeds JSON

**Contexte** : Les fichiers `seeds/*.seed.json` existaient comme documentation de structure de données mais n'étaient pas exécutables via `sequelize-cli db:seed:all`. Sequelize CLI attend des fichiers `.js` dans un dossier déclaré dans `.sequelizerc`.
**Décision** : Créer un dossier `seeders/` distinct de `seeds/` pour les seeders Sequelize CLI. Les JSON sont conservés comme documentation. Seules les données de référence (Roles, User admin) sont converties en seeders CLI.
**Alternative écartée** : Convertir tous les JSON en seeders — les données métier (Subject, LeitnerCard, etc.) sont interdépendantes et ne peuvent pas être insérées sans un utilisateur et des relations préexistantes.
**Conséquences** : La distinction seeds (JSON/doc) vs seeders (CLI/exécutable) doit être maintenue. Les nouveaux jeux de données de démo nécessiteront des seeders CLI avec gestion des dépendances.

---

### [2026-06-05] Migration dédiée pour les index FK

**Contexte** : Les 9 index (13 au total) ajoutés via `indexes: []` dans les modèles en M-00.04 sont créés par `sync()` en dev mais ignorés en prod (sync désactivé).
**Décision** : Créer une migration Sequelize CLI `20260605000001-add-indexes.js` avec `addIndex` / `removeIndex` pour chaque index. Noms d'index explicites (`idx_<table>_<colonne>`) pour faciliter le debug.
**Alternative écartée** : Indexes dans les migrations de création de table — trop couplé, difficile à ajouter a posteriori sans modifier des migrations déjà jouées.
**Conséquences** : La migration doit être jouée avant la mise en production. En dev, les index sont créés deux fois (sync + migration) — Sequelize ignore silencieusement si l'index existe déjà.

---

### [2026-06-05] Validation inline migrée vers express-validator middleware

**Contexte** : Les controllers Grading et Semantic contenaient de la validation manuelle (if/return 400) en anglais, violant l'architecture Controller → Service → Model et la convention "messages en français".
**Décision** : Supprimer la validation inline et créer `validators/Grading.validators.js` avec `.custom()` pour `correct_answers` (string | string[]). Brancher via le middleware `validate`.
**Alternative écartée** : Garder la validation inline pour les cas polymorphes (string | array) — express-validator supporte `.custom()` qui gère ce cas proprement.
**Conséquences** : Les controllers Grading/Semantic sont désormais conformes à l'architecture (try/catch + appel service + réponse HTTP uniquement). Les messages d'erreur sont en français.

---

### [2026-06-05] Messages d'erreur en français
**Contexte** : L'application cible des utilisateurs francophones.  
**Décision** : Tous les messages HTTP (erreurs et succès) retournés par l'API sont en français.  
**Alternative écartée** : Anglais — standard technique mais inadapté aux utilisateurs finaux.  
**Conséquences** : Les messages d'erreur ne peuvent pas être réutilisés tels quels dans un contexte international sans adaptation.

---

### [2026-06-06] CORS avec fonction plutôt qu'avec string fixe
**Contexte** : Le package `cors` avec `origin: 'string'` retourne toujours l'origine configurée dans le header `Access-Control-Allow-Origin`, sans comparer avec l'origine de la requête. Le contrôle est délégué au navigateur uniquement.  
**Décision** : Utiliser `origin: function(origin, callback)` — callback `(null, true)` si l'origine est dans la liste autorisée, `(null, false)` sinon. Cela empêche le serveur de poser le header CORS pour les origines non configurées.  
**Alternative écartée** : `origin: string` — contrôle côté navigateur uniquement, ne protège pas les appels non-navigateur. `origin: false` — désactive CORS entièrement, trop restrictif.  
**Conséquences** : Les requêtes sans header `Origin` (Postman, mobile, serveur-à-serveur) sont autorisées (`!origin → true`). En test (`NODE_ENV=test`), aucun mock supplémentaire n'est nécessaire — les headers CORS sont présents normalement.

---

### [2026-06-06] trust proxy activé pour la compatibilité Traefik
**Contexte** : Sans `app.set('trust proxy', 1)`, Express lit `req.ip` depuis la connexion TCP directe — qui est l'IP interne de Traefik. Résultat : tous les clients partagent le même compteur de rate limiting.  
**Décision** : Activer `trust proxy: 1` (un seul saut de proxy) pour que Express lise l'IP client depuis le header `X-Forwarded-For` posé par Traefik.  
**Alternative écartée** : Désactiver trust proxy — rate limiting inefficace derrière Traefik (tout le monde est Traefik).  
**Conséquences** : Un client malveillant peut théoriquement forger `X-Forwarded-For` pour contourner le rate limiting. En production, Traefik réécrit ce header, neutralisant l'attaque. En dev sans proxy, cette valeur est trusting mais sans conséquence.

---

### [2026-06-06] Stratégie de test pour api.js : mock complet d'axios via vi.hoisted
**Contexte** : Tester `api.js` nécessite d'isoler l'instance Axios créée à l'init du module et les dépendances (`@/stores/auth`, `@/router`). Plusieurs approches possibles : `axios-mock-adapter`, MSW (Mock Service Worker), ou mock complet d'Axios via Vitest.  
**Décision** : Mock complet d'`axios` via `vi.mock` + `vi.hoisted` pour exposer les méthodes (`get`, `post`, `put`, `delete`) en tant que `vi.fn()`. Les dépendances (`@/config`, `@/stores/auth`, `@/router`) sont également mockées. Pas de nouvelle dépendance ajoutée.  
**Alternative écartée** : `axios-mock-adapter` — intercepte au niveau des adaptateurs Axios, testera mieux les intercepteurs mais ajoute une dépendance. MSW — plus réaliste (niveau réseau) mais setup complexe pour des tests unitaires. Les deux auraient requis l'installation d'un package supplémentaire non approuvé.  
**Conséquences** : Les intercepteurs (injection JWT, FormData) ne sont pas testés par ces tests unitaires — comportement correct à confirmer en test d'intégration/e2e. Toute addition de dépendance de test doit passer par la liste approuvée dans `CONVENTIONS.md`.

---

### [2026-06-06] Tests controllers : mock des modèles + services, pas de DB réelle
**Contexte** : Les tests d'intégration Supertest démarrent `app.js` complet (Express + middlewares + routes). Utiliser une vraie DB alourdirait le setup et rendrait les tests dépendants de l'état de la base.  
**Décision** : Mock complet de `models/index` (retourne des objets vides) et mock de chaque service testé via `jest.mock()`. Auth middleware utilise le vrai JWT mais avec un secret de test fixe.  
**Alternative écartée** : Base SQLite en mémoire pour chaque test — plus réaliste mais fragile (sync schema, seeds, isolation des suites) et déjà couvert par les tests de services.  
**Conséquences** : Les tests controllers vérifient le comportement HTTP (codes, routing, validation, ownership) sans tester la logique métier ni le SQL — c'est le rôle des tests de services. Le mock de `Subject` dans Diagramme.controller.test.js expose `findByPk` et `findOrCreate` car le controller importe directement le modèle (couplage fort).

---

### [2026-06-06] LeitnerBox.intervall en secondes (pas en jours)
**Contexte** : L'algorithme de répétition espacée a besoin de flexibilité pour des intervalles sub-journaliers (rappel toutes les heures, toutes les 30 minutes, etc.) — un choix par jours entiers serait trop rigide.  
**Décision** : `LeitnerBox.intervall` stocke la durée en **secondes** dans tous les environnements. Les valeurs de dev (5/10/15/20/30 s) sont des raccourcis de test ; en prod, utiliser des valeurs significatives (ex. 3600, 86400, 259200).  
**Alternative écartée** : Jours entiers — plus simple à configurer mais empêche les créneaux de révision intra-journaliers.  
**Conséquences** : L'UI de configuration des boîtes doit permettre de saisir une durée en heures/minutes et la convertir en secondes avant envoi à l'API.

---

### [2026-06-06] VitePWA sans précaching + auth store en sessionStorage
**Contexte** : La configuration VitePWA par défaut (sans `workbox.globPatterns`) précache l'ensemble du build Vite (JS/CSS/HTML), soit 1-3 Mo dans la Cache API du navigateur — persistants même après fermeture du browser. Par ailleurs, le store `auth` persistait l'intégralité de son état (y compris les champs de formulaire) en localStorage.  
**Décision** :  
  1. `vite.config.js` — `workbox: { globPatterns: [], cleanupOutdatedCaches: true }` : désactive le précaching d'assets. Le manifeste PWA reste actif (app installable), le service worker s'enregistre mais ne met rien en cache.  
  2. `auth.js` — `persist: { paths: ['token', 'user', 'authenticated'] }` : seules les données d'auth sont persistées en localStorage (l'utilisateur reste connecté entre les sessions), les champs de formulaire ne sont plus stockés.  
**Alternative écartée** : Supprimer VitePWA entièrement — retire aussi l'installabilité de l'app ; sessionStorage — rejetée car l'utilisateur veut rester connecté entre les sessions.  
**Conséquences** : Le cache service worker est nul : toutes les requêtes asset vont sur le réseau. Les champs de formulaire (email, password des onglets login/register/etc.) ne sont plus sauvegardés entre les pages. Si une future itération nécessite du cache offline, il faudra re-configurer `workbox` avec une stratégie explicite.

---

### [2026-06-06] Sécurité Swagger globale plutôt que par route
**Contexte** : Toutes les routes de l'API (sauf 7 routes publiques) requièrent un JWT Bearer. Ajouter `security: [{bearerAuth:[]}]` sur chaque route aurait alourdi 20 fichiers de routes.
**Décision** : Déclarer `security: [{bearerAuth:[]}]` globalement dans `swagger.config.js` sous la clé `definition.security`. Les 7 routes publiques (register, login, verify-email, forgot-password, reset-password, grading/date, grading/semantic) surchargent localement avec `security: []`.
**Alternative écartée** : Annotation par route — plus explicite mais duplication × 20 fichiers, risque d'oubli sur les nouvelles routes.
**Conséquences** : Toute nouvelle route protégée est couverte automatiquement. Les nouvelles routes publiques doivent explicitement ajouter `security: []` dans leur JSDoc Swagger.

---

### [2026-06-06] Documentation schéma BDD dans diagrams/ plutôt que dans .agents/
**Contexte** : Le ticket M-00.15 demande une documentation du schéma BDD. Un fichier `diagrams/classes_diagram.md` existait mais reflétait un design conceptuel non conforme à l'implémentation réelle.  
**Décision** : Créer `diagrams/schema_bdd.md` comme source authoritative du schéma implémenté (format `erDiagram` Mermaid). Conserver `classes_diagram.md` comme trace du design initial sans le modifier.  
**Alternative écartée** : Mettre à jour `classes_diagram.md` directement — risque de confusion entre design et implémentation ; le format `classDiagram` est moins adapté à un ERD que `erDiagram`.  
**Conséquences** : `diagrams/schema_bdd.md` doit être mis à jour à chaque ajout/modification d'entité. Tout développeur doit référencer ce fichier et non `classes_diagram.md` pour connaître le schéma réel.

---

### [2026-06-06] JWT payload : { id: userId } uniquement, jamais de droits
**Contexte** : Plusieurs controllers (LeitnerCard, OnboardingState) tentaient de lire `req.user.rights` ou `req.user.userId` depuis le JWT décodé. Ces champs n'existent pas : `Auth.middleware.js` fait `req.user = jwt.verify(token)` et le token est signé avec `{ id: user.userId }` uniquement.  
**Décision** : Le JWT ne contient que `{ id: userId }`. Toute logique de droits ou de résolution d'entité utilisateur doit passer par un appel DB dans le service, pas depuis le payload JWT.  
**Alternative écartée** : Mettre les droits dans le JWT — risque de données périmées, gonflement du token, complexité de révocation.  
**Conséquences** : `req.user.id` est la seule propriété fiable sur `req.user`. Tout controller qui lirait `req.user.userId`, `req.user.rights`, `req.user.role` ou autre est buggué — auditer à chaque ajout de controller.

---

### [2026-06-06] Alias Sequelize obligatoires dans les includes
**Contexte** : Plusieurs associations Sequelize sont définies avec `as: "alias"` (ex. `Question.belongsToMany(Test, { as: "test" })`). Sequelize exige que tout `include: [{ model: Test }]` sans alias correspondant échoue avec "Test is associated to Question using an alias. You must use the 'as' keyword."  
**Décision** : Toute association définie avec `as:` dans les modèles doit être reprise dans chaque `include` avec le même `as:`. Pattern systématique dans tous les services.  
**Alternative écartée** : Supprimer les alias dans les associations — casse les accès aux relations via `instance.alias` et les includes sans ambiguïté.  
**Conséquences** : Lors de l'écriture d'un nouveau service utilisant un include Sequelize, vérifier en premier les modèles pour connaître les alias exacts. Les associations affectées identifiées : `Question ↔ Test (as: "test")`, `Question → LeitnerCard (as: "leitnerCard")`, `LeitnerCard → LeitnerBox (as: "leitnerBox")`, `LeitnerCard → Question (as: "question")`, `Response → Question (as: "question")`.

---

### [2026-06-06] Résolution des droits LeitnerCard depuis la DB
**Contexte** : `LeitnerCard.controller.js` utilisait `req.user.rights` (toujours `undefined`) pour les opérations d'écriture. Sans droits, toute opération addCard/updateCard/deleteCard échouait en 403.  
**Décision** : Ajouter `resolveUserRights(userId, idSystem)` dans `LeitnerCard.service.js` : vérifie si l'utilisateur est propriétaire du LeitnerSystem (droits complets) ou utilisateur partagé (droits depuis `LeitnerSystemsUsers`). Ajouter `getCardSystem(cardId)` pour remonter l'idSystem depuis idBox.  
**Alternative écartée** : Injecter les droits dans le JWT lors du login — droits périmés, gonflement token, invalidation difficile.  
**Conséquences** : Chaque opération d'écriture sur LeitnerCard génère 1-2 requêtes DB supplémentaires (résolution droits). Acceptable pour un MVP, à optimiser avec du cache Redis si la charge augmente.

---

### [2026-06-10] CalendarEvent.update ne modifie pas les occurrences ni recurrenceRule
**Contexte** : Modifier la règle de récurrence d'un événement existant impliquerait de régénérer ou supprimer/recréer toutes les occurrences, avec le risque de perdre les Deadlines qui y sont rattachées.
**Décision** : Le PUT `/calendar-events/:id` ne modifie que `name`, `description` et `type`. Pour changer les occurrences, l'admin doit utiliser `POST /:id/occurrences` (ajout) ou `DELETE /occurrences/:id` (suppression unitaire).
**Alternative écartée** : Permettre la modification de recurrenceRule avec régénération — trop destructif, détruit les Deadlines liées aux occurrences supprimées.
**Conséquences** : L'UI doit proposer une gestion manuelle des occurrences après la création d'un événement si les dates changent.

---

### [2026-06-10] STRING plutôt qu'ENUM SQL pour les champs type/role du module Calendrier
**Contexte** : Les champs `type` (CalendarEvent, Deadline) et `role` (ClassGroupUsers) auraient pu utiliser `DataTypes.ENUM` pour une contrainte d'intégrité au niveau de la base.
**Décision** : Utiliser `DataTypes.STRING(20)` avec validation express-validator côté application. Pas d'ENUM SQL.
**Alternative écartée** : `DataTypes.ENUM` — crée des types nommés en PostgreSQL qui nécessitent une gestion explicite lors des migrations et rollbacks (`queryInterface.sequelize.query("DROP TYPE ...")`) ; comportement différent sur SQLite (string silencieuse).
**Conséquences** : La validation des valeurs autorisées est portée par les validators express-validator à chaque endpoint. La cohérence est garantie à l'application level, pas à la DB level — acceptable pour un MVP.

---

### [2026-06-10] EventOccurrence matérialisées plutôt que calculées à la volée
**Contexte** : Les événements peuvent être récurrents (règle hebdomadaire sur tout un semestre) ou à dates multiples manuelles. Deux approches possibles pour stocker les occurrences : les calculer dynamiquement depuis la règle à chaque lecture, ou les persisteer en base à la création.
**Décision** : Persistance en base (`EventOccurrence` table). À la création d'un `CalendarEvent` en mode `auto`, toutes les occurrences sont générées et insérées en base. En mode `manual`, chaque date choisie crée une `EventOccurrence`.
**Alternative écartée** : Calcul à la volée depuis `recurrenceRule` — plus léger en stockage mais complexe à filtrer (supprimer une occurrence isolée, rattacher une Deadline à une occurrence spécifique, requêter par plage de dates).
**Conséquences** : Les occurrences peuvent être supprimées individuellement (exception jours fériés, séance annulée). Un événement sur un semestre entier peut générer 30–40 lignes `EventOccurrence` — volume négligeable pour un MVP. La règle `recurrenceRule` reste stockée sur `CalendarEvent` pour permettre la régénération si nécessaire.

---

### [2026-06-10] RevisionSession = todo item (pas d'entité séparée)
**Contexte** : L'utilisateur crée des séances de révision qui doivent apparaître dans son calendrier ET dans sa todo list du jour.
**Décision** : Un seul objet `RevisionSession` (date + startTime + endTime). La todo list filtre simplement les `RevisionSession` dont `date = aujourd'hui` — aucune entité `TodoItem` séparée.
**Alternative écartée** : Deux entités distinctes (`RevisionSession` + `TodoItem`) avec synchronisation — doublon de données, logique de sync complexe, incohérences possibles.
**Conséquences** : Toute modification de la séance (nom, heure) est immédiatement répercutée dans les deux vues. Supprimer une séance la retire du calendrier et de la todo list simultanément.

---

### [2026-06-10] Deadline liée à une EventOccurrence (pas à un CalendarEvent)
**Contexte** : Un cours peut recourir tout le semestre (20 occurrences). Une échéance (devoir à rendre) concerne une seule séance, pas toutes les occurrences du cours.
**Décision** : `Deadline.occurrenceId` pointe vers une `EventOccurrence` spécifique. L'enseignant choisit la séance dans laquelle il annonce l'échéance.
**Alternative écartée** : Lier la Deadline au `CalendarEvent` parent — l'échéance apparaîtrait sur toutes les séances du cours, ce qui est incorrect.
**Conséquences** : L'UI de création d'échéance doit permettre à l'enseignant de sélectionner l'occurrence (séance précise) et non juste le cours. Le champ `dueDate` est indépendant : l'échéance peut être *annoncée* le lundi et *due* le vendredi.

---

### [2026-06-06] Rate limiters extraits dans un middleware dédié
**Contexte** : `authLimiter` et `registerLimiter` étaient définis inline dans `User.routes.js`. Le nouvel `apiLimiter` global nécessitait un point de centralisation.  
**Décision** : Créer `middlewares/rateLimit.middleware.js` qui exporte les trois limiteurs. `User.routes.js` importe depuis ce fichier.  
**Alternative écartée** : Garder les limiteurs inline et dupliquer `apiLimiter` dans `app.js` — DRY violation, tests plus complexes.  
**Conséquences** : Les trois limiteurs sont configurables via env vars (`AUTH_RATE_MAX`, `REGISTER_RATE_MAX`, `API_RATE_MAX`, etc.). En prod multi-instance, un `RedisStore` partagé sera nécessaire (MemoryStore par défaut non partagé).
