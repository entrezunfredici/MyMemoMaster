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

> **Mise à jour [2026-07-06]** : l'alternative « stocké en clair » a été révisée par le correctif OWASP A02-H1 (ticket M-00b.07b) : `setRefreshToken` hache désormais le token en SHA-256 avant stockage, et `verifyRefreshToken` hache le token entrant avant comparaison (voir `.agents/SECURITY_AUDIT_OWASP.md`). Le token en clair ne transite que vers le client.

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

> **Mise à jour [2026-07-06]** : cette décision ne reflète plus le code. `better-sqlite3` a disparu de `package.json`, et `config/db.config.js` ne déclare aucun `dialectModule` — Sequelize v6 utilise donc le driver par défaut `sqlite3`, qui est **requis** et ne doit pas être retiré des dépendances. Repasser à `better-sqlite3` demanderait de le réinstaller et d'ajouter `dialectModule: require('better-sqlite3')` — non justifié aujourd'hui (usage dev/test uniquement).

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

> ⚠️ **Révoquée le 2026-07-12** — `server_docker_compose/` a été supprimé ; le VPS test est déployé avec le compose racine et `--profile test` (voir l'entrée du 2026-07-12).

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

### [2026-06-23] MindMap — upload images : multerS3 (backend dynamique, fallback disque local)
**Contexte** : L'upload d'images dans les nœuds de carte mentale utilisait `multer.diskStorage` vers `public/uploads/mindmaps/`. En prod Docker, les fichiers sont éphémères (conteneur recréé = perte des images). Le projet dispose déjà d'un client S3 Infomaniak configuré dans `storage.config.js`.
**Décision** : `mindmapImageUpload.js` sélectionne dynamiquement le backend au démarrage : `multerS3` vers le bucket `S3_BUCKET` si la variable est définie, `diskStorage` vers `public/uploads/mindmaps/` sinon. Le contrôleur `uploadImage` détecte le mode via `process.env.S3_BUCKET && req.file.key` pour construire l'URL de réponse correcte. Le middleware existant `upload.middleware.js` n'est pas réutilisé ici car il sauvegarde vers `os.tmpdir()` en fallback (non servi par Express), ce qui briserait le dev sans S3.
**Alternative écartée** : Réutiliser `upload.middleware.js` directement — son fallback local écrit dans `os.tmpdir()`, inaccessible via le serveur HTTP statique. Dédier un middleware par domaine (mindmaps vs storage général) permet un fallback correct dans chaque contexte.
**Conséquences** : Clé S3 préfixée `mindmaps/` (distinct du préfixe `uploads/` de `Storage.middleware.js`). Les images locales dev restent servies via `app.use('/api/uploads', express.static(...))`. Les images S3 prod nécessitent une politique de bucket public sur `mindmaps/*`. Les URLs stockées dans `mindMapJson` diffèrent selon le mode (chemin relatif vs URL absolue S3) — voir décision suivante pour la résolution côté front.

---

### [2026-06-23] MindMap — résolution URL image front : priorité `path` (local) sur `url` (S3)
**Contexte** : Le contrôleur retourne `{ url, path? }` : `path` = chemin relatif (local, ex. `/api/uploads/mindmaps/foo.jpg`) ; `url` = URL publique directe (S3). Le front doit construire une URL affichable dans les deux cas.
**Décision** : `resolveImageUrl(payload)` (MindMapPalette) et la logique de `handleImageDrop` (MindMapNode) appliquent : si `payload.path` → `new URL(path, VITE_API_URL).toString()` (reconstitue l'URL publique depuis l'origine de l'API) ; sinon `payload.url` tel quel (S3). En S3, seul `url` est présent (`path` est `null`) — le fallback s'active naturellement.
**Alternative écartée** : Stocker uniquement `url` dans les deux modes (construire l'URL locale côté serveur) — perdrait l'information de chemin relatif utile pour les re-calculs si `VITE_API_URL` change entre dev/prod, et couplait le serveur au format public de l'URL.
**Conséquences** : Les cartes sauvegardées en dev local contiennent des URLs `http://localhost/api/uploads/…` dans `mindMapJson`. Si rechargées en prod S3, ces URLs pointent vers un serveur local inexistant — les images apparaîtront cassées. À documenter dans la procédure de migration dev → prod.

---

### [2026-06-22] MindMap — resolveSubject : fallback "Sujet par défaut" plutôt que 400
**Contexte** : La carte mentale doit être rattachée à un sujet (`subjectId FK NOT NULL`). Le `subjectId` fourni par le client peut être absent, nul ou pointer vers un sujet supprimé.
**Décision** : `DiagrammeService.resolveSubject(subjectId)` crée ou réutilise un sujet nommé `"Sujet par défaut"` via `findOrCreate` quand le subjectId est absent ou invalide. Aucune erreur 400 n'est retournée pour ce champ — le client ne peut pas provoquer un échec de création par un subjectId manquant.
**Alternative écartée** : Rendre `subjectId` obligatoire et retourner 400 si absent — oblige l'utilisateur à choisir une matière avant toute création de carte, ce qui freine l'usage en contexte d'exploration rapide.
**Conséquences** : Le sujet par défaut peut s'accumuler des cartes sans lien sémantique clair. En prod, le nombre de cartes rattachées à "Sujet par défaut" sera un indicateur de l'usage réel de la matière optionnelle.

---

### [2026-06-23] Sécurité — Routes Fields/Test/Tutorials : GET intentionnellement publics (lecture)
**Contexte** : Audit OWASP M-00b.07. Les routes GET `/fields`, `/tests`, `/tutorials` ne filtraient pas par userId et n'utilisaient pas authMiddleware. Après analyse, les controllers ne font aucune référence à `req.user`.
**Décision** : Seules les routes d'écriture (POST/PUT/DELETE) ont reçu `authMiddleware`. Les GET restent publics : ces ressources sont des contenus pédagogiques consultables sans connexion (référentiels, tutoriels, tests disponibles). Si le besoin métier évolue vers du contenu privé par utilisateur, il faudra ajouter authMiddleware ET un filtre userId dans le service.
**Alternative écartée** : Protéger toutes les routes (GET inclus) — bloque l'accès non authentifié à du contenu potentiellement public et nécessite un refactor des controllers pour filtrer par userId.
**Conséquences** : Les données de ces trois modules sont visibles anonymement. Aucune donnée utilisateur personnelle n'est exposée (ces entités ne contiennent pas de PII).

---

### [2026-06-23] Sécurité — forgotPassword : réponse générique 200 (anti-énumération)
**Contexte** : Audit OWASP A04. `forgotPassword` retournait 404 si l'email n'existait pas, permettant l'énumération des comptes.
**Décision** : Retourner systématiquement `200` avec le message "Si cet email existe, un code vous a été envoyé." — que l'utilisateur existe ou non. Identique pour `verifyEmail` : si l'email est inconnu, retourne `401 "Code invalide"` (même réponse que code incorrect).
**Alternative écartée** : Conserver le 404 avec un rate limiting agressif — la surface d'énumération reste entière, le rate limit est contournable par rotation d'IP.
**Conséquences** : L'UX côté client est légèrement dégradée (l'utilisateur ne sait pas s'il a une typo dans son email), ce qui est le comportement attendu et recommandé OWASP. À documenter dans les specs front.

---

### [2026-06-23] Sécurité — Login bloque si email non vérifié (hasValidatedEmail = false)
**Contexte** : Audit OWASP A01. Le champ `hasValidatedEmail` existait mais n'était jamais vérifié lors du login. Un compte pouvait être créé avec une adresse email usurpée et utilisé immédiatement.
**Décision** : Ajouter une vérification `if (!user.hasValidatedEmail)` dans `User.controller.login`, retournant 403 avec un message explicite invitant à vérifier l'email.
**Alternative écartée** : Laisser la connexion possible avec un avertissement — offre moins de garantie sur l'ownership de l'adresse email.
**Conséquences** : Les comptes créés avant cette modification mais avec `hasValidatedEmail = false` ne peuvent plus se connecter sans vérifier leur email. Les fixtures et seeds de test doivent avoir `hasValidatedEmail: true` pour que les tests de connexion continuent de fonctionner.

---

### [2026-06-23] KPI — Graphiques CSS remplacés par Chart.js + vue-chartjs (KPI-02)
**Contexte** : KPI-01 avait livré des graphiques en pur CSS (barres proportionnelles). Lors de la revue, l'utilisateur a demandé des graphiques interactifs (tooltip, hover, fill). Chart.js a été soumis à validation : licence MIT, gratuit y compris en déploiement public.
**Décision** : Adopter `chart.js@^4.5.1` + `vue-chartjs@^5.3.3`. Trois graphiques interactifs : `<Bar>` activité hebdomadaire, `<Line>` évolution scores (fill), `<Bar>` répartition Leitner (couleurs B1-B5). `ChartJS.register()` appelé une seule fois au niveau module dans `KpiPage.vue`.
**Alternative écartée** : ECharts — plus lourd, API complexe. Recharts — React uniquement. Barres CSS — pas de tooltip ni de courbe.
**Conséquences** : Dans les tests Vitest (jsdom), `chart.js` et `vue-chartjs` sont mockés (`vi.mock`) car jsdom n'implémente pas le contexte canvas. Les composants `Bar` et `Line` sont stubbed avec `<canvas />` simples. Pattern à reproduire pour tous les futurs tests de pages avec charts.

---

### [2026-06-23] KPI Alertes — Digest via modèle Reminder existant (entityType: 'kpi_digest'), pas de nouveau modèle
**Contexte** : Le système d'alertes KPI doit envoyer des notifications in-app. Deux options : nouveau modèle `KpiNotification` ou réutiliser `Reminder` (déjà utilisé pour deadlines et révisions, déjà affiché dans la cloche).
**Décision** : Réutiliser `Reminder` avec `entityType: 'kpi_digest'`, `channel: 'in_app'`, `message: JSON.stringify(items)`. Le `NotificationBellComponent` filtre déjà par `status: 'pending'` et affiche le contenu selon `entityType`. Une branche `kpi_digest` a été ajoutée : badge violet "Progression", titre "Bilan de progression", liste des items parsés.
**Alternative écartée** : Nouveau modèle `KpiDigest` — duplication de la logique de polling/affichage déjà présente dans la cloche. Nouvelle table en base pour un cas d'usage couvert par l'existant.
**Conséquences** : Le `message` d'un rappel `kpi_digest` est du JSON (tableau d'items `{icon, text}`), pas une string libre. Tout code qui lit `reminder.message` pour un digest doit passer par `parseDigest()`. Les `Reminder` kpi_digest ne sont pas liés à une entité applicative (entityId = userId, pas un ID de session/deadline).

---

### [2026-06-23] KPI Alertes — Anti-spam : lastDigestSentAt mis à jour même si 0 alertes déclenchées
**Contexte** : Le cron vérifie `lastDigestSentAt < today` avant d'envoyer un digest. Si le digest est "vide" (aucun trigger), faut-il quand même mettre à jour la date ?
**Décision** : Oui — `lastDigestSentAt` est mis à jour même quand `items.length === 0`. Le calcul des KPIs a déjà été fait ; recalculer demain est inutile si l'utilisateur est dans un bon état.
**Alternative écartée** : Ne mettre à jour que si items > 0 — relance le calcul complet chaque jour pour les utilisateurs sans problème, coût inutile en I/O.
**Conséquences** : Un utilisateur qui avait des alertes hier et n'en a plus aujourd'hui reçoit quand même un "tick" silencieux. Comportement invisible pour l'utilisateur, avantageux pour les perfs.

---

### [2026-06-23] Sauvegardes auto — service Docker dédié avec script inline plutôt que crontab VPS
**Contexte** : M-00b.01 avait livré un `scripts/backup.sh` lancé manuellement ou via crontab hôte. Pour rendre les sauvegardes réellement automatiques (démarrage sans intervention lors du déploiement), deux approches ont été évaluées.
**Décision** : Service Docker Compose `backup` avec le script de dump embarqué en `command:` inline. Même pattern que le service `front` (qui injecte `window.__APP_CONFIG__` au runtime). Le service démarre avec `compose up -d backup` et redémarre automatiquement. Le script calcule la prochaine heure cible (BACKUP_HOUR) et dort jusqu'à elle, puis loop 24h.
**Alternative écartée** : Crontab hôte (déjà documenté dans RUNBOOK) — requiert une intervention manuelle sur le VPS. Busybox crond dans le conteneur — nécessite de gérer la non-transmission des variables d'environnement Docker aux jobs crond (problème classique), plus complexe sans bénéfice. Supercronic — nouvelle dépendance non justifiée.
**Conséquences** : Le script inline est plus verbeux dans le `docker-compose.yml` mais entièrement auto-suffisant (pas de fichier externe à déployer). Le `$$VAR` (YAML) → `$VAR` (shell) est la convention à respecter dans tous les blocs `command:` qui utilisent des variables de l'environnement conteneur.

---

### [2026-06-23] Email vérification — lien cliquable avec code en query param (pas de token hashé)
**Contexte** : L'inscription génère un code de vérification 6 chiffres (`validEmailCode`) stocké en clair. Pour l'UX, un lien cliquable est préférable à un copier-coller de code.
**Décision** : Le lien contient `?email=<email>&code=<code>` en query params. `VerifyEmailPage.vue` lit ces params à l'`onMounted` et appelle auto. `authStore.verifyEmail()`. Le code 6 chiffres reste inchangé (stockage en clair, validité 30 min).
**Alternative écartée** : Token opaque + SHA-256 (pattern reset-password) — plus sécurisé mais aurait nécessité une migration du modèle `User` (colonne `validEmailCode` est STRING, pas STRING(64)). Différé à un ticket sécurité dédié si l'exigence évolue.
**Conséquences** : Le code est exposé dans l'URL (historique navigateur, logs serveur). Risque faible pour MVP car le token expire en 30 min et n'est valable qu'une fois.

---

### [2026-06-23] KPI — Endpoint unique GET /kpi/my (agrégation serveur, pas de requêtes multiples côté front)
**Contexte** : Les KPIs agrègent des données de 4 sources (RevisionSession, TestResult, LeitnerSystem/Box/Card, Subject). Le frontend aurait pu appeler 4 endpoints séparés ou 1 endpoint omnibus.
**Décision** : Un seul endpoint `GET /kpi/my` qui fait 3 requêtes Sequelize en `Promise.all` et calcule tout dans le service. Le front reçoit un objet `{ revision, exercises, leitner, subjects, discipline, badges }` en un seul appel.
**Alternative écartée** : 4 endpoints séparés — plus modulaire mais oblige le front à gérer 4 chargements parallèles et à agréger les données pour les badges (cross-cutting).
**Conséquences** : L'endpoint peut retourner beaucoup de données pour un utilisateur très actif (des centaines de sessions, de cartes). Acceptable MVP. Si la latence devient un problème, les données Leitner (la plus volumineuse) pourraient être paginées ou mises en cache.

---

### [2026-06-25] KPI pédagogiques — décrochage basé sur RevisionSession uniquement (pas LeitnerCard ni TestResult pour l'activité)
**Contexte** : Le calcul de `lastActivityAt` et `daysInactive` pour la détection de décrochage nécessite de choisir une source d'activité. Trois sources disponibles : `RevisionSession`, `LeitnerCard.last_review_at`, `TestResult.completedAt`.
**Décision** : Utiliser uniquement `RevisionSession.date` comme proxy d'activité générale. C'est la source la plus représentative d'une intention de travail planifiée, et la plus simple à requêter (un seul `findAll` par groupe).
**Alternative écartée** : Agréger les 3 sources (MAX de RevisionSession.date, LeitnerCard.last_review_at, TestResult.completedAt) — plus complet mais nécessite 3 requêtes supplémentaires et une logique de max par utilisateur. Différé si le besoin de précision augmente.
**Conséquences** : Un étudiant qui fait des exercices mais ne crée pas de RevisionSession apparaît comme inactif. Documenté dans `diagrams/kpi_pedagogiques.md` section Limites.

---

### [2026-06-24] Tags — M2M global (non scopé utilisateur) avec tables junction dédiées
**Contexte** : Le ticket S-05.01 demande un système de tags applicable aux mind maps, systèmes Leitner et exercices. Deux options : tags scopés par utilisateur (chaque user a ses propres tags), ou tags globaux partagés.
**Décision** : Tags globaux (pas de `userId` dans `Tag`). 3 tables junction dédiées (`MindMapTag`, `LeitnerSystemTag`, `TestTag`) avec Sequelize `belongsToMany`. L'opération de mise à jour des tags utilise `entity.setTags(tags)` (Sequelize helper qui fait un replace atomique). Guard vide : `tagIds.length ? Tag.findAll(IN) : []` pour éviter `IN ()` SQL invalide.
**Alternative écartée** : Tags scopés par user — plus isolant mais complexifie les requêtes (nécessite un `userId` dans Tag + filtre dans chaque include). Différé si la segmentation devient une exigence produit.
**Conséquences** : Un tag créé par un utilisateur est visible et utilisable par tous les utilisateurs. Si deux utilisateurs créent "Maths", il n'y a qu'une seule entrée (contrainte `UNIQUE` sur `name`). La création inline dans `TagSelectorComponent` peut échouer avec un conflit 409 si le tag existe déjà — le composant doit gérer ce cas (actuellement il affiche une erreur toast, le tag existant reste disponible dans la liste).

### [2026-06-26] ClassroomPage — coordinateur mince + 3 vues filles (Établissement / Enseignant / Étudiant)
**Contexte** : ClassroomPage.vue était une page monolithique combinant la liste de groupes, les KPIs, la gestion des membres et les actions enseignant. L'ajout des sections/rendus, ressources, emploi du temps récurrent et des 3 profils d'utilisateurs rendait cette approche ingérable.
**Décision** : ClassroomPage.vue devient un coordinateur de 30 lignes qui sélectionne la vue fille selon le rôle (`isAdmin` → Établissement, `isEnseignant` → Enseignant, sinon → Étudiant). Les admins disposent d'un sélecteur pour basculer entre vues. Les invitations en attente restent affichées dans le coordinateur (transversal à tous les rôles).
**Alternative écartée** : Tabs dans une seule page — plus léger mais couplait les stores/imports de 3 profils distincts dans un seul composant, avec des `v-if` imbriqués illisibles.
**Conséquences** : Chaque vue charge ses propres stores et ne connaît pas les autres. Un admin roleId=4 voit la vue Établissement par défaut ; pour voir la vue Enseignant d'un groupe dont il est teacher, il bascule manuellement. La détection "enseignant dans ce groupe" se fait côté front (`members.some(m => m.userId === userId && m.role === 'teacher')`) — dépend que `fetchGroups` retourne les membres avec leur User.

---

### [2026-06-25] Invitation — email comme clé d'invitation (pas userId), deux branches selon existence du compte
**Contexte** : L'ancien système d'invitation nécessitait de connaître l'`userId` de la cible, inutilisable pour inviter quelqu'un qui n'a pas encore de compte.
**Décision** : Le formulaire et l'API reçoivent désormais `targetEmail` (adresse email) au lieu de `targetUserId`. Le service `Invitation.service.invite()` applique une logique à deux branches : (1) si un `User` avec cet email existe → `ClassGroupUsers.findOrCreate` immédiat, 200 renvoyé, aucune invitation stockée ; (2) sinon → `Invitation` créée avec `targetEmail` (+ `targetUserId: null`), email envoyé via `sendEmail`. À l'inscription (`User.service.create`), un hook appelle `_processPendingEmailInvitations` : vérifie les `Invitation` en attente par `targetEmail`, crée les memberships correspondants et passe le statut à `accepted`.
**Alternative écartée** : Invitation token unique dans l'email (lien magic-link) — plus user-friendly mais nécessite un endpoint public `GET /invitations/accept?token=…`, une colonne token supplémentaire et une gestion d'expiration. Différé à un ticket UX dédié.
**Conséquences** : `Invitation.targetUserId` est maintenant nullable (migration `20260625000001`). `Invitation.targetEmail` ajouté (STRING(255), nullable). `User.service.js` importe `Invitation` et `ClassGroupUsers` (couplage acceptable : le hook est localisé dans `_processPendingEmailInvitations`). L'email envoyé aux non-inscrits est informatif (pas de lien magic-link) ; l'utilisateur doit s'inscrire avec l'email invité.

### [2026-06-26] KPI pédagogiques — corrections post-revue S-01.09

**Contexte** : La revue de code S-01.09 a identifié 8 bugs dont 3 de données critiques.

**Décision** :
- `Deadline.findAll` scopé au groupe via join `EventOccurrence → CalendarEvent.classGroupId` (évite la contamination cross-groupe quand un enseignant appartient à plusieurs groupes).
- `RevisionSession.findAll` filtré sur `isDone: true` (évite que les sessions planifiées/futures faussent le calcul de `lastActivityAt`).
- `daysInactive` calculé via `dayjs().startOf('day').diff(dayjs(lastActivityAt), 'day')` au lieu de `new Date()` brut (évite le décalage UTC sur les champs DATEONLY).
- `atRiskStudents` computed : `?.students?.filter(...)` avec double chaînage optionnel (évite le crash TypeError si la clé `students` est absente de la réponse API).
- `expandedAnalyticsStudents` réinitialisé à chaque `loadStudentAnalytics` (évite l'état expand persistant cross-groupe).
- `findGroupEvents` et `findGroupDeadlines` déplacés du controller vers le service (`getGroupEvents` / `getGroupDeadlines`) — respecte l'architecture `controller → service → model`.
- Validator `findById` (`param('id').isInt`) ajouté sur `GET /:id/events` et `GET /:id/deadlines` pour éviter les 500 PostgreSQL sur un `:id` non entier.

**Alternative écartée** : Garder la logique inline dans le controller pour les deux handlers events/deadlines — plus rapide à écrire mais viole CLAUDE.md et duplique la logique d'auth.

**Conséquences** : `ClassGroup.service.js` importe désormais `EventOccurrence, CalendarEvent, Test`. Le controller `ClassGroup.controller.js` n'importe plus de modèles directement. Le validator `ClassGroup.validators.js` utilise `param` en plus de `body`.

---

### [2026-06-27] KpiConsent — consentement par quadruplet (étudiant, enseignant, groupe, matière)
**Contexte** : L'étudiant doit pouvoir accorder l'accès à ses KPI à un enseignant — potentiellement filtré par matière (ex. partager ses KPI de physique uniquement avec le prof de physique).
**Décision** : Consentement par quadruplet `(studentId, teacherId, classGroupId, subjectId)` où `subjectId` est nullable (null = accès global tous sujets, entier = filtré par matière). Contrainte unique sur ce quadruplet. Un étudiant peut avoir plusieurs consentements pour le même (teacher, group) si chaque entrée concerne une matière différente.
**Alternative écartée** : Triplet sans subjectId (global uniquement) — plus simple, mais ne permet pas la granularité par matière demandée. / Consentement global par liste de subjects (colonne JSON) — difficile à indexer et à contraindre en SQL.
**Conséquences** : L'UI front doit proposer un sélecteur de matière lors de l'accord. La gestion de l'idempotence pour subjectId=null est faite au niveau applicatif (`findOrCreate`) car SQL traite NULL comme distinct dans les indexes uniques (SQLite et PostgreSQL <15). La migration `20260627000001` inclut le champ `subjectId` dès la création de la table.

---

### [2026-06-27] KpiConsent — pas de bypass admin sur les KPI personnels
**Contexte** : Par convention dans ce projet, les admins (roleId 1 et 4) ont accès total à la gestion des groupes et des ressources pédagogiques. La question était d'appliquer ou non ce bypass aux KPI personnels des étudiants.
**Décision** : Aucun bypass admin. Seul un membre avec `role='teacher'` dans le groupe ET disposant d'un consentement explicite de l'étudiant peut consulter ses KPI personnels. `_isTeacherInGroup` dans `KpiConsent.service.js` ne consulte pas `User.roleId`.
**Alternative écartée** : Bypass admin comme dans `ClassGroupResource._canWrite` — rejeté car les KPI personnels sont des données privées de l'étudiant (révision, scores, streaks). Le bypass admin est justifié pour la gestion opérationnelle des groupes, pas pour l'accès aux données personnelles sans accord.
**Conséquences** : Un admin qui veut voir les KPI d'un étudiant doit demander son consentement comme n'importe quel enseignant. Cohérent avec la valeur utilisateur : "l'étudiant conserve le contrôle sur ses données".

---

### [2026-06-26] Accès aux fichiers S3 privés — presigned URL vs. proxy streaming
**Contexte** : Les fichiers uploadés sur Infomaniak Swiss Backup (bucket privé) ne sont pas accessibles via leur URL publique. Une première approche utilisait un endpoint proxy backend (`GET /storage/stream`) qui récupérait le fichier avec `GetObjectCommand` et le pipe-ait vers la réponse Express. Cette approche échouait silencieusement avec Infomaniak (le `Body.pipe(res)` d'AWS SDK v3 est moins fiable hors AWS) et complexifiait le front (blob URL + popup blocker).
**Décision** : Utiliser `@aws-sdk/s3-request-presigner` pour générer une URL signée temporaire (15 min) côté serveur. Le backend retourne `{ url }`, le front redirige directement vers cette URL. Pour les téléchargements, `disposition=attachment` passe via `ResponseContentDisposition` qui force `Content-Disposition: attachment` dans la réponse S3.
**Alternative écartée** : Proxy streaming (`Body.pipe(res)`) — plus de contrôle sur la bande passante et les droits, mais fragile avec les providers S3-compatibles non-AWS, et consomme la bande passante du serveur API pour chaque téléchargement.
**Conséquences** : Les URLs signées expirent après 15 min — non partageable hors session. Si un utilisateur copie une presigned URL, elle expire. La bande passante S3 → client est directe (pas transit API). Infomaniak doit respecter `ResponseContentDisposition` (standard S3 — validé en pratique).


---

### [2026-06-28] Séries d'exercices — propriété par créateur + assignation M2M aux groupes

**Contexte** : Les exercices (Test) étaient globaux et publics. La demande est de les rendre privés par défaut (seul le créateur les voit), tout en permettant à un enseignant de les partager avec un ou plusieurs groupes. Le contexte d'utilisation (privé vs. groupe) détermine comment les scores sont comptabilisés dans les KPI.

**Décision** : Table junction `TestClassGroup` (M2M entre Test et ClassGroup). Un test sans entrée dans cette table est privé — seul son créateur (`userId`) y accède. Un test avec des entrées est accessible aux membres des groupes assignés. `GET /tests` et `GET /tests/:id` requièrent désormais un JWT. La route `POST /tests/:id/groups` (propriétaire uniquement) permet de gérer les assignations via `setClassGroups()`. Dans `Kpi.service.js`, seuls les résultats des tests **sans groupe** (`classGroups.length === 0`) alimentent les KPI personnels. Dans `ClassGroup.service.js`, les KPI pédagogiques interrogent `TestClassGroup` directement (remplace l'approche via Deadline/EventOccurrence/CalendarEvent qui était indirecte et fragile).

**Alternative écartée** : Une FK `classGroupId` nullable sur `Test` (un seul groupe) — ne permet pas d'assigner à plusieurs groupes simultanément. Garder la recherche via Deadline — indirecte, ne couvre pas les exercices assignés sans deadline associée.

**Conséquences** : Migration `20260628000001` à passer. Les tests avec `userId=null` (legacy) restent visibles de tous les utilisateurs connectés. Les tests Jest existants sur Test.service/controller utilisent l'ancienne signature sans `userId` — à adapter. Le partage KPI pédagogiques (`KpiConsent`) continue de fonctionner sur le même jeu de données filtré.

---

### [2026-06-27] Suivi rendus enseignant — endpoint /status séparé plutôt que jointure dans findBySection
**Contexte** : Le prof veut voir, pour chaque section "rendu", qui a soumis et qui n'a pas encore soumis. `findBySection` ne retourne que les soumissions existantes — les étudiants sans soumission sont invisibles.
**Décision** : Nouvel endpoint `GET /class-groups/:id/sections/:sectionId/submissions/status` qui croise `ClassGroupUsers` (rôle=student) avec `ClassGroupSubmission`. Retourne `{ submitted: [...], notSubmitted: [...] }`. `findBySection` est conservé inchangé (utilisé en interne / vue étudiant).
**Alternative écartée** : Enrichir `findBySection` avec un JOIN OUTER sur ClassGroupUsers — change l'interface publique existante, casse les consumers et mélange deux usages distincts (liste de rendus vs statut de participation).
**Conséquences** : La route `/status` est déclarée avant `/submissions` dans le router Express pour éviter un conflit de chemin. `ClassGroupUsers` doit avoir un `include: [User]` pour transmettre nom/email — une requête DB supplémentaire par appel, acceptable car c'est une action enseignant ponctuelle.

---

### [2026-06-27] Cache TTL Pinia — condition groupId actif obligatoire
**Contexte** : Les stores `calendarEvents`, `deadlines`, `classGroupSections`, `classGroupResources` utilisent un cache TTL par `groupId` pour éviter des appels API redondants lors de la navigation. L'implémentation initiale stockait `_cache[groupId] = timestamp` sans tracker le groupe actif. Bug : après `fetchByGroup(A)` puis `fetchByGroup(B)`, revenir sur A dans les 5 min retournait `true` immédiatement (cache A valide) mais le tableau de données (`groupEvents`, etc.) contenait encore les données de B.
**Décision** : Ajouter `_currentGroupId` dans le state de chaque store. La garde TTL inclut `this._currentGroupId === groupId`. Le cache n'est utilisé que si c'est le même groupe qu'au dernier fetch. Si l'utilisateur change de groupe, on refetche toujours.
**Alternative écartée** : Stocker les données par `groupId` (ex. `eventsByGroup: { [groupId]: [] }`) — correct mais change le contrat de l'interface publique et nécessite de mettre à jour toutes les vues qui lisent `store.groupEvents` directement. / Supprimer le cache TTL entre groupes — corrige le bug mais on perd le bénéfice pour le scénario navigation aller-retour.
**Conséquences** : Le cache TTL ne bénéficie que du cas "même groupe, re-mount rapide" (navigation aller-retour vers la même page avec le même groupe actif). Le switch entre groupes est toujours un fetch réseau. Ce comportement est correct : les données affichées doivent toujours correspondre au groupe sélectionné.

---

### [2026-06-30] Migration vers Helm pour le déploiement Kubernetes
**Contexte** : Les manifests `k8s/preprod/` et `k8s/prod/` étaient quasi-identiques (14 fichiers en doublon). Toute modification de resources/probes/config devait être faite deux fois.
**Décision** : Un seul chart Helm `helm/` avec `values-preprod.yaml` et `values-prod.yaml`. Le CD utilise `helm upgrade --install --atomic` au lieu de `kubectl apply` + `rollout restart`. Le flag `--set rolloutTimestamp=$(date +%s)` force un rolling update à chaque push même avec des images `:latest`. Le script `k8s/helm-migrate.sh` annote les ressources existantes pour adoption Helm sans downtime.
**Alternative écartée** : Kustomize — pas de logique conditionnelle (Redis Deployment vs StatefulSet selon l'env), moins expressif que Helm pour les valeurs par environnement.
**Conséquences** : Les anciens dossiers `k8s/preprod/` et `k8s/prod/` sont conservés en référence mais ne sont plus appliqués par le CD. Avant le premier déploiement Helm, exécuter `bash k8s/helm-migrate.sh <env>` pour annoter les ressources existantes.

---

### [2026-06-28] TestClassGroup — table de jonction M2M pour l'affectation exercices ↔ groupes

**Contexte** : Un enseignant doit pouvoir affecter une série d'exercices à un ou plusieurs groupes classes (S-03.05). Le test (exercice) appartient à son créateur ; les groupes sont indépendants. Un exercice peut être partagé avec 0, 1 ou N groupes.
**Décision** : Table de jonction `TestClassGroup` (`testId` FK→Test, `classGroupId` FK→ClassGroup, contrainte unique `(testId, classGroupId)`, ON DELETE CASCADE sur les deux). Sequelize `belongsToMany` des deux côtés (`Test.classGroups`, `ClassGroup.assignedTests`). Méthode `setClassGroups()` (Sequelize helper) pour remplacer l'ensemble des groupes en une seule opération — évite de gérer les deltas manuellement. Endpoint `POST /tests/:id/groups` avec le tableau complet des `groupIds` à chaque appel (idempotent).
**Alternative écartée** : Colonne `classGroupId` nullable directement sur `Test` — un exercice ne pourrait appartenir qu'à un seul groupe. Rejeté car un enseignant peut enseigner la même matière à plusieurs classes. / Table `TestAssignment` avec `assignedBy` + `assignedAt` — plus riche mais surconçu pour le MVP.
**Conséquences** : Migration `20260628000001-create-testclassgroup-table.js` à passer en prod. `Test.service.findAll(userId)` effectue 2 requêtes supplémentaires (memberships + assignments) pour construire la clause `OR` — acceptable au volume MVP. Les KPI persos filtrent sur `classGroups.length === 0` (privé) ; les KPI pédagogiques filtrent sur `classGroups.length > 0`.

### [2026-06-30] submitAnswers — contrôle d'accès identique à findOne
**Contexte** : `Test.service.submitAnswers` ne vérifiait pas si l'utilisateur avait accès au test avant de permettre la soumission. Un utilisateur connaissant l'ID d'un test privé pouvait obtenir la correction complète (bonnes réponses + scores sémantiques) via `POST /tests/:id/submit`.
**Décision** : Réutiliser exactement la même logique d'accès que `findOne` dans `submitAnswers` : propriétaire (userId match), test legacy (userId null), ou membre d'un groupe assigné via `ClassGroupUsers`. Retourner `null` (→ 404 controller) si aucune condition n'est remplie.
**Alternative écartée** : Extraire la logique d'accès dans une méthode privée `_checkAccess(test, userId)` — améliorerait la maintenabilité mais constitue une refactorisation hors du périmètre d'une revue de code.
**Conséquences** : `submitAnswers` fait désormais une requête `ClassGroupUsers.findOne` supplémentaire pour les tests non-propriétaires. Le include `CLASS_GROUPS_INCLUDE` est ajouté au `findByPk` initial. Coût négligeable en MVP.

---

### [2026-06-30] S-04.01 — Etablissement sans FK sur User/ClassGroup en V1 (scope via Invitation.invitedBy)
**Contexte** : Pour scoper les droits de l'admin établissement (roleId=4) à ses propres utilisateurs, deux options : (1) ajouter `etablissementId` sur `User` et `ClassGroup`, ce qui nécessite des migrations et rompt l'accès actuel de l'admin via `requireRole(1, 4)` sur les groupes ; (2) utiliser `Invitation.invitedBy` comme indicateur de scope implicite.
**Décision** : En V1, pas de FK `etablissementId` sur `User` ni `ClassGroup`. Le scope de l'admin établissement pour l'activation/désactivation de comptes est dérivé de `Invitation.invitedBy = req.user.id`. L'entité `Etablissement` (name, code, adminId) est créée comme entité de configuration légère sans jointure directe aux groupes ou aux utilisateurs.
**Alternative écartée** : `etablissementId` FK sur `User` et `ClassGroup` dès V1 — correct architecturalement mais nécessite 2 migrations + mise à jour de tous les services existants qui ne connaissent pas ce champ. Risque de casser les tests existants (724+ tests). Différé en V2.
**Conséquences** : Un utilisateur peut appartenir à plusieurs établissements si il a été invité par des admins différents — cas rare en MVP mais non contraint. La garde d'activation vérifie `Invitation.invitedBy` et non un lien direct. Si un admin réinvite un utilisateur déjà membre, deux invitations coexistent — sans impact car `invitedBy` sert uniquement de permission gate, pas de lien structurel.

---

### [2026-06-30] S-04.01 — AuditLog conçu en V1, implémentation différée en V2
**Contexte** : Le périmètre S-04 inclut un audit trail (traçabilité des actions admin). Deux options : (1) implémenter la table `AuditLog` + la logique d'insertion dès V1 ; (2) concevoir le schéma maintenant et l'implémenter en V2.
**Décision** : L'entité `AuditLog` (id, actorId, action, entityType, entityId, metadata JSON, createdAt) est conçue et documentée dans `diagrams/etablissement_admin_perimeter.md` mais non implémentée en V1. En V1, les logs Winston + Morgan couvrent la traçabilité minimale (chaque requête HTTP loguée avec acteur, endpoint, status).
**Alternative écartée** : Implémenter `AuditLog` dès V1 — nécessite de hooker tous les services concernés (User, ClassGroup, Invitation, Etablissement) et d'écrire les tests associés. Complexité disproportionnée pour une fonctionnalité non bloquante en MVP.
**Conséquences** : Pas de requêtage SQL sur l'historique des actions admin en V1 (uniquement logs fichier). À implémenter avant toute certification RGPD ou audit de conformité. La migration et le schéma sont prêts dans le document — l'implémentation V2 ne nécessitera pas de re-analyse.

---

### [2026-06-30] S-04.04 — isActive vérifié dans requireRole, pas dans Auth.middleware
**Contexte** : Pour bloquer les comptes désactivés sur les appels API, deux emplacements étaient candidats : `Auth.middleware` (vérifie le JWT) ou `requireRole` (vérifie le rôle avec un DB lookup déjà présent).
**Décision** : Garde `isActive` ajoutée dans `requireRole.middleware.js` uniquement. Auth.middleware reste synchrone (JWT uniquement, sans DB call). La garde au login est ajoutée dans `User.controller.js`.
**Alternative écartée** : Ajouter un `User.findByPk` dans Auth.middleware — rompt les 28 tests controllers existants qui mockent `User: {}` (sans `findByPk`). Le coût de migration était disproportionné par rapport au gain V1 (les routes sans requireRole concernent des opérations peu sensibles, le JWT expire en 15 min).
**Conséquences** : Les routes `authMiddleware`-seules (`GET /users/:id`, `GET /invitations/mine`, etc.) n'appliquent pas la garde `isActive`. Acceptable en V1 car : login bloqué → pas de nouveau token, JWT actuel expire vite. À reconsidérer si durée JWT augmente ou si routes sensibles n'utilisent pas requireRole.

---

### [2026-06-30] S-04.04 — Scope roleId=4 sur GET /etablissements/:id géré dans le controller
**Contexte** : L'admin établissement (roleId=4) doit pouvoir accéder aux détails de son propre établissement, mais pas aux autres. Deux options : scope dans le service ou dans le controller.
**Décision** : Le controller `findOne` inspecte `req.user.roleId` : si roleId=4, il appelle `EtablissementService.findByAdmin(requesterId)` et vérifie que l'id demandé correspond ; sinon appel normal via `findOne(id)`. Le service expose `findByAdmin` comme méthode autonome.
**Alternative écartée** : Passer `requesterId` + `roleId` au service et y appliquer le scope — l'injection de la logique HTTP (roleId) dans le service viole la séparation des responsabilités.
**Conséquences** : Le controller contient une branche de routing logique (`if roleId === 4`), ce qui est acceptable car c'est de la logique de présentation (qui voit quoi), pas de la logique métier.

---

### [2026-06-30] S-04.03 — AuditLog sans updatedAt (log immuable)
**Contexte** : Les tables Sequelize ont habituellement `timestamps: true` (createdAt + updatedAt). Pour `AuditLog`, un enregistrement ne doit jamais être modifié après insertion — updatedAt n'a pas de sens et induirait en erreur.
**Décision** : `timestamps: false` sur AuditLog + uniquement la colonne `createdAt` déclarée manuellement. Pas de `UPDATE` ni `DELETE` prévu en SQL sur cette table.
**Alternative écartée** : `timestamps: true` et ignorer `updatedAt` — la colonne existante mais jamais mise à jour est trompeuse pour les futures lectures de schéma.
**Conséquences** : Le service AuditLog (V2) ne doit exposer que `create` et `findAll` — aucune méthode `update` ou `delete`. Si une entrée de log est corrompue, la corriger directement en SQL avec un script de migration one-shot.

---

### [2026-06-30] S-04.02 — ClassroomEtablissementView en onglets, AdminPlatformePage séparée
**Contexte** : La vue admin établissement (`ClassroomEtablissementView.vue`) couvre la gestion des groupes. S-04 ajoute la gestion des utilisateurs et un tableau de bord. Deux options : (1) tout consolider dans `ClassroomEtablissementView.vue` ; (2) extraire l'espace admin plateforme dans une page dédiée.
**Décision** : `ClassroomEtablissementView.vue` est étendue en 3 onglets (Tableau de bord / Groupes / Utilisateurs) sans déplacer son contenu actuel — l'onglet Groupes enveloppe l'existant tel quel. L'espace admin plateforme (CRUD établissements, liste globale utilisateurs) va dans une **nouvelle page `AdminPlatformePage.vue`** sur la route `/admin` avec `meta.roles: [1]`. Les deux audiences (admin établissement et admin plateforme) sont ainsi séparées sans couplage.
**Alternative écartée** : Tout dans `ClassroomEtablissementView.vue` avec des sections conditionnelles sur `isAdminPlateforme` — crée une vue "fourre-tout" qui gère deux périmètres fonctionnels distincts, difficile à maintenir et à tester.
**Conséquences** : Un lien "Administration" s'ajoute dans `NavbarComponent.vue` visible uniquement pour roleId=1. Le guard `meta.roles: [1]` existant suffit pour la protection de `/admin`. Les deux stores sont distincts : `etablissements.js` (CRUD pour admin plateforme) et `adminUsers.js` (activate/deactivate pour les deux rôles admin avec scope différent).

---

### [2026-06-30] Routes Question — authMiddleware sur les routes d'écriture
**Contexte** : Les routes `POST /questions`, `PUT /questions/edit/:id`, `DELETE /questions/:id` n'avaient pas d'`authMiddleware`, contrairement à la décision 2026-06-23 ("Seules les routes d'écriture (POST/PUT/DELETE) ont reçu authMiddleware"). Les GET restent intentionnellement publics.
**Décision** : Ajouter `authMiddleware` sur les 3 routes d'écriture. Les GET (`/`, `/tests/:testId`, `/card/:cardId`, `/:id`, `/correction/:id`) restent publics (contenu pédagogique).
**Alternative écartée** : Ajouter ownership sur update/delete (vérifier que la question appartient au créateur) — les questions ne sont pas scopées par userId dans le modèle actuel ; différé si ce besoin émerge.
**Conséquences** : Les tests Question.controller ont été mis à jour pour envoyer un token JWT sur les routes protégées. Un mock `reminder.worker` manquant a été ajouté dans ce test (causa un import silencieux brisé).

---

### [2026-06-30] Question.content — champ JSON polymorphe sérialisé en TEXT
**Contexte** : Les 4 types de questions ont des structures de données radicalement différentes. Stocker chaque variante dans des colonnes dédiées aurait multiplié les colonnes nullables et les migrations.
**Décision** : Un seul champ `content TEXT` avec get/set Sequelize qui JSON.parse/stringify automatiquement. La structure attendue par type est documentée dans `diagrams/exercices_types_correction.md` et validée par le service à la correction (les clés manquantes defaultent à `null`/`[]` sans erreur).
**Alternative écartée** : Colonnes séparées par type (`correct_answer TEXT`, `options JSONB`, etc.) — migration complexe à chaque nouveau type, couplage fort entre modèle et type de question. / Type JSONB PostgreSQL — pas compatible SQLite dev, dialecte-dépendant.
**Conséquences** : Pas de validation SQL de la structure interne du `content` — la cohérence est assurée uniquement au niveau service. Le getter Sequelize retourne `null` si le JSON est malformé (try/catch silencieux).

---

### [2026-07-01] Renommage des branches CI/CD : `test`→`dev`, `preprod`→`staging` (infra interne non touchée)
**Contexte** : Les noms de branches Git `test` et `preprod` prêtaient à confusion avec les environnements applicatifs qu'ils déclenchent. `experiment`/`dev` a été envisagé mais écarté (voir échange) car `preprod` est un environnement stable miroir de la prod, pas un bac à sable ; `test`/`dev` conviennent mieux à l'environnement VPS léger.
**Décision** : Renommer uniquement les branches Git et les triggers `ci.yml`/`cd.yml` : `test` → `dev`, `preprod` → `staging` (`main` inchangé). Les noms internes d'infrastructure déjà en place restent identiques : images DockerHub (`mymemomaster_test_*`, `mymemomaster_preprod_*`), namespace K8s (`mymemomaster-preprod`), release Helm (`mmm-preprod`), chemin VPS (`/var/www/html/my_memo_master_test`), manifests (`k8s/preprod/`).
**Alternative écartée** : Renommage complet de l'infra (namespace K8s, images, chemin VPS, ingress) — plus cohérent sémantiquement mais nécessite de recréer le namespace K8s (secrets/configmaps à refaire), de repousser les images sous un nouveau nom, et de migrer le dossier VPS sans casser le déploiement en cours ; reporté à une décision explicite si besoin.
**Conséquences** : `README.md` documentait déjà une branche `dev` comme branche d'intégration de base (`git checkout dev` avant de créer une feature branch) — ce renommage fait donc de `dev` à la fois la branche d'intégration quotidienne ET le trigger de déploiement automatique vers le VPS test. Chaque merge sur `dev` déploie désormais automatiquement sur le VPS test (comportement à confirmer avec l'équipe si ce n'est pas voulu).

### [2026-07-04] assignAdmin — désactivation admin-à-admin intentionnellement bloquée
**Contexte** : La revue S-04.12 a identifié qu'un admin plateforme (roleId=1) pouvait désactiver tous les autres admins plateforme, permettant à un attaquant de rester le seul admin actif.  
**Décision** : `setActive` bloque la désactivation d'un user roleId=1 par tout autre roleId=1. Aucun admin plateforme ne peut désactiver un autre admin plateforme via l'API.  
**Alternative écartée** : Permettre la désactivation admin-à-admin pour gérer les comptes compromis — trop risqué sans mécanisme de "dernier recours" ; une intervention directe en BDD est préférable pour ce cas extrême.  
**Conséquences** : Pour désactiver un compte admin plateforme compromis, il faut une intervention directe en base de données. Le self-deactivation est également bloqué (targetId === actorId).

---

### [2026-07-04] assignAdmin — un user ne peut gérer qu'un seul établissement à la fois
**Contexte** : Sans garde, un admin plateforme pouvait assigner le même user comme admin de deux établissements (double roleId=4 + double accès via etab.adminId !== requesterId).  
**Décision** : `assignAdmin` vérifie `Etablissement.findOne({ where: { adminId: user.userId } })` avant la promotion. Retourne `'already_admin'` si un autre établissement pointe déjà vers cet admin.  
**Alternative écartée** : Permettre le multi-établissement — incompatible avec le modèle de données actuel (pas de table junction admin↔etab).  
**Conséquences** : Pour changer d'établissement, l'admin doit d'abord être révoqué du premier. L'ancien admin perd son roleId=4 lors du remplacement (réinitialisé à 2).

---

### [2026-07-04] getAuditLogs — limit plafonnée à 500, entityId validé numériquement
**Contexte** : `filters.limit` et `filters.entityId` venaient directement de req.query (strings). Une string non numérique produisait NaN dans les clauses SQL Sequelize (crash PostgreSQL ou dump de table).  
**Décision** : Validation via `Number.isInteger()` + plafond `Math.min(val, 500)`. La route `GET /:id/audit` utilise désormais un validator express-validator dédié (`auditLogs`) qui refuse les valeurs non entières avant d'atteindre le service.  
**Alternative écartée** : Valider uniquement dans le service — la validation au niveau route est préférable (rejet rapide, message d'erreur structuré).  
**Conséquences** : Requêtes avec `limit > 500` sont automatiquement plafonnées. Les clients doivent paginer pour obtenir plus de 500 entrées d'audit.

---

### [2026-07-04] ClassroomPage — sélecteur de vue conditionné sur `isAdmin`, pas sur le nombre de vues disponibles
**Contexte** : Le commit `f4d654e` a introduit `v-if="availableViews.length > 1"` pour afficher le sélecteur "Vue :", couplé à un `availableViews` rendu exclusif pour l'admin plateforme (`[{key:'plateforme'}]` uniquement). Résultat : le sélecteur restait affiché pour un simple étudiant/enseignant (2 vues toujours poussées : enseignant + étudiant) et disparaissait pour l'admin plateforme (1 seule vue), cassant 3 tests CI (`ClassroomPage.test.js`).
**Décision** : Le sélecteur reste conditionné strictement sur `isAdmin` (roleId 1 ou 4), pas sur le nombre de vues. `availableViews` redevient additif : `plateforme` s'ajoute aux vues (étalissement/enseignant/étudiant) pour l'admin plateforme au lieu de les remplacer — un admin plateforme peut donc basculer entre les 4 vues, un admin établissement entre 3, et un enseignant/étudiant n'a pas de sélecteur (vue fixe imposée par son rôle).
**Alternative écartée** : Garder `availableViews.length > 1` en poussant conditionnellement enseignant/étudiant selon le rôle — plus de complexité pour un gain nul, et risque de recréer la même régression au prochain ajout de vue.
**Conséquences** : Toute nouvelle vue ajoutée à `ClassroomPage.vue` doit être poussée dans `availableViews` de façon additive (jamais en remplacement d'une vue existante) pour ne pas rompre l'invariant "le sélecteur n'apparaît que pour `isAdmin`".

---

### [2026-07-06] Health endpoint déclaré hors du routeur v1 (avant le rate limiter)
**Contexte** : La readinessProbe K8s cible `/api/v1/health` toutes les 10 s. Toutes les routes v1 passent par `apiLimiter` (500 req/15 min, clé IP pour le trafic non authentifié) : la sonde kubelet aurait consommé le bucket anonyme, voire été bloquée — pods NotReady en cascade lors d'un pic.
**Décision** : Déclarer `app.get('/api/v1/health')` directement dans `app.js`, avant le montage du routeur v1 et donc hors rate limiting. L'endpoint vérifie réellement la disponibilité de la base (`instance.authenticate()`) : 200 si OK, 503 sinon — un pod dont la DB est injoignable ne doit pas recevoir de trafic.
**Alternative écartée** : Route dans `routes/Health.routes.js` comme les entités — rejeté car le montage via le routeur v1 la placerait derrière `apiLimiter` ; un `skip` conditionnel dans le limiteur ajouterait de la complexité pour un endpoint d'infrastructure sans logique métier.

---

### [2026-07-06] LeitnerBox.idSystem — FK corrigée en ON DELETE CASCADE (constraint sans nom explicite retrouvée dynamiquement)
**Contexte** : Suppression d'un système de Leitner → 500 en prod. La FK `LeitnerBox.idSystem` (migration `20260226152200`) n'avait aucun `onDelete` défini, contrairement aux 3 autres tables enfants de `LeitnerSystem` (`LeitnerSystemsUsers`, `LeitnerSystemTag`, `cardSystems`, toutes en `CASCADE`). PostgreSQL applique `NO ACTION` par défaut → violation FK dès qu'un système (qui a toujours 5 `LeitnerBox` créées automatiquement) est supprimé.
**Décision** : Nouvelle migration `20260706000001` qui remplace la contrainte par `ON DELETE CASCADE ON UPDATE CASCADE`, + ajout de `references`/`onDelete` sur l'attribut `idSystem` dans `LeitnerBox.model.js` (absent jusqu'ici, alors que les autres modèles comme `LeitnerSystem.model.js` déclarent systématiquement ce couple). Sur PostgreSQL, la contrainte créée par `CREATE TABLE ... REFERENCES` n'a pas de nom explicite — son nom auto-généré est retrouvé via `information_schema.table_constraints`/`key_column_usage` dans un bloc `DO $$` avant `DROP CONSTRAINT`, plutôt que de supposer `LeitnerBox_idSystem_fkey` en dur (fragile si PostgreSQL change un jour sa convention de nommage, ou si la contrainte a été recréée manuellement entre-temps).
**Alternative écartée** : `ON DELETE SET NULL` — écarté car des `LeitnerBox` orphelines (sans système parent) n'ont aucun sens métier ; `SET NULL` est justement le comportement implicite qu'appliquait Sequelize `sync()` en dev/SQLite via les défauts de l'association `belongsTo` (FK nullable), ce qui explique pourquoi le bug ne s'est jamais manifesté en local/tests — seul PostgreSQL en prod (schéma piloté par les migrations, indépendant des associations Sequelize) était affecté.
**Conséquences** : La suppression d'un système de Leitner supprime désormais aussi ses boîtes en cascade (comportement identique en dev/SQLite et prod/PostgreSQL). Migration testée dans les deux sens sur SQLite et sur un conteneur PostgreSQL 17 jetable avant merge. Test de non-régression `test/bdd/leitner.delete.test.js` vérifie la suppression réelle par `idBox` (pas seulement l'absence d'erreur, qu'un simple `SET NULL` aurait aussi satisfaite).
**Conséquences** : Exception documentée au pattern controller→service (endpoint infra, pas une entité). L'endpoint est public par conception (aucune donnée sensible retournée). Le healthcheck Compose côté VPS peut désormais s'appuyer dessus.

---

### [2026-07-06] Métriques RED/USE — prom-client, serveur HTTP dédié sur un port séparé
**Contexte** : Aucune métrique applicative n'existait (seulement logs Winston/Morgan + AuditLog métier). Besoin d'exposer des métriques RED (Rate, Errors, Duration) sur les requêtes HTTP et USE (Utilization, Saturation, Errors) sur le process Node, pour un futur scraping Prometheus — sans savoir encore si une stack Prometheus/Grafana existe déjà sur le cluster.
**Décision** :
- Dépendance `prom-client` (nouvelle, à ajouter à la liste approuvée — fait dans `CONVENTIONS.md`).
- `helpers/metrics.js` : `Registry` dédiée (pas le registre global de prom-client), `collectDefaultMetrics()` pour l'USE (CPU, mémoire, event-loop-lag, handles — désactivé si `NODE_ENV=test` pour ne pas laisser de `setInterval` actif après les tests Jest), + 2 métriques custom pour le RED : `http_request_duration_seconds` (Histogram) et `http_requests_total` (Counter), labellisées `method`/`route`/`status_code` (Errors = filtrer `status_code >= 500` côté requête PromQL, pas une métrique séparée).
- `middlewares/metrics.middleware.js` : instrumente chaque requête via `res.on('finish')`. Le label `route` utilise `req.route.path` (nom de route Express, ex. `/users/:id`) et non `req.originalUrl`, pour éviter l'explosion de cardinalité Prometheus si un attaquant ou un bot génère des URLs arbitraires ; les requêtes non matchées (404) sont regroupées sous le label `non_route`.
- `GET /metrics` n'est **pas** une route Express de l'app publique : c'est un second serveur `http.createServer` démarré dans `server.js` sur `METRICS_PORT` (défaut 9090), en dehors de l'app Express/Helmet/CORS. Les Services K8s (`k8s/prod/service.yml`, `k8s/preprod/service.yml`) exposent ce port en ClusterIP, mais aucun Ingress ne le référence — le port 9090 est donc structurellement injoignable depuis l'extérieur du cluster (contrairement à un chemin `/metrics` sur le port applicatif, qui aurait été routé par l'Ingress `path: /` catch-all existant). Annotations `prometheus.io/scrape|port|path` ajoutées sur les Deployments pour un scraping par découverte de pods, sans dépendre d'un CRD `ServiceMonitor` (pas encore su si `prometheus-operator` est installé).
- Endpoint non authentifié (choix utilisateur) : la protection vient de l'isolation réseau (port séparé, non exposé), pas d'un token applicatif.
**Alternative écartée** : `express-prom-bundle` (wrapper tout-en-un) — écarté pour garder le contrôle explicite sur le label `route` (cardinalité) et ne pas ajouter une dépendance quand ~30 lignes suffisent. `/api/v1/metrics` sur le port applicatif existant — écarté car l'Ingress prod/preprod route tout (`path: /`, `pathType: Prefix`) vers le service API : un chemin dédié aurait nécessité soit un `configuration-snippet` nginx (annotation désactivée par défaut sur les installations récentes d'ingress-nginx, fragile), soit une règle Ingress explicite de refus — plus complexe et plus fragile qu'un port physiquement séparé. Exporters dédiés Postgres/Redis (USE infra) — hors périmètre de ce ticket (validé avec l'utilisateur), à faire si besoin dans un ticket dédié.
**Conséquences** : Nouvelle dépendance `prom-client` en prod. `METRICS_PORT` (9090) ajouté aux ConfigMaps K8s prod/preprod ; `docker-compose.yml` n'a rien à changer (Traefik ne route déjà que le port `API_PORT`, donc 9090 n'est jamais publié côté VPS Docker). Dette : pas encore de Prometheus/Grafana déployé pour consommer ces métriques (scope à valider) ; USE limité au process Node (pas de vision CPU/mémoire host ni Postgres/Redis).

---

### [2026-07-06] Magic bytes uploads — signatures codées à la main plutôt que le package file-type
**Contexte** : L'audit OWASP (A08-M2) demandait de ne plus faire confiance au MIME déclaré par le client sur les uploads. La recommandation initiale citait le package `file-type`.
**Décision** : Implémenter `helpers/fileSignature.js` : table de signatures binaires pour les 11 types autorisés (JPEG/PNG/GIF/WebP/PDF/OOXML/CFB), croisement extension ↔ MIME au `fileFilter`, et vérification des magic bytes **sur le flux** via une fonction `contentType` custom pour multer-s3 (lit le premier chunk, rejette ou relaie via PassThrough — même mécanique que `AUTO_CONTENT_TYPE`, qui détectait sans jamais rejeter).
**Alternative écartée** : Package `file-type` — les versions ≥17 sont ESM-only (projet CommonJS) et la v16 CJS n'est plus maintenue. Les types autorisés étant peu nombreux et leurs signatures stables, la table maison est plus simple à auditer (12 tests dédiés).
**Conséquences** : Tout nouveau type MIME autorisé doit être ajouté dans `SIGNATURES` **et** `EXTENSIONS_BY_MIME`, sinon il sera rejeté. Le fallback disque (dev sans S3) ne vérifie que extension ↔ MIME (pas de hook de flux dans diskStorage) — acceptable, la prod est sur S3.

---

### [2026-07-06] sqlite3 déplacé en devDependencies + npm audit bloquant en CI (OWASP A06)
**Contexte** : `npm audit` remontait 5 vulnérabilités high sur l'API, toutes dans la chaîne de build de `sqlite3` (node-gyp/tar/make-fetch-happen). Or SQLite ne sert qu'en dev/tests — la prod, la preprod et le VPS de test sont sur PostgreSQL.
**Décision** : (1) `sqlite3` passe en devDependencies : `npm ci --omit=dev` (Dockerfile) et `npm install` sous `NODE_ENV=production` ne l'installent plus — la chaîne vulnérable sort des images déployées. (2) Étape CI bloquante `npm audit --omit=dev --audit-level=high` sur les deux applications. (3) `npm audit fix` appliqué au front (form-data).
**Alternative écartée** : Forcer la mise à jour de la chaîne sqlite3 (`npm audit fix --force` → sqlite3@6) — breaking change inutile pour une dépendance de dev ; ignorer les findings — indéfendable pour le critère OWASP du référentiel.
**Conséquences** : 0 high/critical sur les dépendances de prod à date. Résiduel : `uuid` moderate (transitive de Sequelize), sous le seuil du job. Un développeur qui fait `npm install --omit=dev` en local n'aura pas SQLite — utiliser l'install complète en local.

---

### [2026-07-06] Campagne accessibilité — aria-label systématique plutôt que refonte label for/id
**Contexte** : L'audit statique (`scripts/audit-a11y.mjs`, développé pour l'occasion) relevait 135 non-conformités RGAA : 111 champs sans nom accessible, 14 boutons symboles sans nom, 10 éléments cliquables sans équivalent clavier.
**Décision** : (1) Champs : `aria-label` (statique ou `:aria-label` dynamique pour les champs en boucle), libellé aligné sur le label visible ou le placeholder — appliqué par codemod, vérifié par ré-audit. (2) Éléments cliquables : lien natif quand la sémantique s'y prête (TutorialItem), sinon pattern ARIA `role="button"`/`tabindex="0"`/`@keydown.enter/.space`. (3) Motifs justifiés encodés comme exceptions dans l'outil (overlays de fermeture, `@click.stop`, wrapper `cursor-text`). (4) Non-régression : tests axe-core dans Vitest (CI).
**Alternative écartée** : Association `label for`/`id` généralisée — plus canonique mais exige des ids uniques dans des composants répétés (v-for) et une refonte des templates ; `aria-label` donne le même nom accessible sans restructuration. Un `<button>` natif pour les blocs mois du calendrier — invalide (contenu non-phrasing : h3 + grille).
**Conséquences** : Les libellés visibles et les aria-label doivent rester synchronisés lors des évolutions (WCAG 2.5.3 label-in-name). Tout nouveau formulaire doit passer `node scripts/audit-a11y.mjs` (0 attendu) ; les contrastes et un test lecteur d'écran réel restent hors périmètre outillé (docs/AUDIT_RGAA.md §5).

---

### [2026-07-08] LeitnerCard.idBox — FK corrigée en ON DELETE CASCADE (2ᵉ niveau de la cascade Leitner)
**Contexte** : Malgré le fix du 2026-07-06 (`LeitnerBox.idSystem` en CASCADE), la suppression d'un système contenant des cartes renvoyait toujours un 500 : la cascade système → boîtes déclenchait une violation de `LeitnerCard_idBox_fkey` (`NO ACTION`, migration `20260226152300` sans `onDelete`). L'audit du fix précédent s'était limité aux enfants directs de `LeitnerSystem` sans suivre la cascade en profondeur. Reproduit sur le Postgres dev Docker.
**Décision** : Migration `20260708000001` sur le pattern exact de `20260706000001` (Postgres : contrainte retrouvée dynamiquement via `information_schema` dans un bloc `DO $$` ; SQLite : recréation de table) + `references`/`onDelete: 'CASCADE'` sur `idBox` dans `LeitnerCard.model.js`. Particularité SQLite : `PRAGMA foreign_keys = OFF` pendant le rebuild (réactivé en `finally`), car le `DROP TABLE "LeitnerCard"` aurait sinon cascadé sur `cardSystems` (FK `idCard` en CASCADE) et détruit les liaisons cartes↔systèmes pendant la copie.
**Alternative écartée** : `ON DELETE SET NULL` — des cartes sans boîte resteraient orphelines en base (invisibles dans l'UI, jamais révisées) alors que la carte n'a de sens que dans une boîte de son système ; suppression applicative dans `LeitnerSystem.service#delete` (transaction) — écarté pour rester cohérent avec le choix DB-level du 2026-07-06 et couvrir aussi les suppressions de boîtes isolées.
**Conséquences** : Cascade complète `LeitnerSystem → LeitnerBox → LeitnerCard` (les Questions, elles, survivent — vérifiées par le test de non-régression). Audit refait sur toute la profondeur du sous-arbre Leitner : plus aucune FK bloquante (`cardSystems.idCard` CASCADE, `RevisionSession.idSystem` SET NULL). Leçon retenue : lors d'un fix de cascade, auditer les FK **transitivement**, pas seulement les enfants directs.

### [2026-07-11] Mémoire du projet hors .agents/ — synthèse avec renvois plutôt que duplication

**Contexte** : besoin de rendre la mémoire du projet (conventions, décisions, changelog, audit OWASP) visible hors du dossier caché `.agents/`, notamment pour le jury B2.

**Décision** : un document de synthèse unique `docs/MEMOIRE_PROJET.md` (présentation du dispositif + essentiel de chaque fichier + date de synchronisation), avec renvois vers les sources `.agents/` qui restent canoniques.

**Alternative écartée** : copier les fichiers dans `docs/` — ~530 Ko de doublons (CHANGELOG seul : 402 Ko) qui divergeraient dès le ticket suivant, le CLAUDE.md ne pointant que vers `.agents/`.

**Conséquences** : le document n'est pas mis à jour à chaque ticket ; seule la date de synchronisation et les chiffres clés sont à rafraîchir si l'écart devient significatif. En cas de contradiction, `.agents/` fait foi (règle écrite en tête du document).

### [2026-07-11] Manuels de déploiement dédiés par infrastructure (docs/) — le README garde le volet CI/CD

**Contexte** : la documentation de déploiement était éclatée (README partie 3 + RUNBOOK) et la partie Kubernetes du README décrivait le flux `kubectl apply` abandonné lors de la migration Helm du 2026-06-30 — risque qu'un opérateur (ou le jury B2) suive une procédure obsolète.

**Décision** : deux manuels dédiés — `docs/MANUEL_DEPLOIEMENT_VPS.md` (test) et `docs/MANUEL_DEPLOIEMENT_KUBERNETES.md` (preprod/prod, Helm) — qui décrivent le cas nominal actuel et renvoient au RUNBOOK pour l'exploitation. Le README partie 3 reste la référence des secrets/variables GitHub Actions, avec un encart signalant que ses sections `kubectl apply` sont le flux historique pré-Helm.

**Alternative écartée** : réécrire la partie 3 du README — elle est citée telle quelle dans B2_RENDU.md et son historique `kubectl apply` documente la migration ; un encart de recadrage évite la réécriture et conserve la trace.

**Conséquences** : toute évolution du déploiement se documente dans les manuels de `docs/`, pas dans le README (sauf secrets CI/CD). La cartographie 9.1 et le §9.2 de B2_RENDU.md pointent les manuels en premier.

---

### [2026-07-11] Annexes du dossier B2 — liens vers les fichiers du dépôt plutôt que contenu embarqué

**Contexte** : besoin d'annexes pour le dossier B2 (galerie du prototype, captures de l'application, documents de preuve). La fiche RNCP39583 n'impose aucune forme (pas de limite de pages, pas de soutenance pour le bloc 2) et exige que le dossier contienne « le code source et la documentation associée » — le dépôt fait partie du livrable.

**Décision** : trois annexes en fin de B2_RENDU.md — A. galerie du prototype (tableau de liens vers les 16 PNG de prototype/captures/), B. captures de l'application déployée (à insérer), C. index des documents du dépôt (document → chemin → sections). Les documents volumineux (audit OWASP, RGAA, changelog…) ne sont **pas recopiés** : ils sont référencés, l'utilisateur partage les fichiers/dossiers avec le dossier.

**Alternative écartée** : embarquer les images et recopier les audits dans le PDF — dossier autoporteur mais volumineux, et doublons divergeant des sources versionnées.

**Conséquences** : le rendu doit être accompagné du dépôt (ou des dossiers partagés) pour que les liens des annexes soient résolubles ; chaque annexe est appelée depuis le corps du dossier.

### [2026-07-11] docs/ = dossier unique de documentation ; .agents/ réservé à la mémoire agent

**Contexte** : le prototype (HTML + captures) vivait à la racine (`prototype/`) et l'audit OWASP dans `.agents/`, alors que les autres livrables documentaires (RUNBOOK, manuels, audit RGAA) étaient dans `docs/`. L'utilisateur veut un point d'entrée documentaire unique et visible.

**Décision** : `docs/` regroupe toute la documentation livrable : manuels, audits (OWASP déplacé à côté du RGAA), `docs/prototype/` (HTML + README + captures), `docs/sources/` (références scientifiques du constat produit), synthèse mémoire. `.agents/` ne conserve que la mémoire de travail de l'agent (AGENT, CONVENTIONS, CHANGELOG_AGENT, DECISIONS, DOC_mindmap_editor, référentiel). Déplacements en `git mv` (historique préservé), liens de B2_RENDU.md et MEMOIRE_PROJET.md mis à jour.

**Alternative écartée** : fichiers à plat à la racine de `docs/` (état intermédiaire créé manuellement) — un `README.md` de prototype à la racine de `docs/` se lirait comme le README du dossier docs, et les copies manuelles étaient des exports plus anciens que les versions git.

**Conséquences** : tout nouveau livrable documentaire va dans `docs/` ; `.agents/DOC_mindmap_editor.md` reste l'exception (doc technique interne citée par le B2) et pourra suivre le même chemin si besoin.

---

### [2026-07-11] Parcours guidé — état front persisté (Pinia + localStorage), pas de nouveau backend, formulaires réels plutôt qu'overlay

**Contexte** : ajout d'un parcours guidé (carte mentale → système de Leitner → exercices → planification) déclenché par un bouton. L'API `OnboardingState` existe (tourSeen + checklist JSONB) mais l'utilisateur a précisé qu'elle est réservée à une autre fonctionnalité (onboarding). L'utilisateur veut « peu de modifs » : les vrais formulaires + un bouton pour passer à l'étape suivante + liaison des éléments.

**Décision** :
- État du parcours dans un store Pinia `guidedTour.js` persisté en localStorage (`persist: true`, plugin déjà en place) — `active`, `stepIndex`, et `links` (IDs des entités créées) pour lier les étapes : la matière de l'étape 1 pré-remplit les formulaires Leitner/exercice, la séance planifiée reçoit `idSystem`.
- UI = un bandeau unique (`GuidedTourBannerComponent`) monté dans `App.vue`, visible sur toutes les pages tant que le parcours est actif ; le bouton « Étape suivante » est déverrouillé par la création effective de l'élément (détectée aux points de succès des POST existants via `recordLinks`, no-op hors parcours).
- Le parcours s'appuie sur les pages réelles (MindmapsPage, FlashcardsPage, ExercisesPage, CalendarPage) — pas de page wizard dédiée ni d'overlay.

**Alternative écartée** : (1) réutiliser `OnboardingState.checklist` — exclu par l'utilisateur (réservé à l'onboarding) ; (2) visite guidée en overlay (driver.js / intro.js) — dépendance hors liste approuvée et sélecteurs CSS fragiles ; (3) un bouton « suivant » ajouté dans chaque formulaire — plus invasif que le bandeau global pour le même résultat, et l'utilisateur perdrait le fil hors des pages d'étape.

