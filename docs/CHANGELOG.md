# CHANGELOG — Historique du projet MyMemoMaster

> Synthèse chronologique de tout ce qui a été réalisé depuis la création du dépôt.
> **Sources** : historique git (831 commits sur la branche principale, du 2024-10-03 au 2026-07-11) et journal détaillé par ticket [.agents/CHANGELOG_AGENT.md](../.agents/CHANGELOG_AGENT.md) (état module par module, hypothèses, dette).
> Ce document se lit du plus ancien au plus récent : il raconte la construction du projet, phase par phase.

---

## Vue d'ensemble

| | |
|---|---|
| Premier commit | 2024-10-03 (`Create README.md`) |
| Dernier commit synthétisé | 2026-07-11 |
| Commits (branche principale) | ~830 (~900 toutes branches) |
| Contributeurs | Une dizaine — projet d'équipe (2024–début 2026) devenu majoritairement individuel (entrezunfredici, ~63 % des commits) |
| Stack finale | Node.js 22 · Express 4 · Sequelize 6 · PostgreSQL/SQLite · Vue 3 + Vite + Pinia · Docker · Kubernetes (Helm) · GitHub Actions |

**Contributeurs** : entrezunfredici (Frédéric Macabiau), LalbaAnthony, nicolaspoda, Guilhamasse, Jordan (jordanQuin), gaiailou, Georgie1502, Xplit, rlena/Lénaaaa, DHwass, Minjxxe8.

---

## Phase 1 — Amorçage (octobre – novembre 2024)

- Création du dépôt et du README (03/10/2024).
- Squelette de l'API Express : configuration base de données, première documentation Swagger.
- Premières briques CI (`tests.yml`), configuration SonarQube auto-hébergé, `.gitignore`, sécurité initiale.
- Choix du framework front : Angular envisagé puis **abandonné au profit de Vue 3** (commits « Switch to vue », « remove angular from docker & cli », fin novembre 2024).
- Première dockerisation et volumes.

## Phase 2 — Fondations backend en équipe (novembre 2024 – janvier 2025)

Travail parallèle sur branches `dev_back_*` / `dev_front_*`, mergées dans `dev` :

- **Entités de base** : Roles + seeders (LalbaAnthony), Subject et Unit avec routes/controller/service/model/tests (nicolaspoda), Response et Question (Guilhamasse), Users.
- **Système de Leitner** : modèles LeitnerSystem / LeitnerBox / LeitnerCard, associations, seeders, tests unitaires, liaison systèmes↔utilisateurs (nicolaspoda, décembre 2024).
- **Cartes mentales** : premières routes diagramme côté front (Jordan), test de la librairie gojs (finalement non retenue).
- **Interpréteur scientifique** (composant front) : premières formules — fractions, exposants, matrices, vecteurs, dérivées (nicolaspoda, décembre 2024 – janvier 2025).
- Architecture API stabilisée : structure controller → service → model, renommages PascalCase.
- **Infrastructure** : Dockerfiles API/front, PostgreSQL + pgAdmin dockerisés, seeders au démarrage, premiers workflows de déploiement CI/CD (décembre 2024 – janvier 2025, longue série de commits de mise au point).

## Phase 3 — Interpréteur, pipeline et environnements (février – mai 2025)

- **Pipeline CI/CD** consolidé : ESLint ajouté au back puis campagne de correction lint, pipeline complet avec MEP, configuration Apache versionnée (LalbaAnthony, février 2025) ; passage du build front à Vite ; **SonarQube retiré du pipeline** (mars 2025 — serveur auto-hébergé abandonné).
- **Environnement de préprod** : premier déploiement préprod (mars 2025), réseau et compose dédiés.
- **Backend** : entités Fields/FieldTypes (Georgie1502), Test/Question consolidés (Guilhamasse, gaiailou pour les tests unitaires et la doc Swagger), Tutorials, relations et clés étrangères corrigées.
- **Front** : pages Connexion/Inscription (Georgie1502), stores Pinia (roles, auth, tests), ToggleButton + SettingsPage + ProfilePage (gaiailou), CRUD complet des cartes mentales avec filtres (Jordan), palette de symboles et contrôle d'homogénéité des unités dans l'interpréteur (nicolaspoda).
- Import des cartes mentales en base, liaison Leitner ↔ carte mentale (Jordan).

## Phase 4 — Infrastructure serveur : Traefik et HTTPS (juin – août 2025)

- Stabilisation PostgreSQL et docker-compose serveur.
- **Traefik** introduit comme reverse proxy (juillet 2025), configuration réseau, **HTTPS** (août 2025).
- Tâches cron, diagramme de classes (documentation), librairie intro.js testée côté front.
- Améliorations du compose de dev et du proxy préprod.

## Phase 5 — Stabilisation en solo (septembre – décembre 2025)

Le projet devient majoritairement individuel :

