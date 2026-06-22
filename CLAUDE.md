# CLAUDE.md — Instructions pour Claude Code

> Ce fichier est lu automatiquement par Claude Code à chaque session.
> Il sert de pont vers les fichiers `.agents/` qui contiennent les règles du projet.

---

## Lecture obligatoire en début de session

**Avant toute action, lis ces fichiers dans cet ordre :**

1. [.agents/AGENT.md](.agents/AGENT.md) — comportement général, standards, checklist de livraison
2. [.agents/CONVENTIONS.md](.agents/CONVENTIONS.md) — stack technique, nommage, règles spécifiques au projet
3. [.agents/CHANGELOG_AGENT.md](.agents/CHANGELOG_AGENT.md) — état actuel du code, ce qui a déjà été fait
4. [.agents/DECISIONS.md](.agents/DECISIONS.md) — décisions techniques structurantes déjà prises

Ces fichiers sont la mémoire du projet. Les ignorer entraîne des incohérences avec le travail déjà livré.

---

## Documentation obligatoire en fin de ticket

Après chaque ticket ou tâche significative, tu **dois** mettre à jour :

### `.agents/CHANGELOG_AGENT.md`
- Section "État global" : met à jour le statut du module concerné
- Nouvelle entrée en bas avec : fichiers créés/modifiés, ce qui est utilisable, hypothèses posées, dette éventuelle

### `.agents/DECISIONS.md`
- Ajoute une entrée pour chaque choix technique structurant (format de donnée, pattern d'auth, contournement d'une lib, etc.)
- Format : Contexte / Décision / Alternative écartée / Conséquences

**Ne considère pas un ticket terminé tant que ces deux fichiers ne sont pas à jour.**

---

## Stack technique (rappel)

Node.js 22 · Express.js v4 · Sequelize v6 · PostgreSQL (prod) / SQLite (dev) · Vue 3 + Vite + Pinia · JWT + bcryptjs

---

## Règles rapides

- Architecture stricte **controller → service → model** — jamais de logique métier dans un controller
- Toute route privée est protégée par `Auth.middleware.js` — pas de vérification JWT inline
- Toute validation d'entrée passe par `validate.middleware.js` + un fichier `validators/[Entity].validators.js`
- Les controllers ne font que : try/catch + appel service + réponse HTTP (200/201/400/401/403/404/500)
- Les messages HTTP (erreurs et succès) sont **en français**
- Ne pas ajouter de dépendance externe sans la signaler (voir `CONVENTIONS.md` pour la liste approuvée)
- Les tests couvrent : cas nominal + cas limites + erreurs attendues
- Commits : `[ADD]` nouveau · `[IMP]` amélioration · `[REF]` refacto · `[FIX]` bug