**Conséquences** : le parcours est par-appareil (localStorage), non synchronisé entre appareils — acceptable pour un guide d'usage ponctuel ; si un jour il faut le synchroniser, prévoir une entité dédiée (ne pas squatter OnboardingState). Toute page qui crée une entité du parcours doit appeler `guidedTourStore.recordLinks(...)` au point de succès. L'ordre des étapes est centralisé dans `GUIDED_TOUR_STEPS` (stores/guidedTour.js).

---

### [2026-07-11] Analyse statique — SonarCloud (SaaS) plutôt que ré-hébergement SonarQube ou abandon

**Contexte** : le job SonarQube de la CI était commenté depuis la panne du serveur auto-hébergé. Trois options : ré-héberger, supprimer l'analyse statique (couverture qualité déjà assurée par lint + tests + npm audit + axe-core bloquants), ou migrer vers SonarCloud.

**Décision** : SonarCloud (SonarQube Cloud), gratuit pour les dépôts publics. Un seul projet pour le monorepo (`sonar.sources` couvre api + front/src) — l'analyse de branches native de SonarCloud remplace l'ancienne distinction prod/preprod par tokens séparés. Job CI `sonarcloud` via `SonarSource/sonarqube-scan-action@v5` (action unifiée qui a remplacé `sonarcloud-github-action`), exécuté après tests + lint, non bloquant.

