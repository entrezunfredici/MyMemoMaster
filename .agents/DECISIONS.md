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

### [2026-06-14] Refresh token — opaque, stocké en clair, rotation à chaque renouvellement
**Contexte** : L'access token JWT est court (15 min). Il faut un mécanisme pour renouveler sans redemander les identifiants.
**Décision** : Refresh token opaque (`crypto.randomBytes(64).toString('hex')`, 128 chars hex), stocké en clair dans `User.refreshToken` (+ `refreshTokenExpiresAt`). Rotation systématique : chaque `POST /users/refresh-token` invalide l'ancien et en émet un nouveau. Côté front : intercepteur Axios response qui tente le refresh en cas de 401 avant de logger l'utilisateur. Le logout révoque le token côté serveur (route publique `POST /users/logout`).
**Alternative écartée** : Stocker le refresh token hashé en base (sha256) — plus sécurisé si la DB est compromise, mais ajoute de la complexité sans bénéfice MVP. Le token en clair est cohérent avec l'approche des codes `validEmailCode` déjà en clair. / Refresh token dans un httpOnly cookie — pas de XSS, mais ajoute de la complexité CORS hors MVP.
**Conséquences** : Migration `20260614000002` à passer. Si la DB est compromise, les refresh tokens actifs sont lisibles. La rotation limite la fenêtre d'exploitation. `AUTH_JWT_EXPIRES_IN=15m` et `AUTH_REFRESH_TOKEN_EXPIRES_DAYS=7` sont les nouvelles valeurs par défaut (ancienne valeur: 24h pour l'access token).

---

### [2026-06-15] Reset password token — hashé SHA-256, token brut envoyé par email
**Contexte** : Le code de reset password (6 chiffres, stocké en INTEGER en clair) offrait une faible entropie (900 000 valeurs) et était lisible en cas de fuite de base de données. Ticket M-05.06 impose "token hashé".
**Décision** : Token opaque `crypto.randomBytes(32).toString('hex')` (64 chars hex, 2^256 valeurs), hash SHA-256 stocké en base (`User.resetPasswordCode STRING(64)`). Le token brut est envoyé par email. À la vérification, `SHA-256(token_reçu)` est comparé au hash stocké. Le token est effacé en base après la première vérification (valide ou non).
**Alternative écartée** : Conserver le code à 6 chiffres mais le hasher avec bcrypt — bcrypt sur 900 000 valeurs reste vulnérable aux rainbow tables pré-calculées. / Garder le stockage en clair — exposé en cas de fuite DB.
**Conséquences** : Migration `20260615000001` à passer (colonne INTEGER → STRING(64)). L'utilisateur doit désormais copier-coller un token de 64 chars depuis son email au lieu de saisir un code court — UX dégradée, un lien cliquable serait idéal dans un ticket front dédié. Le `validEmailCode` et le `refreshToken` restent en clair (décisions distinctes documentées ci-dessus).

---

### [2026-06-14] Middleware RBAC `requireRole` — vérification DB par requête, pas par JWT
**Contexte** : Les routes sensibles (CRUD rôles, assignation de rôle à un user) doivent être réservées à certains rôles. Le JWT actuel ne contient que `{ id: userId }`, pas le roleId.
**Décision** : Créer `requireRole.middleware.js` qui fait une `User.findByPk(req.user.id, { attributes: ['roleId'] })` à chaque requête pour vérifier le rôle. Le résultat est injecté dans `req.user.roleId` pour les handlers suivants.
**Alternative écartée** : Inclure `roleId` dans le payload JWT (évite la requête DB). Rejeté car un changement de rôle en base ne prendrait effet qu'à l'expiration du JWT — comportement non souhaité pour un système RBAC réactif.
**Conséquences** : Une requête DB supplémentaire par endpoint protégé par `requireRole`. Acceptable pour un MVP mono-instance. Si la latence devient un problème à l'échelle, passer à un JWT enrichi avec durée courte (ex: 15 min) + refresh token.

---

