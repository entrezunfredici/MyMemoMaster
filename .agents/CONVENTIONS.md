# CONVENTIONS.md — Conventions du projet

> Fichier spécifique à ce projet. L'agent IA doit lire ce fichier avant toute implémentation.

---

## Stack technique

| Élément | Valeur |
|---------|--------|
| Runtime | Node.js 22 (Docker : node:22-alpine) |
| Framework API | Express.js v4 |
| Base de données | PostgreSQL (prod) / SQLite (dev) |
| ORM | Sequelize v6 + Sequelize CLI |
| Authentification | JWT (jsonwebtoken) + bcryptjs |
| Validation API | express-validator |
| Documentation API | swagger-jsdoc + swagger-ui-express |
| Logs | Winston |
| Dates | dayjs |
| Tests API | Jest + supertest |
| Linter API | ESLint v9 |
| Framework front | Vue.js 3 |
| Build front | Vite v6 |
| State management | Pinia (avec persistence localStorage) |
| HTTP client front | Axios via vue-axios |
| Styling | Tailwind CSS v3 |
| Tests front | Vitest |
| Linter front | ESLint v8 + Prettier |

---

## Structure de dossiers

```
MyMemoMaster/
├── my_memo_master_api/
│   ├── config/              # db.config.js, dbms.config.js, swagger.config.js, redis.config.js
│   ├── controllers/         # [Entity].controller.js — handlers Express
│   ├── routes/              # [Entity].routes.js — définitions de routes + JSDoc Swagger
│   ├── services/            # [Entity].service.js — logique métier
│   ├── models/              # [Entity].model.js — modèles Sequelize + models/index.js
│   ├── middlewares/         # Auth, errorHandler, sanitize, validate, upload
│   ├── validators/          # [Entity].validators.js — règles express-validator
│   ├── helpers/             # logger.js, metrics.js, sendEmail.js, generateToken.js, generateCode.js
│   ├── jobs/                # Tâches cron (node-cron)
│   ├── migrations/          # Migrations Sequelize CLI
│   ├── seeds/               # Seeders de données
│   ├── test/                # Tests Jest (*.spec.js / *.test.js)
│   ├── app.js               # Configuration Express + middlewares
│   └── server.js            # Démarrage serveur
├── my_memo_master_front/
│   └── src/
│       ├── pages/           # [Name]Page.vue — composants de page
│       ├── components/      # [Name]Component.vue — composants réutilisables
│       ├── stores/          # camelCase.js — stores Pinia
│       ├── router/          # index.js (guards) + routes.js (définitions)
│       ├── helpers/         # api.js, notif.js, functions.js
│       ├── assets/          # Images, fonts
│       ├── lang/            # i18n
│       ├── directives/      # Directives Vue custom
│       └── config.js        # Variables d'environnement Vite
├── .agents/                 # Ce dossier
├── docker-compose.yml
└── .env / .env.example
```

---

## Nommage

### Backend

| Élément | Convention | Exemple |
|---------|-----------|---------|
| Fichiers controllers | PascalCase + `.controller.js` | `User.controller.js` |
| Fichiers routes | PascalCase + `.routes.js` | `User.routes.js` |
| Fichiers services | PascalCase + `.service.js` | `User.service.js` |
| Fichiers models | PascalCase + `.model.js` | `User.model.js` |
| Fichiers middlewares | CamelCase + `.middleware.js` | `Auth.middleware.js` |
| Classes de service | PascalCase | `UserService` |
| Méthodes de service | camelCase | `findAll`, `findOne`, `create`, `update`, `delete` |
| Colonnes DB | camelCase | `userId`, `hasValidatedEmail` |
| Noms de table Sequelize | PascalCase | `"User"`, `"LeitnerSystem"` |
| Variables | camelCase | `currentUser` |
| Constantes | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Endpoints API | kebab-case pluriel | `/leitner-systems`, `/onboarding-states` |

### Frontend