**Alternative écartée** : ré-héberger SonarQube — charge d'exploitation (JVM, base, maintenance, disponibilité) disproportionnée pour l'apport, la panne l'a démontré ; suppression pure — perd l'axe « analyse statique continue » du dossier B2 alors que le SaaS l'offre à coût quasi nul ; Automatic Analysis SonarCloud (sans job CI) — écarté car incompatible avec l'analyse par scanner CI (il faut choisir) et sans contrôle sur le déclenchement post-tests.

**Conséquences** : dépôt public requis (plan gratuit) ; secret unique `SONAR_TOKEN` (les anciens SONAR_PROD_TOKEN/SONAR_PREPROD_TOKEN/SONAR_HOST_URL sont obsolètes) ; l'Automatic Analysis doit rester désactivée sur SonarCloud sinon le job CI échoue ; la couverture lcov et le quality gate bloquant sont des extensions possibles documentées dans le CHANGELOG.

---

### [2026-07-11] Monitoring — Prometheus central par environnement dans le chart Helm (pas de sidecar, pas de kube-prometheus-stack)

**Contexte** : l'instrumentation RED/USE existe depuis le 2026-07-06 (prom-client, `GET /metrics` sur port 9090) mais aucun scraper n'était déployé — les annotations `prometheus.io/*` étaient inertes. L'idée initiale (un sidecar + un Prometheus par pod) inversait le modèle pull de Prometheus : métriques éclatées par pod, RAM démultipliée, historique perdu au crash du pod. Constat additionnel : la migration Helm (2026-06-30) avait perdu le port metrics — ni `containerPort` 9090, ni annotations `prometheus.io/*`, ni `METRICS_PORT` dans le chart, alors que les manifests historiques `k8s/prod|preprod/` les avaient.

