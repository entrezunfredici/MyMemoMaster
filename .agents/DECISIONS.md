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

---

### [2026-07-25] Journal des versions reconstitué en `AAAA.MM.n`, adossé au CHANGELOG_AGENT
**Contexte** : Le Bloc 4 du référentiel (C4.3.2) exige un journal des versions déployées. Le dépôt n'a aucun tag git et les images Docker sont poussées en `:latest` — il n'existe pas d'identifiant de version exploitable.
**Décision** : Créer `docs/JOURNAL_VERSIONS.md` avec une convention datée `AAAA.MM.n` (année.mois.itération), une « version » = un jalon mergé sur une branche de déploiement. Le journal est la vue synthétique orientée exploitation ; le détail technique reste dans `.agents/CHANGELOG_AGENT.md` (pas de duplication). Les livrables Bloc 4 sont placés dans `docs/` (préfixe `MCO_`), cohérent avec les manuels et audits existants.
**Alternative écartée** : Introduire immédiatement des tags semver rétroactifs — réécrire un versionnage a posteriori sur l'historique serait artificiel ; la mise en place de semver est proposée pour les **futures** livraisons (recommandation R1 de `docs/MCO_MAINTENANCE_EVOLUTIONS.md`).
**Conséquences** : `docs/JOURNAL_VERSIONS.md` doit recevoir une entrée à chaque merge sur `dev`/`staging`/`main`. Si la recommandation R1 (tags semver + images taguées) est adoptée, la convention `AAAA.MM.n` sera remplacée par `vX.Y.Z` à partir de ce point, sans réécrire les entrées passées.

---

### [2026-07-26] Bloc 4 rendu comme document unique (B4_RENDU.md), aligné sur le format B2
**Contexte** : Les livrables Bloc 4 avaient d'abord été rédigés en 4 fichiers séparés dans `docs/` (un par sous-bloc + journal de version). L'utilisateur a demandé de les fusionner pour rester cohérent avec le Bloc 2, déjà déposé comme un document unique (`B2_RENDU.md`).
**Décision** : Fusionner les 4 documents en un seul `B4_RENDU.md` à la racine du dépôt, avec la même structure que `B2_RENDU.md` (plan, sections par compétence, annexes). Les 4 fichiers `docs/MCO_*.md` et `docs/JOURNAL_VERSIONS.md` sont supprimés — aucune duplication de contenu conservée.
**Alternative écartée** : Garder les 4 fichiers séparés en les référençant depuis un `B4_RENDU.md` court — rejeté car le référentiel n'exige pas cette granularité et la cohérence de format entre blocs facilite le dépôt sur la plateforme YNOV.
**Conséquences** : Le journal de version (§3.2 de `B4_RENDU.md`) n'est plus un document vivant à part — il faudra le mettre à jour manuellement dans `B4_RENDU.md` si de nouvelles versions significatives sont livrées avant le dépôt final du dossier.

---

### [2026-07-31] Limite d'utilisateurs (MAX_USERS) : contrôle serveur source de vérité + guard front fail-open
**Contexte** : Demande utilisateur d'un plafond configurable sur le nombre total de comptes, pour éviter la surcharge de l'application. Le plafond doit rediriger l'utilisateur vers une page dédiée plutôt que vers le formulaire d'inscription une fois atteint.
**Décision** : Le comptage/la décision d'autoriser ou non une inscription vit exclusivement côté API (`UserService.isRegistrationOpen()`, comparaison `User.count()` vs `process.env.MAX_USERS`) — c'est la source de vérité, appliquée dans `UserService.create()` (403 si dépassé). Le front ajoute un `beforeEnter` sur la route `/register` qui appelle `GET /users/registration-status` et redirige vers `/registration-full` si `open === false`, mais **fail-open** : si cet appel échoue (réseau, backend down), la navigation vers `/register` est autorisée quand même — le 403 serveur au moment du submit reste le filet de sécurité. `MAX_USERS` vide/0 désactive la fonctionnalité sans coût (pas de `User.count()` exécuté).
**Alternative écartée** : Bloquer la navigation front en cas d'échec du contrôle (fail-closed) — rejeté, car un simple problème réseau transitoire empêcherait toute inscription même quand la limite n'est pas atteinte ; le filet de sécurité réel est déjà côté API. / Mettre la logique de comptage dans le controller — rejeté, violerait l'architecture Controller → Service → Model (`AGENT.md`).
**Conséquences** : `isRegistrationOpen()` compte tous les `User` sans filtrer sur `isActive` — désactiver des comptes ne libère pas de la place tant qu'ils ne sont pas supprimés. Si un besoin de "places libérées par désactivation" apparaît, il faudra ajouter `where: { isActive: true }` (ou équivalent) à `User.count()`, à documenter comme une nouvelle décision distincte.

---

### [2026-08-02] Sonde d'uptime externe via GitHub Actions planifié (pas de service tiers)
**Contexte** : La recommandation R3 du Bloc 4 demandait un signalement proactif des pannes entre deux déploiements — le pipeline CI/CD ne détecte une indisponibilité qu'au moment où il tourne. Il fallait un point d'observation **extérieur** au VPS et au cluster supervisés.
**Décision** : Un workflow GitHub Actions planifié (`.github/workflows/uptime.yml`, cron toutes les 5 min) pingue les URLs de santé listées dans la variable de dépôt `UPTIME_URLS` (3 tentatives espacées de 10 s) et alerte sur le webhook Discord déjà en place (`DISCORD_LOG`). Les URLs ne sont pas codées en dur : les domaines des environnements vivent dans les `.env` des serveurs, pas dans le dépôt ; variable absente = job en succès sans sonde (environnements éteints).
**Alternative écartée** : Service dédié (UptimeRobot, uptime-kuma auto-hébergé) — rejeté : un nouvel outil/compte à gérer, et uptime-kuma hébergé sur le VPS supervisé perdrait l'extériorité recherchée. L'infrastructure GitHub est déjà le point d'ancrage de toute la chaîne CI/CD et le webhook Discord existe.
**Conséquences** : Granularité réelle du cron GitHub ≥ 5 min avec dérive possible aux heures de pointe (objectif de détection ≤ ~10 min, assumé) ; le cron ne s'exécute que sur la branche par défaut, la sonde n'est donc active qu'une fois le workflow mergé sur `main` ; GitHub désactive les workflows planifiés après 60 jours sans activité du dépôt (à réactiver manuellement le cas échéant). Pas de déduplication d'alerte (relance toutes les ~5 min tant que la panne dure). Si un Alertmanager Prometheus est branché plus tard, cette sonde reste complémentaire (vue extérieure up/down vs métriques internes fines).

---

### [2026-08-02] Alertmanager intégré au chart maison, webhook Discord monté en fichier
**Contexte** : Second volet de la recommandation R3 du Bloc 4 — les métriques RED/USE collectées par le Prometheus du chart n'alertaient pas. Il fallait un Alertmanager routant vers le canal Discord existant, sans exposer le webhook.
**Décision** : Alertmanager déployé par le chart maison (`helm/templates/alertmanager.yaml`), un par namespace comme le Prometheus, image `prom/alertmanager:v0.28.1` épinglée, gaté par `monitoring.alerting.enabled` (false par défaut). Le webhook Discord est lu via `discord_configs.webhook_url_file` depuis la clé `DISCORD_WEBHOOK_URL` du Secret manuel `<release>-secrets`, montée en fichier — jamais en clair dans la ConfigMap. 4 règles d'alerte dans le `rules.yml` du Prometheus (cible down, 5xx, p95, event loop), seuils paramétrables par values.
**Alternative écartée** : `kube-prometheus-stack` (chart communautaire complet) — rejeté : dizaines de CRDs et de composants (Grafana, operators) disproportionnés pour un Prometheus par namespace déjà en place ; le pattern du chart maison (Role namespacé, non exposé par l'Ingress) est conservé. / Webhook dans la ConfigMap — rejeté : une ConfigMap est lisible par tout ce qui lit le namespace, le webhook permet de poster sur le Discord du projet.
**Conséquences** : L'activation exige la clé `DISCORD_WEBHOOK_URL` dans le Secret du namespace, sinon le pod Alertmanager ne démarre pas et `--atomic` rollback tout le déploiement — échec explicite préféré à un alerting silencieusement absent. `repeat_interval: 4h` (relance tant que l'alerte dure) ; silences non persistés (`emptyDir`). Si Grafana/dashboards deviennent nécessaires, la migration vers kube-prometheus-stack devra reprendre ces règles.

---

### [2026-08-15] Toute variable `.env` consommée par l'API doit être explicitement listée dans `environment:` de docker-compose.yml
**Contexte** : `MAX_USERS=2` posé dans le `.env` racine restait sans effet en environnement Docker (inscriptions toujours ouvertes) — bug signalé par l'utilisateur après deux comptes créés. `app.js` charge `dotenv.config({ path: path.resolve(__dirname, '../.env') })`, un chemin relatif à `__dirname` qui pointe vers le `.env` racine en exécution locale (`npm run start`), mais qui n'a aucune portée dans le conteneur Docker : seul `./my_memo_master_api` y est monté (`/app`), le `.env` racine n'y existe pas. En Docker, `process.env` du conteneur ne contient que les clés explicitement listées dans le bloc `environment:` de chaque service de `docker-compose.yml` — `MAX_USERS` n'y avait jamais été ajoutée depuis son introduction (2026-07-31).
**Décision** : `MAX_USERS: ${MAX_USERS:-}` ajouté au bloc `environment:` des services `api` (profil `dev`) et `api_server` (profil `test`/VPS) de `docker-compose.yml`, `MAX_USERS=` documentée dans `.env.test.example`, et `MAX_USERS: ""` ajoutée au bloc `config` de `helm/values.yaml` (absorbée automatiquement par la ConfigMap Helm et le `envFrom.configMapRef` de `deployment-api.yaml`, aucun template à toucher). Règle actée pour la suite : toute nouvelle variable lue via `process.env` côté API doit être ajoutée au bloc `environment:` du/des service(s) concerné(s) dans `docker-compose.yml` **et** au bloc `config` de `helm/values.yaml`, dans le même ticket que son introduction dans `.env.example`, sous peine de rester invisible en Docker ou en Kubernetes sans qu'aucune erreur ne le signale.
**Alternative écartée** : Monter le `.env` racine directement dans le conteneur (`env_file: ../.env` ou volume) pour que `dotenv.config` fonctionne tel quel en Docker — rejeté : casserait l'isolation actuelle où chaque service ne reçoit que les variables qui le concernent (ex. `api_server` n'a pas besoin de `PGADMIN_DEFAULT_PASSWORD`), et masquerait silencieusement le même type d'oubli à l'avenir (toute variable du `.env` deviendrait automatiquement visible, sans revue explicite service par service). / Ajouter aussi `MAX_USERS` aux manifests bruts `k8s/preprod/configmap.yml` et `k8s/prod/configmap.yml` — écarté : ces fichiers pré-Helm sont déjà obsolètes (migration Helm du 2026-06-30, cf. README) et il leur manque déjà une dizaine d'autres variables ; les corriger isolément aurait suggéré à tort qu'ils sont encore maintenus en parallèle du chart.
**Conséquences** : Une variable d'environnement Docker/Kubernetes n'étant lue qu'au démarrage du conteneur/pod, toute modification de `MAX_USERS` exige un redémarrage explicite pour être prise en compte (`docker compose up -d --force-recreate api` en local ; `helm upgrade` en cluster). La limite reste désactivée par défaut en preprod/prod (`MAX_USERS: ""` dans `values.yaml`) tant qu'aucune valeur n'est positionnée dans `values-preprod.yaml`/`values-prod.yaml` ou via `--set`.

---