### [2026-06-14] Définition des 5 rôles système
**Contexte** : L'application doit distinguer plusieurs types d'acteurs avec des permissions différentes.
**Décision** : 5 rôles définis par ID stable : 1=Admin plateforme (accès total), 2=Étudiant, 3=Enseignant (vue professeur dans ClassroomPage), 4=Admin établissement (gestion groupes/calendrier, comme roleId=1 sur ce périmètre), 5=Modérateur (rôle réservé, périmètre à définir).
**Alternative écartée** : Table de permissions granulaires (Permission, RolePermission, UserPermission) — plus flexible mais disproportionné pour le MVP. Les rôles suffisent si les périmètres sont bien définis.
**Conséquences** : Les roleIds sont des constantes métier — ne jamais les changer en base sans migration. `ROLE_IDS` dans `useRole.js` (front) et les literals `1, 4` dans les services doivent rester synchronisés.

---

### [2026-06-13] Lien optionnel RevisionSession ↔ LeitnerSystem / Test
**Contexte** : L'utilisateur veut pouvoir planifier des sessions de révision directement depuis un système Leitner ou une série d'exercices.  
**Décision** : Ajouter deux FK nullable (`idSystem`, `idTest`) à `RevisionSession`. La création est déclenchée manuellement depuis le frontend (bouton "+ Planifier" sur chaque système Leitner). ExercisesPage non connectée à l'API : `idTest` réservé pour quand ce module sera branché.  
**Alternative écartée** : Cron backend qui crée automatiquement des sessions depuis un champ `nextReviewDate` sur LeitnerSystem — plus puissant mais complexe ; la valeur est déjà accessible via `GET /leitnercards/due/:systemId`.  
**Conséquences** : Migration `20260613000002` à passer. `findAll`/`findOne` du service incluent désormais `leitnerSystem` et `test` (nom uniquement). Le calendrier et la todo list afficheront le contexte de chaque session.

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

### [2026-06-11] server_docker_compose/ séparé du docker-compose.yml racine

**Contexte** : Le pipeline CD (`cd.yml`) déploie sur un VPS en copiant un fichier compose dédié et en le validant via `docker compose config -q`. Le `docker-compose.yml` racine contient le profil `dev` avec `build:` et un Traefik local sans HTTPS — inutilisable directement sur le VPS.
**Décision** : Créer `server_docker_compose/docker-compose.yml` avec uniquement les 4 services VPS (`postgres`, `pgadmin`, `api`, `front`), images DockerHub, Traefik HTTPS Let's Encrypt. Les noms de services correspondent à ce que le script de déploiement CD appelle (`up -d pgadmin api front`).
**Alternative écartée** : Adapter le compose racine avec un troisième profil — les noms de services diffèrent (`api` vs `api_server`) et les deux fichiers servent des usages très différents (dev vs prod); les séparer évite la confusion.
**Conséquences** : Toute modification des variables d'environnement de l'API/Front doit être répercutée dans les deux fichiers compose. Le `server_docker_compose/.env.example` est la référence pour le VPS.

---

### [2026-06-12] BullMQ + Redis pour les rappels (vs node-cron polling)
**Contexte** : Le ticket M-03.05 spécifie explicitement BullMQ pour le système de rappels. L'alternative naturelle (node-cron + polling DB) était disponible sans nouvelle dépendance.
**Décision** : BullMQ avec Redis comme broker. Chaque rappel génère un job avec un `delay` précis (ms jusqu'à l'heure du rappel). Redis est ajouté à docker-compose et CONVENTIONS.md.
**Alternative écartée** : node-cron avec polling toutes les N minutes — moins précis (granularité de la fenêtre cron), pas de retry intégré, pas de persistance des jobs entre redémarrages du process.
**Conséquences** : Redis est désormais une infrastructure requise. CONVENTIONS.md mis à jour ("Redis utilisé exclusivement comme broker BullMQ"). Si Redis est indisponible, les rappels ne sont pas envoyés mais l'API reste fonctionnelle. En cas de redémarrage Redis, les jobs en queue sont perdus (pas de persistance AOF/RDB configurée par défaut).

---

### [2026-06-12] Reminder.entityType polymorphique sans FK en base
**Contexte** : Les rappels peuvent pointer vers Deadline ou RevisionSession. Deux options : FK spécifique par type (deux colonnes nullables) ou relation polymorphique (entityType + entityId sans contrainte FK).
**Décision** : `entityType STRING + entityId INTEGER` sans FK en base. L'ownership et l'existence de l'entité sont vérifiés dans le service (`_resolveEntity`).
**Alternative écartée** : Deux colonnes `deadlineId` / `revisionSessionId` nullables — contraint d'ajouter une colonne à chaque nouvel entityType, et crée des champs toujours NULL.
**Conséquences** : L'intégrité référentielle n'est pas garantie au niveau DB — si un Deadline est supprimé, le Reminder orphelin reste. Acceptable pour MVP car les Deadlines et RevisionSessions sont protégées par CASCADE sur userId.