**Décision** : un Prometheus **central par environnement/namespace**, intégré au chart Helm (`helm/templates/prometheus.yaml`, activable via `monitoring.enabled`) et donc déployé par le CD existant sans étape manuelle. Découverte des cibles par `kubernetes_sd_configs` (role: pod) limitée au namespace de la release, filtrée sur l'annotation `prometheus.io/scrape: "true"` — pas de CRD `ServiceMonitor`. RBAC minimal : Role/RoleBinding namespacés (pods get/list/watch), pas de ClusterRole. Même dualité que Redis : Deployment + emptyDir en preprod (rétention 7 j), StatefulSet + PVC 5 Gi en prod (rétention 15 j). Redémarrage sur changement de config via annotation `checksum/config` (hash des values monitoring) plutôt que `rolloutTimestamp` (qui aurait redémarré Prometheus à chaque déploiement applicatif). UI non exposée par l'Ingress (conforme à la règle CONVENTIONS.md sur `/metrics`) — accès par `kubectl port-forward`. Image épinglée `prom/prometheus:v3.5.0` (LTS). Le port metrics perdu à la migration Helm est restauré dans le même ticket (ports nommés + annotations sur `deployment-api.yaml`, `METRICS_PORT: "9090"` dans `values.yaml`).

**Alternative écartée** : un Prometheus/sidecar par pod — anti-pattern (voir Contexte) ; kube-prometheus-stack (Helm) — complet (Grafana, Alertmanager, operator, node-exporter) mais ~1-2 Gi de RAM et des dizaines de CRD pour un cluster mono-application, disproportionné à ce stade ; Prometheus cluster-wide dans un namespace `monitoring` dédié — écarté car hors du cycle de déploiement Helm du CD (installation manuelle comme cert-manager), nécessite un ClusterRole que le kubeconfig CI n'a pas forcément, et empêche d'isoler preprod/prod si les clusters sont distincts (deux kubeconfigs distincts dans le CD).