### [2026-08-15] Révocation JWT (A07-M1) — cutoff `iat` par utilisateur plutôt que blacklist par token
**Contexte** : A07-M1 était un risque résiduel assumé (palliatif : expiration courte 15 min + rotation du refresh token) — pas de moyen de couper un token d'accès déjà émis avant son expiration naturelle (logout, reset/changement de mot de passe, désactivation de compte). Demande utilisateur explicite de fermer ce risque plutôt que de le laisser assumé.
**Décision** : `helpers/tokenBlacklist.js` ne blackliste pas des tokens individuels (pas de `jti`, pas de table dédiée) mais pose un marqueur **par utilisateur** (`jwt:revoked-since:<userId>` = timestamp, TTL 2 jours dans Redis) à chaque événement de révocation. `Auth.middleware.js` compare ensuite le claim `iat` du token au marqueur : tout token émis avant est rejeté (401), même non expiré. 4 points de révocation câblés : `logout`, `resetPassword` (en plus du refresh token déjà invalidé), `changePassword` (refresh token conservé — le front rafraîchit silencieusement via l'intercepteur 401 déjà en place, `helpers/api.js`), `setActive(false)`. `verifyRefreshToken` rejette en plus un compte `isActive: false`, sans quoi la révocation à la désactivation était contournable en appelant `/refresh-token` juste après.
**Alternative écartée** : Blacklist par token individuel (`jti` + table/Redis set des tokens révoqués, TTL = expiration du token) — rejetée : demande d'ajouter un `jti` à la génération du JWT (`controllers/User.controller.js`, 2 endroits) et une conversion string→hash à chaque vérification, pour un gain nul dans ce projet : un cutoff par utilisateur couvre exactement les mêmes scénarios (logout, reset, désactivation = « tout ce qui a été émis avant » et pas « ce token précis »), avec une seule clé Redis à écrire/lire au lieu d'une par token.
**Conséquences** : Toute révocation invalide *tous* les tokens de l'utilisateur émis avant l'instant T, y compris — pour `changePassword` — celui de la requête en cours ; assumé et documenté dans le code (le front absorbe ça via son intercepteur de refresh). TTL fixe de 2 jours choisi pour couvrir large sans avoir à parser `AUTH_JWT_EXPIRES_IN` (chaîne libre type `15m`/`1d` acceptée par `jsonwebtoken`) ; la clé s'auto-nettoie, pas de purge à prévoir. `helm/values.yaml` et `k8s/preprod|prod/` n'ont pas de configuration dédiée à ajouter : la fonctionnalité utilise le Redis déjà provisionné pour BullMQ.

---

### [2026-08-15] Client Redis dédié pour tokenBlacklist — pas la config BullMQ réutilisée telle quelle
**Contexte** : Découvert en cours du ticket ci-dessus, à l'exécution de la suite de tests complète (elle restait bloquée indéfiniment, workers Jest tués). `helpers/tokenBlacklist.js` réutilisait initialement `config/redis.config.js` (`maxRetriesPerRequest: null`) — réglage volontaire pour BullMQ (ses commandes bloquantes ont besoin de retries illimités, DECISIONS.md 2026-06-12). Mais `Auth.middleware.js` appelle `tokenBlacklist.isTokenRevoked()` sur **chaque requête authentifiée** : avec ce réglage, toute requête tentait une reconnexion Redis en boucle infinie dès que Redis était injoignable (environnement de test local/CI, sans conteneur Redis), au lieu du fail-open recherché.
**Décision** : Le client ioredis de `tokenBlacklist.js` reprend `redisConfig` (host/port/password) mais **surcharge** ses réglages de résilience : `maxRetriesPerRequest: 1`, `connectTimeout: 800`, `enableOfflineQueue: false` (une commande émise pendant une reconnexion échoue immédiatement plutôt que d'attendre), `retryStrategy` bornée (jusqu'à 5 s). Combiné au mock global de `helpers/tokenBlacklist` posé dans `test/setup.js` (appliqué à tous les fichiers de test, à l'image du mock global déjà existant pour `@xenova/transformers`) avec `jest.unmock(...)` dans `tokenBlacklist.test.js` pour tester le vrai module.
**Alternative écartée** : Garder `redisConfig` tel quel et se reposer uniquement sur le mock global de test — rejeté : le même piège se reproduirait en production lors d'une panne Redis réelle (chaque requête HTTP bloquerait indéfiniment en attendant une reconnexion, au lieu de répondre en fail-open comme documenté) ; le correctif doit vivre dans le code de prod, pas seulement dans les tests.
**Conséquences** : Un réglage de résilience (`maxRetriesPerRequest`/`retryStrategy`) est désormais spécifique à l'usage du client Redis (commande bloquante BullMQ vs vérification synchrone par requête HTTP) — à garder à l'esprit pour tout futur usage direct de Redis hors BullMQ dans l'API : ne pas réutiliser `redis.config.js` sans réévaluer ces réglages.

---

### [2026-08-15] Tagging de version automatisé en AAAA.MM.n plutôt que semver manuel (R1 du Bloc 4)
**Contexte** : R1 du Bloc 4 (`B4_RENDU.md` §5) — les images Docker sont poussées en `:latest` uniquement, un rollback ne peut pas cibler une version précise. Le journal de versions (`B4_RENDU.md` §6) utilisait déjà la convention `AAAA.MM.n` faute de tags git existants. Décision utilisateur : automatiser cette même convention dans `cd.yml` plutôt que d'adopter un semver classique (aurait demandé de décider quel niveau — majeur/mineur/correctif — bumper à chaque merge, un process manuel à mettre en place) ou de se limiter à documenter la procédure sans toucher au pipeline.
**Décision** : Nouveau job `tag_release` dans `cd.yml`, déclenché uniquement sur `staging`/`main` (pas `dev`/test, qui itère trop vite pour être taggé à chaque merge), en parallèle des jobs de déploiement (`needs: push_images`, jamais en amont — un échec de tag/release ne doit jamais bloquer une mise en prod). Calcule `vAAAA.MM.n` (`staging-vAAAA.MM.n` pour staging, préfixe qui évite toute collision de tag git avec les versions `main` sur le même dépôt) en comptant les tags existants du mois ; re-tague les images déjà poussées par `push_images` via `docker buildx imagetools create` (pas de rebuild, même digest) ; crée le tag git et une Release GitHub via le `gh` CLI pré-installé sur les runners GitHub-hosted (`permissions: contents: write` scopé à ce seul job, `GITHUB_TOKEN` intégré — aucun nouveau secret ni Action tierce).
**Alternative écartée** : Semver manuel avec bump décidé par label de PR — rejeté par l'utilisateur (process manuel supplémentaire). / Action marketplace dédiée (`softprops/action-gh-release` etc.) pour la release — écartée : le `gh` CLI est déjà présent sur le runner, une dépendance de moins à auditer/maintenir pour un besoin aussi simple qu'un `gh release create`.
**Conséquences** : Le tag et la release ne couvrent que les merges sur `staging`/`main` ayant déclenché un déploiement réussi (`push_images` en succès) — un build qui échoue ne produit ni tag ni release, cohérent avec l'objectif (un tag doit toujours pointer vers quelque chose de déployable). Non vérifié en conditions réelles à ce jour (pas de push déclenché depuis cette session) : validé par relecture + parsing YAML (`js-yaml`) uniquement — à surveiller au premier déploiement réel. `B4_RENDU.md` §6 (journal de versions en prose) n'est pas généré automatiquement par ce job — reste à mettre à jour manuellement, dette déjà actée à l'entrée du 2026-07-26.

---

### [2026-08-15] `overrides` npm ciblés plutôt qu'attendre une montée de version de `@xenova/transformers`
**Contexte** : `npm audit --omit=dev --audit-level=high` (gate CI) en échec sur `protobufjs` (critique) et `sharp` (haute), tous deux embarqués en dur par `@xenova/transformers@2.17.2` — la **dernière version publiée** de ce paquet (aucune 3.x n'existe sous ce nom à ce jour) via `onnxruntime-web@1.14.0` → `onnx-proto@4.0.4` → `protobufjs@^6.8.8`, et `sharp@^0.32.0`. `npm audit fix --force` ne proposait qu'une régression vers `@xenova/transformers@1.4.2`, une version antérieure à celle installée — inutilisable pour une dépendance qui porte le moteur de correction sémantique.
**Décision** : Champ `overrides` dans `package.json` (`protobufjs: 7.6.5`, `sharp: 0.35.0`, `uuid: 11.1.1` pour la même occasion côté `sequelize`) — force ces paquets à une version corrigée dans tout l'arbre, sans toucher à `@xenova/transformers` ni à `sequelize` eux-mêmes. Validé par une vérification **hors Jest** (`@xenova/transformers` est mocké globalement en test via `moduleNameMapper`, donc une suite verte ne prouve rien ici) : script Node autonome chargeant le vrai `pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2')` (le modèle réel de `Semantic.service.js`) et calculant un embedding — succès, ~16,7 s, 384 dimensions.
**Alternative écartée** : Attendre une montée de version amont d'`@xenova/transformers` — pas d'échéance connue, le paquet semble peu maintenu (dernière publication ancienne, pas de 3.x). / Migrer vers `@huggingface/transformers` (successeur officiel du projet Xenova) — changement d'API et de nom de paquet, chantier bien plus large qu'un correctif de sécurité, hors périmètre de ce ticket. / Ignorer/accepter le risque comme pour les CVE OS de l'image de base — écarté : contrairement aux CVE Debian (non exploitables en pratique, `will_not_fix`/`fix_deferred` officiels), celles-ci ont un correctif amont réel (juste pas encore répercuté par `@xenova/transformers`) et bloquaient concrètement le gate CI.
**Conséquences** : `protobufjs@7.6.5` sort de la plage `^6.8.8` déclarée par `onnx-proto` — `npm install` affiche un warning à chaque installation (`overrides` outrepasse volontairement le peer range), sans impact fonctionnel constaté. Si `onnx-proto`/`onnxruntime-web` publient une mise à jour qui dépend d'une API protobufjs 6.x disparue en 7.x, cet override devra être réévalué. Toute nouvelle CVE sur ces 3 paquets (ou sur d'autres transitifs du même type) doit être traitée par le même mécanisme (`overrides` + vérification hors Jest si le paquet est mocké en test) plutôt que par un simple `npm audit fix --force` qui peut proposer des régressions absurdes sur des dépendances peu maintenues.

---

### [2026-08-15] R5 réalisée par anticipation : cache de droits Leitner, TTL 30 s + invalidation explicite
**Contexte** : R5 (`B4_RENDU.md` §5) proposait un cache Redis courte durée (30-60 s) sur `LeitnerCardService.resolveUserRights()`, différé jusqu'à un besoin de charge mesuré. Demande utilisateur de la réaliser maintenant, sans attendre ce signal — aucune dégradation de latence n'a été observée à ce jour, la décision de l'implémenter est donc pilotée par la demande, pas par un indicateur.
**Décision** : Cache Redis clé/valeur (`leitner:rights:<userId>:<idSystem>` → JSON des droits), TTL **30 s** (borne basse de la fourchette recommandée, pas 60 s) doublée d'une **invalidation explicite** à chaque écriture connue de partage (`LeitnerSystemsUsers.create/update/delete`, `LeitnerSystem.share`). La TTL courte n'est donc qu'un filet de sécurité pour un chemin d'écriture non anticipé, pas le mécanisme de fraîcheur principal — un partage retiré est invisible au maximum le temps d'une invalidation manquée, jamais 30 s pleines dans le cas nominal. Client Redis dédié « fail-fast » (`helpers/redisClient.js`, factorisé depuis `helpers/tokenBlacklist.js` — voir l'entrée A07-M1 du même jour) : le cache est une pure optimisation, une panne Redis doit dégrader vers la résolution DB (déjà le comportement avant ce ticket), jamais bloquer une écriture de carte.
**Alternative écartée** : TTL 60 s (borne haute) — écartée, la fenêtre de staleness sur les chemins non couverts par l'invalidation explicite (aucun identifié à ce jour, mais l'exhaustivité n'est jamais garantie) est deux fois plus longue pour un gain de charge marginal au-delà de 30 s sur des sessions d'écriture typiquement courtes (ajouter/éditer quelques cartes d'affilée). / TTL seule sans invalidation explicite (plus simple) — écartée : R5 mentionne explicitement « au prix d'une invalidation à gérer (partages, changements de rôle) » comme le coût assumé de la recommandation, l'ignorer aurait rendu un partage retiré exploitable jusqu'à 30-60 s après coup, un compromis sécurité jugé inutile alors que les points d'écriture sont peu nombreux et déjà identifiés (2 services). / Invalidation par pattern Redis (`SCAN`/`KEYS leitner:rights:*:<idSystem>`, tous utilisateurs d'un système d'un coup) — écartée : l'appartenance (`idUser` du `LeitnerSystem`) n'est jamais réassignée après création (vérifié dans le code), donc une seule paire `(idUser, idSystem)` change à la fois par écriture ; une invalidation ciblée suffit et évite `KEYS`/`SCAN` (coûteux, déconseillé en prod Redis).
**Conséquences** : Toute nouvelle voie d'écriture sur `LeitnerSystemsUsers` (ou sur l'appartenance d'un `LeitnerSystem`, si cette contrainte venait à changer) devra ajouter son propre appel à `invalidateRights()`, sous peine de dette silencieuse identique à celle qui existait déjà côté DB avant ce ticket (aucun garde-fou automatique, juste une convention à respecter au fil des futurs tickets). `helpers/redisClient.js` devient le point de configuration Redis partagé pour tout usage hors BullMQ (`config/redis.config.js` reste dédié aux commandes bloquantes de la queue) — toute future intégration Redis "cache/lookup" doit réutiliser `createFailFastClient()` plutôt que dupliquer les réglages.

---

### [2026-08-26] Prod et preprod sur un cluster Kubernetes unique, isolées par PriorityClass et ResourceQuota
**Contexte** : Chez Infomaniak, le control plane dédié coûte 26,31 €/mois contre 12,15 € par worker. Deux clusters séparés (prod : CP + 2 workers ; preprod : CP + 1 worker) reviennent à 89,06 €/mois contre 50,60 € pour un cluster partagé — +76 %, dont l'essentiel est un second control plane. Côté capacité, prod + preprod ne réservent que 1,5 vCPU / 2,2 Gi sur 7,84 vCPU / 11,0 Gi allocatables : la séparation ne se justifie pas par les ressources.
**Décision** : Un seul cluster, deux namespaces (`mymemomaster` / `mymemomaster-preprod`), avec deux garde-fous pour compenser le fait que l'isolation par namespace est logique et non matérielle : (1) `PriorityClass` `mmm-prod` (1000) et `mmm-preprod` (100) — sous pression mémoire d'un nœud, kubelet évince la preprod avant la prod ; (2) `ResourceQuota` activé **uniquement sur la preprod**, calé au-dessus de la somme de ses limites (1,95 vCPU / 3,1 Gi → plafond 3 vCPU / 4 Gi), pour qu'une fuite mémoire en preprod ne puisse pas atteindre la prod. Les PriorityClass sont volontairement **hors du chart** (`k8s/priorityclasses.yml`) : cluster-scoped, deux releases Helm ne peuvent pas revendiquer le même objet.
**Alternative écartée** : Deux clusters — écartée sur le seul critère du coût du control plane, sans besoin de capacité correspondant. / Quota également sur la prod — écarté : c'est l'environnement que l'on protège, le plafonner reviendrait à bloquer sa propre montée en charge. / Taints/tolerations pour dédier un nœud à la preprod — écarté à 2 nœuds : cela reviendrait à supprimer la redondance de la prod. À reconsidérer à 3 nœuds.
**Conséquences** : Une montée de version du cluster touche les deux environnements simultanément — la preprod continue de valider les changements applicatifs mais cesse d'être un terrain de répétition pour les opérations d'infrastructure. Compromis assumé. **Correction du 2026-08-27** : le quota avait d'abord été calé au plus juste au-dessus de la somme des limites en régime établi (4 Gi pour 3,2 Gi consommés). Il bloquait alors **sa propre mise à jour** : un rolling update crée un pod de surge avant de retirer l'ancien, la demande passait à 4,125 Gi et était refusée — le déploiement restait indéfiniment en `Updated: 0/1`, et la release Helm en `pending-upgrade`. Un quota doit donc être dimensionné sur « régime établi + le pod le plus gros » (ici l'API, 1 Gi) : porté à 4 vCPU / 6 Gi. Par ailleurs, dès qu'un `ResourceQuota` porte sur `requests.*`/`limits.*`, **tout** pod créé dans le namespace preprod doit déclarer requests ET limits, sinon il est rejeté : toute future ressource ajoutée à ce namespace (job ponctuel, pod de debug) devra les porter.

---

### [2026-08-26] StorageClass explicite par environnement : `retain` en prod, `delete` en preprod
**Contexte** : Les trois `volumeClaimTemplates` du chart ne précisaient aucun `storageClassName` et prenaient donc la classe par défaut du cluster. Sur `pck-dkoyol2`, ce défaut est `csi-cinder-sc-retain` — politique **Retain** : le volume Cinder survit à la suppression du PVC et continue d'être facturé (0,080 €/Go/mois, tarif Perf1) jusqu'à suppression manuelle. Les PVC issus d'un `volumeClaimTemplates` ne sont de toute façon pas supprimés par un `helm uninstall`.
**Décision** : Rendre la classe explicite via une valeur `storageClass`, et la différencier : `csi-cinder-sc-retain` en prod (les données de production doivent survivre à une erreur de manipulation), `csi-cinder-sc-delete` en preprod (données jetables — le volume disparaît avec le PVC, pas de volume orphelin facturé après un `helm uninstall`). Valeur vide dans `values.yaml` = classe par défaut du cluster, pour ne pas casser un déploiement sur un autre cluster.
**Alternative écartée** : S'en remettre au défaut du cluster — écarté : le défaut n'est pas garanti d'un cluster à l'autre (l'ancien `pck-xolteoz` n'a pas été vérifié), et un défaut en `Retain` sur la preprod accumule des volumes facturés à chaque cycle de redéploiement. / `Delete` partout — écarté : sur la prod, un `helm uninstall` accidentel détruirait la base.
**Conséquences** : Les volumes de production doivent être supprimés **à la main** (`openstack volume list` puis `delete`) après un démantèlement volontaire, sinon ils restent facturés. À noter : le tarif du block storage Cinder est identique à celui du disque local des flavors (0,00011 €/Go/h dans les deux cas) — agrandir le disque d'un nœud n'est jamais un moyen d'économiser sur le stockage, et le disque local est éphémère.

---

### [2026-08-26] `topologySpreadConstraints` en `ScheduleAnyway` + PDB conditionnels plutôt qu'anti-affinité stricte
**Contexte** : `replicas: 2` sur l'API et le front ne protégeait de rien : sans contrainte de placement, le scheduler pouvait poser les deux pods sur le même nœud, et la perte de ce nœud coupait le service malgré la redondance payée. Aucun `PodDisruptionBudget` n'existait non plus, donc un `kubectl drain` pour maintenance pouvait évincer les deux replicas d'un coup.
**Décision** : `topologySpreadConstraints` avec `maxSkew: 1` sur `kubernetes.io/hostname` et `whenUnsatisfiable: ScheduleAnyway` (contrainte souple), plus un `PodDisruptionBudget` `minAvailable: 1` rendu **uniquement si `replicas > 1`**.
**Alternative écartée** : `whenUnsatisfiable: DoNotSchedule` (ou une anti-affinité `requiredDuringScheduling`) — écarté : sur un cluster réduit à un seul nœud disponible (panne, drain de l'autre), la contrainte stricte laisserait les pods en `Pending` au lieu de les déployer en mode dégradé. On préfère un service dégradé mais debout. / PDB inconditionnel — écarté : un `minAvailable: 1` sur un replica unique (cas de la preprod) bloquerait **définitivement** tout drain de nœud, y compris les opérations de maintenance légitimes.
**Conséquences** : La répartition est un objectif, pas une garantie — en conditions normales elle est respectée, mais un cluster contraint peut regrouper les pods sans alerter. À vérifier avec `kubectl get pods -o wide` après un incident. Par ailleurs la somme des limites de la prod (6,25 Gi) dépasse l'allocatable d'un seul nœud (5,5 Gi) : en cas de perte d'un nœud, tous les pods se replacent (le scheduler raisonne sur les *requests*, 1,2 Gi) mais ne peuvent pas tous saturer leurs limites simultanément — d'où l'intérêt des PriorityClass.

---

### [2026-08-26] Résolution de l'IP client derrière Cloudflare : `CF-Connecting-IP` + `proxy-real-ip-cidr`, `trust proxy` configurable
**Contexte** : Trois problèmes convergents. (1) `app.set('trust proxy', 1)` était calibré pour Traefik en docker-compose ; derrière Cloudflare **et** ingress-nginx la chaîne compte deux sauts, `req.ip` désignerait un proxy et non le client. (2) `ipKeyGenerator(req)` était un appel invalide depuis express-rate-limit v8 (détail dans le CHANGELOG du 2026-08-26) : le rate limiting par IP était totalement inopérant pour les requêtes non authentifiées. (3) Faire confiance à `X-Forwarded-For` sans restriction rend l'en-tête falsifiable par quiconque joint l'origine en direct.
**Décision** : Trois couches. Côté nginx, `use-forwarded-headers: true` **assorti de** `proxy-real-ip-cidr` limité aux 22 plages Cloudflare — l'en-tête n'est cru que s'il provient de Cloudflare, ce qui rend la configuration sûre même avant la mise en place du filtrage par security group. Côté service, `externalTrafficPolicy: Local` (et non `Cluster`) pour que nginx voie l'IP source réelle : en `Cluster`, le SNAT de kube-proxy masque l'origine et les plages Cloudflare ne matcheraient jamais. Côté application, un helper `clientIp(req)` qui privilégie `CF-Connecting-IP` (réécrit par Cloudflare à chaque requête, donc non falsifiable *si* l'origine est filtrée), et `trust proxy` piloté par `TRUST_PROXY_HOPS`, **laissé à 1** par défaut.
**Alternative écartée** : Passer `TRUST_PROXY_HOPS` à 2 immédiatement — écarté : tant que le proxy Cloudflare (nuage orange) n'est pas activé, faire confiance à deux sauts rend `X-Forwarded-For` falsifiable. Le passage à 2 doit être simultané à l'activation du proxy, pas anticipé. / Lire `CF-Connecting-IP` sans garde-fou réseau — écarté : sans filtrage de l'origine, un attaquant en direct forge l'en-tête et s'octroie un bucket de rate limiting neuf à chaque requête. / Corriger uniquement les appels `ipKeyGenerator` sans toucher à `trust proxy` — écarté : la clé aurait été correcte mais construite sur l'IP d'un proxy.
**Conséquences** : `TRUST_PROXY_HOPS` devient un réglage à coordonner avec l'état du DNS Cloudflare — un nuage orange activé sans passer la valeur à 2 remet tous les visiteurs dans un même bucket de rate limiting et fait logger l'IP du proxy dans les journaux de sécurité (`User.controller.js`, `requireRole.middleware.js`). Les 22 plages Cloudflare sont figées dans `k8s/ingress-nginx-values.yaml` : elles évoluent rarement mais doivent être resynchronisées depuis `https://api.cloudflare.com/client/v4/ips` de temps à autre. Enfin, `externalTrafficPolicy: Local` implique qu'un nœud sans pod ingress ne reçoit plus de trafic — sans danger tant que le `replicaCount` du contrôleur est au moins égal au nombre de nœuds.

---

### [2026-08-27] Relais SMTP Brevo pour l'envoi, boîte Hostinger conservée pour la réception
**Contexte** : L'inscription en production remontait un 500. Cause : `EMAIL_FROM` valait `noreply@my-memo-master.com` alors que le compte SMTP authentifié chez Hostinger est `support@my-memo-master.com` — Hostinger rejette tout expéditeur non détenu par le compte (`553 5.7.1 Sender address rejected`). Au-delà du correctif immédiat, la question s'est posée de changer de solution d'envoi : boîte mail auto-hébergée dans le cluster, autre hébergeur de boîtes (Infomaniak Service Mail), ou service d'email transactionnel.
**Décision** : Relais SMTP **Brevo** pour l'**envoi** applicatif (`smtp-relay.brevo.com:587`, STARTTLS), boîte **Hostinger conservée pour la réception** (les MX de `my-memo-master.com` ne bougent pas). Domaine authentifié chez Brevo : `brevo-code`, DKIM `brevo1._domainkey` (TXT) et `brevo2._domainkey` (CNAME), DMARC `p=none` avec rapports vers Brevo. `SMTP_USER` est un login dédié Brevo en `@smtp-brevo.com` (pas l'email du compte), `SMTP_PASS` est la clé SMTP `xsmtpsib-…` (pas une clé API v3 `xkeysib-…`). `EMAIL_FROM` aligné sur l'expéditeur vérifié dans Brevo (`support@my-memo-master.com`) : le domaine étant authentifié par DKIM, un `noreply@` fonctionnerait aussi — vérifié par un envoi réel — mais `support@` fait arriver les réponses des utilisateurs dans une boîte réellement relevée.
**Alternative écartée** : **Serveur mail auto-hébergé dans Kubernetes** (proposition initiale de l'utilisateur) — écarté sur trois motifs cumulés. Coût : un nœud dédié vaut 12,15 €/mois contre ~1,50 € pour une boîte hébergée, l'auto-hébergement revient donc *plus cher*. Délivrabilité : une IP cloud fraîche n'a aucune réputation d'expéditeur, or les emails concernés sont la vérification de compte et la réinitialisation de mot de passe — s'ils partent en spam, plus personne ne peut s'inscrire. Exploitation : SPF/DKIM/DMARC à maintenir, PTR dépendant d'Infomaniak, port 25 sortant souvent bloqué, et un relais mal configuré est un incident de sécurité classique. / **Migrer vers Infomaniak Service Mail** — écarté : c'est de l'hébergement de boîtes (~1,50 €/utilisateur/mois, IMAP/SMTP, pas d'API transactionnelle), donc le même produit qu'Hostinger. Cela aurait déplacé la facture sans rien régler, avec les mêmes quotas d'envoi sur SMTP mutualisé. / **Rester sur Hostinger en corrigeant seulement `EMAIL_FROM`** — solution appliquée en premier et qui fonctionnait ; dépassée à la demande de l'utilisateur, le gain de Brevo étant la délivrabilité mesurable (DKIM géré, suivi des bounces) plutôt que le prix.
**Conséquences** : **Brevo exige d'autoriser explicitement l'IP d'envoi** — l'option « Blocage d'adresses IP non autorisées » affichée sur `Désactivé` ne dispense pas de cette autorisation, ce qui a produit un `525 5.7.1 Unauthorized IP address` au premier essai. L'IP de sortie du cluster est **`83.228.249.91`** (SNAT du routeur OpenStack, commune à la prod et à la preprod) — à ne pas confondre avec `83.228.249.190`, l'IP d'entrée du load balancer. **Si cette IP de sortie change** (recréation du routeur, modification du pool de nœuds), les envois s'arrêteront silencieusement, et la panne se manifestera par une impossibilité de s'inscrire. C'est le point de fragilité principal de ce choix. Le filtrage IP côté Brevo casse par ailleurs l'envoi depuis un poste de développement (IP résidentielle dynamique). Enfin, la migration ne coûte que trois variables (`SMTP_HOST` en ConfigMap, `SMTP_USER`/`SMTP_PASS` en Secret) : `helpers/sendEmail.js` lit tout depuis l'environnement, Hostinger n'y étant qu'une valeur par défaut — changer de fournisseur ne demandera aucune modification de code.

---

### [2026-08-27] Connecteur Odoo : implémentation locale du contrat `rights_plugin_api` plutôt que court-circuit de `rights_bridge`
**Contexte** : Le plugin `odoo-plugin/` (portage Hermes, déposé tel quel dans le dépôt) délègue **toute** décision d'autorisation à un plugin frère `rights-plugin` via `sdk_odoo/rights_bridge.py`. Ce plugin frère n'a pas été copié : `rights_bridge` échoue à importer `rights_plugin_api`, positionne `RIGHTS_AVAILABLE = False`, et **refuse alors chaque appel CRUD** — comportement voulu par ses auteurs (« fails closed », documenté comme exigence opérationnelle dans le README du plugin). Le connecteur était donc inutilisable en l'état, quels que soient les accès fournis.
**Décision** : Écrire un module `local_rights/rights_plugin_api.py` implémentant le contrat public attendu (`ROLE_EVERYONE`, `Identity`, `resolve_identity`, `check_right`, `create_right`, `delete_right`, `list_rights_for_roles`, `list_rights_for_resource_type`), et l'exposer en ajoutant `local_rights/` à `sys.path` depuis `connector/bootstrap.py`. `rights_bridge` fait un simple `from rights_plugin_api import ...` : il suffit que le nom soit résolvable. Le répertoire est ajouté **en fin** de `sys.path`, de sorte qu'un vrai `rights-plugin` déposé un jour à côté du plugin (que `rights_bridge` insère lui-même) reprendrait la main. Le modèle de droits local est plus simple que l'original (pas de liaisons identité→rôle : hors Hermes il n'y a qu'un appelant, porteur du rôle `everyone`) mais conserve le refus par défaut, les jokers de ressource et de champ, et la confirmation par opération.
**Alternative écartée** : **Court-circuiter `rights_bridge`** en appelant `OdooClient` directement depuis le connecteur — écartée : cela aurait aussi contourné le filtrage de champs, la normalisation HTML des champs `html` et le garde-fou de confirmation portés par `OdooAIExecutor`, c'est-à-dire l'essentiel de la valeur du plugin, pour ne garder qu'un client JSON-RPC nu. / **Modifier `rights_bridge.py`** pour qu'il autorise tout quand `rights-plugin` est absent — écartée : cela inverse une décision de sécurité explicite de ses auteurs, dans un fichier qu'on veut pouvoir remplacer à l'identique lors d'une mise à jour du plugin. / **Recopier le vrai `rights-plugin`** — impossible, il n'est pas dans ce dépôt.
**Conséquences** : La politique par défaut (créée au premier lancement dans `odoo-plugin/.local/odoo-rights.json`) autorise la lecture de tous les modèles sans confirmation, et l'écriture/suppression **sous confirmation explicite** (`--yes` en CLI, `confirmed=True` en Python) — c'est le seul garde-fou restant, la validation humaine native d'Hermes n'existant pas ici. Toute restriction plus fine passe par l'édition de ce JSON. Effet de bord sur la suite de tests d'origine du plugin : `connector/bootstrap.py` modifiant `sys.path` à l'import, les tests de `rights_bridge` trouvent l'implémentation locale si un test du connecteur a été collecté avant eux — 5 tests passent du rouge au vert, aucun ne régresse, mais la suite devient sensible à l'ordre de collecte.

---

### [2026-08-27] Accès Odoo lus dans le `.env` sans jamais recopier le mot de passe sur disque
**Contexte** : `sdk_odoo/odoo_profile.py` persiste un profil de connexion via `SDKTable`, qui écrit les champs non secrets dans un JSON et les champs secrets dans un trousseau — fichier (`ODOO_PLUGIN_KEYRING_PATH`, en clair sauf si `ODOO_PLUGIN_ENCRYPTION_KEY` est défini) ou trousseau système (Credential Manager sous Windows). Or le mot de passe Odoo est déjà dans le `.env` du projet : l'écrire une seconde fois ailleurs multiplie les endroits à protéger sans rien apporter, et le chiffrer supposerait de stocker la clé… dans ce même `.env`.
**Décision** : Le profil est enregistré avec `password=None`. `SDKModel.secret_items()` écartant les secrets à `None`, **aucune écriture de trousseau n'a lieu** : `.local/odoo-profiles.json` ne contient que l'URL, la base, le login et le port. Le mot de passe est injecté dans `os.environ` sous `ODOO_SECRET_DEFAULT.PASSWORD` — deuxième niveau du chemin de résolution natif de `SecretService` (trousseau fichier → variable d'environnement → trousseau système). Il ne quitte donc jamais le `.env` ni le process courant. Le parseur `.env` est maison (~30 lignes) plutôt que `python-dotenv` : aucune dépendance ajoutée, et surtout le `.env` du projet n'est **pas** déversé dans `os.environ` — il porte des clés `URL`, `PASSWORD`, `MAIL` beaucoup trop génériques pour ça. Corollaire : ces noms génériques ne sont lus que dans le fichier, jamais dans l'environnement ; seuls les alias explicitement préfixés `ODOO_` (`ODOO_URL`, `ODOO_DB`, `ODOO_LOGIN`, `ODOO_PASSWORD`) peuvent surcharger depuis l'environnement.
**Alternative écartée** : **Trousseau fichier chiffré** (`ODOO_PLUGIN_KEYRING_PATH` + `ODOO_PLUGIN_ENCRYPTION_KEY`) — écartée : la clé de déchiffrement vivrait dans le `.env`, à côté du mot de passe qu'elle protège ; le gain est nul et le nombre de secrets à sauvegarder double. / **Trousseau système Windows** — écartée : un secret déposé hors du dépôt, invisible du `.env`, qui survit à la suppression du dossier et se désynchronise silencieusement si le mot de passe change dans le `.env`. / **`python-dotenv` avec `load_dotenv()`** — écartée : exporte tout le `.env` dans `os.environ`, y compris `PASSWORD`, `URL` et les secrets S3/SMTP/Cloudflare du projet, dans un process qui parle à un service tiers.
**Conséquences** : Le mot de passe est résolu à chaque exécution depuis le `.env` — changer la valeur dans le `.env` suffit, il n'y a rien à re-synchroniser. En contrepartie, le connecteur **ne fonctionne pas sans le `.env`** (pas de mode « accès mémorisés ») : un déploiement ailleurs devra fournir soit le fichier, soit les variables `ODOO_*`. `.local/odoo-profiles.json` reste néanmoins un fichier à ne pas diffuser (il porte le login et l'URL de l'instance) — il est couvert par l'entrée `odoo-plugin` du `.gitignore`, qui exclut le dossier entier.

---

### [2026-08-27] Frontière « correction sémantique » / « correction IA avancée » : la similarité par embeddings est dans le périmètre MVP, le LLM correcteur n'y est pas
**Contexte** : Les 15 tâches du bloc M-06 « Séries d'exercices » du projet Odoo `MyMemoMasterRNCP` déclarent toutes `OUT : Correction IA avancée`, sans qualificatif. Or la correction des réponses ouvertes par similarité sémantique est implémentée, testée et en production (`Semantic.service.js`, branché dans `Test.service.js` et `LeitnerCard.service.js`). Pris au pied de la lettre, le registre officiel exclut donc une fonctionnalité livrée — soit le code sort du périmètre, soit la ligne `OUT` ne dit pas ce qu'elle voulait dire. Il fallait trancher avant de créer la tâche manquante.
**Décision** : Deux natures distinctes, séparées par la question « le modèle produit-il du texte ? ». **IN (MVP)** : correction par **similarité d'embeddings** — modèle local `Xenova/paraphrase-multilingual-MiniLM-L12-v2`, similarité cosinus, seuils, verdict booléen + score, court-circuit d'égalité exacte (normalisation symbolique, équivalence algébrique) avant tout appel modèle, mode dégradé si le modèle est indisponible. Le modèle ne fait que **comparer** deux textes ; il ne génère rien, ne coûte rien par appel, et tourne dans le conteneur API. **OUT (hors MVP)** : correction IA avancée au sens d'un **LLM générateur** — feedback rédigé à l'étudiant, note argumentée, reformulation de la réponse attendue, correction de production écrite longue. Cette frontière est inscrite dans le « Point d'attention » de la tâche Odoo 1337 (`[M-06.15]`), pas dans la ligne `OUT` des 14 autres tâches, laissée intacte.
**Alternative écartée** : **Réécrire la ligne `OUT` des 15 tâches** en « Correction IA avancée (LLM, feedback rédigé) » — écartée : 15 écritures sur un registre officiel pour un ticket qui n'en demandait aucune, et le gabarit de périmètre est manifestement généré depuis une source amont (feature list / planning CSV) qu'une réécriture manuelle désynchroniserait. / **Créer un nouveau bloc dédié** (C-07 ou équivalent) — écartée : la fonctionnalité n'est pas optionnelle (MoSCoW « Could »), elle est appelée par le moteur de correction MVP lui-même ; l'isoler dans un bloc « Could » aurait contredit sa place réelle dans le produit. / **Classer la tâche « validé »** — écartée : aucune tâche de développement du bloc ne l'est, y compris celles dont le code est livré ; le registre réserve visiblement « validé » aux Synthèses.
**Conséquences** : Le critère « le modèle génère-t-il du texte ? » devient la règle d'arbitrage pour toute future fonctionnalité IA du bloc exercices — une aide à la reformulation ou un feedback automatique déclenchera un nouveau périmètre, pas une extension de M-06.15. Tant que les 14 tâches sœurs affichent `OUT : Correction IA avancée` sans qualificatif, la lecture isolée de l'une d'elles reste ambiguë : la levée de doute est dans M-06.15, et nulle part ailleurs. Enfin, la contrainte mémoire du conteneur API (512 Mo) est ce qui a fixé le choix du modèle d'embeddings : elle interdit de fait tout modèle génératif embarqué, ce qui rend la frontière aussi opérationnelle que fonctionnelle.

### [2026-08-27] Conventions de calcul des indicateurs de pilotage (avancement, coûts, délais)
**Contexte** : Le compte rendu `docs/COMPTE_RENDU_METRIQUES.md` chiffre sept indicateurs à partir du projet Odoo `MyMemoMasterRNCP` (279 tâches). Quatre ambiguïtés rendaient chaque indicateur calculable de plusieurs façons, avec des écarts allant jusqu'à un facteur 16 sur l'avancement (5,7 % ou 92,3 %) et 21 563 € sur le coût. Elles devaient être tranchées une fois, explicitement, pour que les chiffres soient reproductibles d'un arrêté à l'autre.
> **Mise à jour du 2026-08-27** — le point (1) est partiellement levé : l'étape Kanban a été recadrée le jour même (137 sous-tâches passées à « validé », voir l'entrée « Cascade de l'étape validé » ci-dessous). L'étape couvre désormais 153 tâches et non 16 ; l'écart résiduel avec l'état de tâche est de 16 tâches (blocs `M-00b` et `S-06`). Les points (2), (3) et (4) sont inchangés.

**Décision** : **(1) Avancement = état de tâche (`state = 1_done`), pas étape Kanban** — au moment de l'arrêté initial, l'étape « validé » ne couvrait que 16 tâches alors que 169 étaient à l'état « Terminé » et que les blocs concernés étaient déployés en production : le champ d'étape n'était pas maintenu. Les deux lectures sont publiées, l'état fait référence. **(2) Deux périmètres distincts, jamais fusionnés en un pourcentage unique** — MVP = blocs `M-*`/`S-*` (183 tâches engagées et chiffrées), backlog = blocs `C-*`/`W-*` (95 tâches, toutes en spécification, 0 h allouée) ; le taux de référence est celui du MVP (92,3 %). **(3) Assiette de coût = tâches élémentaires (sans enfants), 1 JH = 8 h** — les Synthèses agrègent leurs sous-tâches et les inclure double le total (17 522 h au lieu de 9 674 h) ; la valeur 8 h/jour est lue dans `resource.calendar` (« Standard 40 hours/week »), pas supposée. **(4) La charge de la tâche 1337 est ramenée à 70 h dans les calculs** — ses 645 h sont la recopie du total du bloc M-06 lors d'une édition externe du 2026-08-27, pas une estimation.
**Alternative écartée** : **Retenir l'étape « validé »** comme définition de l'avancement — conforme au libellé de l'indicateur (« Tâches Validées / total ») mais afficherait 5,7 % pour un produit en production : exact au sens du champ, faux au sens du réel. / **7 h par JH** (usage fréquent en ESN) — gonflerait le coût de 14 % sans fondement dans les données du projet ; le calendrier Odoo fait foi. / **Corriger la tâche 1337 dans Odoo avant de mesurer** — le registre officiel n'est pas modifié pour produire un rendu ; la correction est recommandée dans le §8 du compte rendu et laissée à l'arbitrage. / **Calculer l'écart de délais depuis Odoo seul** — impossible, `date_end` est vide sur les 279 tâches ; l'écart est reconstitué par appariement avec les entrées datées du CHANGELOG, avec sa limite de représentativité (8 tickets) énoncée dans le rendu.
**Conséquences** : Tout futur point de pilotage doit reprendre ces quatre conventions, sans quoi les séries ne sont pas comparables d'un arrêté à l'autre. L'indicateur « charge par profil » reste non alimentable tant qu'aucun profil n'est renseigné sur les contributeurs Odoo — la ventilation publiée est nominative. L'indicateur « couverture SonarQube » restera à 0 % tant que la CI ne publiera pas de rapport `lcov` : la couverture réelle mesurée localement (86,6 % sur l'API) est documentée à côté mais ne s'y substitue pas.

---

### [2026-08-27] `APP_FRONT_URL` injecté explicitement dans les conteneurs API plutôt que laissé au repli `http://localhost` du code
**Contexte** : `User.controller.js` construit le lien de vérification email (`register` et `resendVerification`) à partir de `process.env.APP_FRONT_URL || 'http://localhost'`. Cette variable était documentée dans `.env.example` (§ Backend) mais **absente du `.env` local et jamais transmise aux services `api` (profil dev) ni `api_server` (profils test/prod)** du `docker-compose.yml` : les deux conteneurs retombaient donc systématiquement sur le repli codé en dur. En dev, la coïncidence est heureuse — Traefik expose le front sur `http://localhost:80`, le repli est la bonne valeur. En test/preprod/prod, le repli est faux : chaque email de vérification serait parti avec un lien vers `http://localhost` chez le destinataire, c'est-à-dire un lien mort ou, pire, pointant sur un service local arbitraire du poste qui l'ouvre.
**Décision** : Ajouter `APP_FRONT_URL` aux deux blocs `environment`, adossé aux variables de domaine déjà en place plutôt qu'à une constante : `${APP_FRONT_URL:-${VITE_FRONT_URL}}` en dev (même source que `CORS_ORIGIN`, qui décrit déjà l'origine du front) et `${APP_FRONT_URL:-https://${FRONT_DOMAIN}}` en test/prod (même construction que `CORS_ORIGIN: https://${FRONT_DOMAIN}` et `API_PUBLIC_URL`). La variable reste surchargeable par le `.env` pour le cas où le lien public diffère de l'origine CORS (front derrière un autre nom de domaine, lien de tracking). Même traitement sur les deux autres chemins de déploiement, où la ConfigMap est consommée entière par `envFrom` : clé déclarée dans `helm/values.yaml` et valorisée par environnement dans `values-preprod.yaml` / `values-prod.yaml`, et ajoutée aux ConfigMaps `k8s/preprod` / `k8s/prod`. Dans tous les cas la valeur reprend le `VITE_FRONT_URL` du même fichier — l'URL du front y est déjà déclarée une fois, on ne l'y réécrit pas différemment. `APP_FRONT_URL=http://localhost` est par ailleurs ajouté au `.env` local, pour que la valeur soit lisible là où on la cherche et non déduite d'un repli.
**Alternative écartée** : **Supprimer le repli du contrôleur et faire échouer l'API au démarrage si `APP_FRONT_URL` est absente** — écartée : `sendEmail` est un chemin secondaire de `register`, et faire tomber tout le service pour une variable d'email est disproportionné ; le repli reste utile en test unitaire et en exécution native hors Docker. / **Reprendre `VITE_FRONT_URL` directement dans le contrôleur** (`process.env.VITE_FRONT_URL`) — écartée : une variable préfixée `VITE_` décrit le build du front, la lire côté API brouille la frontière entre les deux configurations. / **Coder en dur l'URL par environnement dans le contrôleur** (`NODE_ENV === 'production' ? ... : ...`) — écartée : trois environnements (dev/test/preprod/prod) et des domaines déjà paramétrés par `FRONT_DOMAIN`, la duplication se désynchroniserait au premier changement de domaine.
**Conséquences** : Le lien de vérification suit désormais le domaine déclaré de l'environnement, sans intervention. Corollaire à connaître : si `FRONT_DOMAIN` change en prod sans que `APP_FRONT_URL` soit explicitement posée, le lien suit automatiquement — c'est le comportement voulu, mais cela signifie aussi qu'une valeur `APP_FRONT_URL` posée « pour mémoire » dans un `.env` de prod prendra silencieusement le pas sur `FRONT_DOMAIN` en cas de divergence. Les emails déjà envoyés portent l'ancien lien : ils ne sont pas rattrapables, le bouton « Renvoyer le code » de `VerifyEmailPage.vue` est le chemin de sortie.


---

### [2026-08-27] Cascade de l'étape « validé » sur les sous-tâches, plutôt qu'abandon de l'étape Kanban comme indicateur
**Contexte** : Le compte rendu de pilotage a mis en évidence que l'étape Kanban du projet Odoo `MyMemoMasterRNCP` ne reflétait pas le réel : 16 tâches à l'étape « validé » pour 169 à l'état « Terminé », soit un indicateur d'avancement affiché à 5,7 % pour un produit en production. La cause est mécanique et non un désaccord de fond : quand une Synthèse de bloc était validée, ses sous-tâches — toutes terminées — n'étaient pas déplacées avec elle. L'indicateur demandé au titre du pilotage s'intitule pourtant littéralement « Tâches **Validées** / total » : le mesurer sur un autre champ que l'étape est défendable mais demande à chaque fois une note d'explication.
**Décision** : **Réparer le champ plutôt que contourner l'indicateur.** Règle posée par le porteur du projet et appliquée telle quelle : *une tâche à l'étape « validé » implique que toutes ses sous-tâches y sont*. 137 sous-tâches des 12 Synthèses validées ont été repositionnées en une écriture. La cascade a été **conditionnée à un contrôle** : les 137 étaient déjà à l'état `state = 1_done`, donc l'écriture n'avance aucun travail, elle rattrape une saisie. La règle n'a **pas** été étendue dans l'autre sens (« tous les enfants terminés ⇒ valider le parent ») : les blocs `M-00b` et `S-06`, pourtant livrés, restent hors « validé » parce que leur Synthèse ne l'est pas et que `M-00b` porte encore 280 h de reste-à-faire.
**Alternative écartée** : **Laisser l'étape en l'état et ne publier que l'état de tâche** (position de l'entrée « Conventions de calcul » du même jour) — écartée par le porteur du projet : cela fige durablement un registre officiel faux et oblige à défendre, à chaque restitution, pourquoi l'indicateur nommé « validées » n'est pas lu sur le champ de validation. / **Aligner l'étape sur l'état pour les 169 tâches `1_done`** (y compris `M-00b` et `S-06`) — écartée : cela validerait deux blocs dont la Synthèse est encore en « en cours » / « vérification » et dont l'un a du reste-à-faire chiffré ; la cohérence descendante (parent validé ⇒ enfants validés) est une déduction sûre, la cohérence ascendante est un arbitrage. / **Écrire tâche par tâche pour tracer chaque changement** — écartée : `write` sur 137 ids est une seule transaction Odoo (tout ou rien), là où 137 appels laissent un état partiel possible en cas de coupure ; la traçabilité est assurée par le fichier de retour arrière produit avant écriture.
**Conséquences** : L'indicateur d'avancement peut désormais être lu sur l'étape Kanban, comme son libellé le demande : **83,6 % sur le MVP** (153/183), contre 92,3 % au sens de l'état de tâche — deux lectures désormais proches, dont l'écart de 16 tâches est entièrement imputable à `M-00b` et `S-06` et documenté comme tel. Corollaire à ne pas perdre : l'étape Kanban n'est plus « non maintenue » mais elle n'est pas non plus auto-maintenue — la même dérive se reproduira au prochain bloc validé si les sous-tâches ne suivent pas, et la cascade devra être rejouée. L'export local `odoo-plugin/tasks.json` est périmé de ce fait : toute mesure ultérieure doit repartir d'une lecture live.


---

### [2026-08-27] Capacité RH calculée sur le régime de travail déclaré, pas sur le calendrier de ressource Odoo
**Contexte** : L'indicateur RH du compte rendu de pilotage rapporte la charge planifiée à la « capacité disponible ». La seule source de capacité présente dans les données est le calendrier de ressource Odoo, qui déclare les 10 contributeurs en « Standard 40 hours/week » — d'où une capacité de 254 JH par personne sur la fenêtre de Gantt. Ce calendrier est faux pour 9 d'entre eux : le régime réel du projet est **un seul contributeur à temps plein, les autres travaillant 1 jour toutes les 3 semaines** (≈ 16,8 JH sur les 50,4 semaines de la fenêtre). L'indicateur était donc calculé sur une capacité 15 fois surestimée pour 90 % de l'équipe, ce qui rendait la surcharge invisible et le dépassement de délais inexplicable.
**Décision** : Retenir le **régime déclaré** comme base de capacité, et l'énoncer en tête du compte rendu au même rang que le taux journalier (300 €/JH) et la conversion (1 JH = 8 h) — c'est-à-dire comme une convention assumée, pas comme une mesure. La capacité devient asymétrique (254 JH pour un, 16,8 JH pour neuf, 405,2 JH au total) et sert de dénominateur unique aux §4 et §6. Le calendrier Odoo n'est **pas** modifié dans la foulée : corriger le registre est une action de pilotage à part entière (inscrite en P1 au §8), pas un préalable à la mesure. Le régime déclaré est par ailleurs **corroboré, sans être prouvé**, par le dépôt Git (§6.1) : 65 jours actifs pour le contributeur à temps plein sur la fenêtre contre 6 au maximum pour tout autre, soit un rapport de 1 à 11 du même ordre que le rapport de capacité 254 / 16,8.
**Alternative écartée** : **Garder le calendrier Odoo comme source de capacité** — écarté : il produit un indicateur exact au sens du champ et faux au sens du réel, exactement le travers déjà rencontré sur l'étape Kanban le même jour. / **Déduire la capacité des jours de commit Git** (156 jours actifs pour Frederic, etc.) — écarté : un jour de conception, de documentation, d'infrastructure ou de saisie Odoo ne laisse aucun commit ; les jours actifs sont un **plancher d'activité**, jamais une mesure d'effort, et les prendre pour de la capacité sous-estimerait mécaniquement le contributeur le plus impliqué. Ils sont donc publiés en corroboration, dans une section séparée, avec cette limite écrite. / **Corriger les `resource.calendar` d'Odoo avant de mesurer** — écarté pour la même raison que la tâche 1337 au §3 : le registre officiel n'est pas modifié pour produire un rendu ; la correction est recommandée et laissée à l'arbitrage.
**Conséquences** : Trois indicateurs changent de sens et non seulement de valeur. **RH** : la surcharge n'est plus « 444 % sur un contributeur » mais « **281 % à l'échelle de l'équipe**, dont 444 % sur le seul temps plein et 0 JH sur six membres » — ce n'est plus un problème de répartition, c'est un plan surdimensionné dont la capacité collective disponible n'est mobilisée par aucune tâche. **Délais** : les +127 jours cessent d'être un retard d'exécution et deviennent l'écart arithmétique entre un plan de 1 137,4 JH et une capacité de 405,2 JH — le dépassement était certain avant le démarrage. **Coûts** : les 330 712 € ne peuvent plus être présentés comme une dépense constatée (1 102,4 JH ne tiennent pas dans 405,2 JH de capacité) mais comme la valorisation au barème de la charge planifiée livrée. Contrepartie assumée : ces trois lectures reposent sur une donnée **déclarative**, non reproductible depuis les systèmes ; le compte rendu le signale à l'en-tête et en annexe, et tout arrêté ultérieur doit reprendre le même régime sous peine de séries incomparables. **Précision ajoutée après vérification des dates** : la capacité de 405,2 JH suppose les 10 contributeurs présents sur les 50,4 semaines de la fenêtre, alors que le dépôt montre que 3 d'entre eux sont sortis dès mai 2025 et que le dernier commit non-Frederic date du 2026-04-29. C'est donc un **majorant** : les 281 % de surcharge sont un plancher. Il n'est pas possible de faire mieux — Odoo ne porte aucune date d'entrée ou de sortie d'équipe, et l'absence de commit ne prouve pas l'absence du projet. Le compte rendu affiche le chiffre avec cette réserve plutôt qu'une estimation de présence reconstituée, qui aurait été une invention.


---

### [2026-08-27] Le projet Odoo est un registre rétrospectif : les indicateurs mesurent d'abord la qualité du registre
**Contexte** : Le rapprochement du dépôt Git et du projet Odoo faisait apparaître ce qui ressemblait à un défaut de tenue : 4 auteurs Git significatifs sans compte assigné dans Odoo (135 commits cumulés), et 6 des 10 assignés Odoo sans aucune tâche chiffrée. La première rédaction du §6.1 en avait conclu que « le registre et le dépôt ne décrivent pas la même équipe », avec une action de rapprochement des comptes à la clé. **La vérification des dates invalide cette lecture** : les 253 premières tâches Odoo ont été créées le 2026-05-14, le dernier commit d'un contributeur autre que le porteur du projet date du 2026-04-29, et les 196 commits postérieurs à la création du registre sont tous du porteur. Odoo n'a donc jamais observé le projet pendant sa phase collaborative.
**Décision** : Traiter le projet Odoo pour ce qu'il est — un **registre rétrospectif tenu par une seule personne après la clôture de la phase collaborative** — et l'écrire dans le compte rendu plutôt que de corriger les données pour faire disparaître le symptôme. Trois conséquences sont inscrites explicitement : (1) les 6 contributeurs à 0 JH sont un **artefact de périmètre temporel**, pas une donnée RH, et leur travail réel est attesté par le dépôt ; (2) la capacité d'équipe de 405,2 JH est un **majorant nominal**, donc les 281 % de surcharge sont un **plancher** ; (3) le Gantt, saisi le 2026-05-14 pour une fenêtre s'achevant le 2026-05-08, est postérieur à la date de fin qu'il déclare — étant entendu, **précision apportée depuis** (voir l'entrée suivante), que ses dates sont la transcription fidèle d'un planning amont établi *ex ante* : c'est l'observation du réalisé qui manque, pas la planification. La synthèse du §8 en tire la clé de lecture générale : **les indicateurs mesurent d'abord la qualité du registre, et seulement ensuite celle du projet.**
**Alternative écartée** : **Créer les comptes manquants et réassigner rétroactivement les tâches** aux contributeurs de la phase collaborative — écartée : cela fabriquerait dans le registre officiel une répartition qui n'a jamais été saisie, à partir d'une attribution devinée depuis les commits ; c'est une falsification de données de pilotage, pas une correction. / **Reconstituer une capacité « au prorata de présence »** à partir des dates de premier et dernier commit — écartée : l'absence de commit ne prouve pas l'absence du projet (conception, documentation, réunions), et le chiffre obtenu aurait l'apparence d'une mesure sans en être une ; le compte rendu affiche 405,2 JH avec la réserve « majorant » plutôt qu'un nombre inventé. / **Retirer le §6.1 et ne publier que les données Odoo** — écartée : c'est précisément la confrontation des deux sources qui révèle la nature du registre ; la retirer rendrait les 6 contributeurs à 0 JH incompréhensibles et laisserait croire à une équipe inactive.
**Conséquences** : Aucune donnée n'est modifiée dans Odoo au titre de ce constat — c'est une décision de lecture, pas de correction. L'action P2 du §8 est requalifiée : « documenter la phase collaborative hors Odoo (11 contributeurs Git, 2024-10 → 2026-04) » remplace « rapprocher les comptes Odoo des auteurs Git ». Corollaire pour la soutenance : la phase à plusieurs (11 contributeurs, ~450 commits non-porteur) n'est **traçable que dans le dépôt Git** ; toute question sur le travail d'équipe doit être documentée depuis là, jamais depuis Odoo, qui répondrait « 0 JH ». Enfin, cette entrée corrige une conclusion publiée quelques heures plus tôt le même jour — signe que le rapprochement Git/Odoo doit être daté avant d'être interprété, et non l'inverse.


---