---

### [2026-06-12] CalendarPage — clé d'événement avec mois 0-indexé (JavaScript)
**Contexte** : L'ancien dict `events` et la fonction `eventKey(y, m, d)` utilisaient les mois 0-indexés (comme `Date.getMonth()`). Les dates retournées par l'API sont `YYYY-MM-DD` avec mois 1-indexés.
**Décision** : Conserver le format 0-indexé en interne (cohérent avec `isToday`, `isWeekend`, `getFirstDay`). Ajouter `parseDateToKey(dateStr)` qui soustrait 1 au mois API avant de construire la clé.
**Alternative écartée** : Passer à un format 1-indexé partout — aurait cassé `isToday` (qui compare avec `today.getMonth()` 0-indexé) et nécessité une réécriture complète des helpers.
**Conséquences** : Tout ajout de données de dates dans `allEvents` (computed) doit passer par `parseDateToKey`. Ne jamais passer directement une date API à `eventKey`.

---

### [2026-06-13] Score de charge pondéré pour le planning
**Contexte** : L'endpoint `GET /planning/load` doit retourner un `loadScore` agrégé permettant de comparer la charge entre les jours.
**Décision** : Score = `cardsDue × 1 + sessions × 3 + deadlines × 5`. Les deadlines ont le poids le plus fort car les conséquences d'un oubli sont les plus graves.
**Alternative écartée** : Score simple (somme égale) — ne reflète pas l'urgence relative des différents types de tâches.
**Conséquences** : Les coefficients sont des constantes hardcodées dans le service. Si les règles métier évoluent, ils devront être ajustés manuellement dans `Planning.service.js`.

---

### [2026-06-13] Erreurs DeadlineService non-bloquantes dans Planning
**Contexte** : Un utilisateur sans groupe classe ne peut pas charger ses deadlines (DeadlineService.findAll retourne [] ou peut lever une erreur). Si cette erreur propagait, l'endpoint /planning échouerait pour tous les utilisateurs sans groupe.
**Décision** : Encapsuler l'appel DeadlineService dans un try/catch non-bloquant avec logger.warn. L'utilisateur voit deadlines=0 au lieu d'une 500.
**Alternative écartée** : Laisser l'erreur se propager — trop restrictif pour un MVP où beaucoup d'étudiants n'ont pas encore de groupe.
**Conséquences** : Les erreurs DB réelles sur DeadlineService sont silenciées dans /planning (mais loguées). À monitorer si des erreurs inattendues apparaissent.

---

