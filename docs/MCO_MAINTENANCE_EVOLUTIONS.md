# MCO — Maintenance et axes d'amélioration (Bloc 4 / A4.3)

> Livrable de certification — compétences C4.3.1, C4.3.2 et C4.3.3.
> Recommandations d'amélioration argumentées, traçabilité des versions, et
> exemple de problème résolu à partir d'un retour utilisateur.

---

## 1. Recommandations d'amélioration (C4.3.1)

Chaque recommandation est issue soit des indicateurs du projet (pipeline,
supervision), soit de la dette explicitement documentée dans
`.agents/DECISIONS.md`, et est évaluée en gain / coût / faisabilité.

### R1 — Tags git semver + images Docker taguées (priorité haute)

- **Constat** : les images sont poussées en `:latest` par environnement ; le
  rollback VPS (`docs/RUNBOOK.md`) demande d'« identifier le tag de l'image
  précédente sur DockerHub », ce qui est impossible avec un tag unique écrasé.
- **Recommandation** : taguer chaque merge sur `staging`/`main` (`vX.Y.Z`),
  pousser les images avec ce tag en plus de `:latest`, publier une release
  GitHub reprenant l'entrée du `docs/JOURNAL_VERSIONS.md`.
- **Gain** : rollback fiable en < 5 min (changement d'une variable `.env`),
  traçabilité exacte version ↔ code déployé.
- **Coût** : ~1 jour (étape supplémentaire dans `cd.yml`), aucun impact runtime.

### R2 — Persistance Redis pour les rappels BullMQ (priorité haute)

- **Constat** (documenté dans DECISIONS, 2026-06-12) : Redis tourne sans
  persistance AOF/RDB — un redémarrage du conteneur **perd tous les rappels
  programmés**, silencieusement.
- **Recommandation** : activer `appendonly yes` sur le service Redis et monter
  un volume, comme pour PostgreSQL.
- **Gain** : fiabilité d'une fonctionnalité orientée utilisateur (les rappels
  sont au cœur de la promesse de l'app) ; renforce l'attractivité.
- **Coût** : quelques lignes de `docker-compose.yml`/Helm + un test de
  redémarrage. Négligeable.

### R3 — Alerting proactif sur la disponibilité (priorité moyenne)

- **Constat** : la supervision détecte (health endpoint, probes, Prometheus)
  mais n'alerte pas en dehors des déploiements — une panne survenant entre deux
  déploiements n'est vue que si quelqu'un consulte l'app.
- **Recommandation** : sonde d'uptime externe gratuite (ex. ping de
  `/api/v1/health` toutes les 5 min) branchée sur le webhook Discord existant ;
  à terme, Alertmanager sur le Prometheus K8s.
- **Gain** : temps de détection d'incident ramené de « au prochain usage » à
  ≤ 5 min, sans nouvel outil côté équipe (Discord déjà en place).
- **Coût** : ~½ journée pour la sonde externe ; Alertmanager plus coûteux
  (config + maintenance), justifié seulement quand un cluster K8s est actif.

### R4 — Lien cliquable dans l'email de reset password (priorité moyenne)

- **Constat** (documenté dans DECISIONS, 2026-06-15) : l'utilisateur doit
  copier-coller un token de 64 caractères depuis l'email — UX dégradée,
  identifiée dès la conception du correctif sécurité.
- **Recommandation** : email contenant un lien
  `https://<front>/reset-password?token=…` pré-remplissant le formulaire.
- **Gain** : friction supprimée sur un parcours critique (récupération de
  compte), directement lié à la rétention des utilisateurs.
- **Coût** : ~1 jour front + template email ; aucune modification du modèle de
  sécurité (le token reste hashé côté serveur).

### R5 — Cache des droits Leitner si la charge augmente (différée)

- **Constat** (DECISIONS, 2026-06-06/14) : chaque écriture sur une carte et
  chaque endpoint `requireRole` déclenchent 1-2 requêtes DB de résolution de
  droits — choix assumé pour le MVP mono-instance.
- **Recommandation** : ne rien faire tant que les temps de réponse restent
  bons ; si la latence se dégrade, cache Redis courte durée (30-60 s) des
  droits résolus.
- **Gain potentiel** : suppression de la majorité des requêtes de droits.
- **Coût** : invalidation de cache à gérer (partages, changements de rôle) —
  c'est précisément pourquoi elle est différée jusqu'à un besoin mesuré.

---

## 2. Journal des versions (C4.3.2)

Le journal des versions déployées est maintenu dans
**`docs/JOURNAL_VERSIONS.md`** : pour chaque version (jalon mergé sur une
branche de déploiement), il liste les nouvelles fonctionnalités et les
anomalies corrigées, avec renvoi vers les commits et fiches d'anomalies.

Il s'appuie sur deux niveaux de traçabilité déjà en place :
- les commits conventionnés `[ADD]`/`[IMP]`/`[REF]`/`[FIX]` (historique git) ;
- `.agents/CHANGELOG_AGENT.md` (détail technique exhaustif de chaque livraison :
  fichiers, hypothèses, dette).

---

## 3. Collaboration avec le support / retours utilisateurs (C4.3.3)

### 3.1 Organisation

Le projet étant porté par une petite équipe, le rôle « support client » est
assuré via le **serveur Discord du projet** : les testeurs y remontent leurs
problèmes, le même canal recevant les notifications CI/CD — les retours et
l'état de la plateforme sont visibles au même endroit. Le développeur y répond,
qualifie le problème (fiche d'anomalie, cf. `docs/MCO_TRAITEMENT_ANOMALIES.md`)
et notifie le testeur au déploiement du correctif.

### 3.2 Exemple réel — parcours « mot de passe oublié » (2026-07-18)

- **Contexte du retour** : un testeur ne parvient pas à réinitialiser son mot de
  passe — le parcours échoue entre la demande (`ForgotPasswordPage`) et la
  saisie du nouveau mot de passe (`ResetPasswordPage`).
- **Qualification** : reproduction du parcours complet en environnement de
  test ; le problème vient d'un désalignement entre le front et l'API sur le
  flux de vérification du token, et de l'absence de limite de tentatives.
- **Résolution** (commit `fe9c0a9`) :
  - API — `User.service.js`/`User.controller.js`/`User.validators.js` réalignés,
    ajout d'un **compteur de tentatives de reset** (migration
    `20260718000000-add-reset-password-attempts-to-user`) pour empêcher le
    brute-force du token ;
  - Front — `ForgotPasswordPage.vue` et `ResetPasswordPage.vue` corrigées ;
  - Tests — suites `User.service.test.js` et `User.controller.test.js` adaptées
    (cas nominal, tentatives épuisées, token invalide).
- **Contribution des parties prenantes** : le testeur a fourni le scénario de
  reproduction et validé le correctif sur l'environnement de test après le
  déploiement automatique ; le développeur a réalisé l'analyse, le correctif et
  la documentation (entrées CHANGELOG_AGENT + DECISIONS du 2026-07-18).
- **Boucle fermée** : correctif livré par le pipeline standard (CI vert →
  CD → notification Discord ✅), le testeur informé sur le même canal que sa
  remontée initiale.