| Élément | Convention | Exemple |
|---------|-----------|---------|
| Pages | PascalCase + `Page.vue` | `FlashcardsPage.vue` |
| Composants | PascalCase + `Component.vue` | `ButtonComponent.vue` |
| Stores Pinia | camelCase `.js` | `auth.js`, `mindmapBuilder.js` |
| Fonctions / méthodes | camelCase | `getUserById` |

---

## Patterns de code (Backend)

### Controller
```javascript
exports.create = async (req, res) => {
  try {
    const data = await entityService.create(req.body);
    res.status(201).send({ message: "Ressource créée avec succès", data });
  } catch (error) {
    logger.error(error?.message || error);
    res.status(500).send({ message: "Erreur lors de la création" });
  }
};
```

### Service (classe)
```javascript
class EntityService {
  async findAll() { ... }
  async findOne(id) { ... }
  async create(data) { ... }
  async update(id, data) { ... }
  async delete(id) { ... }
}
module.exports = new EntityService();
```

### Model Sequelize
```javascript
module.exports = (instance) => {
  const Entity = instance.define("Entity", {
    // attributs avec DataTypes
  }, { timestamps: false });
  Entity.associate = (models) => { ... };
  return Entity;
};
```

### Route (avec Swagger)
```javascript
/**
 * @swagger
 * /entities:
 *   get:
 *     summary: Récupérer toutes les entités
 *     tags: [Entity]
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès
 */
router.get("/", authMiddleware, entity.findAll);
```

---

## Règles spécifiques au projet

- **Cartes mentales** : tout le code métier non visuel vit dans `src/helpers/mindmap/` (`mindmap.js`, `mindmapItems.js`, `mindmapCalc.js`, `mindmapGraph.js`, `mindmapApi.js`…) ; les routes API des cartes passent par `mindmapApi.js`, pas par des chaînes dans les composants ; le texte saisi par l'utilisateur n'est jamais rendu avec `v-html` ; un nouveau type d'item s'ajoute dans `ITEM_KINDS` (`mindmapItems.js`) et dans `creationLabels` (`mindmapCreation.js`, vérifié par test) ; les sections de la palette sont des composants dans `components/mindmap/palette/` qui réutilisent `palette.css`
- **Aucune couleur en dur dans `src/`** (hex, `rgb()`, `rgba()`, `hsl()`) : toute couleur est une variable CSS déclarée dans `src/assets/base.css` (palette `--slate-500`, thème `--primary` en triplet RGB, rôles `--mindmap-*`…) et s'utilise avec `var(--nom)` ou `rgb(var(--nom) / alpha)`. En JS (canvas Chart.js, attributs SVG liés, valeurs enregistrées en base) : `helpers/themeColors.js` (`themeHex`, `themeRgba`, `tagColors`). Classes Tailwind : pas de `bg-[#…]`, utiliser les couleurs du thème (`bg-primary`, `text-on-primary`, `hover:bg-primary-dark`). Contrôlé en CI par `npm run audit:colors`
- **Accessibilité (RGAA)** : tout texte doit atteindre 4,5:1 (3:1 pour un grand texte) sur son fond. Ne pas utiliser `slate-400`/`gray-400` (ou plus clair) comme couleur de texte : `slate-500`/`gray-500` au minimum ; les classes de palette (`bg-gray-100`, `text-red-600`, `text-white`…) fonctionnent : leurs teintes viennent de `base.css` via `tailwind.config.js` (échelles gray, red, blue, green, amber, yellow, purple, orange + white, black), et `npm run audit:tailwind` échoue si une classe n'existe pas dans le thème (elle serait ignorée sans erreur) ; `text-on-primary` reste l'alias pour le texte sur `bg-primary`. Un champ de formulaire a une bordure d'au moins 3:1 (`border-gray-500`, pas `-300`). Une nouvelle page s'ajoute à `e2e-a11y/pages.spec.js`, un nouvel écran de l'éditeur de carte mentale à `e2e-a11y/mindmap-editor.spec.js` ; `npm run audit:a11y` et `npm run test:a11y` doivent passer avant la livraison
- Les popups, modales et panneaux dropdown **doivent avoir un fond blanc explicite** (`bg-white` / `background: #ffffff`) pour rester lisibles quelle que soit la page en dessous — ne pas laisser le fond transparent ou hérité
- Pas de logique métier dans les controllers — tout passe par les services
- Les messages d'erreur sont en français
- Les variables d'environnement passent par `config/db.config.js` ou `config/dbms.config.js` côté API, et `src/config.js` côté front
- Les erreurs ne sont jamais catchées silencieusement — toujours logger avec Winston + retourner un message HTTP
- L'authentification utilise un middleware `Auth.middleware.js` posé sur les routes privées
- Le rate limiting est appliqué sur les routes d'auth (login : 5 tentatives / 15 min, register : 10 / 1h)
- Les uploads de fichiers vont dans `public/uploads/` ; tout middleware d'upload croise extension ↔ MIME et vérifie les magic bytes via `helpers/fileSignature.js` (OWASP A08)
- La documentation Swagger est générée automatiquement depuis les JSDoc des routes et servie sur `/api-docs`
- En dev, SQLite est utilisé (pas de PG_HOST) ; en prod/docker, PostgreSQL
- `sqlite3` est une **devDependency** (dev/test uniquement — la prod est sur PostgreSQL) : ne pas la remonter en dependencies, sa chaîne de build porte des CVE
- L'accessibilité est outillée sur trois niveaux : `node scripts/audit-a11y.mjs` (front, audit statique RGAA), `test/a11y/axe.test.js` (axe-core en jsdom, composants isolés, exécuté en CI) et `e2e-a11y/contrast.spec.js` (Playwright + axe-core, contraste RGAA 3.2 sur pages réelles rendues en Chromium, `npm run test:a11y:contrast`, exécuté en CI) — toute nouvelle page/formulaire doit passer les trois quand c'est applicable
- Les métriques Prometheus (RED/USE) sont exposées sur `GET /metrics` via un serveur HTTP séparé (`METRICS_PORT`, défaut 9090) — jamais sur le port applicatif, jamais routé par l'Ingress/Traefik

