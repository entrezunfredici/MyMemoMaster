# Mémoire du projet — synthèse

> Ce document présente le dispositif de « mémoire du projet » de MyMemoMaster : à quoi il sert, ce qu'il contient, et l'essentiel de son contenu à date.
> **Les fichiers sources font foi** : ils vivent dans [.agents/](../.agents/) et sont mis à jour après chaque ticket. Ce document est une synthèse de présentation ; en cas d'écart, se référer aux sources.

**Dernière synchronisation : 2026-07-11**

---

## 1. Pourquoi une mémoire de projet

Le projet est développé en collaboration humain + agent IA (Claude Code). Un agent n'a pas de mémoire entre deux sessions : sans dispositif explicite, chaque session repartirait de zéro, réinventerait des choix déjà tranchés et produirait du code incohérent avec l'existant.

La mémoire du projet répond à trois questions, chacune portée par un fichier dédié :

| Question | Fichier source | Rôle |
|----------|---------------|------|
| **Comment travailler ici ?** | [.agents/AGENT.md](../.agents/AGENT.md) + [.agents/CONVENTIONS.md](../.agents/CONVENTIONS.md) | Comportement attendu de l'agent, stack, nommage, patterns de code, règles du projet |
| **Où en est le code ?** | [.agents/CHANGELOG_AGENT.md](../.agents/CHANGELOG_AGENT.md) | Journal d'état : une entrée par ticket terminé + tableau « État global » toujours à jour |
| **Pourquoi le code est comme il est ?** | [.agents/DECISIONS.md](../.agents/DECISIONS.md) | Registre des décisions techniques au format Contexte / Décision / Alternative écartée / Conséquences |

S'y ajoute un livrable de sécurité : [docs/SECURITY_AUDIT_OWASP.md](SECURITY_AUDIT_OWASP.md), l'audit OWASP Top 10 de l'API (résumé en §5).

Le fichier [CLAUDE.md](../CLAUDE.md) à la racine est le point d'entrée : il est lu automatiquement par l'agent en début de session et impose la lecture des fichiers ci-dessus **avant toute action**, puis leur mise à jour **avant de considérer un ticket terminé**. La discipline est donc outillée, pas seulement déclarative.

---

## 2. Conventions — l'essentiel

Source : [.agents/CONVENTIONS.md](../.agents/CONVENTIONS.md)

### Stack

Node.js 22 · Express 4 · Sequelize 6 · PostgreSQL (prod) / SQLite (dev) · JWT + bcryptjs · express-validator · Swagger (JSDoc) · Winston · Jest + Supertest — côté API.
Vue 3 · Vite 6 · Pinia (persistance localStorage) · Axios · Tailwind CSS 3 · Vitest — côté front.

### Règles structurantes

