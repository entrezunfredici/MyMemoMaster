# Journal des versions — MyMemoMaster

> Journal des versions déployées (compétence C4.3.2 — Bloc 4 / A4.3).
> Une « version » correspond à un jalon mergé sur une branche de déploiement
> (`dev` → test, `staging` → preprod, `main` → prod) et livré par le pipeline CD.
> Le détail technique complet de chaque livraison est tracé dans
> `.agents/CHANGELOG_AGENT.md` ; ce journal en est la vue synthétique orientée
> exploitation.

Convention de nommage : `AAAA.MM.n` (année.mois.itération), faute de tags git
semver à ce jour (voir recommandation dans `docs/MCO_MAINTENANCE_EVOLUTIONS.md`).

---

## 2026.07.3 — Interpréteur de formules V2 (2026-07-19 → 2026-07-25)

**Nouvelles fonctionnalités**
- Éditeur de formules V2 (MathLive) : palette à onglets (caractères, formules,
  opérateurs, matrices), lettres fraktur, commandes d'extension de matrices
  (+C/+L) fiabilisées par manipulation LaTeX déterministe.
- Correction sémantique enrichie : équivalences algébriques par AST
  (commutativité, `a/b ≡ a·b⁻¹`, termes semblables), convergence des notations
  V1 (`over(1,2)`) et LaTeX (`\frac{1}{2}`).
- Vérification d'homogénéité des unités sur les formules LaTeX annotées.

**Anomalies corrigées**
- Comparaison V1/LaTeX qui échouait sur un corpus mixte (normalisation des deux
  côtés, sans migration de données).
- Corruption `\begin{split}` des matrices via l'API de commande MathLive
  (remplacée par des fonctions pures testées).

---

## 2026.07.2 — Correctif reset password + consolidation docs (2026-07-18)

**Anomalies corrigées**
- Parcours « mot de passe oublié » réparé de bout en bout (commit `fe9c0a9`) :
  limitation des tentatives de reset (migration
  `20260718000000-add-reset-password-attempts-to-user`), validators et pages
  front `ForgotPasswordPage`/`ResetPasswordPage` alignés sur l'API.

**Maintenance**
- Documentation dédupliquée : `docs/CONVENTIONS.md` et `docs/DECISIONS.md`
  supprimés au profit des versions `.agents/` (source unique).

---

## 2026.07.1 — Durcissement sécurité + observabilité K8s (2026-07-06 → 2026-07-12)

**Nouvelles fonctionnalités**
- Endpoint de santé `GET /api/v1/health` (test réel de la connexion DB), ciblé
  par les readiness probes Kubernetes (commit `515bf84`).
- Déploiement Helm unifié (`helm/`) avec `--atomic` (rollback automatique),
  Prometheus par namespace, montée preprod/prod pilotée par variables.
- Compose racine unifié dev/test (`--profile test`) — suppression de
  `server_docker_compose/`.

**Anomalies corrigées**
- Correctifs de l'audit OWASP (ticket M-00b.07b) : refresh token désormais
  hashé SHA-256 en base (fuite DB ne compromet plus les sessions actives).
- Flag Helm inexistant `--rollback-on-failure` remplacé par `--atomic`.

---

## 2026.06.3 — Authentification durcie + RBAC (2026-06-14 → 2026-06-15)

**Nouvelles fonctionnalités**
- Refresh token opaque avec rotation systématique (access token réduit à 15 min),
  logout révoquant côté serveur, intercepteur Axios de renouvellement.
- Middleware RBAC `requireRole` (vérification DB par requête) — 5 rôles système.
- Reset password par token 64 chars hashé SHA-256 (remplace le code 6 chiffres).

**Anomalies corrigées**
- Faible entropie du code de reset password (900 000 valeurs, stocké en clair).

---

## 2026.06.2 — Modules Calendrier, Planning et Rappels (2026-06-10 → 2026-06-13)

**Nouvelles fonctionnalités**
- Événements récurrents avec occurrences matérialisées, échéances (Deadlines)
  liées à une occurrence précise, sessions de révision (calendrier + todo list).
- Score de charge pondéré `GET /planning/load` (cartes ×1, sessions ×3,
  échéances ×5).
- Rappels par BullMQ + Redis (jobs différés à l'heure exacte).

**Anomalies corrigées**
- `addCard` exposait les erreurs internes Sequelize en 403 (fiche
  ANO-2026-06-10-01, `docs/MCO_TRAITEMENT_ANOMALIES.md`).
- 21 vulnérabilités npm du front (1 critique, 12 high) → 0 (commit `057cbfe`).

---

## 2026.06.1 — Socle technique et normalisation (2026-06-03 → 2026-06-06)

**Nouvelles fonctionnalités**
- Architecture controller → service → model, validation express-validator
  centralisée, messages HTTP en français, Swagger sur `/api-docs`.
- Stack conteneurisée : Docker Compose + Traefik, SQLite (dev) / PostgreSQL
  (prod), pool PG configurable, seeders CLI (rôles + admin).
- Modules d'apprentissage : cartes Leitner (intervalles en secondes),
  mind maps, exercices.

**Anomalies corrigées**
- Routes non-REST (`/add`, `/all`) normalisées ; index manquants sur les FK ;
  CORS par fonction (l'en-tête n'est plus posé pour les origines inconnues) ;
  `trust proxy` activé pour un rate limiting correct derrière Traefik.