- **Auth front réparée de bout en bout** : formulaires inscription/connexion, routes publiques vs privées, redirection des non-authentifiés (PRs #16–#21), refactor des routes front.
- Longue campagne de fiabilisation **docker-compose / déploiement** (septembre – octobre 2025), tentative Google Cloud puis revert.
- **Mind maps** : améliorations éditeur, **autosave** (décembre 2025).
- **OnboardingState** : création de l'état d'onboarding à l'inscription (rlena, novembre 2025), corrigé et mergé en décembre.
- Page Crédits, mise à jour des dépendances back et front, corrections lint.

## Phase 6 — Reprise en équipe élargie et outillage IA (janvier – mai 2026)

- **Sessions Leitner côté front** : page de session, sessions du jour, liaison boîtes/sessions (gaiailou, février – avril 2026).
- **ClassroomPage** : premières pages groupes classes (Georgie1502, février 2026).
- **Correction sémantique des exercices** et flexibilité des formats de dates (DHwass, branches `ia/*`, avril 2026).
- **Calendrier front** initial (Lénaaaa, avril 2026).
- **Migrations Sequelize CLI** introduites (février 2026) — fin du tout-`sync`.
- **Mémoire agent IA** : création de `.agents/` (AGENT.md, conventions, changelog, décisions — février 2026), qui structure toute la suite du développement en tickets documentés (M-xx puis S-xx).
- CI : notifications Discord à chaque exécution (mai 2026), Dockerfiles améliorés.

## Phase 7 — Le grand sprint qualité et fonctionnel (juin 2026)

Mois le plus dense du projet (115 commits), mené en tickets tracés dans [.agents/CHANGELOG_AGENT.md](../.agents/CHANGELOG_AGENT.md) :

**Fonctionnalités**
- **Leitner** : algorithme de répétition espacée finalisé + documentation complète (M-01.13), correction IA/exacte selon le type de carte, stats par boîte.
- **Exercices** : 4 types de questions (ouverte, QCM, texte à trous, phrase à constituer), créateur + éditeur + player, correction côté serveur avec seuils sémantiques, historique des scores (TestResult).
- **Calendrier & planification** : CalendarPage interactive (mois/agenda), séances de révision, échéances, to-do, rappels in-app + email via BullMQ/Redis, NotificationBell (polling 5 min), API Planning (charge + priorités).
- **KPI** : page « Ma Progression », widgets d'alerte, digest quotidien, KPI pédagogiques enseignant, partage de KPI étudiant→enseignant avec consentement (KpiConsent).
- **Groupes classes** : sections, ressources, soumissions avec suivi des rendus, invitations par email, 3 vues (établissement / enseignant / étudiant).
- **Établissements & administration** : CRUD établissements, activation/désactivation de comptes, journal d'audit (AuditLog), page admin plateforme, modération de contenu.
- **Tags & navigation** : système de tags M2M transverse, recherche cross-contenu, navigation par sujet (SubjectsPage), SubjectSelectorComponent avec création inline.
- **Mind maps** : refactor complet de l'éditeur (liste + éditeur séparés, testés), upload d'images migré S3 avec fallback local.

**Qualité, sécurité, infra**
- **Tests** : ~724 tests back (Jest/Supertest) + ~570 tests front (Vitest) — auth, RBAC, algo Leitner, stores, composants.
- **Audit OWASP** complet : 12 vulnérabilités traitées (refresh token hashé avec rotation, reset password hashé, rate limiting auth, sanitisation, magic bytes sur les uploads, clés S3 par utilisateur).
- **Accessibilité RGAA** : campagne 135 → 0 non-conformités, outil d'audit statique maison (`scripts/audit-a11y.mjs`), tests axe-core en CI.
- **Auth durcie** : validation email avec expiration, exigence de caractères spéciaux, doublons → 400, refus loggués.
- **Infra** : migration vers **Kubernetes avec Helm** (préprod/prod), sauvegardes pg_dump automatisées, logs Winston+Morgan, S3, dayjs, `sqlite3` isolé en devDependencies + `npm audit` bloquant en CI.

## Phase 8 — Industrialisation et dossier B2 (juillet 2026)

- **CD Kubernetes validé de bout en bout** : renommage des branches (`test`→`dev`, `preprod`→`staging`), campagne de tests du pipeline (déclenchement par merge, secrets kubeconfig, `helm --atomic`), endpoint `/api/v1/health` pour les readiness probes, caches BuildKit/GHA sur les builds Docker.
- **Observabilité** : métriques Prometheus RED/USE sur un port dédié (9090, hors Ingress).
- **Fiabilité** : cascade de suppression Leitner corrigée en profondeur (FK `ON DELETE CASCADE` aux 2 niveaux).
- **Documentation livrable** : `docs/` devient le point d'entrée unique — manuels de déploiement VPS et Kubernetes, manuel d'utilisation, mémoire de projet, audits OWASP et RGAA, prototype et captures, sources bibliographiques ; rédaction du dossier **B2_RENDU.md** (certification RNCP39583).
- **Parcours guidé** (11/07/2026) : bouton sur la page d'accueil + bandeau persistant guidant l'utilisateur sur les vraies pages — création de la carte mentale → système de Leitner lié → série d'exercices → planification, avec liaison automatique des éléments (matière pré-sélectionnée, séance liée au système) ; store Pinia persisté, 12 tests.
- **SonarCloud** (11/07/2026) : l'analyse statique revient dans la CI via le SaaS SonarCloud (job sur `main`, plan gratuit), remplaçant l'instance auto-hébergée abandonnée en 2025.

---

## Où trouver le détail

- **Journal par ticket** (fichiers touchés, hypothèses, dette) : [.agents/CHANGELOG_AGENT.md](../.agents/CHANGELOG_AGENT.md)
- **Décisions techniques argumentées** (contexte / décision / alternatives / conséquences) : [.agents/DECISIONS.md](../.agents/DECISIONS.md)
- **Synthèse de la mémoire du projet** : [MEMOIRE_PROJET.md](MEMOIRE_PROJET.md)
- **Historique brut** : `git log`