**Conséquences** : chaque release (mmm-preprod, mmm-prod) embarque son Prometheus (`<release>-prometheus`, ClusterIP 9090). Aucune dépendance applicative nouvelle. Dette : pas de Grafana (visualisation via l'UI Prometheus en port-forward), pas d'Alertmanager, pas d'exporters Postgres/Redis (USE infra toujours limité au process Node — ticket dédié si besoin). Si un Grafana est ajouté plus tard, le brancher sur `http://<release>-prometheus:9090`.

---

### [2026-07-12] docker-compose unifié dev/test — server_docker_compose/ supprimé, le CD déploie le compose racine avec --profile test

**Contexte** : la décision du 2026-06-11 avait créé `server_docker_compose/docker-compose.yml` (fichier VPS dédié) en plus du compose racine à profils. Résultat constaté : les profils `test`/`prod` du compose racine étaient du code mort (aucun `.env.test`/`.env.prod`, CD sur le fichier dédié), les deux fichiers divergeaient (noms de services `api` vs `api_server`, service `backup` absent du racine), et chaque variable d'environnement devait être maintenue aux deux endroits — exactement la duplication que les profils devaient éviter. L'utilisateur a tranché : revenir au fichier unique.

**Décision** : le `docker-compose.yml` racine devient l'unique compose du projet, avec **deux profils** : `dev` (comportement local inchangé : build sources, Traefik local HTTP, hot-reload) et `test` (images DockerHub, Traefik externe HTTPS Let's Encrypt — services `api_server`, `front_server`, `pgadmin_server`, `backup`). Le profil `prod` est supprimé (prod/preprod sont sur Kubernetes via Helm). Le service `backup` (pg_dump quotidien) et les `restart: unless-stopped` du fichier VPS sont migrés dans le compose racine. Le CD (`cd.yml`, job `deploy_test`) téléverse le compose racine et force `--profile test` sur toutes ses commandes docker compose ; les noms de services du script sont alignés (`api_server`/`front_server`/`pgadmin_server`). Le template VPS devient `.env.test.example` à la racine, avec `COMPOSE_PROFILES=test` pour les commandes manuelles sur le VPS.

