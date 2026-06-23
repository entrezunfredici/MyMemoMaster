# Audit sécurité OWASP Top 10 — MyMemoMaster

**Ticket** : M-00b.07  
**Date** : 2026-06-23  
**Branche** : dev_back_refactor  
**Périmètre** : API Node.js/Express · Docker Compose · Traefik · Variables d'environnement  
**Hors périmètre** : Kubernetes, HA multi-région, SRE avancé

---

## Résumé exécutif

**Niveau global avant correctifs : INSUFFISANT POUR LA PRODUCTION**  
**Niveau global après correctifs appliqués : ACCEPTABLE (MVP)**

5 vulnérabilités corrigées directement dans cette session. 8 vulnérabilités documentées à corriger en priorité moyenne/haute avant la mise en production complète. Aucune injection SQL ni SSRF détectée.

---

## Vulnérabilités corrigées (cette session)

| ID | OWASP | Titre | Sévérité | Statut |
|----|-------|-------|----------|--------|
| F-01 | A01 | Routes POST/PUT/DELETE de Fields sans authMiddleware | Critique | ✅ Corrigé |
| F-02 | A01 | Routes POST/PUT/DELETE de Tutorials sans authMiddleware | Critique | ✅ Corrigé |
| F-03 | A01 | Routes POST/PUT/DELETE de Test sans authMiddleware | Critique | ✅ Corrigé |
| F-04 | A01 | Login sans vérification hasValidatedEmail | Moyenne | ✅ Corrigé |
| F-05 | A04 | Énumération d'emails via forgotPassword (retournait 404) | Moyenne | ✅ Corrigé |
| F-06 | A04 | Énumération d'emails via verifyEmail (retournait 404) | Moyenne | ✅ Corrigé |
| F-07 | A02 | generateToken.js utilisait Math.random() (non-crypto) | Faible | ✅ Corrigé |
| F-08 | A05 | Swagger UI accessible en production | Moyenne | ✅ Corrigé |

### Détail des corrections

**F-01/F-02/F-03 — Routes sans authMiddleware**  
Fichiers modifiés :
- `my_memo_master_api/routes/Fields.routes.js` — ajout import + authMiddleware sur POST, PUT, DELETE
- `my_memo_master_api/routes/Tutorials.routes.js` — ajout import + authMiddleware sur POST, PUT, DELETE
- `my_memo_master_api/routes/Test.routes.js` — ajout authMiddleware sur POST, PUT, DELETE (GET intentionnellement publics)

**F-04 — Login sans vérification email**  
Fichier : `my_memo_master_api/controllers/User.controller.js`  
Ajouté après validation mot de passe :
```js
if (!user.hasValidatedEmail) {
  return res.status(403).send({ message: 'Veuillez vérifier votre adresse email avant de vous connecter.' })
}
```

**F-05/F-06 — Anti-énumération emails**  
`forgotPassword` : retourne désormais `200` avec message générique que l'email existe ou non.  
`verifyEmail` : retourne `401 "Code invalide"` si l'email n'existe pas (même message que code incorrect).

**F-07 — generateToken.js**  
`Math.random()` remplacé par `crypto.randomBytes(32).toString('hex')`.

**F-08 — Swagger prod**  
`app.use('/api-docs', ...)` enveloppé dans `if (process.env.NODE_ENV !== 'production')`.

---

## Vulnérabilités restantes à traiter

### Haute priorité (avant mise en production)

#### [A02-H1] Refresh token stocké en clair en base — ✅ Corrigé (M-00b.07b)
**Fichier** : `my_memo_master_api/services/User.service.js`  
**Correctif** : `setRefreshToken` hache le token SHA-256 avant stockage. `verifyRefreshToken` hache le token entrant avant lookup DB.

#### [A02-H2] AUTH_JWT_EXPIRES_IN = 1d (trop long) — ✅ Corrigé (M-00b.07b)
**Fichier** : `.env`  
**Correctif** : `AUTH_JWT_EXPIRES_IN=15m`

#### [A01-H3] Storage.delete sans vérification de propriétaire — ✅ Corrigé (M-00b.07b)
**Fichier** : `my_memo_master_api/controllers/Storage.controller.js`, `middlewares/upload.middleware.js`  
**Correctif** : Clé S3 inclut `userId` (`uploads/{userId}/…`). `delete` vérifie le préfixe `uploads/{req.user.id}/` avant suppression.  
**Nettoyage anciens fichiers** : `node my_memo_master_api/scripts/cleanup-s3-legacy-keys.js` (dry-run par défaut, ajouter `--delete` pour supprimer réellement).

#### [A04-H4] Code de vérification email sans expiration — ✅ Corrigé (M-00b.07b)
**Fichier** : `my_memo_master_api/services/User.service.js`, `models/User.model.js`  
**Correctif** : Champ `validEmailCodeExpiresAt` ajouté au modèle. `setValidEmailCode` stocke l'expiry (30 min). `verifyValidEmailCode` vérifie l'expiry avant validation.  
**Action requise** : Migration Sequelize à créer pour `ALTER TABLE Users ADD COLUMN validEmailCodeExpiresAt DATETIME`.

