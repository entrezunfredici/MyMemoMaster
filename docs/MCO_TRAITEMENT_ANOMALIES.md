# MCO — Processus de traitement des anomalies (Bloc 4 / A4.2)

> Livrable de certification — compétences C4.2.1 et C4.2.2.
> Décrit le processus de collecte et de consignation des anomalies, la fiche
> type, et le traitement d'une anomalie réelle rencontrée au cours du projet.

---

## 1. Processus de collecte et de consignation (C4.2.1)

### 1.1 Canaux de détection

| Canal | Type d'anomalie détectée | Signalement |
|-------|--------------------------|-------------|
| Pipeline CI (tests + lint + `npm audit`) | Régressions, vulnérabilités de dépendances | Message Discord automatique à chaque échec (`notify_ci.yml`) |
| Vérification post-déploiement du CD | Service qui ne démarre pas / DB injoignable après mise à jour | Échec du pipeline + logs des conteneurs + message Discord |
| Sonde `GET /api/v1/health` | Indisponibilité de la base en production | `503` + log Winston avec contexte |
| Retours utilisateurs (Discord) | Bugs fonctionnels constatés à l'usage | Remontée sur le serveur Discord du projet |
| Audits ciblés (ex. audit OWASP, audit RGAA) | Failles de sécurité, défauts d'accessibilité | Rapport dédié (`docs/SECURITY_AUDIT_OWASP.md`, `docs/AUDIT_RGAA.md`) |

### 1.2 Consignation

Chaque anomalie est consignée avec les informations nécessaires à sa
**reproduction** puis tracée de bout en bout :

1. **Fiche d'anomalie** (modèle en §2) : symptôme, étapes de reproduction,
   environnement, gravité.
2. **Commit conventionné `[FIX]`** : le message décrit la cause et le correctif
   (convention `.agents/CONVENTIONS.md`).
3. **`.agents/CHANGELOG_AGENT.md`** : entrée détaillant fichiers modifiés,
   hypothèses et dette éventuelle — la traçabilité long terme.
4. **`.agents/DECISIONS.md`** : si le correctif implique un choix structurant
   (ex. changement de format de stockage d'un token).

### 1.3 Modèle de fiche de consignation

```markdown
## Fiche anomalie [ID]
- **Date de détection** :
- **Détectée par** : (CI / sonde / utilisateur / audit)
- **Environnement** : (dev / test VPS / preprod / prod)
- **Gravité** : (bloquante / majeure / mineure)
- **Symptôme** : ce qui est observé
- **Reproduction** : étapes exactes, données d'entrée, résultat attendu vs obtenu
- **Analyse** : cause racine identifiée
- **Correctif** : ce qui a été changé, fichiers concernés
- **Tests** : tests de non-régression ajoutés/adaptés
- **Déploiement** : commit, branche, résultat CI/CD
```

---

## 2. Fiche d'anomalie réelle — exposition d'erreurs internes sur `addCard`

- **ID** : ANO-2026-06-10-01 (commit `0935e05`)
- **Date de détection** : 2026-06-10
- **Détectée par** : revue de code lors des travaux sur le module Leitner
- **Environnement** : dev (présent sur toutes les branches)
- **Gravité** : majeure (sécurité — fuite d'information, OWASP A05)
- **Symptôme** : l'endpoint `POST /leitnercards` renvoie **403 Forbidden pour
  toutes les erreurs**, y compris les erreurs internes imprévues (erreur SQL,
  contrainte violée). Le message brut de Sequelize est exposé au client.
- **Reproduction** :
  1. Authentifié, appeler `POST /leitnercards` avec un `idBox` provoquant une
     erreur DB inattendue (ex. contrainte FK violée).
  2. **Attendu** : `500` avec message générique en français.
  3. **Obtenu** : `403` avec le message d'erreur interne Sequelize dans la réponse.
- **Analyse** : le `catch` du controller traitait uniformément toutes les
  exceptions comme des refus de droits. Aucune distinction entre l'erreur
  *métier* attendue (« Droits insuffisants ») et l'erreur *système*.
- **Correctif** :
  - `services/LeitnerCard.service.js` — l'erreur métier porte désormais
    `error.statusCode = 403` ;
  - `controllers/LeitnerCard.controller.js` — le catch distingue
    `statusCode === 403` (message métier) du fallback `500` (message générique,
    détail logué côté serveur uniquement).
- **Tests** : `test/controllers/LeitnerCard.controller.test.js` — le mock du
  cas 403 porte le `statusCode` ; le cas d'erreur imprévue attend un 500.
- **Déploiement** : commit `0935e05`, CI vert (tests + lint + audit), déployé
  sur l'environnement de test par le pipeline CD.

---

## 3. Création et déploiement du correctif via CI/CD (C4.2.2)

Le traitement d'une anomalie suit le même chemin que toute livraison — le
correctif **profite intégralement de la chaîne d'intégration et de déploiement
continu**, aucun déploiement manuel n'est nécessaire :

```
branche fix (dev_back_* / dev_front_*)
   │  commit [FIX] + tests de non-régression
   ▼
CI (.github/workflows/ci.yml)
   │  npm ci → tests → lint → npm audit (bloquant high/critical)
   │  échec ⇒ notification Discord, pas de déploiement possible
   ▼
merge sur dev
   ▼
CD (.github/workflows/cd.yml)
   │  build des images Docker (cache GHA) → push DockerHub
   │  déploiement VPS test par SSH (docker compose --profile test)
   │  boucle de vérification : tous les services healthy < 2 min, sinon échec + logs
   ▼
notification Discord (✅/❌ Déploiement dev réussi/échoué)
   ▼
promotion staging → preprod (Helm --atomic : rollback auto si échec)
promotion main → prod (Helm --atomic)
```

Points clés :

- **Aucun correctif ne contourne les tests** : le CI est un passage obligé du CD
  (le CD n'est déclenché que par un CI en succès).
- **Rollback maîtrisé** : sur K8s, `helm --atomic` annule automatiquement un
  déploiement raté ; sur le VPS, la procédure de rollback d'image et de
  migration est documentée dans `docs/RUNBOOK.md`.
- **Vérification post-déploiement systématique** : un correctif qui casse le
  démarrage de l'API est détecté par la boucle de healthcheck du CD avant
  d'être considéré comme livré.