### [2026-06-13] Isolation BullMQ dans les tests (mock total, pas de Redis)
**Contexte** : Les tests BDD backend (Supertest) et unitaires appellent des services qui initialisent une connexion BullMQ/Redis au require. Lancer ces tests sans un Redis disponible fait échouer tous les imports.
**Décision** : Mocker `jobs/reminder.queue` et `jobs/reminder.worker` avec `jest.mock(...)` avant tout `require`, en retournant un `mockQueue` en mémoire (`{ add: jest.fn(), getJob: jest.fn() }`). Le mock est défini au niveau module (`const mockQueue = {...}`) pour permettre les assertions (`expect(mockQueue.add).toHaveBeenCalled()`).
**Alternative écartée** : Redis en mémoire (`ioredis-mock`) — plus fidèle mais plus fragile (couplage à l'implémentation interne de BullMQ) et nécessiterait une dépendance dev supplémentaire.
**Conséquences** : Les tests BDD vérifient que les jobs sont *planifiés* (mock.add appelé) et *annulés* (mock.getJob + job.remove appelés) mais ne testent pas le comportement réel du worker. C'est acceptable car le worker est testé séparément ou en intégration réelle.

---

### [2026-06-13] vi.hoisted pour les mocks de directives Vue dans Vitest
**Contexte** : `vi.mock('@/directives/clickOutside.js')` est hoisted en haut du fichier par Vitest. Si la factory référence une variable déclarée avec `const` au-dessus, elle n'est pas encore initialisée → `ReferenceError`.
**Décision** : Utiliser `vi.hoisted(() => ({ ... }))` pour déclarer les stubs de directives. Cette fonction est exécutée AVANT le hoisting des `vi.mock`, garantissant que la variable est disponible dans la factory.
**Alternative écartée** : Inline la valeur directement dans la factory (sans variable) — fonctionne mais interdit de réutiliser le stub dans les tests (impossible de vérifier que la directive a été appelée).
**Conséquences** : Tout mock de module qui référence une variable locale doit déclarer cette variable via `vi.hoisted`. Convention à documenter dans les templates de tests front.

---

### [2026-06-13] Polling 5 min pour NotificationBellComponent (pas de WebSocket)
**Contexte** : La cloche de notification doit afficher les rappels en temps quasi-réel pour informer l'utilisateur des rappels bientôt dus ou déjà traités (status sent/failed).
**Décision** : `setInterval(() => store.fetchReminders(), 5 * 60 * 1000)` dans `onMounted`, nettoyé par `clearInterval` dans `onBeforeUnmount`. Fetch au montage, puis toutes les 5 minutes.
**Alternative écartée** : WebSocket ou SSE côté serveur — plus réactif mais complexe à mettre en place (infrastructure Redis pub/sub, gestion des reconnexions), non requis pour un MVP où les rappels ont une granularité de plusieurs minutes.
**Conséquences** : L'utilisateur peut voir un délai jusqu'à 5 min entre l'envoi réel d'un email de rappel (BullMQ) et la mise à jour du badge. Acceptable car l'email constitue la notification principale ; le badge in-app est informatif.

---

### [2026-06-14] dotenv chargé en tête de server.js, avant tout require()
**Contexte** : `dotenv.config()` était appelé à la ligne 45 de `app.js`, après tous les `require('./routes/...')`. Or `server.js` fait `require('./models')` avant `require('./app')`. Résultat : `models/index.js` voyait `PG_HOST` vide → bascule sur SQLite ; `process.env.API_PORT` n'était pas défini au moment de `const PORT = ...` → port inattendu.
**Décision** : Ajouter `require('dotenv').config({ path: ... })` comme **toute première ligne** de `server.js`, avant tout autre `require`. `app.js` conserve son propre appel (idempotent grâce au comportement de dotenv qui n'écrase pas les vars déjà définies).
**Alternative écartée** : Passer les vars en CLI (`PG_HOST=... node server.js`) — fonctionnel mais fragile, non reproductible sans script wrapper.
**Conséquences** : En Docker, les vars sont déjà dans l'environnement du conteneur (`environment:` du compose) — l'appel dotenv est no-op, aucun effet de bord. En local hors Docker, le `.env` est lu dès le démarrage, PostgreSQL est sélectionné correctement.

---

### [2026-06-14] Séquences PostgreSQL non avancées par les seeders (bulkInsert avec ID explicite)
**Contexte** : Les seeders Sequelize CLI utilisent `queryInterface.bulkInsert` avec des `roleId`/`userId` explicites (1, 2, 3…). PostgreSQL ne fait pas avancer la séquence `<table>_<pk>_seq` lors d'insertions avec valeur explicite. Le premier `Role.create()` après seeding tente d'utiliser `roleId=1` (nextval de la séquence) → `SequelizeUniqueConstraintError: roleId must be unique`.
**Décision** : Après chaque `npx sequelize-cli db:seed:all` sur une DB fraîche, exécuter manuellement la remise à zéro des séquences :
```sql
SELECT setval('"Role_roleId_seq"', (SELECT MAX("roleId") FROM "Role"));
SELECT setval('"User_userId_seq"', (SELECT MAX("userId") FROM "User"));
```
**Alternative écartée** : Utiliser `OVERRIDING SYSTEM VALUE` dans les seeders ou `RESTART WITH` dans des migrations — plus propre mais nécessite de modifier tous les seeders existants.
**Conséquences** : Dette technique : ce reset manuel est à automatiser dans le dernier seeder ou dans `entrypoint.sh` via `ALTER SEQUENCE ... RESTART WITH`. À faire avant la mise en prod pour éviter les erreurs de création en DB fraîche.

---

### [2026-06-17] Suppression de compte — confirmation textuelle "SUPPRIMER"
**Contexte** : La suppression de compte est irréversible (toutes les données de l'utilisateur sont effacées). Il faut une friction UX suffisante pour éviter les erreurs de clic, sans alourdir le parcours standard.
**Décision** : Le bouton "Supprimer mon compte" reste `:disabled` tant que l'utilisateur n'a pas tapé exactement la chaîne `"SUPPRIMER"` dans un champ texte dédié. La comparaison est `deleteConfirm !== 'SUPPRIMER'` côté client.
**Alternative écartée** : `window.confirm()` (dialog natif) — trop facilement cliqué, pas de friction suffisante sur mobile. Modale Vue dédiée — over-engineering pour un MVP ; la friction textuelle est plus efficace que deux clics sur un bouton.
**Conséquences** : La protection réelle reste côté serveur (`DELETE /users/:id` vérifie `req.user.id === req.params.id`). La validation client est purement UX. Tout autre composant implémentant une action irréversible doit suivre ce pattern.

---

### [2026-06-19] Contenu des questions stocké en JSON (champ `content`) par type

**Contexte** : Les 4 types de questions (ouverte, QCM, texte à trou, phrase à constituer) ont des structures de données radicalement différentes. Un modèle relationnel classique (table Response avec une réponse par question) ne couvre que le cas `open` et oblige à multiplier les tables ou à casser la normalisation pour les autres types.

**Décision** : Ajouter un champ `content` (TEXT/JSON) nullable sur la table `Question`. Chaque type a son propre schéma JSON :
- `open` : `{ correct_answer: "..." }`
- `mcq` : `{ options: [{ text, correct }] }`
- `fill_blank` : `{ template: "texte avec {{0}}", blanks: ["réponse"] }`
- `reorder` : `{ fragments: ["mot1", ...], solution: [0, 1, ...] }`
Le champ `type` est contraint côté application à ces 4 valeurs via express-validator (STRING et non ENUM SQL, cohérent avec la décision prise pour CalendarEvent).

**Alternative écartée** : Tables spécialisées par type (QuestionOption, QuestionBlank…) — sur-ingénierie pour un MVP, jointures coûteuses, migration difficile si on ajoute un 5e type. / ENUM SQL pour `type` — rejeté car crée des types nommés en PostgreSQL complexes à gérer en migration, et comportement différent sur SQLite (voir décision 2026-06-10 sur CalendarEvent).

**Conséquences** : La table `Response` reste utilisée uniquement pour les cartes Leitner (`type: 'open'`, `content: null`). La correction `open` dans les exercices est textuelle (exacte) — une correction sémantique nécessitera le moteur Grading/Semantic dans un ticket dédié. Migration `20260619000001` à passer.

---

### [2026-06-20] LeitnerSystem → Subject : FK directe plutôt que many-to-many
**Contexte** : Le modèle initial prévoyait plusieurs sujets par système via une table de jointure `systemSubject`. En pratique, un système Leitner correspond à un seul domaine d'étude.
**Décision** : Remplacer `belongsToMany(Subject)` par une FK directe nullable `subjectId` sur `LeitnerSystem`, alignée sur le pattern de `Test.subjectId`. La table `systemSubject` est conservée en base mais n'est plus utilisée.
**Alternative écartée** : Conserver le many-to-many — plus de complexité (table de jointure, upsert, `setSubjects()`) pour un cas d'usage qui n'existe pas ; le filtre par sujet sur `findAll` aurait nécessité un JOIN explicite.
**Conséquences** : Migration `20260620000001` à passer. La table `systemSubject` est orpheline — à supprimer dans un ticket de nettoyage. `findAll` filtre désormais par `idUser` (cohérent avec la logique existante de propriété).

---

### [2026-06-21] Correction exercices portée server-side (POST /tests/:id/submit)

**Contexte** : La correction des exercices était entièrement côté client (`checkAnswer()` dans `ExerciseDetailPage.vue`). Le ticket M-06.05 demande de la porter côté serveur, comme le fait `POST /leitnercards/response` pour les cartes Leitner.

**Décision** : Ajout de `POST /tests/:id/submit` (authMiddleware, validator). Le service `Test.service.submitAnswers()` charge le test + questions depuis la DB, évalue chaque réponse (`_checkAnswer()`) pour les 4 types, crée le `TestResult` en base, et retourne `{ score, total, results, resultId }`. La correction et la sauvegarde du score se font en un seul appel. Le front (`testResultStore.submitTest()`) remplace l'ancien appel `checkAnswer()` + `saveResult()` en deux étapes.

**Alternative écartée** : Conserver la correction client-side (plus simple, zéro DB) — exposait les réponses correctes via `GET /tests/:id` (déjà le cas pour l'affichage du formulaire, donc pas de gain sécurité immédiat), mais surtout empêchait une vraie validation côté serveur et un futur branchement sur le moteur sémantique IA.

**Conséquences** : La `question.content` reste exposée dans `GET /tests/:id` (nécessaire pour rendre les formulaires côté client). La sécurité de la note est garantie par le serveur. La correction `open` reste exacte en MVP — une correction tolérante/sémantique se branchera sur `Semantic.service.js` dans un ticket dédié ("Correction IA avancée" = OUT of scope M-06.05).

---

### [2026-06-06] Rate limiters extraits dans un middleware dédié
**Contexte** : `authLimiter` et `registerLimiter` étaient définis inline dans `User.routes.js`. Le nouvel `apiLimiter` global nécessitait un point de centralisation.  
**Décision** : Créer `middlewares/rateLimit.middleware.js` qui exporte les trois limiteurs. `User.routes.js` importe depuis ce fichier.  
**Alternative écartée** : Garder les limiteurs inline et dupliquer `apiLimiter` dans `app.js` — DRY violation, tests plus complexes.  
**Conséquences** : Les trois limiteurs sont configurables via env vars (`AUTH_RATE_MAX`, `REGISTER_RATE_MAX`, `API_RATE_MAX`, etc.). En prod multi-instance, un `RedisStore` partagé sera nécessaire (MemoryStore par défaut non partagé).

---

### [2026-06-22] MindMap — structure JSON stockée en blob plutôt que normalisée
**Contexte** : L'éditeur de cartes mentales gère un graphe (nœuds + liens + zones + styles) dont la structure varie selon l'utilisateur. Une normalisation relationnelle impliquerait des tables `MindMapNode`, `MindMapLink`, `MindMapZone` avec de nombreuses colonnes JSON ou des jointures complexes à chaque lecture.
**Décision** : Stocker l'intégralité de la carte dans un champ `mindMapJson` (type JSON Sequelize). Le back ne parse jamais ce JSON — il le passe de bout en bout entre le client et la base. La logique de graphe vit exclusivement dans le front (`mindmapBuilder.js` store).
**Alternative écartée** : Tables normalisées (`MindMapNode`, `MindMapLink`…) — surcoût de migration et d'API pour un graphe dont la structure change souvent en cours de conception UI. Pas de requête SQL ciblant les nœuds individuels justifiant une normalisation en MVP.
**Conséquences** : Pas de validation du contenu JSON côté serveur (seule la présence du champ est validée). La cohérence interne du graphe est sous la responsabilité du front. La migration vers une structure normalisée nécessitera un script de conversion des JSON existants.

---

### [2026-06-22] MindMap — resolveSubject : fallback "Sujet par défaut" plutôt que 400
**Contexte** : La carte mentale doit être rattachée à un sujet (`subjectId FK NOT NULL`). Le `subjectId` fourni par le client peut être absent, nul ou pointer vers un sujet supprimé.
**Décision** : `DiagrammeService.resolveSubject(subjectId)` crée ou réutilise un sujet nommé `"Sujet par défaut"` via `findOrCreate` quand le subjectId est absent ou invalide. Aucune erreur 400 n'est retournée pour ce champ — le client ne peut pas provoquer un échec de création par un subjectId manquant.
**Alternative écartée** : Rendre `subjectId` obligatoire et retourner 400 si absent — oblige l'utilisateur à choisir une matière avant toute création de carte, ce qui freine l'usage en contexte d'exploration rapide.
**Conséquences** : Le sujet par défaut peut s'accumuler des cartes sans lien sémantique clair. En prod, le nombre de cartes rattachées à "Sujet par défaut" sera un indicateur de l'usage réel de la matière optionnelle.