---

### Priorité moyenne (à adresser dans les prochains sprints)

#### [A07-M1] Pas de révocation JWT en cas de compromission
**Description** : Aucune blacklist de tokens, aucun numéro de version de session en base. Réduire `AUTH_JWT_EXPIRES_IN` à `15m` est le palliatif principal.  
**Recommandation long terme** : Blacklist Redis sur le `jti` (JWT ID), ou version de session dans le token vérifiée côté serveur.

#### [A08-M2] MIME type spoofing sur upload (extension non vérifiée)
**Fichiers** : `middlewares/upload.middleware.js`, `middlewares/mindmapImageUpload.js`  
**Description** : La validation repose sur `file.mimetype` (fourni par le client), pas sur les magic bytes du fichier.  
**Recommandation** : Croiser avec l'extension extraite de `file.originalname` sur liste blanche. Idéalement utiliser le package `file-type` (magic bytes) pour détecter le vrai type.

#### [A09-M3] Tentatives d'auth échouées non loggées
**Fichier** : `controllers/User.controller.js:login`  
**Description** : Les échecs de connexion (mauvais mot de passe, email inconnu) ne sont pas loggés. Impossible de détecter un bruteforce a posteriori.  
**Recommandation** :
```js
logger.warn(`[AUTH] Connexion échouée pour ${email} depuis ${req.ip}`)
```

#### [A05-M4] Helmet sans CSP explicite
**Fichier** : `my_memo_master_api/app.js:56`  
**Description** : `helmet()` sans configuration explicite n'active pas de Content-Security-Policy en Helmet v8.  
**Recommandation** :
```js
app.use(helmet({
  contentSecurityPolicy: {
    directives: { defaultSrc: ["'self'"], imgSrc: ["'self'", "data:", "blob:"] }
  }
}))
```

---

### Faible priorité / Améliorations

| ID | OWASP | Titre | Action suggérée |
|----|-------|-------|-----------------|
| F-M1 | A02 | JWT_EXPIRES_IN = 1d en dev | Changer à 15m dans .env dev |
| F-M2 | A07 | Politique MDP sans caractère spécial | Ajouter `.matches(/[^a-zA-Z0-9]/)` dans validators |
| F-M3 | A07 | Validator changePassword valide `body('id')` inutilisé | Supprimer cette règle |
| F-M4 | A04 | Race condition inscription email dupliqué | Capturer l'erreur Sequelize UNIQUE et retourner 409 |
| F-M5 | A05 | PGAdmin credentials admin/admin en dev | Changer dans .env dev |
| F-M6 | A05 | Redis sans mot de passe en dev | Définir REDIS_PASS dans .env dev |
| F-M7 | A09 | Log injection possible dans errorHandler | Sanitiser err.message avant log |
| F-M8 | A09 | Accès 403 non loggés en production | Ajouter logger.warn sur les refus d'accès |

---

## Points positifs confirmés

- ✅ Aucune injection SQL — Sequelize utilisé avec paramètres séparés
- ✅ Aucun SSRF détecté
- ✅ Rate limiting sur routes d'auth (5 tentatives / 15 min)
- ✅ Rotation des refresh tokens implémentée
- ✅ Hash SHA-256 pour les reset tokens
- ✅ Bcrypt coût 10 pour les mots de passe
- ✅ CORS restreint aux origines connues
- ✅ HSTS + HTTPS via Traefik en test/prod
- ✅ `package-lock.json` présent, intégrité des dépendances assurée
- ✅ Versions dépendances récentes (Express 4.21, Helmet 8.2, JWT 9.0, multer 2.1)
- ✅ Vérification de propriétaire en place sur Diagramme (userId check avant read/update/delete)
- ✅ Messages d'erreur génériques en production (errorHandler)

---

## Credentials à révoquer immédiatement

> Le fichier `.env` contient des secrets réels de production. Ce fichier est dans `.gitignore` et ne doit jamais être commité. Vérifier l'historique git avec `git log --all --full-history -- .env`.

Les secrets suivants sont actifs et doivent être régénérés si le `.env` a été exposé :
- `S3_ACCESS_KEY` / `S3_SECRET_KEY` — Infomaniak Swiss Backup
- `SMTP_PASS` — Hostinger SMTP
- `CLOUDFLARE_API_TOKEN` — Cloudflare
- `AUTH_JWT_SECRET` — si exposé, toutes les sessions actives sont compromises

---

## Dette technique identifiée

- Le modèle `User` manque du champ `validEmailCodeExpiresAt` (voir H4 ci-dessus)
- La table `Storage` (fichiers S3) ne mappe pas `userId ↔ s3Key`, ce qui rend l'ownership impossible à vérifier côté API
- `generateToken.js` était historiquement appelé pour des tokens non-critiques — vérifier tous les call sites après correction