**Alternative écartée** : garder les deux fichiers en supprimant seulement les profils morts du racine — moins risqué mais conserve la double maintenance des variables d'environnement ; renommer les services test en `api`/`front` pour coller à l'ancien script CD — impossible, les noms sont déjà pris par les services du profil `dev` dans le même fichier.

**Conséquences** : le `.env` du VPS doit recevoir `COMPOSE_PROFILES=test` (le CD n'en dépend pas grâce à `--profile test` explicite, mais les commandes manuelles du RUNBOOK oui). Au premier déploiement post-migration, les conteneurs changent de nom (`api` → `api_server`…) — les volumes nommés (postgres-data, backup-data…) sont conservés car le nom de projet ne change pas. Les commandes d'exploitation utilisent désormais les noms `*_server` (RUNBOOK et MANUEL_DEPLOIEMENT_VPS mis à jour). Le fichier déployé contient les blocs `build:` du profil dev — inertes sur le VPS tant que le profil dev n'y est pas activé. Révoque la décision du 2026-06-11.

---

### [2026-07-12] Preprod Kubernetes mise en pause — job deploy_preprod derrière la variable K8S_PREPROD_ENABLED

**Contexte** : le cluster preprod Infomaniak tourne sur un unique nœud 1 vCPU / 2 Go, saturé par les réservations (850m CPU / 95 % RAM demandés) : `NodeNotReady` ×15 en 21 h, rolling updates impossibles faute de marge (le pod de surge reste Pending → `helm --atomic` timeout → rollback ; un seul déploiement récent a réussi, dans une fenêtre post-reboot), app inaccessible. L'ajout de Prometheus (2026-07-11) a aggravé la pression mémoire. L'utilisateur choisit d'arrêter la preprod pour raisons de coût et de la recréer plus tard sur un nœud correctement dimensionné.

**Décision** : conditionner le job `deploy_preprod` de `cd.yml` à la variable GitHub Actions `K8S_PREPROD_ENABLED == 'true'` — même mécanisme que `K8S_PROD_ENABLED` pour la prod. Variable absente = job skippé proprement (le job `notify` ne compte que les `failure`, la notification Discord reste verte). Le job `push_images` continue de publier les images `mymemomaster_preprod_*` sur DockerHub à chaque push staging (gratuit, garde les images prêtes pour la recréation).

**Alternative écartée** : supprimer le job du workflow — perd le squelette fonctionnel et l'historique de config pour la recréation ; réduire les requests/désactiver Prometheus pour faire tenir la stack sur 2 Go — pansement sur un nœud structurellement sous-dimensionné (2 stacks + ingress + cert-manager + CNI ne tiennent pas dans 1,37 Go allouables).

**Conséquences** : à la recréation du cluster : (1) recréer le secret `KUBECONFIG_PREPROD`, (2) créer la variable `K8S_PREPROD_ENABLED=true`, (3) dimensionner le nœud à 4 Go minimum (ou 2 nœuds), (4) ne pas redéployer la stack legacy du namespace `default` (`mymemomaster-test-*`, doublon de l'époque test-sur-K8s qui consommait ~30 % du nœud). Le chart Helm et les values preprod restent versionnés et prêts.

---

### [2026-07-14] Formules dans Leitner/exercices — convention inline `$…$` réutilisant l'interpréteur mindmap, sans changement API

**Contexte** : l'utilisateur veut des formules mathématiques dans les questions et réponses des flashcards Leitner et des exercices (création et passage). L'interpréteur KaTeX existe déjà (`src/components/interpreter/`) mais ne servait qu'aux nœuds `formula` des cartes mentales, où tout le contenu du nœud est une formule — alors qu'un énoncé de question est un texte mixte (prose + formules).

**Décision** : convention de délimitation inline `$…$` dans les champs texte existants, rendue par un nouveau `renderInlineMath()` dans `interpreter.js` (segments hors formule échappés HTML, segments `$…$` passés au `renderMath()` existant en mode inline). Deux composants réutilisables : `FormulaTextComponent` (affichage) posé sur tous les points d'affichage des deux modules, et `FormulaHelperComponent` (saisie : bouton ouvrant l'interpréteur complet dans une `ModalComponent`, insertion de la formule entourée de `$…$`, aperçu live). Les données restent du texte brut — aucun changement de schéma, d'endpoint ou de validator.

**Alternative écartée** : un champ « type formule » séparé côté modèle (comme les nœuds mindmap) — impose une migration, des changements de validators et une UI à deux champs pour un besoin qui est du texte mixte ; un éditeur riche (contenteditable avec rendu in-place) — disproportionné et fragile par rapport à la convention `$…$` + aperçu.

**Conséquences** : n'importe quel champ affiché via `FormulaTextComponent` interprète `$…$` (délimiteur réservé ; un `$` isolé reste littéral). La correction des réponses compare toujours le texte brut : deux écritures différentes d'une même formule ne sont pas reconnues équivalentes (dette documentée dans CHANGELOG_AGENT). Tout nouvel affichage de question/réponse doit passer par `FormulaTextComponent` pour rester cohérent.

---

### [2026-07-14] Syntaxe de formule canonique unique — alias frac supprimé à la saisie, normalisé partout, toujours rendu

**Contexte** : l'interpréteur acceptait deux écritures de la fraction (`over(a, b)` et son alias `frac(a, b)`). La correction des réponses comparant des chaînes brutes, `$over(1, 2)$` et `$frac(1, 2)$` étaient jugées différentes alors que leur rendu est identique.

**Décision** : `over` devient la seule syntaxe canonique. Le bouton `frac` disparaît de la palette de l'interpréteur, et `normalizeFormulaSyntax()` (`frac(` → `over(`) est appliquée à trois points : à l'insertion via FormulaHelper, à la création/édition de contenu (cartes Leitner, questions/réponses/options d'exercices) et à la soumission des réponses (session Leitner, passage d'exercice). `toLatex()` continue en revanche d'interpréter `frac` à l'affichage, pour le contenu historique (nœuds formule des mindmaps notamment).

**Alternative écartée** : normaliser côté API (middleware ou service) — plus robuste (couvre tout client) mais touche des services stables et le besoin est aujourd'hui exclusivement front ; supprimer `frac` aussi du rendu — casserait l'affichage du contenu existant.

**Conséquences** : l'équivalence frac/over est résolue par construction pour tout contenu passant par le front. Toute nouvelle syntaxe à raccourcis dans l'interpréteur doit être ajoutée **sans alias** (une écriture = une forme stockée), ou l'alias doit être ajouté à `normalizeFormulaSyntax`. Le contenu historique en `frac` reste non normalisé en base (rendu correct ; migration de données si l'uniformisation rétroactive devient nécessaire).

---

### [2026-07-16] Visite guidée de l'interface — paquet officiel `intro.js` (remplace `introjs`), état synchronisé via l'API OnboardingState

**Contexte** : demande utilisateur d'un onboarding avec intro.js. Le `package.json` front contenait `introjs@0.2.2` — un paquet npm non officiel (l'officiel s'appelle `intro.js`), figé à une version 2013, jamais importé dans le code. Par ailleurs le backend expose déjà `UserOnboardingState.tourSeen` (créé à l'inscription), sans aucune UI branchée dessus, et un « Parcours guidé » local (store guidedTour) existe déjà pour l'accompagnement à la création de contenu.