- **Architecture stricte controller → service → model** : les controllers ne font que try/catch + appel service + réponse HTTP ; toute la logique métier vit dans les services.
- **Nommage systématique** : `[Entity].controller.js` / `.service.js` / `.model.js` / `.routes.js` / `.validators.js` côté API ; `[Name]Page.vue` / `[Name]Component.vue` côté front ; endpoints REST en kebab-case pluriel.
- **Auth** : middleware `Auth.middleware.js` sur toute route privée (jamais de vérification JWT inline) ; rate limiting sur les routes d'auth (login 5 / 15 min, register 10 / 1 h).
- **Validation** : toute entrée passe par `validate.middleware.js` + un fichier `validators/[Entity].validators.js` (express-validator).
- **Erreurs** : jamais catchées silencieusement — log Winston + message HTTP en français ; codes utilisés : 201, 400, 401, 403, 404, 500.
- **Uploads** : croisement extension ↔ MIME + magic bytes (`helpers/fileSignature.js`, OWASP A08) ; stockage `public/uploads/` ou S3.
- **Observabilité** : métriques Prometheus RED/USE sur un serveur HTTP séparé (port 9090, jamais exposé par l'Ingress).
- **Accessibilité** : audit statique `scripts/audit-a11y.mjs` + tests axe-core en CI — obligatoires pour toute nouvelle page.
- **Dépendances** : liste approuvée fermée ; tout ajout doit être signalé et justifié. `sqlite3` reste en devDependencies (chaîne de build porteuse de CVE, la prod est sur PostgreSQL).
- **Hors-scope assumé** : pas de TypeScript, pas de GraphQL, pas de microservices ; Redis sert uniquement de broker BullMQ.

---

## 3. Décisions techniques — panorama

Source : [.agents/DECISIONS.md](../.agents/DECISIONS.md) — **90+ décisions** enregistrées entre le 2026-06-03 et le 2026-07-08, chacune au format Contexte / Décision / Alternative écartée / Conséquences. Panorama par thème (sélection) :

### Données et persistance
- SQLite en dev, PostgreSQL en prod ; `better-sqlite3` plutôt que `sqlite3`.
- Index Sequelize via options de modèle + migration dédiée pour les index FK.
- Contenu des questions d'exercices en **JSON polymorphe** (champ `content` sérialisé TEXT) par type de question.
- Structure des mind maps stockée en **blob JSON** plutôt que normalisée en tables.
- `EventOccurrence` matérialisées en base plutôt que calculées à la volée.
- Cascades de suppression Leitner corrigées en `ON DELETE CASCADE` sur les deux niveaux (`LeitnerBox.idSystem`, puis `LeitnerCard.idBox`).

### Authentification et droits
- JWT payload minimal `{ id: userId }` — **jamais de droits dans le token** ; RBAC via `requireRole` qui vérifie le rôle en base à chaque requête.
- Refresh token opaque avec rotation à chaque renouvellement, puis hashé SHA-256 en base (audit OWASP H1).
- Reset password : token brut envoyé par email, hash SHA-256 stocké.
- Login bloqué tant que l'email n'est pas vérifié ; réponses anti-énumération sur forgotPassword/verifyEmail.
- Pas de bypass admin sur les KPI personnels (consentement par quadruplet étudiant/enseignant/groupe/matière).

### Architecture et front
- Architecture en couches controller → service → model (décision fondatrice du 2026-06-03).
- Pages front complexes refactorisées en **coordinateur mince + vues filles** (MindmapsPage, ClassroomPage).
- Polling 5 min pour les notifications plutôt que WebSocket ; Pinia avec persistance localStorage réduite aux chemins nécessaires.

### Infrastructure et exploitation
- BullMQ + Redis pour les rappels (plutôt que polling node-cron).
- Migration vers **Helm** pour le déploiement Kubernetes ; branches CI/CD renommées `test`→`dev`, `preprod`→`staging`.
- Sauvegardes automatiques via un service Docker dédié plutôt qu'un crontab VPS.
- Health endpoint déclaré hors du routeur v1 (avant le rate limiter) ; métriques sur port dédié.

### Sécurité (décisions issues de l'audit)
- Magic bytes des uploads : signatures codées à la main (le package `file-type` moderne est ESM-only, incompatible CommonJS).
- `sqlite3` en devDependencies + job `npm audit` bloquant en CI (OWASP A06).
- Routes Fields/Test/Tutorials : GET intentionnellement publics (lecture), écritures protégées.

---

## 4. État du projet (changelog)

Source : [.agents/CHANGELOG_AGENT.md](../.agents/CHANGELOG_AGENT.md) — journal chronologique (une entrée par ticket, lecture du bas vers le haut) précédé d'un tableau « État global » par module, mis à jour à chaque ticket.

À date (2026-07-11), le tableau recense **plus de 100 modules, tous à l'état « Stable »**, couvrant :

- **API** : auth complète (register, login, reset, refresh avec rotation), CRUD de toutes les entités (Leitner, mind maps, exercices, calendrier, deadlines, rappels, KPI, tags, groupes classes, établissements), recherche cross-contenu, planning de charge, jobs BullMQ.
- **Front** : 28 pages Vue couvrant les 6 fonctionnalités principales, stores Pinia testés, RBAC (guard + useRole), layouts partagés (AuthFormLayout, ItemListLayout).
- **Qualité** : 724 tests d'intégration API (Supertest) + suites Vitest front ; ESLint/Prettier verts ; tests axe-core en CI.
- **Exploitation** : Docker Compose dev + serveur, CI/CD multi-branches (dev / staging / main), Helm/Kubernetes, métriques Prometheus, logs Winston + Morgan.
- **Documentation** : Swagger complet, ERD base de données, algo Leitner, règles métier Calendrier et Mind Maps, manuel d'utilisation, runbook.

Chaque entrée du journal détaille : fichiers créés/modifiés, ce qui est utilisable à l'issue du ticket, hypothèses posées, dette éventuelle.

---

## 5. Audit de sécurité OWASP Top 10

Source : [docs/SECURITY_AUDIT_OWASP.md](SECURITY_AUDIT_OWASP.md) — ticket M-00b.07, 2026-06-23, périmètre API + Docker Compose + Traefik + variables d'environnement.

**Verdict** : niveau « insuffisant pour la production » avant correctifs → **« acceptable (MVP) » après correctifs**.

### Corrigé pendant l'audit (8 vulnérabilités)

| OWASP | Vulnérabilité | Sévérité |
|-------|---------------|----------|
| A01 | Routes d'écriture Fields / Tutorials / Test sans authMiddleware | Critique |
| A01 | Login sans vérification d'email validé | Moyenne |
| A04 | Énumération d'emails via forgotPassword et verifyEmail | Moyenne |
| A02 | Génération de tokens via `Math.random()` (non cryptographique) | Faible |
| A05 | Swagger UI accessible en production | Moyenne |

### Corrigé ensuite (haute priorité, ticket M-00b.07b puis 2026-07-06)

- Refresh token hashé SHA-256 en base (A02) ; JWT réduit de 1 j à 15 min (A02).
- Suppression S3 avec vérification de propriétaire — clé `uploads/{userId}/…` (A01).
- Expiration 30 min du code de vérification email (A04).
- Magic bytes sur les uploads (A08), log des échecs d'auth et des 403 (A09), CSP Helmet explicite (A05), politique de mot de passe renforcée, anti log-injection, race condition d'inscription.
- Couverture A06 : `npm audit` bloquant en CI, **0 vulnérabilité high/critical** sur les dépendances de production des deux applications.

### Reste ouvert

- Pas de révocation JWT en cas de compromission (A07) — palliatif : expiration 15 min ; piste long terme : blacklist Redis sur `jti`.
- Points de durcissement dev : credentials PGAdmin par défaut, Redis sans mot de passe (environnement de dev uniquement).

### Points positifs confirmés par l'audit

Aucune injection SQL (Sequelize paramétré), aucun SSRF, rate limiting en place, bcrypt coût 10, CORS restreint, HSTS/HTTPS via Traefik, messages d'erreur génériques en production.

---

## 6. Cycle de vie de la mémoire

1. **Début de session** : l'agent lit AGENT.md → CONVENTIONS.md → CHANGELOG_AGENT.md → DECISIONS.md (ordre imposé par CLAUDE.md), puis audite l'état réel du code avant d'écrire une ligne.
2. **Pendant le ticket** : tout écart entre l'état supposé et l'état réel est signalé avant d'être comblé ; tout ajout de dépendance est justifié.
3. **Fin de ticket** : mise à jour obligatoire du CHANGELOG (état global + nouvelle entrée) et de DECISIONS.md pour chaque choix structurant. **Un ticket n'est pas terminé tant que la mémoire n'est pas à jour.**

Ce dispositif rend le projet reprenable par un nouveau développeur — humain ou agent — sans contexte oral : c'est une forme d'évolutivité organisationnelle, complémentaire de l'évolutivité technique du code.
