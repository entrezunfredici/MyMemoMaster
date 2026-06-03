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

### [2026-06-03] Messages d'erreur en français
**Contexte** : L'application cible des utilisateurs francophones.  
**Décision** : Tous les messages HTTP (erreurs et succès) retournés par l'API sont en français.  
**Alternative écartée** : Anglais — standard technique mais inadapté aux utilisateurs finaux.  
**Conséquences** : Les messages d'erreur ne peuvent pas être réutilisés tels quels dans un contexte international sans adaptation.