**Décision** : (1) retirer `introjs@0.2.2` et installer le paquet officiel `intro.js@^7.2.0` (API classique `introJs().setOptions().start()`, épinglée v7 — la v8 a réécrit l'API). (2) Persister la visite via l'API (`tour_seen` d'UserOnboardingState) et non en localStorage : la visite auto ne doit se jouer qu'une fois par utilisateur, tous navigateurs confondus. (3) Étapes ancrées sur des attributs `data-tour` posés dans App.vue et construites dynamiquement en filtrant les éléments absents du DOM (layouts desktop/mobile différents, bouton parcours guidé présent uniquement sur la HomePage). (4) Persistance dans le seul callback `onexit` (déclenché aussi après « Terminer ») avec un `markTourSeen()` idempotent.

**Alternative écartée** : conserver le paquet `introjs` existant — non officiel, obsolète (0.2.2), risque de typosquatting ; localStorage pour `tour_seen` — perdu au changement de navigateur, et le champ API existait déjà ; driver.js/shepherd.js (MIT) — écartés car la demande visait explicitement intro.js et le champ tourSeen existait, mais voir conséquences licence.

**Conséquences** : `intro.js` s'ajoute aux dépendances front approuvées (CONVENTIONS.md à compléter). **Licence : intro.js est AGPL-3.0, une licence commerciale payante est requise pour un usage commercial** — acceptable pour un projet étudiant/personnel, à réévaluer (migration driver.js/shepherd.js, MIT) si le produit est commercialisé. Les nouveaux éléments de navigation majeurs devraient recevoir une ancre `data-tour` + une étape dans `ONBOARDING_TOUR_STEPS`. Le service backend `getOnboardingByUserId` répond 500 (et non 404) pour les utilisateurs sans ligne UserOnboardingState (créés avant la table) : la visite auto ne se lance pas pour eux — dette documentée dans CHANGELOG_AGENT.

> **Mise à jour [2026-07-16]** : intro.js a été remplacé le jour même par **driver.js 1.7 (MIT)** à la demande de l'utilisateur — la contrainte de licence AGPL/commerciale d'intro.js n'était pas acceptable. Périmètre du remplacement : `package.json` (intro.js retiré, driver.js ajouté), réécriture de `useOnboardingTour.js` (API `driver({ steps, onDestroyed })` + `drive()` ; les étapes deviennent `{ element, popover: { title, description } }`), styles `.onboarding-popover` dans `OnboardingTourComponent.vue`. Le store `onboarding.js`, les ancres `data-tour`, `ONBOARDING_TOUR_STEPS` (même forme `{selector, title, intro}`) et le comportement (auto-lancement premier login, persistance idempotente à la sortie) sont inchangés. Alternative écartée : shepherd.js — passé lui aussi sous AGPL sur ses versions récentes.

---

### [2026-07-18] Reset password — retour au code OTP 6 chiffres, hashé bcrypt, avec essais limités (remplace le token 64 chars du 2026-06-15)

**Contexte** : Le token opaque 64 chars hex (décision du 2026-06-15) était envoyé brut par email : illisible, impossible à saisir à la main, et perçu comme « le hash » par les utilisateurs. Demande utilisateur : aligner le flux sur le standard des plateformes (code court saisissable) sans réintroduire la faille d'origine (code 6 chiffres stocké en clair).

**Décision** : Code OTP à 6 chiffres (`crypto.randomInt(100000, 1000000)`) envoyé brut par email, **hashé bcrypt (coût 10)** en base (`resetPasswordCode`, la colonne STRING(64) accueille les 60 chars bcrypt sans migration). Contre-mesures compensant la faible entropie (10^6 valeurs) : expiration **15 min** (au lieu de 30), **5 essais max** par code (nouvelle colonne `resetPasswordCodeAttempts`, migration `20260718000000`), usage unique, invalidation par toute nouvelle demande, rate limiting `authLimiter` déjà en place. En complément (standards OWASP Forgot Password) : `POST /users/reset-password` répond 401 « Code invalide » même si l'email est inconnu (anti-énumération, le 404 est supprimé), et le refresh token est révoqué après un reset réussi (invalidation des sessions actives).

**Alternative écartée** : SHA-256 du code 6 chiffres — brute-forçable hors-ligne en quelques secondes (10^6 hachages) en cas de fuite de base ; bcrypt rend l'attaque coûteuse. / Conserver le token 64 chars avec lien cliquable dans l'email — plus d'entropie mais UX dépendante du client mail, et le formulaire existant est pensé pour une saisie de code.

**Conséquences** : Migration `20260718000000-add-reset-password-attempts-to-user.js` à passer. Le validator `resetPassword` attend désormais `^\d{6}$`. `verifyResetPasswordCode` ne détruit plus le code au premier essai raté (jusqu'à 5 essais), contrairement au comportement précédent. Front : `ResetPasswordPage.vue` passe du textarea 64 chars à un input numérique 6 chiffres (`autocomplete="one-time-code"`). Le `validEmailCode` reste en clair (décision distincte du 2026-06-23, inchangée).

---

### [2026-07-18] Liaison Leitner ↔ carte mentale : câblage de la colonne dormante idMindMap + nœud lié par carte (mindMapNodeId sans FK)

**Contexte** : Demande utilisateur : (1) le parcours guidé doit lier automatiquement le système de Leitner à la carte mentale créée à l'étape précédente ; (2) à la création d'une flashcard (uniquement la création), afficher une mini-vue de la carte mentale liée pour sélectionner le nœud rattaché à la question. La colonne `LeitnerSystem.idMindMap` existait déjà en base mais n'était renseignée nulle part (colonne dormante) ; les nœuds de mindmap vivent dans le JSON `MindMap.mindMapJson` (pas de table de nœuds).

**Décision** : (1) Câbler `idMindMap` de bout en bout : validator (`optional isInt`), controller (create + update), sélecteur « Carte mentale liée » dans le modal de création de système (filtré par matière), pré-rempli par `links.mindMapId` quand le parcours guidé est actif. (2) Nouvelle colonne `LeitnerCard.mindMapNodeId` **STRING(64) nullable sans contrainte FK** (migration `20260718000001`) : les identifiants de nœuds sont des chaînes internes au JSON — une FK est impossible. Référence tolérante : la suppression du nœud dans la mindmap laisse un identifiant orphelin, sans erreur. (3) Nouveau composant `MindMapNodePickerComponent.vue` : rendu SVG **lecture seule** de la mindmap (normalisation + layout via les helpers `normalizeMindMap`/`applyRadialLayout`), nœuds cliquables et pilotables au clavier (`role="button"`, `tabindex`, Entrée/Espace, `aria-pressed`), affiché dans le modal « Nouvelle carte » uniquement en création et uniquement si le système a un `idMindMap`. Le libellé du nœud choisi pré-remplit l'énoncé s'il est vide.

**Alternative écartée** : réutiliser `MindMapBoard.vue` en lecture seule — couplé au store global `mindmapBuilder` (sélection, pan/zoom, dirty state) : le monter dans le modal partagerait l'état avec l'éditeur ; extraire les nœuds dans une table dédiée avec FK — refonte du modèle mindmap disproportionnée pour une référence d'affichage ; stocker le lien dans `Question.content` — champ déjà utilisé par les types de questions (QCM…), risque de collision de format.

**Conséquences** : Migration `20260718000001-add-mindmapnodeid-to-leitnercard.js` à passer. Toute exploitation future du lien carte↔nœud (surbrillance du nœud pendant la révision, statistiques de maîtrise par nœud) doit tolérer un `mindMapNodeId` orphelin (nœud supprimé). Le picker ne propose pas de pan/zoom : les grandes cartes sont réduites par le viewBox (lisibilité limitée au-delà de ~30 nœuds — à faire évoluer si besoin).

---

### [2026-07-18] Parcours guidé — sessionStorage + reset à la déconnexion (plutôt que persistance en base)

**Contexte** : L'état du parcours guidé était persisté en localStorage : il ressuscitait après fermeture du site ou déconnexion, potentiellement des jours plus tard, avec des `links` pointant vers des entités qui n'existent plus. Question utilisateur : sauvegarder en base à la sortie, ou supprimer ?

**Décision** : Supprimer. La persistance passe de localStorage à **sessionStorage** (`persist: { storage: sessionStorage }`) — l'état survit à un rechargement de page pendant la session mais pas à la fermeture de l'onglet — et `auth.logout()` appelle une nouvelle action `guidedTour.reset()` (état + liens remis à zéro) pour couvrir la déconnexion explicite et le changement d'utilisateur sur le même onglet.

**Alternative écartée** : persistance serveur (nouvelle surface API ou détournement d'OnboardingState, réservé à la visite guidée) — disproportionnée pour un guide de ~5 minutes relançable à tout moment depuis l'accueil, et reprise différée risquée (liens orphelins).

**Conséquences** : Le parcours ne peut plus être repris après fermeture du site — comportement voulu. sessionStorage étant par onglet, le bandeau ne suit pas dans un second onglet (acceptable : le parcours est linéaire mono-onglet).

---

### [2026-07-18] Correction sémantique — modèle multilingue MiniLM + stopwords français (remplace all-mpnet-base-v2, anglais)

**Contexte** : Une réponse française correcte mais reformulée (« principe d'Archimède ») obtenait 0,61 de similarité → « Incorrect ». Double cause : `all-mpnet-base-v2` est entraîné sur de l'anglais (similarités déprimées entre paraphrases françaises), et la liste de stopwords du départage en zone grise était anglaise uniquement (« une », « dans », « les » comptaient comme mots-clés et diluaient le Jaccard).

**Décision** : Modèle remplacé par `Xenova/paraphrase-multilingual-MiniLM-L12-v2` (50+ langues, ~120 Mo quantisé) et stopwords français ajoutés. Seuils 0,78/0,55 **conservés** après calibration sur 8 paires françaises réelles dans le conteneur : copie exacte 1,00 ✓, paraphrase éloignée 0,806 ✓ (le cas qui échouait), paraphrase proche 0,89 ✓, réponse fausse même domaine 0,717 → zone grise correctement rejetée par mots-clés ✓, hors-sujet 0,15 ✓, reformulation courte 0,91 ✓.

**Alternative écartée** : `paraphrase-multilingual-mpnet-base-v2` (meilleure qualité) — **~280 Mo de poids : OOM en boucle dans les conteneurs API limités à 512 Mo** (12 redémarrages constatés en dev ; mêmes limites en preprod/prod). L'upgrade reste possible en augmentant `API_LIMIT_MEMORY` et les limites Helm. / Augmenter la mémoire plutôt que réduire le modèle — touchait le dimensionnement de tous les environnements pour un gain marginal.

**Conséquences** : Premier démarrage : téléchargement du nouveau modèle (~120 Mo), absorbé par le pre-warm. Deux limites structurelles des embeddings documentées par la calibration : les **inversions** (« le volume divisé par la masse » scoré 0,889 → accepté à tort) et les **formules symboliques** comparées à leur énoncé en toutes lettres (0,299 → rejeté à tort) — pour les réponses-formules, l'auteur de la carte doit fournir la formule comme réponse attendue, pas sa lecture en français. Nodemon + volume monté : toute écriture dans `my_memo_master_api/` pendant un téléchargement de modèle l'interrompt (redémarrage du process).

---

### [2026-07-18] Correction sémantique — garde anti-inversion, correspondance symbolique et formulations acceptées multiples

**Contexte** : La calibration du modèle multilingue a confirmé deux limites structurelles des embeddings : une inversion d'opérandes (« le volume divisé par la masse ») scorée 0,889 → acceptée à tort, et une formule symbolique (« U = R × I ») comparée à son énoncé en toutes lettres scorée 0,299 → rejetée à tort. Demande utilisateur : corriger les deux.

**Décision** : Trois mécanismes déterministes en amont/aval de l'embedding dans `Semantic.service` : (1) **court-circuit symbolique** — normalisation (casse, espaces, `$…$`, `\cdot`/`×`/`⋅`/`·`→`*`, `÷`→`/`) puis égalité stricte → correct (stratégie `exact`, score 1) sans passer par le modèle ; (2) **garde anti-inversion** — pour la famille division/rapport (`divisé par`, `par unité de`, `sur`, `rapporté à`), si les mots-clés des opérandes sont strictement croisés entre réponse attendue et réponse étudiante, le verdict correct est renversé (`decision_zone: 'inversion'`) ; conservateur : ne se déclenche que si les deux phrases portent un séparateur et aucun recouvrement « droit » ; (3) **formulations acceptées multiples** — l'auteur peut fournir la formule ET son énoncé en prose : côté Leitner via plusieurs `Response correction=true` (déjà supporté serveur, UI ajoutée au modal de création), côté exercices via `content.accepted_answers` (tableau, en plus de `correct_answer` ; UI dans le modal exercice, éditable). Le meilleur score est retenu (comportement existant de `gradeSemantic`).

**Alternative écartée** : passer au modèle mpnet multilingue avec plus de RAM — ne corrige aucune des deux limites (l'insensibilité à l'ordre et le fossé symbole/prose sont communs à tous les modèles d'embedding de phrases) ; parsing NLP général des relations ordonnées — disproportionné, la famille division/rapport couvre le cas réel (grandeurs physiques).

**Conséquences** : Calibration revalidée 7/7 (paraphrase démo 0,806 ✓, inversion rejetée ✓, formules `exact` 1,0 ✓, multi-réponses 0,936 ✓). La garde anti-inversion ne couvre que la famille division/rapport — les autres relations antisymétriques (soustraction, comparaisons) restent non couvertes ; étendre `RATIO_SEPARATOR` si un cas réel apparaît. Nouvelle valeur possible de `decision_zone` : `'inversion'` (consommateurs actuels : affichage du champ `explanation` uniquement). Les alternatives Leitner ne sont pas éditables après création (l'édition ne gère qu'une réponse) — dette UI.

---

### [2026-07-18] Homogénéité des formules — abstention sur les variables non annotées + syntaxe d'annotation d'unité `Var[unité]`

**Contexte** : Le vérificateur d'homogénéité (`interpreter/units.js`) traitait chaque lettre comme une unité : dans `P = F/S`, `P`/`F`/`S` (variables) devenaient `{UNK:1}`, et `UNK/UNK` s'annulait — d'où l'erreur absurde « UNK ≠ — » signalée par l'utilisateur sur une formule correcte. Deux bugs supplémentaires découverts à l'audit : la consommation de l'opérateur `+`/`-` était commentée dans `parseExpr` (boucle infinie — gel de la page — sur toute addition homogène, ex. `2m + 3m`), et le message d'erreur d'addition comparait le membre gauche à une signature vide.

**Décision** : (1) Chaque variable inconnue reçoit une identité propre (`VAR_F`) : `F/F` s'annule correctement, `F/S` reste **indéterminé**, et toute comparaison (égalité entre segments, homogénéité d'addition) impliquant une signature indéterminée est **ignorée** — le vérificateur s'abstient plutôt que d'inventer un verdict. (2) Nouvelle syntaxe d'annotation `P[Pa] = F[N] / S[m^2]` : la variable déclare son unité (remplacée par `(unité)` avant analyse), ce qui rend la vérification réelle et fiable sur les formules symboliques — annotations composées supportées (`c[m^2/s^2]`). (3) Correction de la boucle infinie (opérateur consommé) et du message d'addition. Aide affichée sous l'interpréteur.

**Alternative écartée** : table de correspondance symbole physique → dimension (P=pression, F=force…) — collisions insolubles avec les unités (`m` mètre/masse, `s` seconde/surface, `A`, `V`, `N`…) sans annotation explicite ; brancher les tables `Fields`/`Unit` de l'API — le vérificateur tourne aussi hors contexte de champ (playground, mindmap), et les tables ne sont pas peuplées ; à reconsidérer si les Fields sont un jour exploités.

**Conséquences** : Les formules symboliques sans annotation ne sont plus jamais signalées en erreur (ni vérifiées) ; la vérification devient opt-in via `[unité]`. Les expressions à unités littérales (`3 m + 2 s`, `1 N = 1 kg*m/s^2`) restent vérifiées comme avant. 16 tests Vitest couvrent les trois correctifs (`test/helpers/units.test.js`).

---

### [2026-07-19] Librairie de rendu des formules — KaTeX seul retenu (benchmark MathJax/KaTeX de S-06.01 formalisé, dépendance mathjax retirée)

**Contexte** : La tâche S-06.01 (« Benchmark librairie rendu (MathJax/KaTeX) », V1, US-24) prévoyait de comparer les deux librairies avant de construire l'interpréteur de formules. Le choix a bien été fait dans le code — tout le rendu (interpréteur, nœuds `formula` des mindmaps, `FormulaTextComponent`, aperçus) passe par KaTeX — mais il n'avait jamais été formalisé : `CONVENTIONS.md` listait ambigument « KaTeX / MathJax », et les **deux** librairies étaient en dépendances, `mathjax@3.2.2` n'étant plus référencé que par un helper mort (`src/helpers/mathjax-config.js`, importé par aucun fichier — résidu de la phase d'essai). Cette entrée acte le résultat du benchmark a posteriori et clôture la tâche.

**Décision** : **KaTeX (`katex@0.16`) est la seule librairie de rendu mathématique du front.** Critères du choix, constatés sur les usages réels du projet : (1) **rendu synchrone** — `katex.renderToString`/`render` retourne immédiatement, ce qu'exigent l'aperçu live de l'interpréteur (re-rendu à chaque frappe) et `renderInlineMath` (découpe `$…$` d'un texte mixte en segments rendus un à un) ; MathJax impose un `typesetPromise` asynchrone et un état global `window.MathJax`. (2) **Poids** — KaTeX ≈ 280 Ko min + fontes contre > 1 Mo pour le composant MathJax `tex-mml-chtml`, pour un rendu du même sous-ensemble. (3) **Couverture suffisante** — l'interpréteur génère lui-même un LaTeX restreint (`\frac`, `\sqrt`, exposants, lettres grecques, unités) entièrement couvert par KaTeX ; la couverture LaTeX supérieure de MathJax ne sert à rien ici puisque l'utilisateur ne tape jamais de LaTeX brut. (4) **Testabilité** — sortie chaîne pure, mockable en jsdom (les suites FormulaText/MindMap mockent déjà le rendu) ; le global MathJax est intestable proprement. Nettoyage associé : suppression de la dépendance `mathjax` et du helper mort `mathjax-config.js`, `CONVENTIONS.md` corrigé (« katex » seul).

**Alternative écartée** : MathJax v3 — couverture LaTeX/MathML plus large et rendu SVG accessible, mais asynchrone, ~4× plus lourd, et sa surface supplémentaire est inutile pour un LaTeX généré par l'interpréteur ; garder la double dépendance « au cas où » — code mort, poids d'installation et ambiguïté de conventions sans bénéfice, MathJax restant réinstallable si un besoin MathML/accessibilité SVG apparaît.

**Conséquences** : Tout nouveau rendu de formule doit passer par les helpers existants de `interpreter.js` (`renderMath`, `renderInlineMath`) — ne pas réintroduire de librairie de rendu parallèle. Si un besoin hors couverture KaTeX apparaît (MathML, environnements LaTeX avancés), rouvrir cette décision plutôt que d'ajouter MathJax en complément. La tâche S-06.01 est clôturée ; le reste du périmètre (éditeur, aperçu, stockage, tests formules complexes) était déjà livré (entrées des 2026-07-14 et 2026-07-18).

> **Mise à jour [2026-07-19]** : KaTeX reste le moteur d'**affichage lecture seule** ; l'**édition** passe à MathLive (décision Interpréteur V2 ci-dessous). La frontière est nette : MathLive uniquement dans l'éditeur (chargé lazy), KaTeX partout ailleurs.

---

### [2026-07-19] Interpréteur V2 — éditeur WYSIWYG MathLive, zone brute en mode expert, LaTeX en sortie (Lots 0-3 du plan diagrams/interpreteur_palette_v2.md)

**Contexte** : Vision utilisateur V2 (« système de formules aussi complet que Word, simple à utiliser ») : écrire directement dans la formule rendue, naviguer aux flèches entre les éléments et dans les cellules de matrices, palette à sections (planches utilisateur + `operateurs.md`). Un rendu KaTeX est du HTML figé — inéditable par construction ; il faut un composant maintenant un arbre de formule avec curseur logique.

**Décision** : (1) **MathLive 0.110 (MIT)** fournit la zone rendue éditable (`<math-field>`) — POC validé en navigateur réel : édition, insertion palette avec `\placeholder{}` navigables au Tab, matrices (`addColumnAfter`/`addRowAfter`), zéro erreur console. (2) **Chargement lazy strict** : `import('mathlive')` dans `onMounted` de `Interpreter.vue` uniquement — chunk séparé de 825 Ko (228 Ko gzip) jamais chargé sur les pages d'affichage ; en cas d'échec (jsdom des tests, vieux navigateur), l'éditeur se replie sur zone brute + aperçu KaTeX, pleinement fonctionnels. (3) **La zone brute reste la source de vérité du v-model** (compatibilité contrat `FormulaHelper`/mindmap inchangée) ; elle accepte LaTeX **et** raccourcis V1 (convertis par `toLatex`) ; l'édition WYSIWYG y réécrit du LaTeX (aller simple documenté — pas de conversion retour vers les raccourcis). (4) **`toLatex` rendu idempotent sur du LaTeX** (lookbehind `(?<!\\)` sur les raccourcis fonctionnels) : le LaTeX produit par l'éditeur peut être stocké tel quel et repasser par la chaîne de rendu existante sans corruption — c'est le mécanisme de rétrocompatibilité qui permet la bascule progressive vers le stockage LaTeX canonique (§5 du doc de conception) sans migration immédiate. (5) `\placeholder{}` est converti au rendu KaTeX (`renderMath`) : trou vide → `\square`, trou rempli → son contenu. (6) La palette (117 boutons, 4 onglets, aria-labels français) vit dans `interpreter/palette.js`, générée depuis le doc de conception. (7) Les toggles clavier virtuel/menu de MathLive sont masqués (`::part`) — la palette du projet les remplace.

**Alternative écartée** : MathQuill — sous-ensemble LaTeX plus étroit, pas de matrices natives, maintenance faible ; construire l'édition sur KaTeX — plusieurs mois pour réinventer le cœur de MathLive ; clavier virtuel natif MathLive au lieu de la palette maison — layers JSON puissants mais UI imposée, moins conforme aux maquettes et au design system du projet.

**Conséquences** : Nouvelle dépendance front `mathlive` (MIT) ajoutée aux conventions. `vite.config.js`/`vitest.config.js` déclarent `math-field` comme custom element. Les nouvelles formules produites par l'éditeur sont en LaTeX dans `$…$` — le contenu V1 (raccourcis) reste rendu à l'identique ; la migration one-shot et l'extension de `normalizeSymbolic` (correction `exact` sur LaTeX normalisé) restent à livrer (Lot 4). Boutons matrices +C/+L actifs dès que MathLive est prêt (pas de détection « curseur dans une matrice » — l'API publique ne l'expose pas proprement ; la commande est un no-op sûr hors matrice) — écart assumé vs conception, dette documentée. Le vérificateur d'homogénéité s'abstient sur le LaTeX (gate `\\`) tant qu'il n'est pas porté (Lot 5).

---

### [2026-07-19] Interpréteur V2, Lots 4-5 — normalisation à la comparaison plutôt que migration de données ; forme canonique sans multiplication explicite

**Contexte** : Après la livraison de l'éditeur (Lots 0-3), le corpus de formules devient mixte : raccourcis V1 (`over(1, 2)`) dans le contenu historique, LaTeX (`\frac{1}{2}`) dans le contenu produit par l'éditeur. La correction `exact` (`Semantic.service.normalizeSymbolic`) comparait des chaînes quasi brutes : une réponse V2 face à une réponse attendue V1 (ou l'inverse) ne matchait jamais. Le plan initial (§5 du doc de conception) prévoyait une migration one-shot du contenu V1 vers le LaTeX.

**Décision** : (1) **Pas de migration de données** : `normalizeSymbolic` fait converger les **deux côtés** de la comparaison vers une forme canonique commune (raccourcis V1, LaTeX MathLive et texte libre) — fractions (`over(a,b)` ≡ `\frac{a}{b}` ≡ `(a)/(b)` → `a/b`), racines, exposants (`x²` ≡ `x^{2}` ≡ `x^2`), grec (`\Delta` ≡ `Δ`), ensembles (`\mathbb{R}` ≡ `ℝ`), valeurs absolues, matrices (délimiteurs pmatrix/vmatrix/bmatrix **distincts** — un déterminant n'est pas une matrice), `\placeholder{}` effacés, `\left`/`\right` et espaces LaTeX ignorés. Le stockage mixte devient inoffensif pour la correction, et la représentation stockée reste exactement ce que l'auteur a saisi. (2) **La multiplication explicite disparaît de la forme canonique** (`r*i` ≡ `r·i` ≡ `ri`) : le LaTeX écrit la multiplication implicitement (`\frac{1}{2}mv^2`), impossible à faire matcher autrement avec la saisie V1 `1/2 * m * v^2` sans parser complet. (3) Le vérificateur d'homogénéité (front, `units.js`) reçoit une passe `latexToPlain` (fractions → `(a)/(b)`, insertion des multiplications implicites `)x`/`]x`/`x(`, annotations `\lbrack…\rbrack` → `[…]`) appliquée **uniquement aux entrées contenant un backslash** — la sémantique des saisies V1 est inchangée ; le gate d'abstention sur LaTeX est levé.

**Alternative écartée** : migration one-shot des contenus V1 vers LaTeX — réécriture destructive de données utilisateur pour un bénéfice nul tant que la comparaison normalise les deux côtés ; réévaluable si un autre consommateur exige un corpus uniforme (export, recherche). / Parser les deux écritures vers un AST comparé structurellement — seule voie pour les équivalences profondes (`a/b` ≡ `a·b⁻¹`, commutativité), disproportionnée aujourd'hui ; la parade multi-réponses (2026-07-18) couvre le besoin réel.

**Conséquences** : Risque de collision assumé sur la suppression du `*` : `2*3` ≡ `23` en forme canonique — improbable dans des réponses-formules réelles, sans effet sur la correction sémantique (prose) qui ne passe pas par ce chemin. Le test historique `normalizeSymbolic('U = R × I') === 'u=r*i'` devient `'u=ri'` (forme canonique documentée dans le test). V1 `matrix(…)` et V2 `pmatrix(…)` ne matchent pas entre eux (délimiteurs distincts — limite documentée). Toute nouvelle syntaxe de palette doit être ajoutée aux deux convergences (normalizeSymbolic côté API, latexToPlain côté units si pertinent).

---

### [2026-07-19] Équivalences algébriques dans la correction `exact` — comparaison par AST canonicalisé, en complément de normalizeSymbolic

**Contexte** : Demande utilisateur explicite : au-delà de la convergence textuelle V1/LaTeX (entrée précédente), reconnaître les équivalences mathématiques elles-mêmes — une réponse `a+b` doit matcher `b+a`, `over(F, S)` doit matcher `F*S^-1`, `x+x` doit matcher `2x`. L'entrée précédente avait écarté l'AST comme « disproportionné » ; cette demande revient dessus avec un périmètre volontairement borné.

**Décision** : Nouveau module `my_memo_master_api/helpers/algebraicEquivalence.js` exportant `algebraicallyEqual(a, b)`, appelé en complément (pas en remplacement) de `normalizeSymbolic` dans le court-circuit `exact` de `gradeSemantic`. Fonctionnement : (1) réutilise `unifyFormulaNotation` (extraite de `Semantic.service` dans `helpers/formulaNotation.js`, partagée entre les deux) pour unifier les notations en gardant les opérateurs explicites ; (2) tokenize et parse en arbre (nombres, variables **à une seule lettre** avec multiplication implicite par juxtaposition — convention physique, `mv` ≡ `m*v` — sauf noms de fonction reconnus `sin/cos/tan/ln/log/exp/sqrt/nsqrt`) ; (3) canonicalise : division → puissance inverse (`a/b` → `a·b⁻¹`), soustraction → addition du négatif, fractions/sommes aplaties et triées (commutativité), facteurs de même base combinés (exposants sommés), termes semblables combinés (coefficients sommés), constantes calculées, racines converties en puissance fractionnaire, équations aux côtés triés (symétrie `U=RI` ≡ `RI=U`) ; (4) compare les deux arbres canonicalisés par égalité stricte (`JSON.stringify`). Échec de parsing (prose, matrices, inéquations, syntaxe non couverte) → `false` silencieusement, jamais d'exception : la comparaison retombe sur les autres stratégies. Garde-fous : mots de 4+ lettres non reconnus comme fonction → échec rapide (évite de parser de la prose lettre par lettre) ; entrée > 300 caractères → rejetée ; `<`/`>` présents → hors périmètre (inéquations).

**Alternative écartée** : Un vrai CAS (Système de Calcul Formel) avec simplification/résolution — explicitement hors périmètre du projet (« CAS symbolique » marqué OUT dans les tâches S-06 dès l'origine). Ce module n'en est pas un : il ne résout ni ne simplifie, il compare seulement si deux expressions **déjà écrites** sont structurellement la même chose une fois réordonnées/réduites (pas de distributivité : `2*(a+b)` ≠ `2a+2b`, testé et documenté comme limite assumée). / Étendre `normalizeSymbolic` avec toujours plus de règles regex textuelles — ne peut fondamentalement pas capturer la commutativité ou la combinaison de termes, qui exigent une structure arborescente.

**Conséquences** : `helpers/formulaNotation.js` devient la source de vérité unique des transformations de notation (extrait de `Semantic.service.normalizeSymbolic`, qui l'appelle désormais plutôt que de dupliquer la logique). 22 tests dans `test/helpers/algebraicEquivalence.test.js` + 2 tests d'intégration `gradeSemantic` dans `Semantic.service.test.js`. Toute nouvelle syntaxe de palette introduisant un nouvel opérateur/fonction doit être ajoutée au tokenizer/canon (`FUNCTIONS`, `buildFuncNode`) si l'équivalence algébrique doit la reconnaître.

**Bug corrigé en chemin** : `unifyFormulaNotation` avalait aussi les parenthèses des appels de fonction à argument simple (`sqrt(x)` → `sqrtx`, syntaxe cassée) via la règle de nettoyage des parenthèses redondantes héritée des Lots 4-5 — corrigé par un lookbehind `(?<![a-zA-Z])` qui exclut les parenthèses précédées d'une lettre. Sans effet sur les tests existants (les deux côtés d'une comparaison textuelle étaient mangled identiquement, donc encore égaux) mais bloquant pour la comparaison par AST (`sqrtx` étant un identifiant de 5 lettres, rejeté par le garde-fou anti-prose).

---

### [2026-07-19] Commandes de matrice (+1C…+3L) — manipulation de chaîne LaTeX déterministe, pas l'API de commande MathLive

**Contexte** : Demande utilisateur : les commandes +C/+L de l'onglet Matrices ne doivent concerner QUE les matrices — jamais créer ni modifier quoi que ce soit d'autre. L'implémentation des Lots 0-3 appelait `mf.executeCommand('addColumnAfter'|'addRowAfter')` (API MathLive), en s'appuyant sur l'hypothèse (non vérifiée) que ces commandes étaient un no-op sûr hors contexte de matrice.

**Investigation** : Cette hypothèse s'est révélée **fausse**. Vérifié en navigateur réel (Edge headless, CDP) : (1) sur un champ **vide**, `executeCommand('addColumnAfter')` retourne `true` et **crée** `\begin{split} & \end{split}` à partir de rien — pas un no-op. (2) Sur une matrice **seule** dans le champ, la commande fonctionne proprement (pas de split) **uniquement si le curseur est resté dans le placeholder juste après l'insertion** (`selectionMode:'placeholder'` par défaut) ; dès que le curseur est déplacé (même Home/End sur la matrice seule, à plus forte raison si du contenu entoure la matrice), la commande enveloppe **tout le champ** dans un `\begin{split}` parasite. (3) Cette corruption s'est révélée **irréversible dans la même session** : ni `mf.setValue(previousLatex)`, ni `executeCommand('undo')` (qui retourne pourtant `true`), ni un délai (`setTimeout`/`requestAnimationFrame`) avant retour n'ont restauré l'état antérieur — le champ reste corrompu. Trois pistes de détection proactive du contexte ont aussi échoué : compter les `\begin`/`\end` dans `getValue(0, mf.position)` (les offsets de MathLive ne correspondent pas à un préfixe LaTeX plat à travers les branches d'un tableau) ; `.closest('.ML__mtable')` sur le marqueur de sélection dans le DOM du shadow root (le curseur/la sélection sont positionnés par transformation CSS, pas par imbrication DOM réelle) ; un champ `<math-field>` détaché comme bac à sable de test (`executeCommand` retourne toujours `false` sur un champ jamais monté — pas de modèle de sélection exploitable hors rendu réel).

**Décision** : Abandon total de l'API de commande MathLive pour ces deux actions. Nouvelles fonctions pures `addMatrixColumn(latex)`/`addMatrixRow(latex)` (`interpreter.js`) : `latex.trim()` doit matcher intégralement `^\\begin\{ENV\}...\\end\{ENV\}$` (une seule matrice/cas comme **tout** le contenu du champ) ; sinon retour `null`. Si ça matche, découpage des lignes sur `\\`, ajout d'un `\placeholder{}` à chaque ligne (colonne) ou d'une nouvelle ligne de `\placeholder{}` au nombre de colonnes existant (ligne), reconstruction de la chaîne. Le résultat est assigné à `userInput.value` (le `watch` existant resynchronise le `<math-field>` par un `setValue` simple et propre — jamais précédé d'un `executeCommand`, donc non affecté par le bug de blocage). Si `null`, un message temporaire (`aria-live="polite"`, 5 s) explique la limite : « Cette commande ne s'applique que si la formule est entièrement une matrice ». Les boutons ne sont plus jamais désactivés selon un état MathLive (fonctionnent aussi en mode repli sans MathLive, en opérant sur `toLatex(userInput.value)`).

**Alternative écartée** : Détecter le contexte « curseur dans une matrice » pour activer/désactiver le bouton en amont — abandonné après trois tentatives infructueuses (voir Investigation) ; l'API publique de MathLive n'expose pas cette information de façon fiable dans cette version (0.110.0). / Exécuter la commande sur un `<math-field>` détaché puis recopier le résultat si sûr — le champ détaché ne produit aucun effet (`executeCommand` toujours `false` hors montage réel), invalidant cette voie. / Diff avant/après sur le champ réel avec revert si un environnement est apparu — le revert ne fonctionne pas (voir Investigation), rendrait la garde inopérante en pratique.

**Conséquences** : Portée volontairement réduite par rapport à la conception initiale (§4 du doc de palette prévoyait une édition de matrice imbriquée dans une formule plus large) : seule une formule **entièrement** constituée d'une matrice/cas est extensible via ces boutons — limite documentée dans `palette.js`, le doc de conception et ici. Si le besoin d'étendre une matrice **imbriquée** dans une formule plus large apparaît, il faudra soit une version future de MathLive avec une API de contexte fiable, soit un parseur LaTeX maison capable de localiser la position du curseur dans l'arbre (chantier significatif, non entrepris ici). 6 tests unitaires (`addMatrixColumn`/`addMatrixRow` dans `test/helpers/interpreterLatex.test.js`) + vérification navigateur réel (champ vide → no-op, matrice seule → extension correcte sur plusieurs appels chaînés, matrice mêlée à du texte → refusé, champ intact).

---

### [2026-07-19] Palette V2 — glyphes ambigus de la planche formules résolus (T, 𝔻, flèche blanche)

**Contexte** : Trois glyphes de la planche « Formules » restaient non implémentés faute de certitude (§11 du doc de conception) : deux boutons « T » de styles différents, un glyphe « 𝔻 » stylisé (fraktur/gothique), une flèche blanche parmi les boutons de structure. Question posée à l'utilisateur pour trancher.

**Décision** : (1) Les deux boutons « T » étaient des **erreurs de saisie sur la planche** sans signification — retirés de `palette.js` (le bouton `\text{}` précédemment ajouté est supprimé). (2) La flèche blanche servait, dans l'outil dont s'inspirait la maquette (Word), à naviguer entre les éléments d'une formule — rôle déjà rempli par les flèches du clavier nativement supportées par MathLive ; ignorée, jamais ajoutée à la palette. (3) Le glyphe « 𝔻 » n'a pas de sens précis unique demandé par l'utilisateur, qui a choisi d'ajouter une section complète « Lettres fraktur » (`\mathfrak{}`, 52 lettres A-Z/a-z) à l'onglet Caractères « au cas où » (usage anticipé : idéaux, algèbres de Lie), sans cas d'usage concret dans le projet à ce jour.

> **Mise à jour [2026-07-19, même jour]** : première livraison avec des labels en lettres latines simples (`D`, `a`…), jugés « indiscernables des autres boutons » par l'utilisateur (impossible de repérer la section visuellement). **Corrigé** : labels remplacés par les glyphes Unicode fraktur réels (bloc Mathematical Alphanumeric Symbols, U+1D504…), **générés par calcul de point de code** plutôt que transcrits à la main (`String.fromCodePoint`, 5 exceptions historiques codées explicitement : C→U+212D, H→U+210C, I→U+2111, R→U+211C, Z→U+2128 empruntent d'anciens blocs Unicode legacy) — élimine le risque de transcription tout en gardant l'identification visuelle immédiate. Vérifié en navigateur réel : bouton affiche « 𝔇 », insère `\mathfrak{D}`, rendu KaTeX correct. Point additionnel clarifié : la section est la 4ᵉ (dernière) du groupe de l'onglet Caractères, dans un panneau à défilement interne (`max-height:260px`) — un utilisateur doit scroller *dans* le panneau (pas la page) pour l'atteindre, ce qui expliquait aussi sa difficulté à la trouver.

**Alternative écartée** : Deviner un sens pour « 𝔻 » (ensemble domaine `\mathbb{D}`, différentielle `\mathrm{d}`) sans confirmation — risque de livrer un bouton qui ne correspond à aucun besoin réel de l'utilisateur. / Utiliser les glyphes Unicode fraktur réels comme labels de bouton — nécessite de dériver correctement les points de code du bloc « Mathematical Alphanumeric Symbols » avec ses exceptions historiques (C, H, I, R, Z empruntent des blocs Unicode legacy distincts) ; risque de transcription non négligeable pour un gain visuel mineur.

**Conséquences** : Palette à 117+52 = 169 boutons. `\mathfrak{}` vérifié pris en charge par KaTeX (`renderToString` sans erreur). Section « Lettres fraktur » sans utilisation connue actuellement dans le projet — à retirer si elle s'avère inutile en usage réel, ou à enrichir (variantes calligraphiques `\mathcal{}`) si le besoin se précise.