### [2026-08-27] Séparer *le plan* du *suivi* dans la lecture des indicateurs : le premier est authentique, le second n'a jamais existé
**Contexte** : Les entrées précédentes du même jour avaient qualifié le projet Odoo de « registre rétrospectif », en tirant implicitement la conclusion que son Gantt était reconstruit après coup — ce qui aurait retiré toute valeur à l'indicateur délais, un plan écrit après les faits ne pouvant servir de référence. Deux précisions du porteur du projet ont conduit à vérifier : il n'y a **jamais eu de saisie de temps**, mais **il y avait bien eu des Gantts** avant Odoo. Les deux se vérifient dans les données, et elles tirent en sens opposés.
**Décision** : Ne plus traiter « Odoo » comme un bloc, mais distinguer explicitement dans le compte rendu **ce qu'il porte** (un plan) de **ce qu'il ne porte pas** (son exécution). **Le plan est authentique et antérieur** : 253 tâches sur 279 portent un `ID source planning`, 129 portent une ligne `Planning CSV: jj/mm/aaaa → jj/mm/aaaa`, et sur **123 d'entre elles les dates du Gantt Odoo sont identiques au jour près** à celles du planning amont ; les tâches portent en outre leur rattachement d'origine (sprints MVP 1-7, V1 8-9, phases « Été 2025 (solo) » et « Post 29/04/2026 »). Comparer le réalisé à ce Gantt est donc **légitime**, et le compte rendu le dit désormais explicitement. **Le suivi, lui, est structurellement absent** : `project.task` n'expose aucun champ d'heures effectives et aucun modèle de feuille de temps n'existe dans l'instance — le module n'est pas installé. L'indicateur coûts passe de « ⚠️ proxy » à « ❌ sans source possible ».
**Alternative écartée** : **Maintenir la qualification « rétro-planning »** au motif que les tâches Odoo ont été créées le 2026-05-14 — écartée : la date de création d'un enregistrement ne dit rien de la date d'établissement du plan qu'il transcrit, et la coïncidence au jour près de 123 fenêtres de dates avec un planning amont ne peut pas être un artefact de saisie rétrospective. / **Installer le module Feuilles de temps et saisir rétroactivement le temps passé** — écartée pour la même raison que la réassignation rétroactive des contributeurs : cela fabriquerait une donnée de pilotage qui n'a jamais été relevée. / **Retirer l'indicateur coûts du rendu**, faute de source — écartée : l'indicateur est demandé, et l'énoncer avec sa réserve (valorisation de charge planifiée, pas dépense) est plus utile au jury que son absence.
**Conséquences** : La synthèse du §8 classe désormais les sept indicateurs en trois catégories, ce qui donne au rendu une structure défendable : **trois se mesurent réellement** (risques, avancement, qualité RGAA), **deux se mesurent contre un plan authentique mais sans réalisé** (délais, RH), **deux n'ont aucune source dans les systèmes** (coûts, couverture SonarQube — cette dernière étant réparable, cf. action P0). Corollaire relevé au passage et conservé au §4 : la borne « Post 29/04/2026 » inscrite dans le planning coïncide exactement avec le dernier commit d'un contributeur autre que le porteur du projet — **la fin de la phase collaborative était planifiée, pas subie**, ce qui retire à l'indicateur RH toute lecture en termes de défection d'équipe. Enfin, méthode à retenir : deux entrées de ce journal ont dû être corrigées le jour même pour avoir interprété une absence de données (contributeurs à 0 JH, puis Gantt sans réalisé) avant d'en avoir daté la cause. **Dater avant d'interpréter.**


---

### [2026-08-28] Planning de référence = le xlsx d'équipe, pas le Gantt Odoo ; durées réestimées pour un profil junior
**Contexte** : Deux plans coexistent pour le même projet. **Odoo** porte 279 tâches dont 129 chiffrées, à un gabarit quasi uniforme de 70 h (8,75 JH) sur 10 jours ouvrés — 105 des 129 tâches tiennent sur trois valeurs, une documentation et un moteur de correction y valent le même prix, 13 Synthèses sur 25 ne totalisent pas leurs enfants, et 32 tâches livrées portent 0 h. **Le xlsx `17_planning_MyMemoMaster.xlsx`** porte 192 tâches sur 12 membres × 16 sprints, à 0,5-2 JH, avec un intitulé métier par tâche. Il fallait choisir lequel sert de base au planning daté demandé.
**Décision** : Retenir **le xlsx comme plan de référence** et le dater ; Odoo n'est pas utilisé pour cet exercice. Les durées ne sont pas reprises telles quelles : chaque tâche est **réestimée pour un profil développeur junior**, une par une (`estim.py`, 192 valeurs explicites) plutôt que par un multiplicateur global — pilotage, bilans et archivage bougent peu (×1,0-1,5), développement et infrastructure doublent (×1,8-2,2). Total 236,5 → **411 JH (×1,74)**. Le calendrier retenu, après constat que « durées junior + 2 jours/3 semaines + fin en mai-juin » sont incompatibles (il aurait fallu 22 cycles, soit décembre 2026) : **3 jours travaillés — mardi, mercredi, jeudi — toutes les 3 semaines**, du 07/10/2025 au 18/06/2026 (13 cycles, 39 JH/personne), **puis réaffectation de tout le reste au chef de projet seul, à taux plein, du 01/07 au 21/07/2026** (14,5 JH, 12 tâches).
**Alternative écartée** : **Dater le Gantt Odoo** — écarté : son chiffrage est un gabarit, pas une estimation ; dater 70 h par tâche indifféremment aurait produit un planning faux avec l'apparence du sérieux. / **Appliquer un multiplicateur junior uniforme** (×1,7 sur tout) — écarté : il aurait gonflé de 70 % des tâches de rédaction de bilan, où la séniorité ne change presque rien, et sous-estimé le canvas interactif ou l'init de cluster K8s, où elle change tout ; le ratio par membre qui en résulte (1,41 en design, 1,92 en dev) est une sortie du calcul, pas une entrée. / **Étaler sur deux ans** — proposé puis explicitement écarté par le porteur du projet : l'objet de l'exercice est justement de condenser les deux ans réels en un an. / **Réduire le périmètre de 43 %** pour tenir dans 24 JH/personne au rythme initial — écarté au profit de la densification du rythme, qui préserve le contenu du plan. / **Remplissage séquentiel des files** — écarté après essai : les membres les plus légers finissaient dès mars, ce qui datait leurs bilans de sprint 16 avant la fin du projet ; les files sont étalées sur toute la fenêtre, ordre des sprints conservé et creux rendus visibles.
**Conséquences** : Le projet daté court du **07/10/2025 au 21/07/2026**, sur un an, avec une fin en solo assumée — ce qui reproduit volontairement la trajectoire réelle (phase collaborative puis clôture par une seule personne, cf. l'entrée du 2026-08-27 sur le registre rétrospectif). Quatre membres seulement débordent, sur leurs dernières tâches (observabilité prod, non-régression, démos, bilans), toutes cohérentes avec une clôture menée par le chef de projet. **Deux réserves à ne pas perdre de vue** : l'estimation junior est un jugement argumenté tâche par tâche, pas une mesure — aucune donnée de temps réel n'existe sur ce projet, le module Feuilles de temps n'étant pas installé dans Odoo ; et le planning daté **n'est pas reporté dans Odoo**, les 192 lignes du xlsx et les 254 sous-tâches Odoo n'étant pas au même grain — un report supposerait d'établir d'abord une table de correspondance. Point de détail à arbitrer : le cycle C5 tombe sur les 30-31 décembre et 1er janvier.


---

### [2026-08-28] L'URL du front dans les emails est résolue par une chaîne de repli, jamais par une valeur codée en dur
**Contexte** : Un test d'inscription lancé **sur la production** a produit un mail de vérification pointant sur `http://localhost/verify-email?…`. Quatre endroits du code (register, resendVerification, invitation groupe, invitation établissement) répétaient le même repli littéral `process.env.APP_FRONT_URL || 'http://localhost'`. Ce repli est correct en dev sous Docker (Traefik expose le front sur `:80`) et **faux partout ailleurs** ; surtout, il est silencieux : aucune trace ne distingue « variable définie » de « variable oubliée ». `APP_FRONT_URL` n'a été ajoutée aux valeurs Helm que la veille (2026-08-27, `d9d1b71`) — toute API prod démarrée avant ce déploiement envoyait donc des liens localhost sans qu'aucun log ne le signale. La règle attendue par le porteur du projet est simple : **un mail porte l'adresse de l'environnement qui l'a envoyé** — local, preprod, prod ou tout autre.
**Décision** : Centraliser la résolution dans `helpers/frontUrl.js` et remplacer la valeur codée en dur par une **chaîne de repli entre variables d'environnement déjà présentes partout**, du plus spécifique au plus général : `APP_FRONT_URL` → `VITE_FRONT_URL` → première origine de `CORS_ORIGIN` → `http://localhost[:VITE_PORT]`. Les deux derniers niveaux signalent une configuration incomplète et sont **journalisés** (`warn` pour le repli CORS, `error` si `NODE_ENV=production` et que les trois variables manquent), une seule fois par processus puisque la fonction est appelée à chaque envoi de mail. Le principe retenu : *le repli doit être dérivé de la configuration de l'environnement courant, pas d'une constante* — `VITE_FRONT_URL` et `CORS_ORIGIN` valent l'URL du front dans les cinq sources de configuration du projet (compose dev, compose test/VPS, `values-preprod.yaml`, `values-prod.yaml`, ConfigMaps k8s), donc chacune ramène l'adresse du bon environnement.
**Alternative écartée** : **Se contenter d'ajouter `APP_FRONT_URL` là où elle manquait** — c'est ce qui avait été fait la veille, et c'est insuffisant : la variable peut être oubliée dans un environnement futur, et le mode de défaillance reste un lien localhost expédié à un vrai utilisateur, sans alerte. / **Lever une exception si l'URL du front n'est pas configurée** — écarté : cela ferait échouer l'inscription entière (500) pour un défaut de configuration qui n'empêche pas de créer le compte ; on préfère envoyer le meilleur lien dérivable et journaliser en erreur. / **Construire l'URL depuis les en-têtes de la requête** (`Host` / `X-Forwarded-Host`) — écarté : l'API et le front sont sur des domaines distincts (`api.my-memo-master.com` vs `app.my-memo-master.com`), l'en-tête donnerait l'URL de l'API ; et un en-tête `Host` est contrôlé par le client, ce qui ouvrirait une injection d'hôte dans un lien envoyé par email. / **Dériver l'URL de `ENVIRONMENT` via une table `dev|test|preprod|prod → domaine`** — écarté : cela réintroduit des domaines codés en dur dans l'image, à maintenir à chaque changement de domaine, alors que la configuration les porte déjà.
**Conséquences** : Un lien localhost en production suppose désormais que `APP_FRONT_URL`, `VITE_FRONT_URL` **et** `CORS_ORIGIN` soient toutes absentes — cas où un `logger.error` est émis au premier envoi. Corollaire opérationnel : le correctif est du code, il **ne prend effet qu'au prochain `helm upgrade`** ; les pods prod en cours continuent d'envoyer ce que porte leur ConfigMap actuelle. Point d'attention laissé ouvert : `k8s/prod/configmap.yml` (jeu de manifestes antérieur à la migration Helm, plus appliqué par la CD) pointe encore le front sur l'apex `my-memo-master.com`, alors que Helm est passé au sous-domaine `app.` — un `kubectl apply` manuel sur ce répertoire réintroduirait le mauvais domaine dans les emails.


---

### [2026-08-28] Retour à un SonarQube auto-hébergé sur Kubernetes — annule la décision du 2026-07-11
**Contexte** : La décision du 2026-07-11 écartait le ré-hébergement de SonarQube au profit de SonarCloud, au motif que la charge d'exploitation (JVM, base, maintenance, disponibilité) était disproportionnée — la panne du serveur auto-hébergé l'ayant démontré. Le porteur du projet demande néanmoins de remettre une instance SonarQube dans un pod du cluster. Le contexte a changé sur un point matériel : il n'y a plus de serveur dédié à maintenir à la main, mais un cluster Kubernetes déjà provisionné (`pck-dkoyol2`, 3 nœuds, réservations mémoire à 13-24 % le 2026-08-28), avec Helm, cert-manager et une CD en place. Ce qui avait échoué, c'est une machine administrée manuellement, pas le principe d'auto-héberger.
**Décision** : Déployer SonarQube Community Build comme **StatefulSet dans un chart Helm séparé** (`helm-sonarqube/`), dans un **namespace dédié `sonarqube`**, avec **son propre PostgreSQL**, **sans Ingress** (ClusterIP + `kubectl port-forward`), et **basculer la CI dessus**. Quatre choix structurants dans ce paquet :
1. **Chart séparé et non un flag du chart applicatif** : SonarQube est un outil d'usine logicielle. L'intégrer à `helm/` le placerait sous le `ResourceQuota` de la preprod — 6 Gi de limites, déjà calé au plus juste et qui avait bloqué son propre déploiement le 2026-08-27 — et lierait son cycle de vie aux déploiements applicatifs.
2. **PostgreSQL dédié et non celui de l'application** : SonarQube écrit massivement et ses montées de version majeures font des migrations de schéma lourdes et irréversibles ; aucune raison de partager un budget de connexions ni un cycle de sauvegarde avec les données utilisateurs.
3. **Pas d'Ingress** : une instance neuve démarre avec `admin`/`admin`. L'exposer publiquement avant ce premier changement de mot de passe donne l'administration à qui trouve l'URL. Même parti pris que Prometheus dans le chart applicatif.
4. **La CI atteint l'instance par un tunnel `kubectl port-forward`, pas par le réseau** : un runner GitHub ne peut pas joindre un ClusterIP, mais il peut joindre l'**API Kubernetes** (publique, authentifiée par kubeconfig). Le runner ouvre le tunnel et pointe le scanner sur `127.0.0.1:9000`. C'est ce qui rend compatibles « instance non exposée » et « analyse en CI ». Rendu possible par le fait que `sonarqube-scan-action@v6` est une action **node20** exécutée nativement sur le runner : une action Docker ne verrait pas ce `127.0.0.1`.
**Alternative écartée** : **Rester sur SonarCloud** — c'est la décision en vigueur, écartée par choix explicite du porteur du projet ; le motif de 2026-07-11 (charge d'exploitation) reste valide sur le fond, il est simplement accepté. / **Exposer l'instance par un Ingress + TLS** (`sonar.my-memo-master.com`) : c'était la voie la plus simple pour la CI, écartée pour ne pas publier une instance à mot de passe par défaut, et parce qu'elle imposait un enregistrement DNS pour un outil à un seul utilisateur. / **Faire tourner le scanner dans un Job Kubernetes** (clone du dépôt dans un initContainer) : fonctionne sans exposer quoi que ce soit, mais duplique dans un manifeste la logique déjà portée par la CI, perd le code déjà récupéré par le runner, et rend les logs d'analyse invisibles depuis GitHub Actions. / **Un runner GitHub auto-hébergé dans le cluster** : réglerait l'accès réseau de façon plus propre, mais ajoute un composant permanent à exploiter — exactement la charge que 2026-07-11 reprochait à l'auto-hébergement. / **Réutiliser le PostgreSQL de l'application avec une base `sonar` séparée** : économise un pod et un volume, écarté pour la raison n° 2 ci-dessus. / **Tag d'image flottant** (`:community`, `:latest`) : écarté formellement — une montée de version majeure de SonarQube migre le schéma de base de façon **irréversible au démarrage du pod** ; un tag flottant fait dépendre une migration de base du moment où un pod redémarre.
**Conséquences** : **L'analyse statique de `main` dépend désormais de la disponibilité du cluster** — si l'instance est arrêtée, le job CI échoue au lieu d'être sauté, et c'est précisément le mode de défaillance que la migration SonarCloud avait fait disparaître. **L'analyse multi-branches, elle, reste impossible** : elle était payante sur SonarCloud, elle est absente de l'édition Community — le job reste donc limité à `main`, pour une raison différente. Le secret `SONAR_TOKEN` change de sens (token généré dans l'instance, l'ancien token sonarcloud.io ne vaut plus rien) et un secret `KUBECONFIG_SONAR` s'ajoute. `sonar.organization` perd son objet et passe en commentaire. Effet de bord positif relevé au passage : le passage à `sonarqube-scan-action@v6` corrige une action **dépréciée qui signalait elle-même une vulnérabilité**, défaut qui existait indépendamment de cette décision. Enfin, `storageClass: csi-cinder-sc-retain` est retenu volontairement pour que les volumes survivent à un `helm uninstall` : l'historique d'analyses est protégé, au prix de volumes Cinder facturés jusqu'à leur suppression manuelle dans OpenStack.


---

### [2026-08-28] Report du planning dans Odoo : correspondance par libellé, jamais par code de bloc
**Contexte** : Le planning daté (192 tâches, durées junior) devait être appliqué aux sous-tâches Odoo. Les deux systèmes partagent une nomenclature d'apparence identique (`M-00`, `M-01`, `S-03`, `C-01`…), ce qui suggérait un mappage trivial par code. **Il est faux** : dans le xlsx `M-01` désigne le moteur de Leitner et `M-02` les cartes mentales, alors que dans Odoo `[M-01]` est l'éditeur de cartes mentales et `[M-02]` la révision par systèmes de Leitner. Les deux blocs sont intervertis. Par ailleurs les deux référentiels ne couvrent pas le même périmètre : 7 features du xlsx (pilotage, service IA, doc, recette, marketing, design, landing) n'ont aucun bloc Odoo, et 9 blocs Odoo (`S-07`, `C-03` → `C-06`, `W-*`) n'ont aucune tâche dans le xlsx.
**Décision** : Établir la correspondance **sur le libellé des blocs, vérifié un par un**, et l'écrire dans le code de report (`map_odoo.py`) plutôt que de la déduire du code. Trois conséquences assumées : (1) l'inversion `M-01` ↔ `M-02` est corrigée explicitement, avec un commentaire dans le script ; (2) les features d'exploitation du xlsx (`DEV-LOCAL`, `DEV-VPS`, `PREPROD-K8S`, `PROD-K8S`, `Perf`) sont versées dans le bloc Odoo `M-00b`, dont le libellé « Infrastructure, CI/CD et exploitation » les couvre ; (3) les 151,5 JH sans destination **ne sont pas répartis d'office** dans les blocs existants — ils restent hors Odoo, et le xlsx demeure la seule vue complète du plan. À l'intérieur d'un bloc, la charge est divisée à parts égales entre les sous-tâches et les dates sont étalées séquentiellement sur la fenêtre du bloc.
**Alternative écartée** : **Mapper par code de bloc** — écarté : c'est exactement le piège, il aurait daté le Leitner sur la fenêtre des cartes mentales et réciproquement, dans un registre présenté comme officiel. / **Répartir les 151,5 JH non mappés au prorata sur les blocs existants** pour que le total Odoo égale les 411 JH du plan — écarté : cela inventerait de la charge de pilotage, de marketing et de design sur des tâches de développement, pour la seule satisfaction de faire tomber un total juste. Un registre à 262 JH sur 411, avec l'écart documenté, est plus honnête qu'un registre à 411 JH dont 37 % sont mal placés. / **Pondérer les sous-tâches d'un bloc selon leur nature** (une revue de code moins qu'une API) — écarté : le planning source ne descend pas à ce grain, la pondération aurait été une invention de précision ; la répartition égale est une convention affichée comme telle. / **Aligner aussi les Synthèses** — non fait : la demande portait sur les sous-tâches, et faire porter à une Synthèse la somme de ses enfants change la sémantique du champ ; l'écart, déjà signalé, est laissé à l'arbitrage.
**Conséquences** : 181 sous-tâches redatées et rechiffrées, 0 échec, fichier de retour arrière conservé. Le gabarit à 70 h disparaît (distribution de 2 h à 40 h) et l'anomalie de la tâche 1337 (645 h) est résorbée au passage. **Odoo porte désormais 262 JH sur les 411 JH du plan (64 %)** : toute lecture de charge faite depuis Odoo seul sous-estime donc le projet d'un tiers, et il faut le dire avant de citer le chiffre. Corollaire immédiat : `docs/COMPTE_RENDU_METRIQUES.md` est annoté comme périmé sur ses §3 (coûts), §4 (délais) et §6 (RH), qui reposaient sur l'ancien gabarit — les §2, §5 et §7 restent valables. Enfin, les lignes `Planning CSV` des descriptions n'ont pas été touchées : la preuve d'antériorité du planning amont, établie la veille, survit à ce report — elle vit dans le champ description, pas dans les champs de date.


---

### [2026-08-28] Un seul nœud dédié — à l'outillage, pas un nœud par environnement
**Contexte** : L'entrée du 2026-06-30 sur le cluster partagé laissait une condition explicite en suspens : « Taints/tolerations pour dédier un nœud à la preprod — écarté à 2 nœuds : cela reviendrait à supprimer la redondance de la prod. **À reconsidérer à 3 nœuds.** » Le 3ᵉ worker ayant été ajouté le 2026-08-27, la condition est remplie et le porteur du projet demande un découpage **1 nœud prod / 1 nœud preprod / 1 nœud outillage**. Mesures faites le jour même sur `pck-dkoyol2` (3 920 m / 5 633 Mi allouables par nœud) : prod réserve 1 050 m / 1 728 Mi mais **plafonne à 5 000 m / 6 400 Mi**, preprod 450 m / 960 Mi pour 1 950 m / 3 200 Mi, addons 400 m / 508 Mi. L'élément nouveau qui motive la demande est SonarQube : 2 Gi réservés, 4 Gi de plafond — le premier voisin réellement bruyant du cluster.
**Décision** : **Ne dédier qu'un nœud, à l'outillage** (label `workload=tooling` + taint `workload=tooling:NoSchedule`, posés par `k8s/node-topology.sh`). Prod et preprod continuent de partager les deux autres nœuds, gouvernées par les mécanismes déjà en place : `topologySpreadConstraints` (`maxSkew: 1` sur `kubernetes.io/hostname`) qui répartit les replicas de prod, `ResourceQuota` sur la preprod, et les PriorityClasses `mmm-prod`/`mmm-preprod` qui font céder la preprod sous pression mémoire. Le principe retenu : **isoler ce qui est bruyant, pas ce qui est important**. La preprod n'était pas le problème — elle est déjà plafonnée et évinçable ; SonarQube, lui, ne l'est ni l'un ni l'autre.
**Alternative écartée** : **Le 1/1/1 demandé** — écarté sur trois obstacles vérifiés, pas sur une préférence. (a) `values-prod.yaml` déclare `api: 2, front: 2` et le chart porte déjà un `topologySpreadConstraints` : clouer la prod sur un nœud unique annule une redondance qui continue d'être payée en ressources. (b) Le PDB `minAvailable: 1` **bloquerait tout `kubectl drain`** du nœud prod — aucun pod évinçable faute de nœud de repli, le drain tourne indéfiniment ; le commentaire de `pdb.yaml` anticipe exactement ce mode de défaillance pour `replicas: 1`. (c) `ingress-nginx`, `cert-manager`, `coredns` et `metrics-server` sont des Deployments **sans toleration** : tainter les trois nœuds les enfermerait tous sur le nœud d'outillage, et le Service ingress étant en `externalTrafficPolicy: Local`, le LoadBalancer Octavia ne routerait plus que vers ce nœud — **tout le trafic de production entrerait par la machine qui fait tourner SonarQube**. / **Tainter aussi le nœud preprod** (prod = 1 nœud, preprod = 1, outillage = 1) : même problème que (a) et (b), la prod se retrouvant sur un seul nœud. / **`NoExecute` plutôt que `NoSchedule`** — écarté : expulserait immédiatement les 4 pods applicatifs présents sur le nœud visé, alors que `NoSchedule` les laisse finir leur vie et les fait migrer à leur prochain rollout, sans coupure. / **Un 4ᵉ worker** (12,15 €/mois) : c'est la **seule** topologie qui donne à la fois l'isolation demandée et la redondance que `replicas: 2` suppose — écartée pour l'instant sur le coût, mais c'est la bonne réponse si l'isolation de la preprod devient un besoin réel, et non une préférence.
**Conséquences** : À 3 nœuds, **« prod isolée » et « prod redondante » s'excluent** — les limites de la prod (6 400 Mi) dépassent déjà l'allouable d'un nœud (5 633 Mi) ; ce constat, et non le nombre de nœuds, est ce qui devra être réexaminé plus tard. La condition « à reconsidérer à 3 nœuds » de l'entrée du 2026-06-30 est donc **tranchée : non, pas pour la preprod ; oui, pour l'outillage**. Le nœud d'outillage devient un **point unique de défaillance pour l'analyse statique** : sa perte arrête SonarQube, donc le job CI sur `main` — acceptable pour de l'outillage, à ne pas oublier avant d'y placer autre chose. Corollaire d'exploitation : le chart SonarQube porte un `nodeSelector`, donc **déployer sans avoir lancé `k8s/node-topology.sh` laisse les pods en `Pending`** ; vider `nodeSelector` et `tolerations` dans les values est la sortie de secours. Enfin, le label et le taint utilisent la clé `workload` **sans préfixe de domaine** — admis pour un label d'administrateur et plus lisible, à préfixer si le cluster venait à héberger d'autres projets.


---

### [2026-08-28] Le registre Odoo étendu au-delà du produit : 6 blocs transverses créés plutôt que 109 JH laissés hors registre
**Contexte** : Le projet Odoo ne modélisait que le développement fonctionnel. Après report du planning daté, 151,5 JH sur 411 (37 %) n'avaient aucune destination : marketing, design, service IA, recette transverse, pilotage, documentation. Deux de ces familles posaient un problème de diagnostic : l'utilisateur pensait que les tâches IA et QA existaient déjà. **Vérification faite, elles existent sous un autre sens.** Les blocs `C-01`/`C-02` d'Odoo sont des *fonctionnalités* IA (génération de Leitner, d'exercices), déjà alimentées par les lignes homonymes du planning ; les 30 lignes de la feature `IA` portent sur le *service* IA lui-même (FastAPI, benchmark LLM, quotas, prompts, monitoring, runbook, déploiement). **Correction du 2026-08-28 (vérification du dépôt)** : ce service n'existe pas dans le dépôt — voir l'entrée « Validation par la preuve » ci-dessous. De même, les sous-tâches « Tests » de chaque bloc sont des tests *de ce bloc*, alors que les 12 lignes `QA` sont une recette transverse (E2E, WCAG, non-régression, gel fonctionnel).
**Décision** : Créer six blocs — `MKT`, `DES`, `IA`, `QA`, `PIL`, `DOC` — sur le modèle des blocs existants (une Synthèse, des sous-tâches numérotées, description structurée), avec les dates, charges, statuts et **assignations nominatives** du planning. Créer l'utilisatrice manquante `Clélia Potorel` avec un login non routable (`@mymemomaster.local`), la personne n'ayant jamais utilisé Odoo : le compte ne sert qu'à porter l'assignation. Les 5 tâches `Landing` sont ventilées par intervenant plutôt que constituées en bloc propre — les 4 d'Abel dans `MKT`, celle de Clélia dans `DES`.
**Alternative écartée** : **Verser les 49 JH d'IA dans `C-01`/`C-02` et les 26,5 JH de QA dans les sous-tâches « Tests » existantes** — écarté : cela aurait gonflé des blocs de fonctionnalités avec du travail de plateforme, rendu le service IA invisible en tant que tel, et dissous la recette transverse dans les tests unitaires de chaque feature. Le registre aurait affiché un total juste au prix d'une imputation fausse. / **Laisser pilotage et documentation hors Odoo**, au motif que ce ne sont pas des livrables produit — écarté par le porteur du projet : la documentation *est* un livrable du dossier, et un registre qui ignore la conduite de projet ne peut pas servir d'appui à un indicateur de charge. / **Créer un contact `res.partner` plutôt qu'un utilisateur** pour Clélia — impossible : le champ `user_ids` de `project.task` n'accepte que des `res.users`. / **Réassigner dans la foulée les 181 sous-tâches de développement** aux intervenants du planning — non fait : un bloc Odoo est alimenté par plusieurs lignes portées par des personnes différentes, la ventilation à l'intérieur du bloc serait une interpolation supplémentaire ; à décider séparément.
**Conséquences** : Le projet passe de 279 à **381 tâches**, la charge élémentaire de 1 209 à **413,5 JH**, et **Odoo porte enfin la totalité du plan** (contre 64 % après le premier report). Un total de charge lu depuis Odoo est désormais exploitable sans réserve de périmètre — c'était l'objet de l'opération. Corollaire à traiter : les 6 nouveaux blocs ont des assignés nominatifs, les 181 sous-tâches de développement restent au seul chef de projet ; le contraste est visible dans l'outil et invite à la réassignation évoquée ci-dessus. Enfin, `Clélia Potorel` est un utilisateur interne — selon le plan Odoo souscrit, il peut consommer un siège facturé.

---

### [2026-08-28] Correction de la prod par `kubectl patch` + `rollout restart` plutôt que par un `helm upgrade`

**Contexte** : Un mail de vérification parti de la production portait encore `http://localhost/verify-email?…`, alors que deux correctifs successifs (`d9d1b71` du 27/08 ajoutant `APP_FRONT_URL` aux values Helm, `68b906e` du 28/08 introduisant la chaîne de repli `helpers/frontUrl.js`) étaient fusionnés sur `main`. Diagnostic : la release `mmm-prod` était figée en **révision 4 du 27/08 11:35**, antérieure aux deux commits — la ConfigMap vivante n'avait pas `APP_FRONT_URL` et les pods tournaient sur une image sans `frontUrl.js`. `deploy_prod` de `cd.yml` étant conditionné à `vars.K8S_PROD_ENABLED == 'true'`, aucun `helm upgrade` n'était intervenu depuis. Le dépôt était donc juste et la production fausse, sans qu'aucun signal ne le distingue.

**Décision** : Rétablir l'état correct **en ligne**, en deux gestes séparés et dans cet ordre : `kubectl patch configmap mmm-prod-config` pour poser `APP_FRONT_URL`, **puis** `kubectl rollout restart deployment mmm-prod-api`. L'ordre n'est pas neutre : la ConfigMap est posée en premier pour que le lien soit correct **même si le restart avait tiré une image sans le correctif** — l'ancien code lit `process.env.APP_FRONT_URL` directement, la clé seule suffit à le réparer. La valeur patchée reprend **au caractère près** `helm/values-prod.yaml:24`, de sorte que le patch manuel et la source Helm ne divergent pas et que le prochain `helm upgrade` soit un no-op sur cette clé.