---

## Codes HTTP utilisés

| Cas | Code |
|-----|------|
| Création réussie | 201 |
| Mauvaise requête / validation | 400 |
| Non authentifié | 401 |
| Interdit | 403 |
| Non trouvé | 404 |
| Erreur serveur | 500 |

---

## Dépendances approuvées

| Usage | Librairie |
|-------|-----------|
| Logs | winston + morgan |
| Métriques (RED/USE) | prom-client |
| Dates | dayjs |
| Validation | express-validator |
| Auth | jsonwebtoken + bcryptjs |
| Email | nodemailer |
| Cron | node-cron |
| Queue/jobs asynchrones | bullmq + ioredis |
| HTTP client front | axios |
| Notifications front | vue-toastification |
| App mobile (Android) | @capacitor/core + @capacitor/android + @capacitor/cli (MIT) - voir DECISIONS 2026-10-12 |
| Math front | katex (rendu lecture seule — MathJax écarté) + mathlive (éditeur WYSIWYG, chargé lazy — voir DECISIONS 2026-07-19) |
| Graphiques front | chart.js + vue-chartjs |
| Visite guidée front (onboarding) | driver.js (MIT) |
| Accessibilité (tests front) | axe-core (dev) + @playwright/test + @axe-core/playwright (dev, audit de contraste RGAA 3.2 en navigateur réel — voir DECISIONS 2026-08-29) |
| Extraction de texte PDF (API, C-01 Génération IA) | pdfjs-dist (Apache-2.0, zéro dépendance runtime — pdf-parse et unpdf écartés, voir DECISIONS 2026-09-01) |

---

## Ce qui est hors-scope

- Pas de TypeScript (le projet est en JS pur)
- Pas de GraphQL
- Redis est utilisé exclusivement comme broker BullMQ (rappels/notifications) — pas de cache applicatif
- Pas de microservices — architecture monolithique API + front séparés