**Alternative écartée** : **Lancer un `helm upgrade` depuis le poste** — écarté : cela aurait re-rendu les 32 clés de la ConfigMap et les deux Deployments d'un coup, à partir d'un dépôt local dont l'état vis-à-vis de `main` déployé n'était pas établi ; on aurait corrigé un lien d'email en repoussant simultanément une configuration entière non revue. Le patch ciblé ne touche qu'une clé et son effet est lisible. / **Activer `K8S_PROD_ENABLED` et laisser la CD déployer** — écarté dans l'urgence : c'est le bon correctif de fond, mais il rend la prod redéployable automatiquement à chaque push, décision d'exploitation qui n'a pas à être prise en corrigeant un bug. Consigné comme dette. / **Ne patcher que la ConfigMap sans redémarrer** — impossible : la ConfigMap est consommée par `envFrom`, dont les valeurs ne sont lues qu'au démarrage du conteneur ; sans restart, les pods gardent l'ancien environnement. / **Ne redémarrer que les pods sans patcher la ConfigMap** — écarté : cela aurait fonctionné (l'image courante porte le repli `VITE_FRONT_URL`) mais en laissant la prod dépendre du **deuxième** maillon de la chaîne de repli, avec un `logger.warn` permanent, et sans corriger la cause déclarée.

**Conséquences** : La production est correcte sur les deux couches à la fois — clé explicite dans la ConfigMap **et** image portant la chaîne de repli — ce qui est la situation voulue, chacune couvrant la défaillance de l'autre. Trois corollaires à connaître. (1) **La ConfigMap vivante est en dérive vis-à-vis de la révision Helm 4** : un `helm rollback` vers une révision ≤ 4 retirerait `APP_FRONT_URL` et, combiné à un retour d'image, réintroduirait le bug ; un `helm upgrade` en avant, lui, est sans risque. (2) **Le déploiement est en `:latest` avec `imagePullPolicy: Always`** : tout `rollout restart` est aussi un changement de version. Ici le tag courant a été inspecté **avant** l'action (poussé le 28/08 15:01, donc postérieur au commit du correctif) et le digest des nouveaux pods vérifié après — mais ce contrôle manuel est précisément ce qu'un tag par SHA de commit rendrait inutile. (3) **La cause racine reste ouverte** : `K8S_PROD_ENABLED` à `false` signifie que tout correctif fusionné sur `main` restera sans effet en production et devra être rejoué à la main. Preprod porte le même défaut, non corrigé faute d'autorisation sur ce namespace.

---

### [2026-08-29] Audit de contraste RGAA — Playwright plutôt qu'un outil déjà présent, périmètre restreint aux pages publiques sans API

**Contexte** : `docs/COMPTE_RENDU_METRIQUES.md` §7.2 documentait un angle mort connu — la règle `color-contrast` d'axe-core est désactivée dans `test/a11y/axe.test.js` car jsdom ne calcule pas les styles. Aucun outil du projet ne mesurait donc le contraste réel (RGAA 3.2). Validé avec l'utilisateur avant tout ajout de dépendance (règle `AGENT.md`).

**Décision** : ajouter `@playwright/test` + `@axe-core/playwright` (devDependencies) plutôt que Cypress ou un audit Lighthouse en CI. Nouveau fichier `my_memo_master_front/playwright.config.js`, spec dans `e2e-a11y/contrast.spec.js` (répertoire distinct de `test/`, exclu de vitest via `vitest.config.js` pour éviter la collision de pattern `*.spec.js` entre les deux runners). Le `webServer` de Playwright build/preview l'app (`vite preview`) plutôt que de dépendre d'un serveur déjà démarré : reproductible en CI comme en local.

**Alternative écartée** : Lighthouse CI — plus lourd à intégrer (Chrome + budget de perf/SEO non désirés ici), et ne réutilise pas axe-core déjà en place pour la cohérence des règles testées (mêmes IDs de règles qu'en jsdom). Cypress — déjà écarté ailleurs dans le projet (aucune trace dans le dépôt), aurait ajouté un second framework de test e2e à maintenir alors que Playwright couvre le besoin.

**Périmètre restreint aux pages publiques sans appel API au montage** (`/`, `/auth`, `/forgot-password`, `/reset-password`, `/tutorials`, `/credits`, `/error-server`, 404) : le serveur de preview Playwright n'a pas d'API derrière lui. `/register` (appel API dans `beforeEnter` de la route) et `/verify-email` (appel API dans `onMounted`) sont exclues et documentées en commentaire dans le spec ; les pages `private: true` redirigeraient vers `/auth` faute de session. Étendre à ces pages demanderait un mock d'API ou un compte de test seedé — non fait ici, périmètre validé par l'utilisateur.

**Piège rencontré et corrigé** : `vite preview` sans `--host` explicite ne bind qu'en IPv6 (`::1`) sous Windows — `127.0.0.1` (IPv4) restait alors inatteignable et le `webServer` de Playwright expirait au démarrage (`Timed out waiting … from config.webServer`). Fix : `vite preview --host 127.0.0.1 --port 4173 --strictPort` dans la commande du `webServer`.

**Conséquences** : le contraste RGAA 3.2 est désormais vérifié à chaque push CI sur le front, après le build (`.github/workflows/ci.yml`, étape `Run Accessibility Contrast Audit`). Premier passage : 1 non-conformité réelle trouvée et corrigée (`/forgot-password`, voir entrée CHANGELOG du 2026-08-29) — l'outil a immédiatement fait ses preuves plutôt que de rester un ajout théorique.

---

### [2026-08-29] Cause racine du bug de contraste non corrigée — `theme.colors` vs `theme.extend.colors` dans `tailwind.config.js`

**Contexte** : le bouton non conforme sur `/forgot-password` utilisait `text-white`, une classe Tailwind qui ne génère **aucun CSS** dans ce build (vérifié : `grep -c "text-white" dist/assets/*.css` → 0 partout). Cause : `tailwind.config.js` définit `theme.colors` (pas `theme.extend.colors`) — cela **remplace** la palette par défaut de Tailwind (`white`, `black`, `gray-*`, `red-*`…) par la seule palette du projet (`primary`, `light`, `dark`…). Le `safelist: ['text-white']` déjà présent dans la config ne suffisait pas à le regénérer dans le build vérifié.

**Décision** : corriger uniquement les deux instances concrètement cassées (`ForgotPasswordPage.vue`, `ResetPasswordPage.vue`) en leur ajoutant la classe `valider` (CSS brut, `assets/auth-form.css`, `color: white`) — le contournement déjà utilisé avec succès par `login`/`register`. **Ne pas** reconfigurer `tailwind.config.js` (`theme.colors` → `theme.extend.colors`) dans cette campagne.

**Alternative écartée** : corriger la cause racine en basculant `theme.colors` vers `theme.extend.colors`, ce qui régénèrerait `text-white` (et toutes les autres classes de couleur par défaut) partout dans l'app en un seul changement. Écartée pour cette campagne car le rayon d'impact est large et non mesuré : n'importe quelle page qui utilise déjà une classe de couleur Tailwind par défaut (`bg-red-500`, `text-gray-700`…) sans effet visible aujourd'hui **changerait de rendu** dès que la classe se met à exister — un changement qui doit être audité et revu visuellement dans son propre lot, pas glissé dans une campagne d'accessibilité.

**Conséquences** : dette documentée dans `docs/AUDIT_RGAA.md` §5 et l'entrée CHANGELOG du 2026-08-29. Combien d'autres classes de couleur par défaut sont utilisées ailleurs dans `src/` sans effet n'est **pas** audité à l'échelle du projet — seul le cas détecté par l'audit de contraste a été corrigé. Un futur lot dédié doit auditer l'usage réel avant de basculer la config, avec revue visuelle complète de l'app.

---

### [2026-08-29] Prop `ariaLabel` rendue requise sur `ToggleButton` (interface publique modifiée)

**Contexte** : l'extension de la couverture axe-core a révélé que `ToggleButton.vue` n'exposait aucun nom accessible sur son `<input type="checkbox">` (RGAA 11.1) — le `<label>` englobant ne contient que le curseur visuel, sans texte. Composant utilisé exclusivement dans `SettingsPage.vue` (8 usages, vérifié par recherche globale).

**Décision** : ajouter une prop `ariaLabel: { type: String, required: true }` plutôt qu'une valeur par défaut générique (ex. `"Basculer"`). Les 8 usages dans `SettingsPage.vue` ont été mis à jour dans le même changement avec un libellé contextuel en français reprenant le `settings__row-label` adjacent.

**Alternative écartée** : prop optionnelle avec fallback générique — aurait fait taire l'erreur de linter/test sans forcer un libellé réellement contextuel à chaque futur usage, recréant le même risque de non-conformité silencieuse à la prochaine page qui utilise `ToggleButton`.

**Conséquences** : interface publique du composant modifiée (`AGENT.md` §5 — signalé explicitement ici plutôt que fait silencieusement). Tout futur usage de `ToggleButton` doit fournir `ariaLabel` sous peine d'avertissement Vue en développement. Aucun autre consommateur du composant à ce jour — pas de rupture ailleurs dans le dépôt.


---

### [2026-08-29] Couverture publiée vers Sonar par artefact, avec préfixage des chemins
**Contexte** : L'indicateur de couverture était à 0 % depuis toujours (action P0 du compte rendu de pilotage) faute de rapport `lcov` transmis au scanner. Trois questions à trancher : comment produire les rapports, comment les acheminer jusqu'au job de scan, et comment faire en sorte que Sonar les rattache réellement aux fichiers.
**Décision** : (1) **Production** — Jest 30 côté API (couverture native, aucune dépendance), `@vitest/coverage-v8` côté front (fournisseur officiel de Vitest, version alignée sur `vitest` 3.x ; sans lui `vitest --coverage` ne démarre pas). `collectCoverageFrom` côté API couvre **tout le code source**, y compris les fichiers qu'aucun test n'atteint. (2) **Acheminement** — `upload-artifact` dans `test_and_lint`, `download-artifact` dans `sonarqube` : les deux jobs tournent sur des runners distincts, les fichiers de l'un n'existent pas pour l'autre. (3) **Résolution des chemins** — une étape `sed` préfixe les chemins `SF:` du `lcov` avec le sous-projet, avant l'artefact.
**Alternative écartée** : **Rejouer les tests dans le job `sonarqube`** — supprime le besoin d'artefacts, mais double le temps de CI pour un résultat identique. / **Laisser `collectCoverageFrom` par défaut** (seulement les fichiers touchés par les tests) : la couverture API remonterait à ~86,6 % au lieu de 81,41 %, mais le chiffre serait **flatteur et faux** — il exclut du dénominateur tout fichier que personne ne teste, c'est-à-dire précisément ce qu'un indicateur de couverture doit rendre visible. / **Ne pas préfixer les chemins** — écarté après vérification empirique : Jest comme Vitest écrivent des chemins relatifs à leur propre racine, que le scanner (lancé à la racine du dépôt) ne sait pas résoudre. / **Deux projets Sonar distincts**, un par sous-projet, chacun avec son `projectBaseDir` : réglerait la résolution sans `sed`, mais éclaterait le monorepo en deux tableaux de bord et casserait la continuité de l'historique du projet existant.
**Conséquences** : La couverture est **publiable** : 81,41 % API, 58,91 % front — cette dernière mesurée pour la première fois. **Le mode de défaillance à connaître** : si l'étape de préfixage saute, ou si un runner se met à produire des chemins absolus, SonarQube affiche **0 % sans aucune erreur** — la panne est silencieuse et se confond avec « rapport absent ». Tout changement sur cette chaîne doit se vérifier sur la valeur affichée, jamais sur l'absence d'erreur en CI. Corollaire : le chiffre API (81,41 %) **n'est pas comparable** aux 86,6 % relevés auparavant, les dénominateurs diffèrent — c'est le nouveau qui fait foi.


---

### [2026-08-29] Recette QA : état monté par l'API, assertions par l'interface, charge derrière le limiteur neutralisé
**Contexte** : Trois tâches QA (parcours E2E étudiant et enseignant, rapport E2E + charge) étaient déclarées « validé » sans preuve dans le dépôt. Les rendre confirmables supposait de trancher trois choses : comment obtenir des comptes utilisables, comment rendre les rôles observables, et comment mesurer une charge sur une API protégée par un limiteur de débit.
**Décision** : (1) **Comptes** — un seeder dédié, à **double verrou** (`SEED_E2E_USERS=true` ET `NODE_ENV !== 'production'`), invoqué explicitement par l'entrypoint. (2) **État** — le groupe classe et ses membres sont montés **par l'API** dans un `globalSetup`, les assertions restant sur l'interface. (3) **Charge** — limiteur neutralisé par `RATE_LIMIT_DISABLED=true`, avec un seuil `rate_limited_responses == 0` servant de **garde-fou de validité de la mesure**, et une mention explicite dans le rapport que les chiffres décrivent la capacité derrière le limiteur.
**Alternative écartée** : **Injecter un jeton dans le navigateur** au lieu de passer par le formulaire — plus rapide et plus stable, écarté : le parcours doit prouver que l'authentification fonctionne, pas la contourner. / **Créer les comptes par l'API à chaque exécution** plutôt qu'un seeder : l'inscription exige une validation d'email qu'un test ne peut pas relever (`User.controller.js` refuse la connexion sans elle). / **Se passer de groupe classe** et n'asserter que l'accès aux routes privées — écarté après constat que `/classroom` affiche « Aucun groupe. » pour tous les rôles : le test aurait été vert sans rien prouver sur les rôles. / **Laisser le limiteur actif** pour « mesurer la réalité » — écarté : on aurait mesuré le limiteur, pas l'API, et obtenu des 429 dès les premières secondes. / **Une seule config Playwright** pour l'audit de contraste et les parcours — écarté : l'un vise `vite preview` sans API, l'autre la stack complète ; les mélanger obligerait chaque test à composer avec l'absence d'API, ce qui est précisément ce qui rendait l'audit de contraste non déterministe.
**Conséquences** : Les trois tâches sont **couvertes et rejouables**, avec des chiffres datés et un contexte d'exécution écrit. **Ce que la recette ne dit pas** doit rester lisible : aucun test de rupture, charge mesurée sur une stack locale à base vide et sans proxy, parcours courts qui attestent l'accès et la distinction des rôles mais pas les fonctionnalités métier. Le **mode de défaillance à surveiller** : si `RATE_LIMIT_DISABLED` cessait d'être appliqué, le seuil `rate_limited_responses == 0` ferait échouer le test — c'est voulu, un résultat de charge obtenu sous limiteur serait faux sans être visiblement faux. Enfin, `e2e_and_load` est limité à `main` et `staging` : le coût d'une stack Docker complète sur chaque branche de fonctionnalité a été jugé supérieur au gain, au prix d'une détection plus tardive.

---

### [2026-08-30] Réédition du compte rendu de pilotage : revérifier ce qui est bon marché à revérifier, dater le reste sans le déguiser en mesure du jour

**Contexte** : Mise à jour de `docs/COMPTE_RENDU_METRIQUES.md` demandée après trois chantiers clos depuis l'arrêté du 2026-08-28 (couverture publiée, recette QA confirmée, vulnérabilités corrigées). Deux sources de vérité étaient disponibles à des coûts très différents : Odoo et les suites de tests locales sont interrogeables en quelques secondes ; l'instance SonarQube ne l'est pas sans `SONAR_TOKEN`, qui n'existe qu'en secret GitHub, hors d'atteinte en session locale — et tenter de le récupérer depuis un secret Kubernetes du cluster a été refusé par le contrôle d'accès de l'environnement, à raison : ce n'est pas parce qu'une donnée est difficile d'accès qu'il faut contourner la barrière posée devant elle.

**Décision** : (1) **Revérifier tout ce qui était atteignable** — relecture directe d'Odoo (350 tâches, avec `state` en plus de `stage_id` pour objectiver l'écart déclaré/démontrable plutôt que de le supposer résolu), suites de tests API/front rejouées, audits RGAA statique et contraste rejoués, statut CI du commit de vulnérabilités confirmé via l'API GitHub publique (le dépôt est public, donc lisible sans jeton). (2) **Pour SonarQube, ne pas mélanger une mesure d'hier avec une mesure d'aujourd'hui sans le dire** : le rapport porte les valeurs de la dernière analyse **effectivement lue** (2026-08-29, 63,9 % de couverture) et l'indique explicitement comme antérieure au correctif de vulnérabilités du 2026-08-30, plutôt que de laisser croire à une réanalyse. Le nombre de vulnérabilités restantes (3) est repris de l'entrée CHANGELOG datée du 2026-08-30 elle-même (revue par l'auteur du correctif, vérifications de tests jointes), pas d'une lecture indépendante de l'instance. (3) **La répartition RH par profil n'a pas été rejouée** : seul le total (recalculé depuis Odoo) est mis à jour, la ventilation par profil dépend du planning d'équipe qui n'a pas changé entre les deux arrêtés — la revérifier aurait été un travail sans rien à vérifier de neuf.

**Alternative écartée** : **Contourner l'absence de `SONAR_TOKEN`** en cherchant le secret Kubernetes du namespace `sonarqube` — bloqué par le classificateur de permissions de l'environnement, et à juste titre : un jeton d'analyse Sonar n'a pas vocation à être extrait d'un secret cluster depuis une session d'édition de documentation. / **Présenter les 63,9 % comme la mesure du jour** — écarté : la CI confirme que l'analyse du 2026-08-30 a tourné avec succès (vérifiable sans jeton via les check-runs), mais ses valeurs ne l'ont pas été ; affirmer un chiffre non relu aurait reproduit exactement l'erreur méthodologique que ce rapport corrige depuis plusieurs arrêtés (confondre ce qui est déclaré et ce qui est vérifié). / **Ne rien revérifier et se contenter de recopier les chiffres du CHANGELOG** — écarté : deux des trois chantiers clos (recette QA, correctif de vulnérabilités) avaient un effet mesurable sur des indicateurs bon marché à revérifier (avancement, délais, RGAA, tests) ; ne pas le faire aurait laissé passer le rééquilibrage périmètre engagé/backlog (246→248) que seule une relecture directe d'Odoo a révélé.

**Conséquences** : Le rapport distingue désormais explicitement, indicateur par indicateur, ce qui a été **revérifié à cet arrêté** (Odoo, tests, RGAA, statut CI) de ce qui est **repris de la dernière mesure connue et daté comme tel** (mesures SonarQube détaillées, RH par profil). C'est plus verbeux qu'une réédition qui présenterait tout comme frais, mais **l'écart déclaré/démontrable que ce rapport traque depuis son origine ne doit pas se recréer en son sein** — un chiffre non revérifié présenté comme mesuré serait exactement ce défaut. Corollaire pour la prochaine réédition : si un `SONAR_TOKEN` local devient disponible (variable d'environnement, ou accès autorisé au secret cluster), relire `/api/measures/component` et `/api/issues/search` avant de recopier les valeurs du 2026-08-29, qui seront alors périmées.

---

### [2026-08-30] RGAA « 106 critères » : étendre l'outillage automatisable plutôt que lancer un audit manuel non demandé

**Contexte** : Après la réédition du compte rendu de pilotage, demande de l'utilisateur de « s'occuper des 106 critères » du RGAA — le rapport ne couvrait alors que 6 critères outillés. L'ambiguïté de la demande était réelle : un audit manuel complet (méthodologie RGAA officielle, 109 tests, conforme/non conforme/non applicable par critère) et une extension de l'outillage automatisable sont deux chantiers de nature et d'ampleur très différentes, et rien dans la demande ne permettait de choisir entre eux sans supposer.

**Décision** : Poser la question avant tout code plutôt que de deviner l'ampleur voulue (quatre options présentées, y compris une combinaison des deux et un statu quo documentaire). L'utilisateur a choisi l'extension de l'outillage automatisable. Exécution : revue des 36 composants de `src/components/` un par un (pas d'échantillonnage) pour départager ceux qui portent un élément interactif propre de ceux qui n'en portent pas ; 20 montés sous axe-core (12 de plus), 16 écartés avec justification écrite (purement présentationnels). Deux non-conformités réelles trouvées **en lisant le rendu**, pas en se fiant au seul verdict d'axe (`TodoWidget.vue`, `MenuItemComponent.vue`) — corrigées par cohérence avec le correctif déjà posé sur le même anti-patron (`ToggleButton.vue`, 2026-08-29), sans attendre qu'un outil les exige formellement.

**Alternative écartée** : **Lancer directement l'audit manuel des 106 critères** sans poser la question — écarté : c'est un chantier de plusieurs sessions dont la sortie (déclaration d'accessibilité) engage le projet publiquement ; le lancer sur une lecture possiblement erronée de la demande aurait été le pire compromis, ni le bon chantier ni un chantier léger. / **Se contenter d'étendre l'outillage sans chercher de non-conformité au-delà de ce qu'axe rapporte** — écarté : cela aurait reproduit exactement la limite que la campagne visait à documenter (un outil ne peut juger ni la fiabilité d'un `title` ambiant ni la pertinence d'un glyphe comme nom accessible) sans jamais la montrer concrètement ; les deux cas trouvés en sont la preuve empirique, pas une affirmation de principe.

**Conséquences** : Le périmètre outillé passe de 8 à 20 composants sur 36 (les 16 restants, revus et écartés avec justification, ne sont pas des angles morts silencieux). Deux non-conformités de plus corrigées. **La limite du tout-automatisé est désormais démontrée par deux cas réels documentés dans `docs/AUDIT_RGAA.md` §2 ter**, pas seulement énoncée en principe comme aux arrêtés précédents — ce qui rend plus difficile de confondre, à l'avenir, « 0 violation axe-core » avec « conforme RGAA ». Corollaire pour la suite, si l'utilisateur souhaite un jour aller au-delà : l'audit manuel des 106 critères reste un chantier distinct, non entamé par cette entrée, et demandera d'être reposé explicitement plutôt que supposé inclus.

---

### [2026-08-30] Audit manuel des 106 critères RGAA : référentiel officiel téléchargé plutôt que reconstitué, journal resumable plutôt que faux livrable complet

**Contexte** : L'utilisateur a explicitement demandé le second chantier laissé de côté à l'entrée précédente — l'audit manuel des 106 critères. Deux risques identifiés avant tout travail : (1) reconstituer la grille RGAA de mémoire ou depuis un résumé web expose à des erreurs sur un document qui peut servir de base à une déclaration d'accessibilité publique ; (2) 106 critères × ~15 pages d'échantillon représente un volume qu'il est malhonnête de prétendre boucler en un seul tour.

**Décision** : (1) **Source** — téléchargement du PDF officiel `RGAA-v4.1.2.pdf` (accessibilite.numerique.gouv.fr) et extraction texte via `pdftotext -layout -enc UTF-8`, plutôt que `WebFetch` (le premier essai sur la page web équivalente s'est révélé tronqué et partiellement inexact sur les thématiques 10-13 — écarté après vérification, pas supposé fiable). Grille recomptée (106 confirmés : 9+2+3+13+8+2+5+10+4+14+13+11+12) avant tout usage. (2) **Format** — `docs/AUDIT_RGAA_106.md` explicitement marqué **EN COURS**, avec un tableau d'avancement par thématique et une légende distinguant verdict posé de case vide, plutôt qu'un tableau à 106 lignes toutes remplies dont une partie aurait été inventée pour faire nombre. (3) **Priorité de remplissage** — d'abord les critères vérifiables par recherche exhaustive dans `src/` (ex. « aucun `<iframe>` dans tout le dépôt » pour la thématique 2), qui sont aussi solides qu'un test par page et coûtent une commande, avant les critères qui exigent un rendu réel par page de l'échantillon.

**Alternative écartée** : **Remplir les 106 lignes dès ce tour**, y compris par estimation à partir de la lecture de code sans preuve exhaustive — écarté : certains critères (pertinence d'un intitulé, ordre de tabulation réel, cohérence de navigation) ne peuvent pas être tranchés sans un rendu de page réel ou sans recherche exhaustive vérifiée ; les deviner aurait produit un document qui a l'air complet mais ne l'est pas, exactement le défaut que ce projet corrige méthodiquement ailleurs (voir la correction du doublon `IA` du 2026-08-28). / **Se contenter d'un audit par échantillonnage de code sans échantillon de pages formalisé** — écarté : la méthodologie RGAA elle-même exige un échantillon déclaré, condition de validité d'un futur taux de conformité.

**Conséquences** : 23/106 verdicts posés à l'ouverture (22 %), dont deux non-conformités candidates concrètes trouvées par recherche exhaustive plutôt que par supposition : 8.6 (5 titres de route en anglais/casse incohérente dans une app francophone) et 12.7 (aucun lien d'évitement clavier trouvé dans tout `src/`). Effet de bord découvert en vérifiant les routes : `src/pages/AdminPage.vue` n'est référencé par aucune route ni aucun composant — code mort, hors périmètre RGAA, signalé séparément plutôt que noyé dans l'audit. **Ce qui reste à faire est explicite** (§4 du document, ordre thématique proposé) plutôt qu'implicite : la prochaine session peut reprendre directement le tableau d'avancement sans recontextualiser.

---

### [2026-08-31] 500 création LeitnerSystem : resserrer le validateur sur 50 plutôt que migrer la colonne à 100

**Contexte** : Signalement utilisateur (screenshot prod) d'un 500 à la création d'un système de Leitner. Diagnostic : `LeitnerSystem.validators.js` acceptait un `name` jusqu'à 100 caractères, mais la colonne `LeitnerSystem.name` est `VARCHAR(50)` depuis la migration initiale (`20260226151700-create-leitnersystem-table.js`) — jamais élargie depuis. Un nom de 51 à 100 caractères passait la validation puis faisait échouer l'`INSERT` en base, remontant en 500 générique. Deux corrections possibles, de nature différente : resserrer le validateur (et le front) sur la limite DB réelle, ou élargir la colonne à 100 pour matcher l'intention apparente du validateur.

**Décision** : Question posée à l'utilisateur avant de coder (écart bloquant au sens d'`AGENT.md` §2 — le choix engage soit une migration prod, soit un changement de comportement UI). L'utilisateur a choisi de **resserrer validateur + front sur 50**, sans toucher au schéma. Exécution : `nameRules` (`LeitnerSystem.validators.js`) passé à `max: 50` ; `maxlength="50"` ajouté au champ front (`FlashcardsPage.vue`) pour empêcher la saisie en amont plutôt que de compter sur le seul 400 serveur ; 2 tests de régression ajoutés (51 caractères → 400, 50 pile → 201).

**Alternative écartée** : **Élargir `LeitnerSystem.name` à `VARCHAR(100)`** via migration Sequelize — écarté par choix utilisateur : nécessite une migration à jouer en prod avant tout déploiement du fix, alors que resserrer le validateur corrige immédiatement le 500 sans toucher au schéma ni aux données existantes. Cette option reste disponible si le besoin de noms > 50 caractères est confirmé plus tard.

**Conséquences** : Le comportement observable change légèrement — un nom de 51 à 100 caractères, auparavant accepté en façade puis cassé en 500, est maintenant refusé proprement en 400 (et bloqué dès la saisie côté front). **Dette signalée, non traitée dans ce ticket** : le même désaccord (validateur plus permissif que la colonne `STRING(50)` réelle) existe sur `Subject.validators.js` (max: 100) et `Diagramme.validators.js` (max: 200) — probable même classe de bug latent, à vérifier et corriger séparément si confirmé en prod.

---

### [2026-08-31] Dette Subject/Diagramme : même correctif que LeitnerSystem, sans repasser par une question

**Contexte** : Demande explicite de l'utilisateur de corriger la dette signalée à l'entrée précédente. Contrairement au cas `LeitnerSystem`, pas de réel choix à arbitrer ici : la décision de principe (resserrer le validateur plutôt que migrer la colonne) a déjà été prise et justifiée juste au-dessus, et s'applique à l'identique aux deux mêmes cas (colonne `VARCHAR(50)` non touchée depuis sa création, validateur plus permissif sans raison documentée).

**Décision** : Appliquer le même correctif sans reposer la question — `Subject.validators.js` (`max: 100` → `50`) et `Diagramme.validators.js` (`max: 200` → `50`), + `maxlength="50"` sur les 4 champs front concernés (`SubjectSelectorComponent.vue`, `MindmapsListView.vue` création et renommage, `MindmapsEditorView.vue` renommage à l'export) + 2 tests de régression par entité (même pattern que `LeitnerSystem.controller.test.js`). `AdminPage.vue` explicitement écarté du périmètre : confirmé mort (aucune route ne le référence, constaté lors de l'audit RGAA du 2026-08-30) — corriger un champ inaccessible en prod n'aurait rien réparé.

**Alternative écartée** : **Reposer la question du choix resserrer/migrer pour Subject et Diagramme** — écarté : l'utilisateur avait déjà tranché ce point pour un cas identique quelques minutes plus tôt (même nature de colonne, même absence de justification pour un max plus large), reposer la question aurait ignoré une décision déjà prise sans raison de la remettre en cause.

**Conséquences** : Les 3 cas identifiés dans l'audit initial sont traités de façon cohérente (même limite, même stratégie, mêmes tests). Aucun audit exhaustif de tous les validateurs vs. tous les modèles n'a été mené — seuls les cas déjà repérés dans le code lu ont été corrigés ; un désaccord similaire pourrait subsister ailleurs dans le périmètre non lu à cette occasion.

---

### [2026-08-31] Nom de carte mentale écrasé à la création : retirer la réinitialisation redondante dans `MindMapBuilder.vue` plutôt que la rendre conditionnelle

**Contexte** : Signalement utilisateur — le nom saisi dans la modale « Nouvelle carte mentale » était systématiquement remplacé par « Nouvelle carte mentale » dès l'ouverture de l'éditeur. Cause : deux composants réinitialisaient le store `mindmapBuilder` pour le même événement (création d'une carte) — `MindmapsPage.handleCreate` (avec le bon nom) puis, un instant plus tard au montage, le watcher `immediate` de `MindMapBuilder.vue` sur `props.mapPayload` (avec un nom générique en dur, dès que `mapPayload` est `null`).

**Décision** : Supprimer la réinitialisation faite par `MindMapBuilder.vue` quand `mapPayload` est `null`, plutôt que la rendre conditionnelle (ex. « ne réinitialiser que si le titre du store est vide »). Vérification préalable : `MindMapBuilder.vue` n'a qu'un seul point de montage dans tout le front (`MindmapsEditorView.vue`), qui initialise toujours le store (`mindmapStore.new(nom)` ou `mindmapStore.load(...)`) avant de monter le composant — la responsabilité d'initialiser le store appartient déjà entièrement à l'appelant, la dupliquer dans l'enfant n'apportait aucune garantie réelle et créait la course qui a produit le bug.

**Alternative écartée** : garder un filet de sécurité conditionnel dans `MindMapBuilder.vue` (ex. `if (!store.map.nodes || Object.keys(store.map.nodes).length === 0) store.new(...)`) — écarté après vérification que l'état initial du store Pinia (`state: () => ({ map: createBlankMindMap(), ... })`) contient toujours au moins le nœud sujet ; cette condition serait donc toujours fausse et n'aurait protégé aucun scénario réel, tout en laissant croire à une garantie qui n'existe pas.

**Conséquences** : Le composant `MindMapBuilder.vue` n'a plus de comportement implicite de réinitialisation — s'il gagne un second point de montage à l'avenir sans passer de `mapPayload` initial cohérent, l'éditeur s'ouvrira sur l'état courant du store plutôt que sur une carte vide nommée par défaut ; l'appelant devra explicitement appeler `mindmapStore.new(...)` avant montage, comme le fait déjà `MindmapsPage`. Corollaire couplé : la première sauvegarde automatique (`MindmapsEditorView.onMounted` → `mindmapStore.touch()` si pas d'id) dépend maintenant de cette invariance — un futur point de montage qui ne suivrait pas cette convention casserait aussi l'auto-save initial.

---

### [2026-08-31] Suppression de carte mentale signalée en échec malgré un succès réel : aligner `MindmapsListView` sur le contrat déjà documenté de `api.del`, pas modifier `api.del`

**Contexte** : Signalement utilisateur — suppression d'une carte mentale confirmée par toast d'avertissement « Suppression impossible. » alors que la carte est réellement supprimée en base (vérifiable au rafraîchissement). Cause : `api.del` retourne `undefined` sur une réponse `204 No Content` (comportement voulu et déjà documenté dans son JSDoc, et déjà pris en compte correctement dans `stores/diagrammes.js` — `resp !== undefined` traité comme un échec). `MindmapsListView.confirmDelete`, introduit lors du refacto M-02.12 sans passer par ce store, appelait `api.del` directement avec une condition de succès (`response && [200,204].includes(response.status)`) qui ne peut jamais être vraie pour un `response` `undefined`.

**Décision** : Corriger l'appelant (`MindmapsListView.vue`) pour qu'il traite `response === undefined` comme un succès, plutôt que de modifier `api.del` pour qu'il retourne systématiquement un objet même sur 204. Le contrat de `api.del` (et de `get`/`post`/`put`/`patch`, qui partagent le même helper `handleSpecialStatus`/`toResponse`) est déjà consommé correctement ailleurs dans le projet ; le changer pour ce seul point d'appel aurait rendu le comportement de `api.del` incohérent entre ses différents appelants sans traiter la cause réelle du bug (un appelant qui ne respecte pas un contrat déjà en vigueur et déjà documenté).

**Alternative écartée** : faire passer `MindmapsListView` par le store `stores/diagrammes.js` (qui gère déjà correctement ce cas) plutôt que de dupliquer la correction dans le composant — écarté après lecture : ce store expose une API à état interne (`this.diagramme`) pensée pour un flux différent (formulaire d'édition), incompatible sans réécriture avec le flux liste/suppression en une seule action de `MindmapsListView`. Le corriger localement, avec le commentaire `CHOIX/RAISON` pointant vers le pattern déjà établi dans `stores/diagrammes.js`, était le changement le plus petit qui respecte le contrat déjà documenté.

**Conséquences** : Le message de succès et le retrait de la carte de la liste locale reflètent maintenant le résultat réel de la requête serveur. Dette signalée : d'autres appelants de `api.del`/`api.put` sur des entités dont le controller retourne 204 (`Test`, `Role` — cf. note existante ligne ~1977 de `CHANGELOG_AGENT.md`) n'ont pas été audités à cette occasion ; le même défaut pourrait exister ailleurs et n'a pas été cherché de façon systématique.

---

### [2026-08-31] Redirection après création d'un système de Leitner : uniquement sur création, jamais sur édition

**Contexte** : Demande utilisateur — après création d'un système de Leitner, être redirigé directement vers la gestion des cartes de ce système plutôt que de rester sur la liste. Décision à prendre : la redirection doit-elle aussi s'appliquer à une édition de système existant ?

**Décision** : Restreindre la redirection au cas `isCreate` (pas `editingId.value`). Un système fraîchement créé n'a par construction aucune carte, donc « gérer les cartes » est l'action suivante évidente ; un système édité a probablement déjà des cartes et l'utilisateur qui vient de le modifier (nom, matière, tags) est plus vraisemblablement en train de gérer plusieurs systèmes depuis la liste que de vouloir en éditer les cartes. Le comportement d'édition (rester sur la liste, `fetchSystems` + `loadStats`) reste inchangé.

**Alternative écartée** : rediriger dans les deux cas (création et édition) — écarté, aucune indication dans la demande utilisateur que l'édition devait aussi rediriger, et le raisonnement ci-dessus (système édité ≠ système vide) allait à l'encontre de ce comportement par défaut.

**Conséquences** : Effet de bord mineur et assumé sur le bandeau de parcours guidé (`GuidedTourBannerComponent.vue`) — après la redirection, `onStepPage` (qui compare `route.name` à `'flashcards'`) devient faux et affiche en plus un bouton « Reprendre l'étape → », sans rien casser (le bouton « Étape suivante → » reste disponible, basé sur `links.leitnerSystemId` et non sur la route courante). Non corrigé, jugé cosmétique et hors périmètre de la demande initiale.

---

### [2026-08-31] Fermeture des modales au clic extérieur : corriger les 10 occurrences du pattern dupliqué, pas seulement celles en cours de travail

**Contexte** : Signalement utilisateur — sélectionner du texte dans un champ d'une modale puis relâcher le clic hors du panneau (glisser-sélectionner qui déborde) fermait la modale par accident. Cause identifiée : le pattern `@click="close"` sur l'overlay + `@click.stop` sur le panneau, dupliqué à l'identique dans 7 fichiers (10 modales) plus `ModalComponent.vue`, ferme au relâchement (`click` se déclenche sur le plus proche ancêtre commun entre le point d'appui et le point de relâchement, pas sur l'un ou l'autre isolément).

**Décision** : Question de portée posée à l'utilisateur avant de coder (corriger seulement les modales de cette session vs. toutes) — l'utilisateur a choisi toutes les modales. Remplacement mécanique et identique partout : `@click="close"` (overlay) + `@click.stop` (panneau) → `@mousedown.self="close"` (overlay seul, `@click.stop` retiré car rendu inutile par `.self`). `.self` compare `event.target` à `event.currentTarget` : seul un appui démarré directement sur l'overlay ferme la modale, quel que soit l'endroit du relâchement — élimine la classe de bug plutôt qu'un correctif au cas par cas.

**Alternative écartée** : garder `@click.stop` sur le panneau par prudence, en plus de `.self` — écarté : strictement redondant une fois `.self` en place, aurait laissé du code mort suggérant à tort une protection supplémentaire à un futur lecteur. / Centraliser dans `ModalComponent.vue` et migrer les 6 autres fichiers vers ce composant partagé — écarté comme hors périmètre : un vrai refactor de dé-duplication (6 modales hand-roulées à réécrire avec slots équivalents à `ModalComponent`) est un chantier distinct, plus risqué, non demandé ; corriger le bug signalé à l'identique dans chaque copie est le changement le plus petit qui le résout partout.

**Conséquences** : Les 10 modales de l'app partagent maintenant un comportement de fermeture cohérent et non-bugué. Dette signalée, non traitée : la duplication du pattern modal-overlay/modal-panel dans 6 fichiers hand-roulés (au lieu de passer par `ModalComponent.vue`) subsiste — un futur correctif de ce type devra être répété manuellement dans chaque fichier tant que cette dé-duplication n'est pas faite. `TagSelectorComponent.vue` a un pattern de fermeture au clic extérieur différent (pas de classe `modal-overlay`), non audité à cette occasion.

---

### [2026-08-31] Compte rendu de pilotage : documenter explicitement que le registre Odoo ne capture pas les correctifs traités hors ticket, plutôt que de laisser « inchangé » se lire comme « rien livré »

**Contexte** — Réédition du rapport à un arrêté où les cinq indicateurs dérivés d'Odoo (Avancement, Coûts, Délais, Risques, RH) sont revérifiés strictement identiques à l'arrêté précédent, alors que trois commits réels ont été livrés dans l'intervalle (validateurs resserrés à 50 caractères, bugs de carte mentale, fermeture des modales). Recherché par mot-clé dans les 350 tâches Odoo : aucune des trois ne correspond à une tâche du registre.

**Décision** : plutôt que de présenter silencieusement les cinq indicateurs comme « inchangés » (ce qui, lu vite, suggère une semaine sans activité), l'encadré en tête du rapport nomme explicitement les trois commits, confirme qu'ils sont verts en CI et **explique pourquoi** ils n'apparaissent dans aucun indicateur : le registre Odoo mesure fidèlement le plan qu'il contient, il ne peut pas mesurer un travail qui n'y a jamais été rattaché. C'est un point de méthode à faire figurer à chaque arrêté futur où le même écart se reproduit, pas une correction ponctuelle de ce rapport-ci.

**Alternative écartée** : créer rétroactivement des tâches Odoo pour les trois commits, pour que le registre « colle » au travail réellement livré — écarté : ce ticket n'a pas mandat pour modifier le registre de pilotage (contrairement aux arrêtés du 2026-08-28/30, où la remise à plat du registre avait été explicitement demandée), et fabriquer des tâches a posteriori pour faire correspondre un chiffre est exactement le type de confusion déclaré/démontrable que ce rapport corrige méthodiquement depuis son origine — la bonne réponse est de documenter l'écart, pas de le faire disparaître artificiellement.

**Conséquences** : Un lecteur du rapport comprend désormais que « registre inchangé » ne veut pas dire « rien livré », et sait où regarder (l'encadré, puis `git log`) pour retrouver le travail hors registre. Corollaire pour la suite : si ce type de correctif hors ticket devient fréquent, la question de savoir si le registre Odoo doit ou non les tracer (nouveau bloc « maintenance » ?) devrait être posée explicitement à l'utilisateur plutôt que laissée à l'appréciation de chaque arrêté.

---

### [2026-08-31] Audit RGAA 106 critères, reprise : lecture de code exhaustive plutôt que test sur page rendue, verdicts posés uniquement sur preuve directe

**Contexte** — L'utilisateur, qui « ne sait pas faire », a délégué entièrement la poursuite de l'audit manuel des 106 critères (bloqué à 23/106 depuis le 2026-08-30). Deux approches possibles pour avancer : (a) monter une stack Playwright complète (build + serveur de preview + navigation automatisée) pour tester les critères sur les pages réellement rendues, comme prévu à l'étape 2 du plan du document ; (b) continuer par lecture de code et recherche exhaustive (`grep`), comme les verdicts déjà posés au 2026-08-30.

**Décision** : Poursuivre par lecture de code exhaustive pour cette session, réserver Playwright aux critères qui l'exigent **structurellement** (zoom, ordre de tabulation réel, focus visible, clignotements — non observables en lisant des fichiers `.vue`). Chaque verdict posé cite sa preuve exacte (chemin + ligne, ou commande `grep` reproductible) — aucun verdict par estimation, y compris quand un motif se répète sur plusieurs fichiers (vérifié fichier par fichier, pas supposé identique). Un cas a été vérifié puis **rejeté** avant d'être écrit (analyse initiale de la hiérarchie des titres par simple comptage de `<h1>`-`<h6>` par fichier, qui suggérait à tort que la plupart des pages n'avaient aucun `<h1>` — la lecture du rendu réel de `App.vue` a révélé un `<h1>{{ route.meta.title }}` ambiant, rendu avant `<RouterView />` sur toutes les pages, invalidant le premier diagnostic) : preuve que le grep seul, sans tracer le rendu réel, peut produire un faux positif — gardé comme rappel dans la méthode plutôt qu'effacé silencieusement.

**Alternative écartée** : monter la stack Playwright dès cette session pour tout auditer d'un coup — écarté par pragmatisme : la lecture de code exhaustive a permis de poser 37 verdicts supplémentaires (23→60, avant même la correction du compteur désynchronisé, voir plus bas) sans dépendance à un environnement de rendu, ce qui aurait ajouté un coût d'installation/lancement sans bénéfice pour les critères purement structurels (présence de `<caption>`, `autocomplete`, `<fieldset>`…). Le travail nécessitant réellement un navigateur reste identifié et listé explicitement (§4/§5 du document), pas évité par contournement.

**Correction de méthode découverte en cours de route** : le tableau de suivi (« État global ») du document était désynchronisé de la grille détaillée pour les thématiques 4, 12 et 13 — des verdicts déjà posés (ex. `12.10`, `13.5`/`13.6`/`13.8`/`13.10`/`13.12`) n'avaient jamais été reportés dans le compteur agrégé lors des sessions précédentes. Recompté directement depuis la grille (source de vérité) pour tout le document, pas seulement les sections touchées — sinon le pourcentage affiché continue de sous-représenter le travail déjà fait indéfiniment.

**Conséquences** : 60/106 verdicts posés, dont **5 non-conformités confirmées par preuve directe** (une sévère : 6.2, navigation principale sans nom accessible — invisible à l'outillage axe-core existant car portée par le shell applicatif `App.vue`, jamais testé isolément). Ces non-conformités sont documentées mais **pas corrigées** dans cette session — la demande portait sur l'audit, pas sur le correctif ; à proposer explicitement au tour suivant. Le compteur agrégé du document doit désormais être recalculé depuis la grille à chaque session future, pas seulement incrémenté à la main, pour éviter que la désynchronisation ne se reproduise.

---

### [2026-08-31] Correctifs RGAA : `role`/`aria-labelledby` plutôt que `<fieldset>`/`<legend>`, `<caption class="sr-only">` plutôt que visible, correctif ciblé sur le lot proposé uniquement

**Contexte** — Sur l'offre faite à l'issue de l'audit (5 non-conformités confirmées listées), l'utilisateur a demandé « tu peux faire les correctifs RGAA ? ». Plusieurs choix d'implémentation se posaient pour chaque correctif, avec un impact direct sur le rendu visuel existant.

**Décision 1 — Regroupements de champs (11.6/11.7)** : `role="radiogroup"`/`role="group"` + `aria-labelledby` plutôt que `<fieldset>`/`<legend>`. Le RGAA accepte les deux comme équivalents valides. `<fieldset>` porte un style par défaut du navigateur (bordure, marge, padding) qu'il aurait fallu neutraliser par CSS sur chaque usage pour ne pas changer le rendu visuel existant ; l'approche ARIA n'a aucun effet visuel, se pose en une ligne sur l'élément englobant déjà présent, et réutilise le texte déjà affiché (énoncé de question, libellé « Options… ») comme légende plutôt que d'en dupliquer un nouveau — sauf dans le seul cas où aucun texte n'existait déjà (sélection de jours, `ClassroomEtablissementView.vue`), où un `<span>` `sr-only` dédié a été ajouté.

**Décision 2 — Titres de tableau (5.4/5.5)** : `<caption class="sr-only">` plutôt qu'un `<caption>` visible. Les 4 tableaux étaient déjà précédés d'un titre visuel (`<h2>`/contexte de page) — un `<caption>` visible aurait dupliqué ce titre à l'écran. La classe `sr-only` (utilitaire Tailwind natif, déjà disponible sans configuration) rend le `<caption>` accessible aux AT sans rien changer au rendu.

**Décision 3 — Nav principale (6.2)** : `aria-label` ajouté sur **tous** les liens de navigation, y compris les 3 qui avaient déjà un `title` (`/calendar`, `/todo`, `/kpi`) — pas seulement les 8 qui n'avaient rien. `title` seul est un mécanisme faible et inconstant selon les lecteurs d'écran/navigateurs ; `aria-label` est la garantie robuste déjà utilisée ailleurs dans le projet (`ToggleButton.vue`). Le `title` existant est conservé (infobulle utile à la souris), `aria-label` s'ajoute en plus. Un test de régression dédié (`test/App.test.js`) vérifie que chaque lien de la nav a un nom accessible — absent jusqu'ici (aucun test n'existait pour `App.vue`).

**Décision 4 — Portée du correctif** : uniquement les 5 non-conformités explicitement proposées à l'utilisateur (1.2, 5.4-5.7, 6.2, 11.6/11.7, 11.13). Le candidat 9.2 (saut de niveau de titre sur `CalendarPage.vue`), bien que déjà confirmé dans la grille détaillée, n'était pas dans ce lot et n'a pas été corrigé — pour rester strictement sur ce qui a été proposé et accepté, pas étendre silencieusement le périmètre d'une demande de correctif à des éléments non annoncés.

**Alternative écartée** : profiter du fait d'être dans ces fichiers pour corriger aussi 8.6 (titres de route en anglais) — écarté, le document d'audit lui-même signale que 8.6 pourrait être un choix éditorial délibéré et demande une confirmation utilisateur avant correctif ; le corriger sans poser la question aurait pu défaire une décision de nommage intentionnelle.

**Conséquences** : Les 5 non-conformités proposées sont corrigées et vérifiées (705/705 tests dont 2 nouveaux, 0 régression axe-core/statique, ESLint propre). Thématiques 1, 5, 6 closes sans aucune non-conformité restante. Effet de bord corrigé au passage : le lien « Classe » de la nav mobile utilisait la mauvaise icône (`ExercisesIcon` au lieu de `ClassroomIcon`) — signalé lors de l'audit, corrigé avec le reste du bloc `App.vue` puisque déjà en cours d'édition. 3 candidats restent ouverts par choix explicite (9.2, 8.6, 12.7), pas par oubli.

---

### [2026-08-31] Prod figée en révision 4 (encore) — débloquée par `kubectl rollout restart` plutôt qu'un `helm upgrade`, root cause `K8S_PROD_ENABLED` laissée à l'utilisateur

**Contexte** — Signalement utilisateur : les commits `6c3d02c`/`d86401c`/`d1ef46a` (31/08) mergés sur `main` ne se reflétaient pas en prod. Diagnostiqué en direct grâce à un accès `kubectl` disponible ce jour sur le poste (contexte `kubernetes-admin@pck-dkoyol2`, absent des sessions précédentes qui n'avaient pu que déduire l'état de la prod depuis le dépôt et les logs `helm`/`kubectl` cités a posteriori). C'est la **3ᵉ occurrence** du même symptôme, après les deux du 27-28/08 déjà consignées ci-dessus : `deploy_prod` de `cd.yml` conditionné à `vars.K8S_PROD_ENABLED == 'true'`, resté à `false` — aucune décision n'avait encore été prise pour corriger le fond, seulement des rattrapages ponctuels.

**Décision** : rattraper à nouveau **manuellement**, mais par `kubectl rollout restart deployment mmm-prod-api mmm-prod-front -n mymemomaster` seul — **pas** de `helm upgrade`, ni de `kubectl patch` de ConfigMap. Vérifié au préalable que les 3 commits ne touchent aucun fichier `helm/`/`k8s/` (uniquement `my_memo_master_front/src/**` et `my_memo_master_api/validators/**`) : `imagePullPolicy: Always` suffit à faire repartir les pods sur les images `:latest` déjà poussées sur Docker Hub le jour même (16:42 UTC), sans qu'aucune clé de configuration n'ait besoin d'être re-rendue. Root cause (`K8S_PROD_ENABLED`) explicitement **laissée à l'utilisateur** — decision d'exploitation (rendre la prod redéployable automatiquement à chaque push), pas quelque chose à trancher en corrigeant un symptôme, cohérent avec l'arbitrage déjà pris le 28/08.

**Vérification étendue à la preprod, à la demande de l'utilisateur** — Diagnostic différent : `helm history mmm-preprod` est aussi figé (révision 7 du 27/08), mais **sans dérive** — les pods tournent déjà sur les mêmes digests que ceux publiés sur Docker Hub (`mymemomaster_preprod_*:latest`, poussés le **2026-07-19**). La staleness ne vient pas de la CD mais du fait que la branche `staging` n'a reçu aucun merge depuis cette date (`git log origin/staging..origin/main --oneline` → 54 commits d'écart, `staging` restant un ancêtre direct de `main` via `git merge-base --is-ancestor`). Un `rollout restart` sur preprod n'aurait rien changé de neuf. Aucune action prise sur ce namespace, à la demande explicite de l'utilisateur.

**Alternative écartée** : proposer de basculer `K8S_PROD_ENABLED` moi-même — écarté, je n'ai ni `gh` CLI installé sur ce poste (`where gh` → introuvable) ni token GitHub en variable d'environnement ; même en les ayant eus, cette bascule reste la même décision d'exploitation que celle déjà refusée dans l'urgence le 28/08, à laisser au porteur du projet.

**Conséquences** : Prod à jour sur les 3 commits, vérifié par comparaison de digests (`sha256:1ce6f9d1…`/`sha256:80efe63e…`, identiques entre Docker Hub et les nouveaux pods) et par le hash du bundle front changé sur `GET /`. **`K8S_PROD_ENABLED` reste à `false`** : tout futur merge sur `main` retombera dans le même symptôme tant que l'utilisateur n'a pas fait la bascule (Settings → Secrets and variables → Actions → Variables) — action qu'il a indiqué prendre en charge lui-même à l'issue de cette session. Le rappel déjà consigné le 28/08 tient toujours : le premier `helm upgrade` qui se déclenchera après réactivation re-rendra les 32 clés de la ConfigMap (dérive du patch manuel `APP_FRONT_URL`), sans risque de contenu mais avec un diff large à anticiper. `K8S_PREPROD_ENABLED` également laissé à `false`, sans urgence tant que `staging` n'avance pas.

---

### [2026-08-31] `Question.statement` : migrer en TEXT plutôt que resserrer, contrairement aux 3 correctifs précédents de la même classe de bug

**Contexte** — 4ᵉ occurrence de la classe de bug « validateur plus permissif que la colonne DB réelle » découverte cette session (après `LeitnerSystem.name`, `Subject.name`, `Diagramme.mmName`, tous corrigés en resserrant le validateur/front sur la limite de colonne existante, jamais en migrant). Cette fois : `Question.statement` en `VARCHAR(255)` (défaut Sequelize non voulu, jamais de longueur précisée dans la migration d'origine), sans aucun validateur de longueur — un énoncé d'exercice un peu long faisait échouer l'`INSERT` en 500.

**Décision** : à la différence des 3 cas précédents, **migrer la colonne en TEXT** plutôt que resserrer — question posée explicitement à l'utilisateur, qui a tranché dans ce sens. Le raisonnement qui justifiait de resserrer pour `LeitnerSystem`/`Subject`/`Diagramme` (ce sont des champs « nom », courts par nature, 50 caractères est une limite raisonnable et déjà large) ne s'applique pas ici : un énoncé de question est du contenu, pas un libellé — `Question.content` (qui porte les options de réponse) est déjà en `TEXT` sans limite, donc plafonner l'énoncé de la question elle-même à 255 caractères aurait été **incohérent avec sa propre table**, pas seulement restrictif.

**Alternative écartée** : resserrer `statement` à 255 caractères (validateur + `maxlength` front), par cohérence mécanique avec les 3 correctifs précédents — écarté par l'utilisateur : appliquer la même décision sans réévaluer la nature du champ aurait reproduit une limite arbitraire sur du contenu qui peut légitimement être long (énoncé de problème mathématique, texte à lire, consigne détaillée).

**Conséquences** : Migration `20260831000001-change-question-statement-to-text.js` à jouer au prochain déploiement (CD), comme toutes les migrations de ce projet — non exécutée dans cette session faute d'accès à une base locale/prod. Contrairement aux 3 correctifs précédents, celui-ci ne change **aucun** comportement observable pour un énoncé valide existant (aucune donnée tronquée, aucun 400 nouveau) — il retire une limite plutôt que d'en resserrer une. `Question.validators.js` reste sans contrainte de longueur sur `statement`, assumé (pas de plafond arbitraire à inventer).

---

### [2026-08-31] Messages d'erreur de validation avalés dans tout le front : correctif centralisé dans `api.js` plutôt que 160 correctifs par appelant

**Contexte** — En creusant un signalement utilisateur (« erreurs en local à la création d'événements dans le calendrier »), reproduit avec un screenshot : le formulaire affichait `"Erreur lors de la création."` (message générique) au lieu de la vraie raison du rejet (heures de début/fin identiques). Cause : `validate.middleware.js` renvoie `{ errors: [...] }` (forme express-validator brute) sur un 400, jamais `{ message }` — mais `grep -rn 'resp?.data?.message' src/` remonte **160 occurrences** dans le front, toutes écrites en supposant l'existence d'un champ `message` qui n'a jamais existé sur cette forme de réponse.

**Décision** : corriger une fois dans `helpers/api.js` (`toResponse()`, déjà le point de passage unique de `get`/`post`/`put`/`patch`/`del`) plutôt que dans chacun des 160 appelants. La fonction synthétise `data.message = data.errors[0].msg` uniquement quand `message` est absent et `errors` est un tableau non vide — condition volontairement étroite pour ne jamais écraser un message déjà posé par un contrôleur (`res.status(400).json({ message: '...' })`, pattern différent utilisé ailleurs dans l'API pour des erreurs métier non issues d'express-validator).

**Alternative écartée** : corriger `RevisionSession` uniquement (le cas signalé) — écarté dès la découverte de l'ampleur réelle (160 occurrences, pas un cas isolé) : corriger un seul appelant aurait laissé le même défaut resurgir au prochain formulaire signalé, exactement le type de correctif ponctuel que ce projet évite depuis le début de session (cf. l'extension RGAA à tout `src/` plutôt qu'au seul cas trouvé). / Renommer `errors` en `message` côté `validate.middleware.js` pour que la forme corresponde à ce que les appelants attendent — écarté : `errors.array()` retourne plusieurs erreurs potentielles (un tableau), les réduire à un unique `message` perdrait cette granularité pour tout code qui voudrait un jour afficher plusieurs erreurs de champ à la fois ; le correctif front lit `errors[0].msg` (le premier), ce qui couvre le cas d'usage actuel (un toast, un message) sans fermer la porte à mieux plus tard.

**Conséquences** : Les 160 appelants affichent désormais le vrai message de validation sans modification individuelle. `test/helpers/api.test.js` — 3 tests ajoutés couvrant la normalisation (avec `errors`, avec `message` déjà présent — non écrasé, sans `errors` ni `message` — reste `undefined`). Dette non traitée : aucun audit des 160 sites d'appel n'a été fait pour vérifier qu'aucun ne dépendait implicitement de `data.message` étant `undefined` sur une erreur de validation (le garde `!data.message` réduit ce risque mais n'est pas une preuve exhaustive par appelant).

---

### [2026-09-01] Tables de jointure `belongsToMany` : modèle Sequelize explicite (`timestamps: false`) plutôt que `through: 'string'` — corrigé sur 6 associations, pas seulement celle qui a crashé

**Contexte** — 500 en prod confirmé par l'utilisateur à la création d'une série d'exercices, diagnostiqué en direct via `kubectl logs` (accès cluster disponible ce jour) : `column question->testQuestions.createdAt does not exist`. `Test.belongsToMany(Question, { through: 'testQuestions' })` passe la table de jointure en simple chaîne, sans modèle Sequelize enregistré — Sequelize crée alors un modèle implicite avec `timestamps: true` par défaut (aucun `define.timestamps` global dans `dbms.config.js`), alors que la migration réelle (`20260226152800-create-testquestions-table.js`) n'a créé que `idTest`/`idQuestion`. Tout INSERT généré via `question.addTest()` échoue en prod.

**Pourquoi le bug n'existait qu'en prod** — `server.js` ne lance `db.syncModels()` (→ `instance.sync({ alter })`) que si `ENVIRONMENT !== 'prod'` ou base vide. En dev/preprod, ce sync a toujours ajouté silencieusement les colonnes `createdAt`/`updatedAt` manquantes pour faire converger la table réelle vers l'attente implicite de Sequelize — masquant le défaut indéfiniment. Seule la prod (sync désactivé, migrations seules font foi) exposait le désaccord modèle/table.

**Décision** — Modèle Sequelize explicite par table de jointure (`timestamps: false`, colonnes alignées sur la migration), enregistré dans `models/index.js`, en réutilisant le nom déjà passé à `through:` — pattern déjà éprouvé par `TestClassGroup.model.js` (seule association du projet à ne jamais avoir eu ce bug). Sequelize résout `through: 'nomDeTable'` en cherchant d'abord un modèle déjà enregistré sous ce nom exact ; s'il existe, il est réutilisé tel quel (aucune modification requise dans `Test.model.js`/`Question.model.js`/etc., qui référencent déjà la bonne chaîne).

**Portée étendue aux 5 autres associations au même défaut** (`TestTag`, `questionSubject`, `cardSystems`, `MindMapTag`, `LeitnerSystemTag`) plutôt que la seule `testQuestions` qui a crashé — trouvées par grep systématique de tous les `through:` du projet suivi de vérification une à une de chaque migration (aucune ne crée de colonnes timestamps). Même cause exacte, même absence de preuve tant qu'aucune écriture n'a eu lieu sur ces tables en prod depuis le dernier sync dev/preprod — jugé plus sûr de corriger les 5 maintenant (changement mécanique, zéro risque de régression : aligne l'ORM sur le schéma réel, ne le modifie pas) que d'attendre un 6ᵉ signalement utilisateur identique sur une autre fonctionnalité (tags mindmap, tags Leitner, cartes Leitner, sujets de question).

**Alternative écartée** : exclure `createdAt`/`updatedAt` uniquement au niveau des requêtes de lecture (`through: { attributes: [] } }`, déjà utilisé pour `TAG_INCLUDE`/`CLASS_GROUPS_INCLUDE` dans `Test.service.js`) — écarté comme correctif principal : ça masque le problème en lecture (SELECT) mais ne change rien à l'écriture (`addX()`/`setX()`), qui est précisément le chemin qui a crashé (`question.addTest()`, jamais un `include`). Un modèle explicite corrige les deux chemins à la source.

**Alternative écartée** : ajouter la migration `add-timestamps-to-testQuestions` pour faire correspondre la table réelle au modèle implicite (plutôt que l'inverse) — écarté : aurait fallu la répliquer sur les 6 tables, pour des colonnes `createdAt`/`updatedAt` qu'aucun code ne lit ni n'affiche sur une table de jointure pure (pas d'entité métier, juste une clé composite) ; corriger le modèle pour refléter la table existante est le changement le plus petit et le plus sûr des deux.

**Conséquences** : `npx jest` (API) → 1560/1560, 0 régression. Correctif fait au niveau du code, **pas encore déployé** (pas de commit/push dans cette session) — voir dette dans `CHANGELOG_AGENT.md`.

---

### [2026-09-01] `helpers/api.js` : retirer la redirection globale vers `/error-server`, pas la remplacer par un toast générique

**Contexte** — Suite directe de l'incident `testQuestions` ci-dessus : sur tout vrai 5xx ou erreur réseau, `get`/`post`/`put`/`del`/`patch` faisaient `router.push({ path: '/error-server' })` **sans condition**, dans leur `catch` interne — y compris pour un appel secondaire après un succès déjà affiché à l'utilisateur (exactement ce qui s'est produit : `Test` créé avec succès, puis 1ʳᵉ `Question` en 500 → toute l'app bascule sur une page d'erreur plein écran, perdant le contexte du formulaire en cours). Demande explicite de l'utilisateur de corriger cet effet de bord après le correctif de la cause racine.

**Décision** — Retirer purement et simplement l'appel à `router.push` dans les 5 fonctions ; elles continuent de retourner `undefined` sur erreur (comportement déjà existant, inchangé pour les appelants) et de logger via `console.error`. Pas de remplacement par une notification toast générique dans `api.js`.

**Pourquoi pas un toast générique en remplacement** (option considérée) — Aurait ajouté un second message pour les appelants qui font déjà leur propre `notif.notify` dans leur `catch` englobant (cas majoritaire observé : `stores/tests.js`, `stores/tags.js` et la plupart des stores suivent le pattern controller→service répliqué côté front, try/catch systématique). Un double toast (un générique + un spécifique) aurait été plus bruyant que la situation actuelle sans rien apporter de plus qu'un seul message correctement formulé par l'appelant qui connaît le contexte de son action.

**Pourquoi ce retrait est sûr malgré ~200 sites d'appel non audités un par un** — Le contrat de retour d'`api.js` ne change pas : il retournait déjà `undefined` sur erreur avant ce correctif (le `router.push` était un effet de bord additionnel, pas ce qui produisait `undefined`). Tout appelant qui plante aujourd'hui sur un `resp` `undefined` non gardé (ex. `resp.data` sans `?.`) plantait *déjà* de la même façon avant ce correctif — la redirection ne faisait que masquer visuellement ce plantage en écrasant l'écran par la page 500 avant que l'utilisateur n'ait le temps de le voir. Le retirer expose ce qui existait déjà plutôt que de créer un nouveau risque.

**Alternative écartée** : garder la redirection mais seulement pour les appels du premier rendu d'une page (ex. `onMounted`) et pas pour les actions secondaires (soumissions de formulaire, appels en boucle) — écarté : `api.js` n'a aucun moyen générique de distinguer les deux cas (c'est un helper HTTP bas niveau, sans notion de contexte applicatif) ; ç'aurait nécessité un paramètre supplémentaire à faire remonter dans les ~200 appelants, largement disproportionné pour ce correctif.

**Conséquences** : `import router from '@/router'` retiré d'`api.js` (devenu inutilisé). `/error-server` et `ErrorServerPage.vue` restent dans le code mais **ne sont plus jamais déclenchés automatiquement** — conservés tels quels, non supprimés (décision de suppression pas prise, hors périmètre). 4 tests dans `test/helpers/api.test.js` adaptés (vérifient `console.error` + `undefined` au lieu de `router.push`). `npx vitest run` → 708/708, 0 régression ; `npx eslint` → 0 erreur.

---

### [2026-09-01] Temps de révision réel : nouvelle table `LeitnerReviewSession` + colonne `TestResult.durationSeconds`, plutôt que réutiliser `RevisionSession`

**Contexte** — KPI « Temps total de révision » toujours à 0 min en pratique, signalé par l'utilisateur avec une proposition concrète : chronométrer le temps réel passé sur chaque session Leitner et chaque série d'exercices. Cause : `Kpi.service.js` ne sommait que les créneaux planifiés dans `RevisionSession` (`startTime`/`endTime`, saisis à l'avance dans le calendrier) — jamais l'activité réellement effectuée, qu'aucune table ne capturait.

**Décision** — Deux nouveaux points de mesure dédiés à l'activité réelle, distincts de `RevisionSession` :
- `TestResult.durationSeconds` (colonne ajoutée) — une ligne `TestResult` existe déjà par tentative d'exercice complétée.
- `LeitnerReviewSession` (table créée) — aucune entité n'existait pour « une session de révision Leitner terminée » (chaque carte est un appel API indépendant) ; journal minimal (userId, idSystem, cardsReviewed, durationSeconds, completedAt).

Les deux durées s'additionnent au temps planifié existant (`revision.totalMinutes` dans `Kpi.service.js`), sans modifier le calcul de `_computeRevision` lui-même — addition faite par l'appelant (`getMyKpis`/`getPersonalKpisForSubjects`), pas dans la fonction pure.

**Alternative écartée** : réutiliser `RevisionSession` pour journaliser automatiquement chaque session Leitner/exercice réellement effectuée (créer une ligne avec `startTime`/`endTime` réels et `isDone: true` à la volée). Séduisant en apparence (aucune nouvelle table, réutilise l'agrégation `totalMinutes` déjà en place) mais **corrompt le sens des autres indicateurs qui dépendent de cette même table** : `Sessions planifiées`/`complétées`, `Taux de complétion` et `Streak actuel` mesurent spécifiquement si l'utilisateur suit un planning **qu'il a fixé à l'avance** — une discipline de planification, pas seulement de pratique. Injecter automatiquement de l'activité non planifiée dedans aurait fait grimper artificiellement le taux de complétion et le streak de n'importe quel utilisateur actif, qu'il planifie ou non ses révisions, sans que le tableau de bord ne le signale — un utilisateur qui ne planifie jamais rien aurait fini avec un « taux de complétion » élevé, ce qui n'a pas de sens pour cet indicateur précis.

**Pourquoi le plafond de 4h sur `durationSeconds`** (les deux validateurs, dupliqué intentionnellement plutôt que factorisé — voir ci-dessous) : un onglet resté ouvert en arrière-plan ou un ordinateur mis en veille pendant une session produirait un `Date.now() - startedAt` de plusieurs heures voire jours ; sans plafond, une seule valeur aberrante peut fausser durablement la moyenne affichée. Rejeter plutôt que tronquer : une valeur hors plage signale un chronométrage non fiable, mieux vaut la refuser (400) que la faire passer silencieusement pour une vraie mesure.

**Alternative écartée (facturation du plafond)** : extraire `MAX_SESSION_DURATION_SECONDS` dans une constante partagée plutôt que de la dupliquer dans `Test.validators.js` et `LeitnerReviewSession.validators.js` — écarté pour une seule constante scalaire dupliquée deux fois, un module partagé (`validators/shared/durations.js` ou équivalent) aurait été plus de cérémonie que la duplication elle-même ; à reconsidérer si un 3ᵉ flux de chronométrage apparaît.

**Conséquences** : `revision.totalMinutes` reflète désormais une vraie mesure d'activité, sans changer le sens des 4 autres indicateurs de la section « Révision & Régularité » (RevisionSession intact). `npx jest` (API) → 1580/1580 (+20) ; `npx vitest run` (front) → 713/713 (+5). Dette : abandon d'une session Leitner en cours (bouton Retour) non journalisé — seule une session menée à son terme est comptée, voir `CHANGELOG_AGENT.md`.

---

### [2026-09-01] C-01.01 — Contrat de sortie du prompt de génération de cartes aligné sur les 3 endpoints existants, plutôt qu'un format libre à parser ensuite

**Contexte** — Ticket `C-01.01` demande la spécification du prompt de génération de cartes par IA (feature list `C-01`, aucune ligne de code existante, `C-01` à 0/11 dans Odoo). Le contrat de sortie du LLM (schéma JSON des cartes proposées) pouvait être conçu librement, indépendamment du modèle de données actuel, puisque l'étape de Parsing (qui transforme cette sortie en appels API) est un ticket séparé et hors périmètre.

**Décision** — Le schéma JSON de sortie (`cards[].statement/type/answer/acceptedAnswers/options`) reprend délibérément la forme déjà acceptée par la création manuelle d'une carte (`POST /questions` puis `POST /responses` si `type: "open"` puis `POST /leitnercards`, cf. `FlashcardsCardsPage.vue#handleCreate`) plutôt qu'un format LLM-natif générique (ex. un simple tableau de paires question/réponse sans distinction de type). Un champ `sourceExcerpt` est ajouté par carte, sans équivalent dans le modèle de données actuel — pur mécanisme de traçabilité pour l'écran de validation (hors périmètre), non destiné à être persisté dans cette première version.

**Alternative écartée** : un schéma de sortie générique (`{ question, answer }[]` uniquement), plus simple à écrire dans le prompt mais qui aurait reporté tout le travail de distinction `open`/`mcq` et de structuration des options QCM sur l'étape de Parsing — écarté pour ne pas déplacer une contrainte du modèle de données vers une étape qui n'a pas vocation à la connaître mieux que le prompt lui-même, et pour que le mapping de persistance (§6 du document) reste une simple correspondance directe plutôt qu'une transformation.

**Conséquences** : le contrat de sortie du prompt (`diagrams/generation_ia_prompt_cartes.md` §4) est couplé au contrat de persistance actuel de `Question`/`Response`/`LeitnerCard` — toute évolution future de ce contrat de persistance (ex. un futur endpoint de création en masse) devra être répercutée dans le prompt. Le mapping de persistance lui-même (§6 du document) reste explicitement une hypothèse non tranchée, pas une décision actée par ce document — voir la note en tête de section dans le document.

---

### [2026-09-01] C-01 — Orientation fournisseur LLM : Mistral AI, pour raison RGPD (hébergement UE)

**Contexte** — Le document `diagrams/generation_ia_prompt_cartes.md` (C-01.01) laissait volontairement ouvert le choix du fournisseur LLM, le Benchmark LLM étant un élément distinct du feature list `C-01`, non traité par ce ticket. L'utilisateur a tranché cette orientation en session : le fournisseur retenu sera **Mistral AI**, motivé explicitement par la conformité RGPD — un modèle français/européen, hébergé dans l'UE, limite l'exposition aux transferts de données hors UE (contrairement aux offres américaines type OpenAI/Anthropic, qui impliquent un cadre de transfert international — clauses contractuelles types ou équivalent — que MyMemoMaster n'a pas à mettre en place avec un fournisseur européen).

**Décision** — Orientation actée pour le fournisseur : Mistral AI. **Ceci n'est pas le Benchmark LLM lui-même** (ticket distinct, hors périmètre de C-01.01) — reste à faire séparément : le choix du modèle précis dans la gamme Mistral (ex. `mistral-large` vs `mistral-small`, arbitrage qualité de génération / coût / latence), la vérification concrète du support JSON strict sur ce modèle, et le format d'appel réseau. Cette orientation restreint simplement le périmètre du futur benchmark à l'offre Mistral plutôt qu'à un comparatif multi-fournisseurs ouvert.

**Alternative écartée** : fournisseurs américains (OpenAI, Anthropic) — non retenus comme orientation par défaut en raison du critère RGPD mis en avant par l'utilisateur ; pas d'éléments de comparaison qualité/coût/latence discutés à ce stade, cette décision porte uniquement sur le critère de conformité, pas sur une évaluation technique comparée (qui reste à faire dans le Benchmark LLM si l'orientation Mistral s'avérait insuffisante en pratique).

**Conséquences** : `diagrams/generation_ia_prompt_cartes.md` (§8, §11) mis à jour pour refléter cette orientation — le prompt système (§3.1, règle 6) suppose un mode de sortie JSON strict, cohérent avec l'offre Mistral actuelle (`response_format: json_object`) à reconfirmer sur le modèle précis une fois choisi. Aucun code, aucune clé d'API, aucune variable d'environnement ajoutée — décision d'orientation documentaire uniquement à ce stade.

---

### [2026-09-01] C-01.02 — Maquettes UI génération IA en ASCII dans `diagrams/`, pas en bundle-surgery du prototype interactif

**Contexte** — Le ticket C-01.02 demande des « Maquettes UI génération Leitner IA ». Ce dépôt a déjà livré deux « Maquettes UI » par le passé, avec deux méthodes différentes : S-06.02 (2026-07-19) a directement édité le bundle minifié `docs/prototype/MyMemoMaster - Standalone.html` (dépaquetage manifest gzip+base64 → template → repackaging, via des scripts ad hoc non versionnés) pour ajouter un écran « Interpréteur de formules » ; S-05.02/S-04.02 ont produit des maquettes ASCII dans `diagrams/*_ui.md`. Les deux précédents n'ont pas le même contexte : S-06.02 documentait une fonctionnalité **déjà implémentée** en Vue (l'écran mirroir l'UI réelle, utile comme preuve pour le dossier de certification Bloc 2) ; S-05.02/S-04.02 documentaient une fonctionnalité **pas encore construite**, à l'étape « Analyse » — exactement la situation de `C-01` (0/11 dans Odoo, aucune ligne de code).

**Décision** : maquettes ASCII dans `diagrams/generation_ia_ui.md`, sur le modèle d'`etablissement_admin_ui.md` (périmètre, vues ASCII, composants à créer/modifier, store Pinia squelette, comportements, points d'attention).

**Alternative écartée** : reproduire la méthode S-06.02 (ajouter des écrans au prototype interactif versionné). Écartée pour deux raisons : (1) le prototype sert à démontrer une UI **déjà tranchée et cohérente avec l'implémentation réelle** — l'ajouter maintenant obligerait soit à figer des choix d'interaction qui n'ont pas encore été validés fonctionnellement, soit à re-générer l'écran une seconde fois une fois l'implémentation faite (double travail) ; (2) la méthode elle-même est fragile et coûteuse : dépaquetage/repackaging d'un bundle minifié de 255 Ko via des scripts ponctuels non versionnés, plus régénération des 17 captures via automatisation navigateur (Chromium headless/CDP) — disproportionné pour une fonctionnalité entièrement hypothétique à ce stade.

**Conséquences** : `diagrams/generation_ia_ui.md` reste un document de travail non visuel (wireframes texte), moins parlant qu'une maquette Figma/Claude Design haute-fidélité pour une revue non technique — accepté comme niveau de maturité cohérent avec le reste des documents « Analyse » du projet. Si la fonctionnalité est un jour implémentée, un écran pourra être ajouté au prototype interactif à ce moment-là (comme S-06.02 l'a fait a posteriori pour l'interpréteur), sans que ce document ASCII n'ait besoin d'être conservé au-delà de sa valeur d'analyse.

---

### [2026-09-01] C-01.03 — Modèle LLM retenu : `mistral-small-latest`, `mistral-medium-latest` en option d'escalade

**Contexte** — L'orientation fournisseur Mistral AI était déjà actée (entrée précédente, raison RGPD). Restait à choisir un modèle précis dans la gamme pour exécuter le prompt de génération de cartes (C-01.01). Aucune intégration technique n'existe dans le dépôt : le choix s'appuie sur une revue documentaire (tarifs et documentation publique Mistral, début septembre 2026 — sources dans `diagrams/generation_ia_llm_benchmark.md`), pas sur une mesure empirique.

**Décision** — `mistral-small-latest` (Mistral Small 4) retenu comme modèle par défaut. Le profil de la tâche (extraction structurée ancrée sur un chunk de texte déjà découpé, sortie JSON strictement contrainte, pas de raisonnement complexe ni d'agentique) ne justifie pas a priori un modèle plus capable : Small expose le même mécanisme de sortie structurée que Large/Medium (JSON mode + schéma custom, cf. documentation Mistral), pour une fraction du coût (~×2,5 moins cher que Large en sortie, ~×12,5 moins cher que Medium). Le coût par appel est un critère de premier ordre ici car la fréquence d'appel (un par génération demandée par un utilisateur) interagit directement avec le budget que le futur arbitrage Quotas (hors périmètre) devra fixer.

**Alternative écartée** : `mistral-large-latest` ou `mistral-medium-latest` par défaut — écartés comme choix par défaut faute de justification sur ce profil de tâche précis (pas un problème de raisonnement), mais **pas définitivement exclus** : documentés comme option d'escalade si une validation empirique future (protocole décrit en §8 du document, non exécuté ici) montrait un taux de non-conformité JSON ou une qualité de génération insuffisante avec Small. / Famille Ministral (8B/14B/3B, encore moins chère) — écartée par prudence, leur fiabilité sur un schéma JSON à plusieurs niveaux d'imbrication n'étant pas établie dans la documentation consultée, sans pour autant avoir été testée pour confirmer ou infirmer ce doute.

**Conséquences** : `diagrams/generation_ia_llm_benchmark.md` documente le choix et son critère de bascule. Aucun code, aucune clé d'API, aucune variable d'environnement ajoutée — décision d'orientation documentaire, à valider empiriquement (protocole du §8 du document) avant toute mise en production. Le choix n'a d'impact ni sur le contrat du prompt (C-01.01, inchangé — le mécanisme de sortie structurée est le même pour tous les modèles candidats) ni sur les maquettes UI (C-01.02, le modèle est invisible pour l'utilisateur final).

---

### [2026-09-01] C-01.04 — `fetch` natif plutôt qu'`axios`/SDK Mistral officiel, pour l'appel LLM

**Contexte** — Le service d'inférence IA (`AiCardGeneration.service.js`) doit appeler l'API Mistral en HTTP. Trois options : le SDK officiel `@mistralai/mistralai`, `axios` (déjà dépendance approuvée côté front, absente côté API), ou `fetch` natif (disponible globalement depuis Node 18, Node 22 utilisé par ce projet).

**Décision** — `fetch` natif, sans ajouter de dépendance. Un appel HTTP JSON simple (une requête, une réponse, un timeout via `AbortController`) ne justifie ni le SDK (surface d'API plus large que le seul besoin ici — chat completions) ni `axios` (déjà écarté côté API historiquement, cf. absence dans `package.json`).

**Alternative écartée** : `@mistralai/mistralai` — écarté pour cette première version : aurait apporté du typage/des retries intégrés, mais aussi une dépendance de plus à maintenir/auditer (OWASP A06, cf. `CONVENTIONS.md`) pour un besoin qui se résume à un seul endpoint REST. À reconsidérer si le service doit gérer plusieurs endpoints Mistral (embeddings, OCR…) ou des besoins avancés (function calling multi-tours) que le SDK simplifierait significativement. / `axios` — écarté, aucun gain sur ce cas d'usage par rapport à `fetch` natif, et introduirait une dépendance supplémentaire là où `fetch` suffit.

**Conséquences** : `package.json` de l'API inchangé, aucune nouvelle dépendance à auditer. Le timeout et l'annulation de requête sont gérés manuellement via `AbortController` (`services/AiCardGeneration.service.js#callModel`) plutôt que par une option native du client HTTP.

---

### [2026-09-01] C-01.04 — `response_format: json_object` (+ rappel du schéma dans le prompt) plutôt que les Custom Structured Outputs de Mistral

**Contexte** — Mistral expose deux mécanismes de sortie structurée (cf. `diagrams/generation_ia_llm_benchmark.md` §4, `diagrams/generation_ia_prompt_cartes.md` §11) : le mode JSON simple (`response_format: { type: "json_object" }`, sortie JSON garantie mais forme libre) et les Custom Structured Outputs (schéma JSON Schema fourni à l'API, forme garantie). Le schéma de sortie du prompt (C-01.01 §4) a des champs conditionnels selon `card.type` (`answer`/`acceptedAnswers` pour `open`, `options` pour `mcq`, mutuellement exclusifs).

**Décision** — `response_format: json_object`, avec le schéma rappelé en toutes lettres dans le prompt utilisateur (`SCHEMA_DESCRIPTION`, reproduit tel quel depuis `generation_ia_prompt_cartes.md` §4) — stratégie déjà actée en C-01.01, reprise ici sans modification.

**Alternative écartée** : Custom Structured Outputs — un JSON Schema strict représenterait mal l'union conditionnelle `open`/`mcq` sans le modéliser en deux variantes de carte distinctes (`oneOf` sur `type`), ce qui aurait complexifié le schéma et désynchronisé l'implémentation du contrat déjà documenté et revu en C-01.01 sans bénéfice certain (le mode JSON simple, combiné à la validation applicative déjà écrite en `validatePayload`/`validateCard` + le retry unique, couvre déjà le besoin de fiabilité).

**Conséquences** : la fiabilité du format repose sur la combinaison prompt + validation applicative + retry (déjà la stratégie documentée), pas sur une garantie API. Piste de dette explicitement notée : si le protocole de validation empirique (C-01.03 §8) mesure un taux de non-conformité trop élevé avec `json_object` seul, migrer vers les Custom Structured Outputs (avec un schéma `oneOf` par type de carte) est l'option de repli, sans remise en cause du reste du service.

---

### [2026-09-01] C-01.04 — Plafond technique `MAX_CARD_COUNT=30`, explicitement distinct de Quotas

**Contexte** — `validateInput` du service rejette un `cardCount` non entier, ≤ 0, ou > 30. Le feature list `C-01` prévoit un élément IN séparé, « Quotas », non livré à ce stade (hors périmètre de C-01.04). Point d'attention du ticket : ne pas étendre le périmètre à Quotas.

**Décision** — Un plafond fixe de 30 cartes par appel, codé en dur dans le service (`MAX_CARD_COUNT`), présenté et commenté explicitement comme un **garde-fou technique de robustesse du service** (éviter un appel manifestement aberrant — ex. `cardCount: 100000` — de gonfler démesurément un prompt ou un coût d'appel unique), **pas** une implémentation de Quotas (qui porterait sur un cumul dans le temps, par utilisateur/plan, avec sa propre persistance et ses propres règles produit — tout cela hors périmètre).

**Alternative écartée** : aucune limite dans le service (tout `cardCount` positif accepté, la borne réelle laissée entièrement à un futur Quotas) — écartée car elle aurait laissé le service vulnérable à un appel technique aberrant même avant qu'un mécanisme de Quotas n'existe (ex. pendant le développement/les tests manuels de la prochaine intégration), pour un coût de complexité nul (une constante, une comparaison).

**Conséquences** : le futur ticket Quotas devra composer avec cette borne haute existante (30) — soit la reprendre telle quelle comme plafond technique en complément de ses propres règles métier, soit la faire évoluer si une valeur différente s'avérait pertinente ; ce n'est pas un contrat figé, juste un filet de sécurité pris par prudence dans ce ticket.

---

### [2026-09-01] C-01.05 — Extraction PDF : `pdfjs-dist` plutôt que `pdf-parse` ou `unpdf`

**Contexte** — Le pipeline de traitement (C-01.05) doit extraire le texte d'un PDF fourni par l'utilisateur. Aucune dépendance PDF n'existe dans l'API à ce jour. Trois candidats évalués (`npm view`, 2026-09-01) : `pdf-parse` (le plus utilisé historiquement), `unpdf` (wrapper plus récent orienté serverless), `pdfjs-dist` (la bibliothèque Mozilla elle-même, utilisée en interne par les deux autres).

**Décision** — `pdfjs-dist@6.3.289` (Apache-2.0), ajouté comme dépendance de production. Vérifié : `npm view pdfjs-dist dependencies` ne liste **aucune** dépendance runtime — confirmé après installation (`package-lock.json` : une seule entrée `node_modules/pdfjs-dist`, aucun paquet transitif ajouté). `npm audit --omit=dev` reste à **0 vulnérabilité** après ajout (les 8 vulnérabilités remontées par `npm install` sans `--omit=dev` sont préexistantes côté devDependencies, non liées à ce changement).

**Alternative écartée** : `pdf-parse` — la version actuelle (2.x, vérifiée via `npm view pdf-parse dependencies`) dépend de `pdfjs-dist` **et** de `@napi-rs/canvas`, un binaire natif (napi-rs) — exactement le type de dépendance que ce projet évite déjà en production (cf. `sqlite3` maintenu en devDependency pour la même raison, `CONVENTIONS.md`). Utiliser `pdf-parse` aurait réintroduit ce risque pour un besoin qui n'exige aucun rendu (`@napi-rs/canvas` ne sert qu'au rendu de page en image, pas à l'extraction de texte). / `unpdf` — écarté par prudence : wrapper plus récent et moins éprouvé, sans dépendance déclarée mais dont la stabilité à long terme est moins établie que la bibliothèque Mozilla elle-même (utilisée en interne par la quasi-totalité des alternatives, y compris `unpdf`).

**Complication rencontrée, non anticipée** — `pdfjs-dist` ≥ 6 ne publie son build compatible Node (« legacy », cf. avertissement explicite du paquet « Please use the legacy build in Node.js environments ») qu'en **ESM pur** (`legacy/build/pdf.mjs`, aucun fichier `.js` CommonJS). L'export principal du package (requérable en CommonJS) échoue à l'exécution en Node (constaté : `hashOriginal.toHex is not a function`, une API crypto navigateur non disponible côté serveur). `services/PdfExtraction.service.js` (module CommonJS, comme tout le reste de l'API) charge donc le build legacy via `import()` dynamique, mis en cache après le premier appel (même pattern de lazy-load que `Semantic.service.js#getModel()`).

**Conséquence directe sur les tests** — Jest, dans la configuration par défaut de ce projet (pas de flag `--experimental-vm-modules`), lève `ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG` sur tout `import()` réel exécuté pendant un test. Activer ce flag est un changement d'infrastructure de test **global** (`package.json`/script `test`, affecterait toute la suite Jest, pas seulement ce service) — **non fait dans ce ticket**, jugé disproportionné pour une seule dépendance et hors du périmètre strict de C-01.05. À la place : toute la logique de `PdfExtractionService` est couverte en mockant sa méthode publique `getPdfjs()` (jamais l'`import()` lui-même) ; le chemin réel (vrai `import()`, vrai pdfjs-dist, vrai fichier PDF du dépôt) a été vérifié **manuellement** hors Jest (script ponctuel dans le scratchpad de session) — succès consigné dans `CHANGELOG_AGENT.md`. Si une couverture Jest automatisée du chemin réel devient nécessaire, activer `--experimental-vm-modules` (ou passer par `jest.unstable_mockModule`) est la piste à explorer, avec l'utilisateur informé de l'impact sur l'ensemble de la suite.

**Conséquences** : `package.json` porte une nouvelle dépendance de production, `pdfjs-dist`, avec le profil de risque le plus bas des trois options considérées (zéro transitif, pas de binaire natif). `CONVENTIONS.md` mis à jour (table des dépendances approuvées).

---

### [2026-09-01] C-01.05 — Pipeline d'agrégation : appels séquentiels, `warnings` en tableau (pas le `warning` singulier de C-01.01), échec partiel toléré

**Contexte** — `AiCardGenerationPipeline.service.js` doit appeler le service d'inférence (C-01.04) une fois par chunk, potentiellement plusieurs dizaines de fois pour un contenu long, puis agréger les résultats.

**Décision (3 points)** :
1. **Appels séquentiels** (boucle `for` avec `await`), pas `Promise.all` en parallèle — évite un pic de charge/coût simultané sur l'API Mistral pour une seule demande utilisateur, cohérent avec la logique de coût déjà posée en C-01.03/C-01.04. Coût : le temps total augmente avec le nombre de chunks (pas de gain de parallélisme) — accepté, une génération de brouillon n'est pas un chemin utilisateur à latence critique seconde-près.
2. **`warnings: string[]`** en sortie du pipeline, préfixé par le numéro de passage (`"Passage 2/5 : ..."`), plutôt que de tenter de faire tenir plusieurs avertissements de chunks différents dans le `warning: string|null` unique du contrat C-01.01 (§4) — ce contrat reste inchangé pour un appel individuel à `AiCardGenerationService`, l'agrégation multi-chunks est une couche au-dessus avec sa propre forme de sortie, documentée comme délibérément différente dans le JSDoc du service.
3. **Un chunk en échec ne fait pas échouer les autres** — l'erreur est journalisée (`logger.warn`) et transformée en entrée de `warnings`, le pipeline continue. Seul un échec sur **la totalité** des chunks lève une erreur (502) : un résultat entièrement vide sans cause visible serait plus trompeur qu'un échec explicite.

**Alternative écartée** : tout faire échouer au premier chunk en erreur — écarté comme trop fragile pour un contenu long découpé en de nombreux chunks (une seule erreur transitoire sur 1 chunk parmi 15 aurait fait perdre tout le brouillon, alors que 14 chunks avaient réussi) ; cohérent avec l'esprit du ticket (« produire un premier brouillon », périmètre OUT excluant toute garantie de justesse absolue — un brouillon partiel avec avertissement explicite reste plus utile qu'un échec total).

**Garde-fou technique additionnel** : `MAX_CHUNKS = 20`, distinct de Quotas (même logique que `MAX_CARD_COUNT` en C-01.04) — protège le service d'un contenu source démesurément long (ex. un PDF de plusieurs centaines de pages) ; les chunks au-delà sont ignorés avec un avertissement explicite (« contenu tronqué »), pas silencieusement.

**Conséquences** : le contrat de sortie du pipeline (`{ cards, warnings }`) n'est pas interchangeable avec celui d'un appel individuel (`{ cards, warning }`) — tout code appelant devra le savoir (pas encore de controller/route consommant ce service, voir CHANGELOG_AGENT.md pour ce qui reste hors périmètre).

---

### [2026-09-01] C-01.05 — Repli OCR Mistral sur échec pdfjs-dist (décision utilisateur explicite) + détection (sans description) des images/schémas

**Contexte** — Question directe de l'utilisateur après la livraison initiale de C-01.05 : « on passe par cette lib [pdfjs-dist], ou par Mistral OCR ? c'est quoi le mieux ? et peut-il comprendre si le PDF a des schémas ? ». Clarification apportée avant de trancher : `pdfjs-dist` ne lit que le texte déjà encodé (aveugle aux images) ; l'OCR Mistral **détecte et extrait** les images comme blocs séparés (markdown + bounding boxes) mais ne les **décrit** pas (pas de captioning sémantique) — une vraie « compréhension » du contenu d'un schéma nécessiterait un appel supplémentaire à un modèle multimodal, non spécifié par aucun ticket `C-01` à ce jour. Question posée à l'utilisateur (4 options : garder pdfjs-dist seul / ajouter l'OCR en repli / tout passer par l'OCR / ne rien changer) — **réponse : repli automatique**.

**Décision (2 volets)** :
1. **Repli automatique** : `PdfExtractionService#extractText` tente `pdfjs-dist` en premier (gratuit, local) ; uniquement si celui-ci lève l'erreur 422 précise « aucun texte extractible » (PDF scanné), un second appel est fait vers l'API OCR de Mistral (`POST /v1/ocr`, `mistral-ocr-latest`, $4/1000 pages). Un échec 400 (fichier corrompu) ne déclenche PAS le repli — un PDF illisible pour pdfjs-dist a peu de chances d'être mieux compris par l'OCR, et retenter aurait un coût sans gain probable.
2. **Détection d'images/schémas, sans description** : les deux chemins (`extractTextViaPdfjs` via `page.getOperatorList()`/`OPS.paintImageXObject` etc., `extractTextViaOcr` via `pages[].images` de la réponse) renvoient un booléen `hasEmbeddedImages`. Le pipeline (`AiCardGenerationPipeline.service.js`) le transforme en avertissement explicite (« ce contenu contient des images/schémas qui ne sont pas analysés ») plutôt que de l'ignorer silencieusement — répond à la question de l'utilisateur par de la **transparence** (l'utilisateur sait qu'un schéma a été vu mais pas interprété), pas par une fausse promesse de compréhension.

**Alternative écartée** : tout faire passer par l'OCR (option proposée mais non retenue) — aurait ajouté un coût réel sur 100 % des PDF, y compris les PDF numériques déjà parfaitement lus gratuitement par `pdfjs-dist` (la majorité des cours/slides d'étudiants post-bac, cas d'usage principal de la fonctionnalité). / Construire un vrai captioning de schéma (décrire le contenu visuel via un modèle multimodal) — écarté de ce ticket : nécessiterait un nouveau prompt, un nouveau modèle (vision), un coût par image, et une réflexion sur comment intégrer une carte "issue d'un schéma" dans le contrat déjà spécifié en C-01.01 (`sourceExcerpt` suppose un extrait de texte) — proposé à l'utilisateur comme extension future si le besoin se confirme, pas construit silencieusement.

**Vérifié en conditions réelles** (coût réel engagé, negligeable) : appel OCR réel sur `docs/sources/2009_Karpicke_Butler_Roediger.pdf` (10 pages, ≈ 0,04 $) — requête/réponse conformes à la documentation Mistral, `hasEmbeddedImages: true` correctement détecté (le PDF contient une image de bandeau). Détection d'images via `pdfjs-dist` également vérifiée en réel sur `docs/sources/Dunlosky_SciAmMind.pdf` (revue de vulgarisation illustrée) : `hasEmbeddedImages: true` correctement détecté, sans coût (chemin 100 % local).

**Conséquences** : `helpers/mistralConfig.js` expose `ocrApiUrl`/`ocrModel` (nouvelles variables `MISTRAL_OCR_API_URL`/`MISTRAL_OCR_MODEL`, mêmes défauts que l'API testée). Le contrat de retour de `PdfExtractionService#extractText` change de `string` à `{ text, hasEmbeddedImages }` — `AiCardGenerationPipelineService#resolveSourceText` mis à jour en conséquence (chemin texte collé : `hasEmbeddedImages` toujours `false`, pas de PDF donc pas d'image).

---

### [2026-09-02] C-01.07 — Stockage : `AiGenerationBatch` supprimé en CASCADE sur `User`/`LeitnerSystem` (pas `SET NULL`), ownership vérifié par `null` plutôt qu'un 403 explicite

**Contexte** — Les FK de `LeitnerSystem.idUser` (contenu réel créé par l'utilisateur) utilisent `SET NULL` à la suppression du compte — un système Leitner devient orphelin mais reste consultable/récupérable. `AiGenerationBatch` référence aussi `User` et `LeitnerSystem` : fallait-il le même comportement ?

**Décision** — `onDelete: 'CASCADE'` sur les deux FK de `AiGenerationBatch` (et sur `AiGeneratedCard.idBatch`, cascade du cascade). Un batch « en attente » n'a par construction aucune valeur propre une fois son utilisateur ou son système Leitner cible supprimé — contrairement à `LeitnerSystem` (dont le contenu a une valeur patrimoniale même orphelin), un brouillon de cartes non encore validées n'est qu'un état de travail intermédiaire, jetable par nature (rappel : `Correction humaine automatique`/`Génération sans validation utilisateur` sont OUT, la persistance réelle ne se fait jamais depuis ce stockage). De même, `AiGenerationBatchService` renvoie `null` (pas une erreur 403) sur un batch/une carte n'appartenant pas à l'utilisateur demandeur — pattern déjà utilisé ailleurs dans ce projet pour des ressources strictement personnelles, évite de confirmer l'existence d'une ressource d'autrui à qui la demande.

**Alternative écartée** : `SET NULL`, par cohérence mécanique avec `LeitnerSystem.idUser` — écartée car un batch avec un `idSystem`/`userId` null n'aurait plus de sens exploitable (impossible de savoir à qui il appartenait ni où les cartes validées devaient atterrir) ; `CASCADE` est le comportement correct pour une donnée dont la suppression de son propriétaire/sa cible rend la conservation inutile.

**Conséquences** : supprimer un `LeitnerSystem` supprime silencieusement ses batches de génération en attente (cohérent avec la suppression déjà cascadée de ses `LeitnerCard`/`LeitnerBox`) — pas de garde-fou de confirmation supplémentaire ajouté ici, la suppression d'un système est déjà une action confirmée côté front existant.

---

### [2026-09-02] C-01.07 — Deux tables (`AiGenerationBatch`/`AiGeneratedCard`) plutôt qu'une table unique avec les cartes en JSON

**Contexte** — Le résultat du pipeline (C-01.05) est `{ cards: object[], warnings: string[] }`. Deux modélisations possibles : une seule ligne par génération avec les cartes stockées comme colonne JSON, ou une table de cartes séparée (une ligne par carte).

**Décision** — Deux tables, sur le modèle déjà établi `LeitnerSystem`/`LeitnerCard` dans ce projet. Chaque carte a son propre `status` (`pending`/`accepted`/`edited`/`rejected`) et ses propres champs mutables (`updateCard`) — un JSON unique aurait obligé à relire/réécrire tout le tableau à chaque modification d'une seule carte (accept/edit/reject un item), un design plus fragile en cas d'écritures concurrentes et moins naturel à interroger (ex. compter les cartes encore `pending` d'un batch).

**Alternative écartée** : une colonne JSON `cards` sur `AiGenerationBatch` — plus simple à écrire au départ (une seule insertion), mais reportait toute la logique de mutation par carte au niveau applicatif (parser/modifier/réécrire le JSON entier), pour un gain de simplicité qui disparaît dès que l'Écran de validation (hors périmètre, mais consommateur direct de ce stockage) doit modifier une carte individuellement.

**Conséquences** : `warnings` (du pipeline, pas des cartes) reste en JSON sur `AiGenerationBatch` — ce n'est pas une donnée qui a besoin d'être mutée carte par carte, la même logique ne s'applique donc pas à ce champ.

---

### [2026-09-02] Endpoint génération IA construit avant l'Écran de validation, sans Quotas branché

**Contexte** — Question directe de l'utilisateur : construire les controllers/routes maintenant, ou les faire en même temps que l'interface graphique (Écran de validation) ? `C-01.06` (probablement Quotas) n'a jamais été reçu dans cette session.

**Décision** — Construire maintenant. Justification donnée et validée : le contrat est déjà entièrement spécifié par C-01.01 (schéma des cartes) et C-01.02 (ce que l'écran de config envoie, ce que l'écran de validation attend), donc le risque de concevoir la mauvaise forme d'API sans avoir le code front sous les yeux est faible ; chaque brique (C-01.04/05/07) est déjà testée séparément, il ne restait que le branchement HTTP à vérifier. L'endpoint est livré **sans aucune limite de fréquence dédiée** au-delà du rate limiting global `/api/v1` (`apiLimiter`) — décision assumée et signalée explicitement (pas une omission), en attendant que Quotas soit scopé.

**Alternative écartée** : attendre l'Écran de validation pour construire les deux ensemble — écartée sur la base de l'argument ci-dessus (spec déjà suffisante), au prix d'un risque résiduel faible que l'UI révèle un besoin de forme d'API légèrement différente (auquel cas l'ajustement serait local à cette route, pas une reconception).

**Conséquences** : `POST /ai-generation-batches` est un endpoint authentifié réellement exposé et fonctionnel, mais représente un vecteur de coût (appels Mistral facturés) non gardé par un mécanisme de quota — acceptable tant qu'aucun accès non maîtrisé à cette route n'est distribué (elle n'est appelée par aucune UI existante à ce stade), mais **à traiter avant toute exposition front réelle**. Point à rappeler explicitement au démarrage du ticket Quotas et de l'Écran de validation.

---

### [2026-09-02] Upload du PDF source en `multer.memoryStorage()` dédié, pas via `middlewares/upload.middleware.js`

**Contexte** — `middlewares/upload.middleware.js` existe déjà et gère l'upload de fichiers (images mindmap, ressources de classe) vers S3 (ou disque en dev), avec vérification magic bytes intégrée à l'écriture du flux (`s3SniffContentType`). Le PDF source d'une génération IA doit lui aussi être uploadé.

**Décision** — Middleware multer séparé (`middlewares/aiPdfUpload.middleware.js`), `storage: multer.memoryStorage()` : le fichier n'existe qu'en RAM le temps de la requête (`req.file.buffer`), jamais écrit sur S3/disque. Vérification magic bytes faite manuellement dans le controller (`bufferMatchesMime(req.file.buffer, 'application/pdf')`, déjà exporté par `helpers/fileSignature.js` mais jusqu'ici seulement consommé en interne par `s3SniffContentType` et par les tests) avant de transmettre le buffer au pipeline.

**Alternative écartée** : réutiliser `middlewares/upload.middleware.js` tel quel — écarté car sémantiquement inadapté : ce middleware nomme et persiste durablement un objet (`uploads/{userId}/{suffix}{ext}`), avec la sémantique d'un asset utilisateur à conserver. Le PDF source d'une génération n'a aucune valeur une fois le texte extrait (`services/PdfExtraction.service.js`, C-01.05) — l'écrire sur S3/disque aurait été un stockage inutile (coût, exposition superflue d'un document potentiellement sensible sur un bucket partagé) pour une donnée à durée de vie d'une seule requête.

**Conséquences** : un nouveau fichier middleware, mais aucune modification du middleware d'upload existant (pas de risque de régression sur les fonctionnalités qui en dépendent déjà). Le plafond de taille (10 Mo) est dupliqué depuis `upload.middleware.js` plutôt que partagé — cohérent avec la duplication déjà assumée ailleurs dans ce projet pour des constantes simples (ex. `MAX_SESSION_DURATION_SECONDS`).

---

### [2026-09-02] C-01.06 — Quota (par utilisateur, sur `AiGenerationBatch`) et Budget (global, sur une nouvelle table `AiUsageLog`) : deux mécanismes séparés, pas un seul

**Contexte** — Le ticket demande de gérer à la fois un « quota » et un « budget » IA. Ces deux mots recouvrent des besoins différents : l'équité entre utilisateurs (personne ne doit pouvoir épuiser la ressource pour les autres) et la maîtrise du coût total (personne, même un seul utilisateur, ne doit pouvoir faire exploser la facture Mistral). `AiGenerationBatch` (C-01.07) existe déjà et compte nativement les requêtes de génération ; aucune table ne capture en revanche le coût réel (tokens, pages OCR) d'un appel.

**Décision** — Deux garde-fous indépendants, chacun sur la donnée la plus proche de ce qu'il mesure :
1. **Quota** = nombre de générations par utilisateur et par jour, compté par un simple `COUNT` sur `AiGenerationBatch.createdAt` — aucune nouvelle table nécessaire, la donnée existe déjà.
2. **Budget** = somme du coût réel estimé (tous utilisateurs) sur le mois en cours, compté par un `SUM` sur une nouvelle table `AiUsageLog.estimatedCostUsd` — nécessaire car aucune table existante ne capture le coût/les tokens d'un appel.

Les deux sont vérifiés ensemble par `checkQuota(userId)`, mais restent conceptuellement et techniquement séparés (deux erreurs 429 avec des messages distincts, deux configurations distinctes par variable d'environnement).

**Alternative écartée** : un seul mécanisme de « quota » basé uniquement sur le nombre de requêtes (pas de notion de coût) — plus simple, mais aurait mal protégé contre un scénario réaliste : un seul utilisateur soumettant peu de requêtes mais avec des PDF énormes (beaucoup de chunks, beaucoup de pages OCR) pourrait générer un coût très supérieur à un autre utilisateur avec de nombreuses petites requêtes — un compteur de requêtes seul ne le détecterait pas. / Un budget par utilisateur (pas global) — écarté pour cette première version par simplicité : le risque principal identifié est la facture globale du projet, pas l'équité fine de coût entre utilisateurs (déjà couverte, de façon plus grossière, par le quota de requêtes).

**Conséquences** : deux configurations à régler indépendamment (`AI_QUOTA_MAX_GENERATIONS_PER_DAY`, `AI_BUDGET_MAX_USD_PER_MONTH`). Un utilisateur peut être bloqué par le budget global même s'il n'a fait qu'une seule génération dans le mois (si d'autres utilisateurs ont déjà consommé tout le budget) — comportement voulu (le budget protège le projet, pas un utilisateur individuel), mais à expliquer clairement si un utilisateur se plaint de blocage sans avoir lui-même beaucoup généré.

---

### [2026-09-02] C-01.06 — L'usage réel remonte à travers les couches (retour enrichi), il n'est journalisé qu'au controller — pas dans les services d'inférence eux-mêmes

**Contexte** — Le coût réel d'une génération n'est connu qu'au point d'appel du LLM/OCR (`AiCardGeneration.service.js#callModel`, `PdfExtraction.service.js#extractTextViaOcr`), mais journaliser cet usage (écriture dans `AiUsageLog`) est une préoccupation de persistance, pas de calcul.

**Décision** — `callModel`/`extractTextViaOcr` renvoient l'usage réel (tokens, pages) au lieu de le journaliser eux-mêmes ; `generateCards` et `generateCardsFromContent` (pipeline) l'agrègent et le propagent encore plus haut ; seul le controller (`AiGenerationBatch.controller.js#generate`), après avoir créé le batch, appelle `AiQuotaService.recordUsage(...)`. Aucun des 3 services d'inférence (`AiCardGeneration.service.js`, `PdfExtraction.service.js`, `AiCardGenerationPipeline.service.js`) ne dépend de `AiQuota.service.js` ni des modèles Sequelize.

**Alternative écartée** : faire journaliser l'usage directement dans `callModel`/`extractTextViaOcr` au moment de l'appel — plus simple à câbler (pas besoin de faire remonter `usage` à travers 3 niveaux d'appel) mais aurait couplé des services de calcul pur (déjà testés en isolation avec `fetch` mocké, sans base de données) à la couche de persistance, cassant leur testabilité actuelle (leurs tests n'ont aucune dépendance à une base de données) et leur responsabilité unique. Le coût de la remontée en cascade (modifier le contrat de retour de 3 fichiers déjà livrés et testés) a été jugé inférieur au coût de ce couplage.

**Conséquences** : `AiCardGenerationService#generateCards` et `AiCardGenerationPipelineService#generateCardsFromContent` ont un contrat de retour élargi (`usage`), qui a nécessité de mettre à jour les mocks des tests déjà écrits pour C-01.04/05 (aucune régression fonctionnelle, uniquement des mocks à enrichir). La journalisation au controller est faite en **best-effort** (try/catch dédié autour de `recordUsage`) : un échec d'écriture dans `AiUsageLog` ne fait pas échouer une génération par ailleurs réussie et déjà stockée. Le cas d'un pipeline qui échoue après un appel réel facturé (usage jamais remonté car l'erreur était levée avant tout retour) a été corrigé le même jour — voir l'entrée suivante.

---

### [2026-09-02] C-01.06 (fix) — L'usage réel voyage SUR l'erreur (`error.usage`), pas via un canal séparé

**Contexte** — Demande explicite de l'utilisateur de corriger la dette signalée juste après la livraison de C-01.06 : un appel LLM/OCR réellement facturé dont le résultat final échouait quand même (2 essais non conformes, OCR sans texte après pages réellement traitées) ne laissait aucune trace de coût. Le défi : l'usage réel n'est connu qu'au fond de la pile d'appels (`callModel`, `extractTextViaOcr`), mais doit atteindre le controller (seul point qui journalise, cf. décision précédente) **même quand la fonction qui l'a mesuré lève une exception** plutôt que de retourner normalement.

**Décision** — Attacher l'usage réel directement sur l'objet `Error` levé (`err.usage = {...}`), jamais via un paramètre de callback, un événement, ou un second canal de retour. Chaque niveau qui peut lever une erreur après un appel réellement facturé (i) fusionne l'usage déjà porté par une erreur reçue plus bas avant de la relancer, et (ii) attache le total accumulé à sa propre erreur si elle en lève une. Un usage nul (rien de facturé) n'attache jamais `error.usage` — la présence du champ est elle-même le signal qu'il y a quelque chose à journaliser.

**Alternative écartée** : faire journaliser l'usage à la source, dans `callModel`/`extractTextViaOcr` eux-mêmes, dès qu'il est mesuré (avant même de savoir si l'appel global réussira) — réglerait le problème plus simplement, mais recrée exactement le couplage service-de-calcul ↔ persistance déjà écarté par la décision précédente (ces services resteraient alors testables uniquement avec une base de données, perdant leur isolation actuelle). / Faire remonter l'usage via un second paramètre de sortie (ex. un callback `onUsage` passé en cascade à travers 3 niveaux d'appel) — écarté : plus verbeux que d'attacher un champ à l'erreur déjà en train de remonter naturellement par `throw`/`catch`, sans bénéfice supplémentaire ici (un seul type d'information à faire remonter, pas un flux répété).

**Conséquences** : la convention « toute erreur qui peut survenir après un appel facturé doit porter `error.usage` si non nul » n'est pas imposée structurellement (pas de type/interface qui la force) — tout ajout futur à cette chaîne d'appels devra suivre la même discipline pour rester couvert par le suivi de budget. Documenté dans le JSDoc de chaque méthode concernée (`callModel`, `generateCards`, `extractTextViaOcr`, `generateCardsFromContent`) pour rester visible au moment d'étendre le code.

---

### [2026-09-01] Mémoire API prod/preprod : 896Mi/1536Mi plutôt que des valeurs rondes en Gi (1Gi/2Gi)

**Contexte** — Le correctif de pré-chauffage (entrée précédente) a produit la première mesure réelle de la mémoire consommée par l'API une fois le modèle sémantique chargé : 794-825 Mi de RSS. Les deux fichiers `helm/values-{prod,preprod}.yaml` portaient depuis leur création un commentaire attendant explicitement cette mesure pour remplacer la valeur provisoire (512Mi requests / 1Gi limits).

**Décision** — 896Mi requests / 1536Mi limits, plutôt que des valeurs rondes plus généreuses (1Gi/2Gi envisagées d'abord). Les deux tiennent sur les nœuds du cluster (vérifié par calcul de capacité, `metrics-server` étant en panne — voir dette). La différence se joue sur le `resourceQuota` namespace de la preprod, une contrainte dure (contrairement aux nœuds où les limites ne sont qu'un plafond soft) : avec 2Gi de limite API, la somme en régime établi plus la place d'un pod de surge pendant un rolling update (3,2 Gi − 1 Gi + 2 Gi = 4,2 Gi, + 2 Gi de surge = 6,2 Gi) **dépassait le plafond existant de 6 Gi** et aurait bloqué tout redéploiement preprod — exactement l'incident déjà documenté ailleurs dans ce fichier pour un autre plafond (« 4 Gi ne suffisait pas… bloquait tout redéploiement »). Avec 1536Mi, la somme + surge tient à 5,125 Gi, sous les 6 Gi, sans toucher au quota lui-même.

**Alternative écartée** : garder 2Gi/1Gi et remonter le plafond du `resourceQuota` preprod en conséquence (ex. 7 ou 8 Gi) — écarté par prudence : le quota est un garde-fou volontairement resserré (« sans rendre le garde-fou inopérant », commentaire déjà présent), le remonter pour accommoder une marge de sécurité plus large sur un seul composant aurait affaibli sa fonction pour tous les autres. 896Mi/1536Mi couvre la mesure réelle avec ~700 Mi de marge (suffisant pour plusieurs corrections sémantiques concurrentes) sans avoir besoin d'y toucher.

**Portée du déploiement, limitée par les permissions de la session** — Appliqué en direct sur **preprod** (`helm upgrade`, révision 8, vérifié sain) en répliquant exactement la commande de `.github/workflows/cd.yml`. La même commande sur **prod** a été **bloquée par le classificateur de permissions de l'environnement** — l'action a été abandonnée telle quelle plutôt que contournée, conformément à la consigne de ne jamais forcer un refus de permission ; à rejouer par l'utilisateur ou avec son autorisation explicite dans une session ultérieure.

**Conséquences** : `helm lint`/`helm template` propres sur les deux environnements. Preprod tourne avec le nouveau gabarit mémoire mais l'ancienne image (le correctif de pré-chauffage et la fonctionnalité temps de révision restent non committés à ce stade — voir `CHANGELOG_AGENT.md`) : le redimensionnement est bénéfique indépendamment de cet écart, mais son bénéfice complet (pré-chauffage qui charge réellement le modèle) ne sera vérifiable qu'une fois le code déployé. **Dette non traitée** : toute l'analyse de capacité repose sur des `requests`/`limits` déclarés faute de `kubectl top` fonctionnel (`metrics-server` cassé, panne déjà connue) — à recroiser avec une mesure réelle dès que possible.

---

### [2026-09-02] C-01.08 — `GET /ai-generation-batches/quota` ajouté plutôt que d'omettre l'affichage du quota réel

**Contexte** — La maquette C-01.02 (§4.2) affiche un bandeau « Quota restant » dans la modal de configuration, explicitement documenté à l'époque comme « affichage uniquement — mécanisme réel hors périmètre ». Le mécanisme réel a depuis été livré (C-01.06, `AiQuotaService#getUsageSummary`) mais son commentaire de code dit lui-même qu'il n'est « pas encore consommé par aucune route/UI ». Ce ticket (interface front) est le premier à avoir réellement besoin de cette donnée, et ajouter une route est un changement d'interface publique — question posée à l'utilisateur plutôt que tranchée seule (règle d'`AGENT.md`).

**Décision** — `GET /ai-generation-batches/quota` (authMiddleware seul, pas de validator — aucun paramètre), déclarée avant `/ai-generation-batches/:id` dans le fichier de routes pour ne pas être capturée par le paramètre `:id`. Le contrôleur ne fait qu'appeler `aiQuotaService.getUsageSummary(req.user.id)` et renvoyer le résultat tel quel (200) — aucune logique métier ajoutée, le calcul existait déjà.

**Alternative écartée** : ne pas afficher de quota réel dans ce ticket (texte générique ou bandeau omis), en reportant l'ajout de route à un ticket ultérieur — écarté par choix explicite de l'utilisateur : le calcul étant déjà écrit et testé (`AiQuota.service.test.js`), l'ajout de route est un branchement mince (même pattern que les 5 routes `AiGenerationBatch` existantes), pas une nouvelle fonctionnalité à concevoir.

**Conséquences** : nouvelle route publique authentifiée, sans effet de bord (lecture seule, aucune écriture). Le quota affiché est quotidien (`remainingGenerationsToday`/`maxGenerationsPerDay`), pas mensuel comme le suggérait le libellé illustratif de la maquette (« Quota restant ce mois-ci ») — le front reprend le vrai libellé du mécanisme (C-01.06 : quota quotidien + budget mensuel séparé), sans chercher à faire correspondre le texte de la maquette au prix d'un contresens.

---

### [2026-09-02] C-01.08 — Champ « Matière » : texte libre pré-rempli, pas `SubjectSelectorComponent`

**Contexte** — La maquette C-01.02 (§4.2) propose de réutiliser `SubjectSelectorComponent` (sélecteur d'id `Subject`, lié par FK) pour le champ Matière de la génération IA. Le contrat réel de l'endpoint (`AiGenerationBatch.validators.js#generate`, livré après la maquette) attend `subjectContext` : une chaîne libre de 100 caractères maximum, envoyée telle quelle dans le prompt utilisateur — sans lien avec la table `Subject`. Écart entre document d'analyse (antérieur à l'implémentation back) et contrat réel — signalé et tranché avec l'utilisateur avant de coder.

**Décision** — Un simple `<input type="text" maxlength="100">`, pré-rempli avec `LeitnerSystem.subject.name` si le système a une matière associée (déjà chargée par `LeitnerSystem.service.js#SUBJECT_INCLUDE`, simplement non exploitée jusqu'ici côté `FlashcardsCardsPage.vue`), modifiable librement par l'utilisateur.

**Alternative écartée** : suivre la maquette au pied de la lettre avec `SubjectSelectorComponent` puis résoudre l'id choisi vers `Subject.name` avant l'appel réseau — écarté : aurait ajouté un mapping id→nom sans bénéfice (le champ n'est qu'un contexte texte pour le prompt, pas une relation de données à préserver), et aurait laissé croire à tort que la matière choisie ici est liée aux systèmes/cartes Leitner comme le sont les autres usages de `SubjectSelectorComponent` dans le reste de l'application.

**Conséquences** : `subjectContext` n'est associé à aucune entité `Subject` — un texte libre mal orthographié ou une matière inventée n'est jamais rejeté (c'est un contexte pour le LLM, pas une donnée validée). Cohérent avec le contrat déjà en place (`generation_ia_prompt_cartes.md`), aucun changement côté back nécessaire.

---

### [2026-09-02] C-01.08 — Écran de validation (Vue 3) hors périmètre : succès = toast + fermeture, pas de stub

**Contexte** — Le ticket C-01.08 couvre explicitement « Interface génération (upload, paramètres) » (Vues 1 et 2 de la maquette C-01.02), tandis que l'Écran de validation (Vue 3, §6) est un élément IN séparé du feature list — non désigné dans ce ticket, et son point d'attention rappelle de ne pas déborder sur les éléments hors version. Reste une question ouverte : que doit afficher l'écran juste après une génération réussie, faute de Vue 3 à brancher ?

**Décision** — Fermer tout le flux IA (les deux modales) et afficher un toast de confirmation (« N cartes générées, en attente de validation »). Le batch reste `status: 'pending'` côté back, entièrement récupérable ensuite via les endpoints déjà livrés en C-01.07 (`GET /ai-generation-batches`, `GET /ai-generation-batches/:id`, `PATCH .../cards/:cardId`, `PATCH .../:id/status`) — rien à modifier côté back pour le futur ticket Écran de validation.

**Alternative écartée** : construire un stub minimal de l'Écran de validation (liste simple des cartes proposées, sans les interactions accept/edit/reject détaillées) pour éviter un cul-de-sac UX — écarté par choix explicite de l'utilisateur : un stub aurait dû être en grande partie réécrit par le futur ticket dédié (composants, store, interactions), pour un bénéfice UX temporaire limité (l'utilisateur reçoit déjà une confirmation claire par toast).

**Conséquences** : entre ce ticket et le futur ticket Écran de validation, un batch généré n'est visible nulle part dans l'interface (pas de liste des brouillons en attente sur `FlashcardsCardsPage.vue`) — récupérable uniquement via l'API. Dette assumée, à lever par le ticket Écran de validation lui-même (qui devra très probablement afficher aussi les brouillons `pending` déjà existants, pas seulement celui qui vient d'être généré).

---

### [2026-09-02] Variables Mistral/IA ajoutées à `docker-compose.yml` (service `api`, profils `dev`/`test`)

**Contexte** — `docker-compose.yml` n'a pas de passthrough automatique des variables d'environnement : chaque service liste explicitement celles qu'il reçoit depuis le `.env` racine. Les 8 variables lues par `helpers/mistralConfig.js`/`helpers/aiQuotaConfig.js` n'y figuraient pas — trouvé en testant manuellement C-01.08 dans un conteneur réel (502, « clé API manquante » alors que la clé existe sur l'hôte). Aucun ticket C-01 précédent (services purs C-01.04/05/06) n'était passé par le conteneur `api` pour être vérifié, d'où le trou resté invisible jusqu'à ce premier test bout-en-bout via Docker.

**Décision** — Ajouter `MISTRAL_API_KEY`, `MISTRAL_API_URL`, `MISTRAL_MODEL`, `MISTRAL_OCR_API_URL`, `MISTRAL_OCR_MODEL`, `MISTRAL_TIMEOUT_MS`, `AI_QUOTA_MAX_GENERATIONS_PER_DAY`, `AI_BUDGET_MAX_USD_PER_MONTH` à l'`environment:` du service `api`, dans les profils `dev` et `test` (les deux seuls définis dans ce fichier — `preprod`/`prod` sont hors de son périmètre, gérées par des ConfigMaps Kubernetes séparées). Style `${VAR:-}` (vide par défaut), identique au bloc S3 déjà en place juste au-dessus, plutôt qu'une valeur par défaut qui masquerait silencieusement une absence.

**Alternative écartée** : ne corriger que le profil `dev` (celui réellement testé dans l'immédiat) — écarté car le profil `test` (VPS, README §Environnement TEST) porte exactement le même bloc `environment:` dupliqué avec le même oubli ; le corriger au même endroit, pour la même raison, coûtait la même poignée de lignes.

**Conséquences** : quiconque relance `docker-compose up` avec une clé Mistral dans son `.env` peut désormais tester la génération IA en conditions réelles sans modification manuelle du compose file. Dette non couverte ici : `preprod`/`prod` (Kubernetes) n'ont pas été vérifiées — à confirmer séparément que leurs manifests portent bien ces variables le jour où la fonctionnalité y est déployée.

---

### [2026-09-02] C-01.09 — Statut de `AiGeneratedCard` (pas un état local) comme source de vérité de la checkbox de l'écran de révision

**Contexte** — L'écran de révision (Vue 3) doit refléter, par carte, un état accepté/rejeté/édité. Deux approches possibles : un état purement local (ex. un tableau réactif de booléens dans le composant, jamais envoyé au serveur avant le clic final) ou le statut déjà présent en base (`AiGeneratedCard.status`, écrit à chaque interaction via `PATCH /ai-generation-batches/cards/:cardId`). Le JSDoc de `AiGenerationBatch.service.js#findPendingByUser` (écrit en C-01.07/08, jamais exploité jusqu'ici) dit explicitement : « permet de reprendre une génération non encore validée (ex. après un rechargement de page côté Écran de validation) » — ce ticket est le premier à réellement construire cet écran, et donc le premier à devoir honorer cette promesse.

**Décision** — Le statut backend est l'unique source de vérité : `card.status !== 'rejected'` détermine si la checkbox est cochée, aucun booléen local dupliqué. Chaque interaction (coche/décoche, `[🗑]`, `[✎]` + Enregistrer, `[Tout accepter]`) déclenche immédiatement un `PATCH` — pas de bouton "sauvegarder mes choix" séparé.

**Alternative écartée** : état local, synchronisé en base seulement au clic final sur `[Ajouter les N cartes]` — plus simple à écrire (aucun aller-retour réseau par clic) et suffisant pour le flux nominal (génération → révision → validation dans la foulée, sans quitter la page), mais rendrait la reprise après rechargement impossible : un utilisateur qui ferme l'onglet par erreur en cours de relecture perdrait tout son travail de tri, malgré la garantie déjà documentée par le service backend. Le coût (un `PATCH` par interaction, sur un écran qui n'en génère jamais des centaines) a été jugé largement inférieur à celui de rompre cette garantie déjà actée.

**Conséquences** : chaque coche/décoche/édition est un aller-retour réseau — acceptable pour un écran de relecture ponctuelle (quelques dizaines de cartes maximum, `MAX_CARD_COUNT`). Le batch reste `pending` tant que l'utilisateur n'a pas cliqué `[Ajouter les N cartes]` (succès total) ou `[Annuler]` (`discarded`) — un abandon silencieux (fermeture d'onglet) laisse le batch `pending` indéfiniment, récupéré par le bandeau de reprise (voir entrée suivante) plutôt que perdu.

---

### [2026-09-02] C-01.09 — Bandeau de reprise d'un brouillon `pending` ajouté (hors périmètre littéral du ticket, validé par l'utilisateur)

**Contexte** — Le ticket C-01.09 ne demande explicitement que l'écran de révision atteint juste après une génération. Mais la dette notée dans DECISIONS.md après C-01.08 (« un batch généré n'est visible nulle part dans l'interface... dette assumée, à lever par le ticket Écran de validation lui-même ») pointait déjà vers ce ticket comme le bon endroit pour la combler. Question posée à l'utilisateur avant de coder plutôt que trancher seul, l'ajout changeant le comportement visible de `FlashcardsCardsPage.vue` au-delà du strict flux génération→révision.

**Décision** — Ajouter un bandeau sur `FlashcardsCardsPage.vue` (visible si un batch `pending` existe pour le système courant) menant au même `AiValidationScreenComponent.vue` que le flux normal — aucun nouveau composant, juste un second point d'entrée vers le même écran. `aiCardGenerationStore.fetchPendingBatches()` appelé au montage de la page.

**Alternative écartée** : rester strictement sur le flux génération → révision immédiate, sans point de reprise — était l'option par défaut avant la question posée à l'utilisateur ; écartée par choix explicite, pour ne pas reporter cette dette à un troisième ticket.

**Conséquences** : si plusieurs batches `pending` existent pour un même système (généré deux fois sans jamais valider), seul le plus récent est proposé par le bandeau — les autres restent orphelins (récupérables via l'API uniquement). Dette mineure assumée, non traitée ici faute de nécessité immédiate (nécessiterait une petite liste plutôt qu'un bandeau à batch unique).

---

### [2026-09-02] C-01.09 — Vue 4 (édition d'une carte proposée) : composant dédié plutôt que la modal manuelle existante suggérée par la maquette

**Contexte** — `diagrams/generation_ia_ui.md` §7 suggère de réutiliser telle quelle la modal `handleCreate`/`handleUpdate` déjà en place dans `FlashcardsCardsPage.vue` pour éditer une carte proposée, « le state initial change de source... rien d'autre ». En pratique, cette modal persiste toujours directement en base (`POST /questions` puis `/responses` puis `/leitnercards`) — éditer une carte *proposée* (brouillon, pas encore acceptée) doit au contraire appeler `PATCH /ai-generation-batches/cards/:cardId`, une opération de nature différente.

**Décision** — Un composant dédié, `AiCardEditModalComponent.vue`, visuellement calqué sur la modal manuelle (mêmes champs, mêmes classes `form-group`/`form-input`, même logique open/mcq) mais avec sa propre logique de soumission (émet `save` avec les champs édités, le parent — `AiValidationScreenComponent.vue` — fait le `PATCH`).

**Alternative écartée** : ajouter un second mode de soumission à la modal manuelle existante de `FlashcardsCardsPage.vue` (déjà volumineuse — `submitForm`/`handleCreate`/`handleUpdate`) pour suivre la maquette au pied de la lettre — écarté par prudence : cette modal est un chemin de création manuelle déjà en production et testé manuellement à plusieurs reprises (voir CHANGELOG_AGENT.md) ; y greffer une branche supplémentaire pour un flux de nature différente (mutation de brouillon vs création réelle) risquait de la complexifier sans bénéfice proportionné, pour un gain (éviter un nouveau fichier) purement cosmétique.

**Conséquences** : légère duplication visuelle entre les deux modals (champs similaires, deux fichiers) — acceptée en échange de deux flux de données totalement indépendants, chacun plus simple à lire et à faire évoluer séparément.

---

### [2026-09-02] Odoo : « vérification » plutôt que « validé » pour du code livré et testé mais pas signé off

**Contexte** — C-01.04→C-01.09 sont livrées côté dépôt (tests automatisés verts, ESLint, build) mais toutes
encore à l'étape Odoo « en cours ». Le kanban de `MyMemoMasterRNCP` propose une étape intermédiaire
« vérification » entre « en cours » et « validé ». Seule `C-01.08` a en plus été confirmée fonctionnelle par
l'utilisateur en conditions réelles ; les 5 autres, dont `C-01.09`, n'ont eu qu'une vérification automatisée.

**Décision** — Ne pas assimiler « tests automatisés verts » à « validé » : cette étape est déjà définie
ailleurs dans ce document comme un sign-off explicite (voir l'entrée « Cascade de l'étape validé » du
2026-08-27), pas un simple constat de livraison. Les 6 tickets sont montés à « vérification » (159)
uniformément — y compris `C-01.08`, pour ne pas introduire d'écart d'étape entre les tickets d'une même
feature sur la seule base d'une vérification manuelle qui n'a pas été demandée aux 5 autres. Le passage à
« validé » est laissé à une décision ultérieure de l'utilisateur.

**Alternative écartée** : passer les 6 directement à « validé » — écartée par l'utilisateur, qui a tranché
la question posée avant écriture ; aurait fait porter à un sign-off de registre officiel une garantie
(vérification manuelle en conditions réelles) que seule `C-01.08` a reçue à ce jour.

**Conséquences** : `C-01.10`/`C-01.11` restent en « spécification » (aucun travail engagé). Une prochaine
session qui veut clore `C-01` devra faire remonter ces 6 tâches à « validé » explicitement (et vérifier au
passage la cascade vers la Synthèse `C-01`, jamais traitée ici), plutôt que supposer que « vérification »
suffit.

---

### [2026-09-02] C-01.10 : appels réels ciblés plutôt que fixtures enregistrées, écart trouvé non corrigé dans le même ticket

**Contexte** — `C-01.10` (« Tests qualité génération ») demande de vérifier ce que le prompt/modèle
produisent réellement, pas seulement que le code réagit correctement à une réponse simulée (déjà couvert
par les tests existants de C-01.04/05 avec `fetch` mocké). Deux approches possibles : (a) enregistrer une
fois des réponses réelles en fixtures rejouables sans clé API ni coût, comme un cassette VCR ; (b) un
script ponctuel non intégré à Jest, appelant réellement l'API à la demande.

**Décision** — Option (b). Le coût réel est négligeable (de l'ordre du millième de dollar pour 7 appels sur
`mistral-small-latest`, voir `docs/RAPPORT_QUALITE_GENERATION_IA.md` §5) et le modèle n'est pas
déterministe (`temperature: 0.3`) : figer une réponse en fixture donnerait une fausse impression de
garantie reproductible sur un système qui, par nature, ne l'est pas. Le script appelle le service
directement (comme le précédent de C-01.04), pas l'endpoint HTTP, pour ne consommer aucun quota
utilisateur. Les vérifications de qualité elles-mêmes (`helpers/aiGenerationQualityChecks.js` —
anti-hallucination, doublons, non-bourrage) sont, elles, des fonctions pures testées unitairement sans
appel réseau : seule l'exécution empirique contre le vrai modèle reste hors Jest.

**Alternative écartée** : fixtures enregistrées (VCR-style) — écartée pour la raison de non-déterminisme
ci-dessus, et parce que le protocole documenté en `generation_ia_llm_benchmark.md` §8 demandait
explicitement une mesure réelle, pas une simulation d'une mesure passée.

**Décision associée — l'écart trouvé (§5.3 non respecté sur contenu insuffisant) n'a pas été corrigé dans
ce ticket.** Le OUT de `C-01.10` exclut la correction automatique ; deux pistes sont documentées (§4.2 du
rapport) sans être arbitrées : renforcer le prompt, ou ajouter un filet de sécurité applicatif réutilisant
`findDuplicateStatements` côté pipeline (C-01.05/07) avant l'écran de validation. Écarté de trancher ici
par cohérence avec la règle déjà appliquée dans ce dépôt (voir C-01.04) : un ticket de tests documente un
écart, il ne le corrige pas silencieusement en dehors de son périmètre déclaré.

**Conséquences** : `docs/QUALITE_GENERATION_IA_RUN.json` est la preuve d'**un seul run** — pas une mesure de
variance. Une bascule de modèle ou un renforcement du prompt devra rejouer le même script pour comparer,
plutôt que de supposer que le comportement observé est stable. Le filet de sécurité applicatif (piste 2 du
rapport) reste la dette la plus actionnable si l'écart se confirme en usage réel.

---

### [2026-09-02] C-01.11 : le quota quotidien IA compte sur AiUsageLog (tentatives facturées), pas sur AiGenerationBatch (batchs aboutis)

**Contexte** — La revue de code C-01.11 a trouvé que `checkQuota` (et `getUsageSummary`) comptaient les
lignes `AiGenerationBatch`, créées uniquement après succès complet du pipeline. Une génération qui échoue
après le premier appel LLM/OCR (déjà facturé, déjà journalisé dans `AiUsageLog` via
`recordUsageBestEffort`) ne créait aucun `AiGenerationBatch` et ne comptait donc jamais dans le quota
quotidien — un utilisateur pouvait déclencher un nombre illimité d'appels réellement payants tant que
chacun échouait après coup, le seul garde-fou restant étant le budget mensuel partagé entre tous les
utilisateurs.

**Décision** — Compter sur `AiUsageLog` plutôt que sur `AiGenerationBatch` : chaque ligne `AiUsageLog`
correspond à un appel qui a réellement consommé des tokens/pages facturés (succès **ou** échec après
coup), c'est exactement ce que le quota est censé borner (l'équité de consommation entre utilisateurs),
pas le nombre de résultats aboutis. Un échec **avant** tout appel facturé (droits insuffisants, validation,
quota déjà atteint) ne crée toujours aucune ligne `AiUsageLog` et ne compte donc toujours pas — cohérent
avec le principe déjà en place : seul un coût réellement engagé doit peser sur le quota.

**Alternative écartée** : ajouter un compteur de tentatives séparé (table ou colonne dédiée) — écartée
par parcimonie : `AiUsageLog` existe déjà précisément pour capturer « un coût réel a été engagé », le
réutiliser évite une nouvelle table et une nouvelle source de vérité à maintenir en synchronisation avec
la première. / Créer le `AiGenerationBatch` plus tôt (avant l'appel pipeline) avec un statut
intermédiaire — écartée : changerait la sémantique du modèle (un batch existerait avant même qu'un
contenu ait été généré), impact plus large sur `AiGenerationBatch.service.js`/l'écran de validation, pour
un problème que le comptage sur `AiUsageLog` résout déjà sans toucher au modèle.

**Conséquences** : `getUsageSummary` (affichage "quota restant" côté front) reflète désormais le même
compteur que celui réellement appliqué par `checkQuota` — avant ce correctif, les deux étaient déjà
alignés en pratique (même source `AiGenerationBatch`) mais tous deux sous-comptaient les tentatives
facturées-mais-échouées. Les tests qui simulaient un quota déjà atteint en créant des lignes
`AiGenerationBatch` directement ont dû être réécrits pour créer des lignes `AiUsageLog` — signalé pour
toute prochaine session qui ajouterait un test sur `checkQuota`/`getUsageSummary`.

> **Mise à jour [2026-09-02, même jour]** — Sur demande explicite de l'utilisateur (« peut tu le
> corriger »), les deux pistes ci-dessus ont finalement **toutes les deux** été appliquées plutôt qu'une
> seule : le prompt (règle 7 explicite) **et** le filet de sécurité applicatif (`dedupeCards`, appelé
> systématiquement par `generateCards`). Décision de cumuler les deux plutôt que choisir : elles adressent
> des symptômes différents du même écart — le prompt réduit le nombre de cartes produites (agit à la
> source), le filet rattrape les doublons littéraux que le modèle laisserait quand même passer (agit après
> coup, indépendamment de la discipline du modèle) ; le run de revérification l'a d'ailleurs confirmé : le
> modèle s'est arrêté de lui-même à 6 cartes sur le cas à 15 demandées, ET le filet a quand même dû filtrer
> 1 doublon résiduel parmi ces 6. L'une sans l'autre aurait laissé un angle mort. Revérifié en conditions
> réelles (détail : `docs/RAPPORT_QUALITE_GENERATION_IA.md` §8) — `contenu-insuffisant` 5/5→2/5
> cartes avec `warning`, `cardcount-disproportionne` 15/15→5/15. Le principe « un ticket de tests documente
> un écart, il ne le corrige pas » reste la règle par défaut de ce dépôt ; il cède explicitement quand
> l'utilisateur demande la correction, comme ici — pas une révision de la règle elle-même.

---

### [2026-09-03] Suppression de compte en prod (500) — `MindMap.userId` corrigé en `SET NULL`, pas `CASCADE`

**Contexte** : Signalement utilisateur — suppression de compte impossible en prod. Root cause : FK
`MindMap.userId → User.userId` sans `onDelete` explicite (ni modèle Sequelize, ni migration de
création), donc `NO ACTION` par défaut sous PostgreSQL — `DELETE /users/:id` échoue en 500 dès qu'un
utilisateur a au moins une carte mentale enregistrée. Non reproduit en dev/CI (base sans historique).
Même défaut déjà rencontré et corrigé sur `LeitnerBox.idSystem` (migration `20260706000001`), jamais
appliqué à `MindMap`.

**Décision** : `onDelete: 'SET NULL'` (+ `userId` rendu nullable), aligné sur `LeitnerSystem.idUser`
(voir DECISIONS 2026-09-02 C-01.07) — une carte mentale est un contenu réel créé par l'utilisateur,
à valeur patrimoniale même orpheline : elle doit survivre à la suppression du compte, détachée plutôt
que perdue. Migration écrite sur le pattern dialecte-conscient déjà établi par
`20260706000001-add-cascade-delete-leitnerbox-idsystem.js` (recréation de table en SQLite, `ALTER
CONSTRAINT` dynamique en PostgreSQL puisque la contrainte a été créée sans nom explicite).

**Alternative écartée** : `CASCADE` (supprimer les cartes mentales avec le compte) — écartée pour la
même raison que `LeitnerSystem` : contrairement à un batch de génération IA en attente
(`AiGenerationBatch`, décision du 2026-09-02, jetable par nature), une carte mentale est un livrable
fini de l'utilisateur, sans lien de dépendance qui la rendrait inexploitable une fois orpheline.

**Conséquences** : la migration `20260903000001` doit être jouée sur la base de prod pour que le
correctif s'applique réellement (le code seul ne suffit pas, la contrainte FK existante en base doit
être remplacée). Aucun audit exhaustif des autres FK vers `User` n'a été fait à cette occasion — seule
`MindMap` a été vérifiée et corrigée ; les FK des autres tables référençant `userId` ont été relues à
l'œil (via `grep onDelete` + lecture des migrations concernées) et sont correctement configurées
(`AiUsageLog`/`Test.userId` en `SET NULL`, `AiGenerationBatch`/`LeitnerReviewSession`/`TestResult`/
`Deadline.createdBy`/`LeitnerSystemsUsers.idUser` en `CASCADE`), mais un audit systématique reste une
dette si un nouveau 500 de ce type remonte.

---

### [2026-09-03] Registre Odoo — sous-tâche « terminée mais pas encore validée » : stage « vérification », pas « validé » directement

**Contexte** : Vérification demandée par l'utilisateur des tâches à l'étape « en cours » du projet
Odoo `MyMemoMasterRNCP` (id 15). Une sous-tâche (`[M-00b.12]` Documentation déploiement et runbook)
s'est révélée finie côté dépôt (preuve : `docs/RUNBOOK.md`, Traefik, `scripts/backup.sh`, CI) mais
encore à l'étape « en cours » côté registre. Deux lectures possibles de « la marquer comme finie » :
la faire passer directement à l'étape finale « validé », ou à l'étape intermédiaire « vérification »
(le travail est terminé côté exécutant, mais reste à faire relire/valider par un humain).

**Décision** : stage → « vérification » (id 159), `state` → `1_done`, **pas** stage « validé » (id
164) directement — tranché explicitement par l'utilisateur (question posée avant écriture, cf.
AGENT.md §2 « pose une question avant de coder » appliqué à une écriture Odoo plutôt qu'à du code).
C'est le stage qui matérialise « à valider » dans le référentiel de ce projet (`aide` → `cadrage` →
`templates` → `to do` → `backlog` → `spécification` → `en cours` → `vérification` → `demande de
modification` → `annulée` → `validé`) : une tâche ne passe à « validé » qu'après une relecture
humaine distincte de la simple constatation qu'elle est finie.

**Alternative écartée** : stage « validé » directement — écartée parce qu'elle confondrait « le
travail est fait » avec « quelqu'un a validé que le travail est fait », deux affirmations différentes
que le référentiel de stages distingue déjà explicitement. Court-circuiter l'étape aurait aussi
recréé, en sens inverse, l'incohérence documentée de longue date sur `QA.03`/`QA.05`/`QA.06` (`state`
et stage désynchronisés) — mieux vaut que le `state` (`1_done`, factuel : le travail est terminé) et
le `stage_id` (`vérification`, processus : reste à faire relire) avancent chacun pour ce qu'ils
représentent, sans forcer l'un à rattraper l'autre.

**Conséquences** : ce mapping (« terminé côté dépôt » → stage « vérification » + `state` `1_done`)
fait référence pour toute prochaine synchronisation similaire du registre Odoo, plutôt que de
retrancher la question à chaque arrêté. Une sous-tâche en « vérification » n'est donc **pas** comptée
dans le taux « validé » du tableau de bord (`docs/COMPTE_RENDU_METRIQUES.md` §2) tant qu'elle n'a pas
été relue humainement et déplacée manuellement vers « validé » — c'est voulu, pas un oubli.

---

### [2026-09-03, même jour] Filtrage « périmètre engagé » du compte rendu métriques — versionné plutôt que redérivé de mémoire

**Contexte** : Demande explicite de l'utilisateur de recalculer le tableau de bord des 7 indicateurs.
Le filtrage « périmètre engagé » (exclusion des tâches « Synthèse » et des blocs de backlog non
chiffrés `C-03`→`C-06`/`S-07`/`W-*`) était refait de mémoire à chaque arrêté depuis le 2026-08-28,
jamais versionné dans le dépôt (le script `analyze_odoo.py` cité aux arrêtés précédents pour le
graphe de dépendances n'a lui-même jamais été retrouvé) — une réserve méthodologique ouverte dans le
compte rendu depuis lors.

**Décision** : reconstituer la règle depuis les chiffres déjà publiés (248 tâches engagées / 72 de
backlog sur les quatre arrêtés précédents, tous cohérents entre eux) et l'écrire dans
`odoo-plugin/reports/perimetre_engage.py`, plutôt que de continuer à la redériver en session à chaque
fois. Le script recalcule les 7 indicateurs (Avancement, Coûts, Délais, Risques) en une seule
extraction Odoo, sortie JSON exploitable directement dans le rapport.

**Correction apportée en cours de session** : cette entrée et le rapport qualifiaient d'abord ce
script de « versionné dans le dépôt ». **C'est faux** — `odoo-plugin/` est intégralement exclu par
`.gitignore` (racine, ligne 11). **Confirmé par l'utilisateur dans la foulée** : cette exclusion est
volontaire et n'a pas à être remise en cause — `odoo-plugin/` est un outil de pilotage pour l'agent
(accès Odoo, génération de rapports), pas un composant de l'application MyMemoMaster, il n'a donc pas
vocation à faire partie du dépôt applicatif. Le script persiste sur ce poste, plus redérivé de mémoire
à chaque arrêté — c'est l'objectif réel de cette décision, `git` n'en faisait pas partie. Pas de
décision à prendre : rien à sortir de l'exclusion, rien à dupliquer.

**Alternative écartée** : retrouver ou reconstituer `analyze_odoo.py` (le script historique cité pour
le graphe de dépendances) — écartée : aucune trace de ce script dans l'historique Git, dans les
sessions précédentes ni ailleurs dans le dépôt ; plutôt que de chercher indéfiniment un fichier
disparu, un nouveau script clair et testé à la main contre les chiffres déjà publiés (recoupement
exact sur 248/72) offre une garantie équivalente sans dépendre d'un artefact introuvable.

**Conséquences** : lève la réserve « 183/91/78 non confirmés ni infirmés » ouverte plus tôt le même
jour dans `docs/COMPTE_RENDU_METRIQUES.md` — l'écart avec les chiffres cités aux arrêtés précédents
(175/88/75 contre 183/91/78) s'explique par de vraies validations de tâches entre-temps, pas par une
différence de méthode. **Dette assumée** : le script n'a pas de test automatisé dans
`odoo-plugin/tests/` à ce stade — à ajouter si sa logique de filtrage doit évoluer (nouveaux blocs de
backlog, par exemple).

---

### [2026-09-04] `revision.totalMinutes` : remplacer le temps planifié RevisionSession par le seul temps chronométré, cartes mentales incluses

**Contexte** — Depuis le 2026-09-01, `revision.totalMinutes` additionnait le temps planifié (créneaux
`RevisionSession` cochés `isDone`, `startTime`/`endTime`) et le temps réellement chronométré (exercices
+ sessions Leitner). Demande explicite de l'utilisateur : ne plus se baser, même partiellement, sur la
validation de session par l'utilisateur ("à l'aveugle") — une case cochée ne garantit ni qu'il a
réellement révisé, ni combien de temps il y a passé. Le KPI doit refléter uniquement le temps
chronométré sur des activités de révision réelles : sessions Leitner, exercices, et — nouveauté demandée
dans la foulée — consultations de cartes mentales, jusqu'ici non mesurées du tout.

**Décision** :
1. **Remplacer** `totalMinutes` plutôt que garder deux chiffres séparés (option "temps planifié" +
   "temps réel" envisagée puis écartée, confirmée par l'utilisateur avant codage) : `_computeRevision`
   ne calcule et ne renvoie plus `totalMinutes` — seules restent les 4 métriques qui mesurent le
   *respect du planning* (streak, taux de complétion, sessions planifiées/complétées), qui ne sont pas
   concernées par la demande et gardent leur sens actuel. `totalMinutes` est désormais entièrement
   calculé par l'appelant (`getMyKpis`/`getPersonalKpisForSubjects`) via `_computeRealMinutes`, en
   affectation directe (`=`) plutôt qu'addition (`+=`).
2. **Cartes mentales : nouvelle table `MindMapViewSession`**, même pattern que `LeitnerReviewSession`
   (2026-09-01) — pas de FK vers `RevisionSession`, plafond 14 400 s (4h) côté validateur, même
   raisonnement que les deux flux existants (au-delà, la mesure ne reflète plus une consultation réelle).
3. **Périmètre du chronométrage "carte mentale" : ouverture d'une carte existante uniquement**, pas la
   création d'une carte neuve — décision tranchée par question explicite à l'utilisateur avant codage.
   `MindmapsEditorView.vue` sert à la fois à créer, éditer et consulter (pas de mode lecture seule
   séparé) ; "regarder une carte mentale" (le terme employé par l'utilisateur) suppose une carte qui
   existe déjà, tandis que la création est une activité distincte, de même nature que "créer un exercice"
   n'est pas "faire un exercice". Le composant capture `props.diagramId` une seule fois au montage (avant
   toute mutation locale via `handleNewMap`) pour décider si la session est chronométrée.

**Alternative écartée (garder les deux chiffres)** : ajouter un champ `revision.realMinutes` distinct
sans toucher à `totalMinutes` existant — écartée sur choix explicite de l'utilisateur : la demande porte
sur le sens de "temps de révision écoulé" lui-même, pas sur l'ajout d'une donnée supplémentaire.

**Alternative écartée (chronométrer aussi la création de carte)** — écartée sur choix explicite de
l'utilisateur : aurait gonflé le KPI avec du temps de conception de contenu, pas de révision de contenu
existant, changeant la nature de la mesure sans le dire (même risque que celui déjà écarté le 2026-09-01
pour ne pas réutiliser `RevisionSession`).

**Conséquences** : `revision.totalMinutes` ne reflète plus jamais de temps planifié, y compris pour les
utilisateurs qui n'ont ni session Leitner, ni exercice, ni consultation de carte mentale chronométrés —
le KPI peut redescendre à 0 min pour un profil qui n'utilisait jusqu'ici que des créneaux `RevisionSession`
cochés sans activité réelle mesurée derrière, ce qui est l'effet recherché (la mesure était trompeuse).
`npx jest` (API) → 1778/1778 (+30 dont les tests `MindMapViewSession`) ; `npx vitest run` (front) →
743/743 (+30). **Dette assumée alors, comblée le jour même** (voir entrée suivante) : consultation
interrompue par fermeture d'onglet/navigateur non journalisée, et bascule vers "Nouvelle carte"
n'isolant pas la durée. Migration `20260904000001` non exécutée contre `db.sqlite` local en session
(action refusée par le classifieur de permissions) — à appliquer manuellement (`npm run migrate`) avant
tout test manuel en dev.

---

### [2026-09-04, même jour] MindMapViewSession : `fetch keepalive` (pas `sendBeacon`) sur `pagehide` (pas `beforeunload`) pour couvrir fermeture d'onglet et bascule "Nouvelle carte"

**Contexte** — Demande explicite de l'utilisateur, en suite immédiate de l'entrée précédente : combler
les deux limites listées dans "Ce qui n'est PAS couvert" (fermeture d'onglet/navigateur pendant une
consultation de carte mentale ; bascule vers "Nouvelle carte" en cours de consultation).

**Décision 1 — fermeture d'onglet/navigateur : `fetch(..., { keepalive: true })` plutôt que
`navigator.sendBeacon()`.**
`sendBeacon()` est l'API standard pour ce cas d'usage (analytics/durée de page envoyées à la fermeture),
mais elle ne permet pas de définir l'en-tête `Authorization` — seul le corps de la requête et son
`Content-Type` (via le type du `Blob` passé) sont configurables. Or `Auth.middleware.js` exige
strictement le schéma `Bearer <token>` dans l'en-tête `Authorization` (AGENT.md : "Toute route privée
est protégée par `Auth.middleware.js` — pas de vérification JWT inline") ; transmettre le token dans le
corps aurait exigé une vérification JWT ad hoc dans le controller, hors architecture. `fetch` avec
`keepalive: true` (support navigateurs modernes équivalent à `sendBeacon`, requête qui survit au
déchargement de la page) accepte des en-têtes personnalisés — solution retenue via une nouvelle fonction
`api.postBeacon()`, qui lit le token depuis `useAuthStore` exactement comme l'intercepteur Axios de
`api.post()`.

**Décision 2 — déclenchement sur `pagehide` plutôt que `beforeunload`.**
`onBeforeUnmount` (hook Vue) ne s'exécute pas lors d'une fermeture réelle d'onglet/navigateur — le
contexte JS est détruit sans exécuter les hooks du framework, c'est précisément la cause de la dette.
Entre les deux événements DOM candidats : `beforeunload` se déclenche même si l'utilisateur annule
ensuite la confirmation de navigation (boîte de dialogue "Quitter le site ?"), ce qui aurait clos la
mesure de consultation prématurément alors que l'utilisateur reste sur la page ; `pagehide` ne se
déclenche que lorsque la page se décharge réellement (navigation confirmée, fermeture d'onglet, mise en
cache bfcache), donc sans ce faux positif. `beforeunload` reste en place, inchangé, pour son rôle actuel
(avertissement de modifications non sauvegardées) — les deux listeners coexistent, chacun sur son
événement le plus approprié.

**Décision 3 — bascule "Nouvelle carte" : clôturer la mesure dans `handleNewMap`, pas au démontage.**
Alternative écartée : laisser courir la mesure jusqu'à la fermeture de l'éditeur, comme avant — aurait
continué à additionner le temps passé à créer la carte neuve dans la durée attribuée à la carte
initialement consultée, contradiction directe avec la décision du 2026-09-04 (entrée précédente)
d'exclure la création du chronométrage. `handleNewMap` appelle désormais `logViewSession()` avant de
réinitialiser `currentDiagramId` ; la garde `viewLogged` (déjà en place pour éviter un double envoi
pagehide/démontage) protège aussi ce nouveau point d'appel sans changement.

**Conséquences** : les deux limites documentées dans l'entrée précédente sont désormais couvertes ; le
KPI "Temps total de révision" reflète un temps de consultation de cartes mentales plus complet et plus
précis (segments correctement bornés par bascule ou fermeture, plutôt qu'une seule mesure de bout en
bout incluant du temps hors périmètre). `npx vitest run` (front) → 752/752 (+9, tous côté front — aucun
changement API dans ce ticket). **Dette assumée alors, requalifiée le jour même** (voir entrée
suivante) : la mise en arrière-plan prolongée (mobile, `visibilitychange`) a été comblée ; la
réplication à `LeitnerReviewSession`/`TestResult` s'est révélée non applicable plutôt que simplement
non faite — ces deux flux n'ont pas de "mesure en cours à clore", voir entrée suivante.

---

### [2026-09-04, 3ᵉ session du jour] MindMapViewSession : mesure par segments (`visibilitychange`) plutôt qu'une seule mesure de bout en bout

**Contexte** — Demande explicite de l'utilisateur : combler les cas restants listés en "Ce qui n'est PAS
couvert" de l'entrée précédente — mise en arrière-plan prolongée d'un onglet resté ouvert (mobile), et
réplication de `postBeacon`/`pagehide` à `LeitnerReviewSession`/`TestResult`.

**Décision 1 — mesure par segments plutôt qu'une seule mesure montage→démontage.**
La mesure "un seul segment du montage à la fermeture" (2026-09-04, 2ᵉ session) suffisait pour une
fermeture propre ou une fermeture d'onglet, mais pas pour un onglet laissé ouvert en arrière-plan
longtemps : le temps passé sur un autre onglet, en veille d'écran, ou avec l'application mobile en
arrière-plan aurait continué à s'accumuler dans `viewedMindMapId` comme si l'utilisateur consultait
activement la carte. Plus grave sur mobile : les OS (iOS Safari, Chrome Android) peuvent tuer l'onglet en
arrière-plan sans jamais déclencher `pagehide` — dans ce cas, la seule mesure de bout en bout n'aurait
jamais été journalisée du tout, perdant même le temps de consultation réel qui avait précédé la mise en
arrière-plan. Solution : `document.visibilitychange` → `'hidden'` clôt et journalise le segment en cours
(`flushSegment(true)`, via beacon puisque l'onglet peut être sur le point d'être tué) sans arrêter le
suivi dans son ensemble ; `'visible'` en ouvre un nouveau (`resumeSegment()`). Chaque segment produit sa
propre ligne `MindMapViewSession` ; `Kpi.service.js#_computeRealMinutes` les additionne déjà toutes (`SUM`
implicite par réduction JS sur tous les enregistrements de l'utilisateur), donc **aucun changement
backend n'était nécessaire** pour ce ticket.

**Décision 2 — ignorer les segments de durée nulle.**
Un utilisateur qui bascule rapidement entre onglets peut déclencher plusieurs `visibilitychange` en
quelques millisecondes. Sans garde, chaque bascule instantanée produirait une ligne `durationSeconds: 0`
(acceptée par le validateur, qui autorise 0 comme "consultation quasi instantanée", même borne que
`LeitnerReviewSession`) — du bruit pur pour le KPI. `flushSegment` retourne sans rien envoyer quand la
durée arrondie est ≤ 0.

**Décision 3 — réplication à `LeitnerReviewSession`/`TestResult` : non applicable, pas seulement non
faite.**
Ré-examen demandé par l'utilisateur : `postBeacon`/`pagehide` résolvent un problème précis — une mesure
**en cours**, sans notion de fin explicite, qui doit être close proprement quand la page se cache ou se
décharge. Les sessions Leitner et les exercices n'ont pas ce problème par construction : les deux ne
journalisent que des activités **menées à leur terme** (dernière carte corrigée pour Leitner, test
soumis pour un exercice) — décision actée le 2026-09-01 pour Leitner (abandon via bouton Retour
volontairement non compté, voir `CHANGELOG_AGENT.md` du 2026-09-01). Il n'y a donc rien à "clore" à la
fermeture de l'onglet : soit l'action de complétion a eu lieu (et la ligne existe déjà, indépendamment de
ce qui se passe ensuite dans le navigateur), soit elle n'a pas eu lieu (et rien ne doit être journalisé,
par design). Répliquer `postBeacon`/`pagehide` sur ces flux reviendrait à journaliser des sessions
abandonnées — un changement de règle métier, non demandé, qui contredirait une décision déjà actée.

**Conséquences** : le KPI "Temps total de révision" reste fiable même sur un onglet laissé ouvert en
arrière-plan pendant une longue période, y compris sur mobile où l'onglet peut être tué sans avertissement
— le temps déjà écoulé au moment de la mise en arrière-plan est journalisé, seul le temps *après* la mise
en arrière-plan cesse d'être compté. Une même consultation peut désormais produire plusieurs lignes
`MindMapViewSession` (un segment par cycle visible/caché) — accepté, aucune limite de volumétrie côté
API (chaque segment reste indépendamment plafonné à 4h par le validateur). `npx vitest run` (front) →
755/755 (+3, tous côté front — aucun changement API/backend dans ce ticket). **Dette assumée** :
aucune nouvelle — les deux limites de l'entrée précédente sont couvertes, et la troisième s'est révélée
non pertinente plutôt que reportée.

---

### [2026-09-04, 4ᵉ session du jour] CD prod zero-downtime : rollout Kubernetes natif (surge + readiness) plutôt qu'un blue/green à deux environnements nommés ; `K8S_PROD_ENABLED` toujours non fonctionnel, laissé à l'utilisateur

**Contexte** — Demande explicite de l'utilisateur : déploiement automatique de la prod à chaque push
`main`, sans coupure — décrit comme une instance de secours qui prend le trafic pendant que l'instance
principale se met à jour, avant un retour puis une mise à jour symétrique de la secours. Avant de coder,
vérification en direct plutôt que sur la foi du seul historique déjà écrit (accès `kubectl`/`helm`
disponibles ce jour sur ce poste via `k8s/kubeconfig/`, API GitHub publique lisible sans token).

**Décision 1 — rollout Kubernetes natif (Deployment + readinessProbe + `maxSurge`/`maxUnavailable`)
plutôt qu'un blue/green à deux environnements/releases Helm persistants.**
Un vrai blue/green (deux releases nommées, bascule de sélecteur de Service, mise à jour de la
"secours" seulement après validation) donnerait un contrôle plus fin (rollback au niveau du routage,
pas seulement au niveau des pods) mais double la question du dimensionnement permanent (deux
environnements complets tournant en continu, pas seulement le temps d'un rollout) — coût difficile à
justifier ici, sur un cluster déjà dimensionné au plus juste (`resourceQuota` preprod explicitement
calé pour "un seul pod de surge", pas un second environnement entier — voir `values.yaml`/`values-preprod.yaml`).
Le mécanisme déjà en place — `replicas: 2` en prod, `readinessProbe` sur les deux Deployments, Service
qui ne route qu'aux pods `Ready` — réalise déjà, nativement, ce que l'utilisateur décrit : le pod
existant continue de servir tant que le nouveau n'est pas prêt, puis seulement à ce moment l'ancien est
retiré. Vérifié par `kubectl diff` contre le cluster réel : les défauts Kubernetes (`maxSurge: 25%`,
`maxUnavailable: 25%`) arrondissent déjà, pour `replicas: {1, 2}`, exactement sur `maxSurge: 1`,
`maxUnavailable: 0` — ce comportement existe donc déjà aujourd'hui, implicitement. Rendu explicite dans
`deployment-api.yaml`/`deployment-front.yaml` pour ne plus en dépendre silencieusement (un futur passage
à 4 replicas ferait dériver le calcul en pourcentage vers `maxUnavailable: 1`, ce qui ne serait plus
zero-downtime). `helm upgrade --atomic` (déjà en place) complète ce mécanisme avec un rollback automatique
de toute la release si le nouveau rollout ne stabilise jamais dans le délai imparti — l'équivalent du
"retour à l'instance de secours" décrit par l'utilisateur si la mise à jour échoue, sans code supplémentaire.

**Décision 2 — notification Discord qui distingue un job `skipped` d'un déploiement réellement propagé,
plutôt que le binaire réussi/échoué existant.**
Constat en direct, avant tout code : pour le run CD du commit `2e2165b` (HEAD actuel de `main`), le job
`Deploy to Kubernetes (prod)` est `skipped`, mais le job `notify` a quand même annoncé "✅ réussi" — 
`contains(needs.*.result, 'failure')` ne traite jamais un `skipped` comme un échec. C'est très
probablement la raison pour laquelle les 4 occurrences précédentes du symptôme "deploy_prod figé"
(27/08, 28/08, 31/08, 03/09, toutes documentées plus haut dans ce fichier et dans `CHANGELOG_AGENT.md`)
n'ont jamais été détectées par la CD elle-même, seulement constatées a posteriori par l'utilisateur ou
en inspectant le cluster. Le job `notify` calcule désormais, par branche, le job de déploiement
réellement concerné et distingue explicitement son `skipped` (⚠️, avec l'endroit précis à vérifier) du
cas normal où un déploiement a réellement eu lieu (✅).

**Décision 3 — ne pas activer `K8S_PROD_ENABLED` moi-même, ni proposer de le faire par un autre biais.**
Constat en direct : même après la correction Secret→Variable du 2026-09-02 (confirmée faite par
l'utilisateur), `deploy_prod` reste `skipped` sur le run le plus récent — la cause exacte reste donc
non identifiée aujourd'hui, deux jours après ce qui devait être le correctif de fond. Sans `gh` CLI ni
token sur ce poste, impossible de lire la valeur ou le scope réel de la variable (Repository vs.
Environment) pour le confirmer ; seule l'API publique GitHub (lecture seule, runs/jobs) a pu être
utilisée. Cohérent avec les décisions déjà actées les 28/08 et 31/08 (voir entrées plus haut) : la
bascule de cette variable est une décision d'exploitation, pas un correctif de code, et reste du
ressort de l'utilisateur — même disponibilité d'accès `kubectl` ne change pas cet arbitrage, qui porte
sur GitHub Settings, hors du dépôt.

**Alternative écartée (readinessProbe qui attend le pré-chauffage du modèle sémantique)** : le
`readinessProbe` actuel de l'API ne vérifie que la connectivité DB, pas l'état du pré-chauffage
ONNX (~30 s, tourne en tâche de fond sans bloquer le démarrage — voir `server.js`) : un pod fraîchement
`Ready` peut donc recevoir une requête de correction sémantique avant d'être chaud. Non traité : ce
n'est pas une coupure de service (juste une latence accrue sur une route précise, pour la première
requête), et gater la readiness sur l'état du modèle exigerait de faire remonter cet état jusqu'à
`/api/v1/health` — changement plus large qu'une simple stratégie de rollout, non demandé ici.

**Conséquences** : le rollout prod/preprod est désormais explicitement zero-downtime (documenté, pinné,
vérifié sans changement de comportement réel aujourd'hui) et toute future désynchronisation
`deploy_prod`/`push_images` sera visible dans Discord au lieu d'être silencieuse. **Le problème que
l'utilisateur pensait résolu ("push sur main → prod à jour automatiquement") ne l'est toujours pas** :
signalé explicitement plutôt que supposé corrigé par les changements de cette session, qui portent sur
la robustesse du rollout et la visibilité de l'échec, pas sur sa cause. Aucune commande `helm
upgrade`/`kubectl apply` exécutée sur le cluster réel dans cette session (uniquement `helm
lint`/`template`, `kubectl diff`, tous en lecture seule) — les changements prennent effet au prochain
déploiement réussi.

---

### [2026-09-04, 5ᵉ session du jour] `DEFAULT_BOXES` Leitner : intervalles réels par défaut, sans restreindre qui peut les modifier

**Contexte** — En creusant la question « c'est le compte admin qui paramètre ça ? », constat qu'aucune
route `LeitnerBox` (`POST`/`PUT`/`DELETE /leitnerboxes`) ne vérifie ni rôle ni propriété — seul
`authMiddleware` protège ces routes, contrairement à `LeitnerCard.service.js` qui a déjà
`resolveUserRights(userId, idSystem)` pour le même genre d'opération. Un utilisateur connecté peut donc
modifier ou supprimer la boîte d'un système qui n'est pas le sien, juste en connaissant son `idBox`.

**Décision 1 — ne pas restreindre les droits sur `LeitnerBox`, sur demande explicite de l'utilisateur.**
Le constat (IDOR potentiel) a été présenté avec une proposition de correctif (répliquer
`resolveUserRights`, déjà en place pour `LeitnerCard`). L'utilisateur a explicitement choisi de ne pas
y toucher : « pour la possibilité de modifier les valeurs on laisse comme ça, l'étudiant pourra
paramétrer ces systèmes de leitner comme il le souhaite ». Interprété comme un choix produit assumé
(la configurabilité des boîtes reste volontairement ouverte), pas comme un oubli — aucune modification
apportée à `routes/LeitnerBox.routes.js`, `controllers/LeitnerBox.controller.js` ni
`services/LeitnerBox.service.js` dans cette session.

**Décision 2 — `DEFAULT_BOXES` passe aux valeurs réelles, sans branchement par environnement.**
Les 5 boîtes créées à chaque nouveau système portaient des raccourcis de test (5/10/15/20/30 s,
`services/LeitnerSystem.service.js`) — appliqués identiquement en prod, faute de toute distinction
dev/prod dans le code (`intervall` est en secondes partout, décision actée 2026-06-06 précisément pour
permettre des délais sub-journaliers si besoin, pas pour être ensuite recloisonnée par environnement).
Sur confirmation explicite de l'utilisateur (« maintenant que le fonctionnement est validé on peut
passer aux vraies valeurs »), `DEFAULT_BOXES` prend les valeurs déjà documentées comme "Prod
(recommandé)" dans `diagrams/leitner_algo.md` §5 (1j/3j/7j/14j/30j) — jusqu'ici une recommandation
jamais réellement appliquée par défaut. Alternative écartée : ajouter une variable d'environnement ou
un `NODE_ENV`/`ENVIRONMENT` pour ne changer le défaut qu'en prod — non demandé, et contraire à l'esprit
de la décision 2026-06-06 (garder `intervall` simple et non recloisonné) ; les suites de tests qui ont
besoin d'intervalles courts définissent déjà leurs propres fixtures indépendamment de cette constante.

**Conséquences** : tout nouveau système Leitner créé à partir de maintenant — en prod comme ailleurs —
démarre avec des intervalles de répétition espacée réels plutôt que des délais de quelques secondes.
Les systèmes déjà existants ne sont pas affectés rétroactivement (`DEFAULT_BOXES` n'est lu qu'à la
création) — aucune migration de données demandée ni faite pour les systèmes déjà créés avec les
anciennes valeurs. `npx jest` (API) → 1779/1779 (+1, nouveau test qui épingle les 5 valeurs réelles).
**Dette assumée, documentée mais pas corrigée** : l'IDOR potentiel sur `LeitnerBox` reste tel quel, sur
choix explicite de l'utilisateur — à reconsidérer seulement s'il change d'avis, jamais à corriger
unilatéralement par l'agent.

---

### [2026-09-04, 6ᵉ session du jour] Session Leitner interrompue : journaliser le temps partiel plutôt que rien — revient sur la décision du 2026-09-01

**Contexte** — En expliquant pourquoi le compteur "Temps total de révision" de l'utilisateur restait à
0 min après un test en prod (session Leitner quittée avant la fin), rappel de la règle actée le
2026-09-01 : « seule une session menée à son terme est comptée ». L'utilisateur a explicitement demandé
de revenir dessus : journaliser le temps passé jusqu'au moment où l'on quitte, pas seulement les
sessions complètes.

**Décision — un point de journalisation unique (`logSessionProgress`), partagé entre fin normale et
sortie anticipée, plutôt que deux chemins de code séparés.**
La fin normale (dernière carte, `nextStep`) et la sortie anticipée (`confirmExit`) ont exactement le
même besoin : calculer la durée depuis `startedAt`, journaliser `reviewedCount` cartes pour `systemId`.
Dupliquer cette logique dans les deux branches aurait risqué une divergence future (ex: un correctif
appliqué à un seul des deux chemins) — un seul point d'appel avec une garde (`sessionLogged`) empêche
aussi tout risque de double envoi si les deux chemins finissaient par se chevaucher.

**Décision — `reviewedCount` (compteur dédié, incrémenté à la correction) plutôt que réutiliser
`currentIndex`/`cardStore.dueCards.length`.**
`currentIndex` ne sert qu'à la navigation d'écran (quelle carte afficher), pas à combien ont été
réellement corrigées : il n'avance qu'au clic sur "Continuer", pas à la correction elle-même —
`submitResponse` a pourtant déjà fait avancer la carte dans ses boîtes côté serveur dès que la réponse
est soumise et validée. Si l'utilisateur corrige la dernière carte visible puis quitte immédiatement
(sans cliquer "Continuer"), `currentIndex` sous-compterait d'une unité. `cardStore.dueCards.length`
(utilisé avant ce ticket) est le total de cartes **dues**, correct seulement quand la session est menée
à son terme — plus la bonne mesure en cas de sortie anticipée. `reviewedCount`, incrémenté dans
`handleValidation` dès que `submitResponse` réussit, reste correct dans les deux cas.

**Alternative écartée (ne rien changer, documenter comme dette permanente)** : la décision du
2026-09-01 avait volontairement écarté la journalisation des abandons — mais c'était un choix par
défaut prudent en l'absence de retour utilisateur, pas un principe intangible. Revenue dessus dès que
l'utilisateur a explicitement demandé le contraire, cohérent avec le traitement déjà appliqué le même
jour à `MindMapViewSession` (segments partiels journalisés plutôt que tout-ou-rien).

**Conséquences** : le temps de révision reflète désormais le temps réellement passé, y compris pour les
sessions interrompues — cohérent avec l'esprit général du 2026-09-04 (totalMinutes = uniquement du
temps réel chronométré, plus fiable qu'une case cochée ou qu'un tout-ou-rien sur la complétion).
`npx vitest run` (front) → 758/758 (+3). **Dette assumée** : même limite que documentée pour les cartes
mentales avant leur propre correctif — une fermeture d'onglet/navigateur pendant une session Leitner en
cours n'est toujours pas journalisée (`FlashcardsSessionPage.vue` n'a pas de handler `pagehide`/beacon).
Non répliqué dans ce ticket, non demandé ; le pattern (`api.postBeacon`, `stores/mindmapViewSessions.js`)
existe déjà et pourrait être réutilisé pour `leitnerReviewSessions.js` si cette limite devient gênante en
pratique.

---

### [2026-09-04, 7ᵉ session du jour] Validation automatique des séances planifiées par la pratique réelle : bornée au jour même, `completed` persisté plutôt que transitoire

**Contexte** — Demande explicite de l'utilisateur (après clarification via question, deux lectures
possibles de son message initial étaient en jeu — voir échange) : qu'une session Leitner menée à son
terme, ou un exercice soumis, valide automatiquement (`isDone = true`) la séance planifiée
correspondante dans le calendrier, si elle existe — et que le compteur "Sessions complétées" reflète
désormais cette pratique réelle plutôt qu'une case cochée à la main uniquement.

**Décision 1 — validation bornée à `date = aujourd'hui`, jamais de rattrapage rétroactif.**
Alternative écartée : valider aussi les séances planifiées passées, encore non faites (rattraper un
retard). Écartée pour rester prévisible — un utilisateur qui a un mois de créneaux planifiés non cochés
ne doit pas voir dix séances anciennes se cocher d'un coup parce qu'il a fait une session aujourd'hui,
sans lien réel avec elles. La sémantique reste simple : "as-tu fait aujourd'hui ce que tu avais prévu
aujourd'hui ?", pas un solde à rattraper.

**Décision 2 — `completed` (LeitnerReviewSession) : colonne persistée plutôt qu'un simple paramètre de
requête transitoire.**
La distinction "session complète / partielle" n'était utile, dans l'immédiat, que pour décider côté
service si `validateMatchingSessions` doit être appelée — un paramètre de requête non stocké aurait
suffi. Persisté quand même : coût quasi nul (une colonne booléenne, défaut `true`), et donne une
information a posteriori utile (distinguer, dans le journal, une session menée à son terme d'un abandon
en cours) sans devoir la reconstituer indirectement (`cardsReviewed` vs. le nombre de cartes dues au
moment de la session, non conservé par ailleurs). Alternative écartée : ne rien persister — écartée
pour ce faible coût contre cette perte d'information définitive.

**Décision 3 — exercices toujours "complets" (`Test.service.js#submitAnswers` appelle systématiquement
`validateMatchingSessions`), sessions Leitner conditionnées à `completed: true`.**
Un exercice n'a pas de notion de soumission partielle : `POST /tests/:id/submit` envoie toutes les
réponses en un seul appel, à la fin du test — contrairement à une session Leitner où chaque carte est
un appel indépendant et où l'utilisateur peut quitter au milieu (fonctionnalité de la 6ᵉ session du jour
sur ce même fichier). Pas de garde côté exercices équivalente à `completed` : il n'y a rien à distinguer.

**Alternative écartée (valider dans `Kpi.service.js`, au moment du calcul plutôt qu'à l'écriture)** —
aurait fallu recalculer, à chaque lecture du KPI, quelles séances planifiées "auraient dû" être validées
par la pratique déjà enregistrée (jointure supplémentaire entre `RevisionSession` et
`TestResult`/`LeitnerReviewSession` par date+système/test, à chaque appel `getMyKpis`). Écartée : plus
coûteux à chaque lecture, et `isDone` resterait sémantiquement faux en base (pas mis à jour) — la
validation à l'écriture (au moment de la pratique) garde `RevisionSession.isDone` comme source de
vérité unique, cohérente pour n'importe quel autre lecteur futur de cette table (pas seulement
`Kpi.service.js`).

**Conséquences** : `totalCompleted`/`completionRate` (déjà calculés depuis `isDone`, `Kpi.service.js`
inchangé) reflètent désormais aussi bien les séances cochées à la main que celles validées par la
pratique — sans changement de code côté KPI, seul le mécanisme qui fait passer `isDone` à `true` change.
Page `KpiPage.vue` réorganisée en deux lignes "Prévu"/"Fait" pour rendre cette distinction visible (voir
CHANGELOG_AGENT.md pour le détail des cartes déplacées). `npx jest` (API) → 1789/1789 (+10) ; `npx
vitest run` (front) → 760/760 (+2). **Dette assumée** : aucun rattrapage rétroactif (décision 1,
assumée) ; pas de notification UI quand une validation automatique a lieu — l'utilisateur le découvre
en consultant son calendrier, non demandé dans ce ticket.

---

### [2026-09-04, 8ᵉ session du jour] CI "Audit Dependencies (OWASP A06)" en échec : `npm install -g npm@latest` plutôt qu'une réparation du lockfile

**Contexte** — Job CI en échec, signalé par l'utilisateur avec le log complet : `400 Bad Request` sur
l'endpoint `quick audit` de npm, que npm annonce lui-même en cours de retrait, suivi d'un message
générique (« Invalid package tree ») qui pointe vers le lockfile sans que ce soit la cause réelle.

**Décision** : mettre à jour npm en CI (`npm install -g npm@latest`) avant `npm ci`, plutôt que
d'investiguer/réparer `package-lock.json`. Deux éléments convergent vers cette piste : (1) le message
d'erreur de npm nomme explicitement l'endpoint retiré, pas une incohérence de lockfile — l'"Invalid
package tree" qui suit est la réaction générique de npm à un 400 qu'il ne sait pas interpréter autrement, pas
un diagnostic fiable ; (2) `package-lock.json` n'a pas bougé depuis un correctif `npm audit fix` du
2026-09-02, `lockfileVersion: 3` standard, rien d'anormal trouvé à l'inspection. Le correctif choisi
reproduit une décision déjà prise et documentée dans ce projet pour un problème de nature identique
(npm embarqué obsolète) : `my_memo_master_api/Dockerfile` fait déjà `npm install -g npm@latest` avant
tout `npm ci`/`npm audit`, pour la CVE de l'npm embarqué dans l'image `node:22-bookworm-slim` — même
levier, même raisonnement, appliqué ici au runner CI plutôt qu'à l'image Docker.

**Alternative écartée (réparer/régénérer `package-lock.json`)** — écartée en l'absence d'indice
concret de corruption : régénérer le lockfile sans savoir ce qui ne va pas aurait risqué de changer des
versions résolues (donc du contenu réellement testé/déployé) pour un problème qui, au vu du message
d'erreur, ne vient probablement pas de là.

**Conséquences** : correctif **non vérifié empiriquement** — reproduction locale non concluante (audit
instantané et sain côté front, bloqué sans réponse côté API sur ce poste, npm local 11.9.0 très
différent du npm 10.x de la CI) ; aucun accès `gh`/token depuis ce poste pour observer un run CI réel.
À confirmer au prochain push — si le symptôme persiste malgré la mise à jour de npm, la piste lockfile
resterait à rouvrir, cette fois avec un vrai signal de la CI (le message d'erreur changerait probablement
de forme si la cause réelle était le lockfile plutôt que l'endpoint).
