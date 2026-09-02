# Rapport de tests final consolidé — MyMemoMaster

> **Ticket** : `DOC.07` — Rapport de tests final consolidé (tous types de tests).
> **Date de consolidation** : 2026-09-02 · **Exécutant** : agent IA, sur poste de développement.
> **Nature du document** : ce rapport ne rejoue pas chaque type de test à chaque publication — il consolide,
> pour chacun, soit une exécution fraîche du jour (marquée **[REJOUÉ 2026-09-02]**), soit la dernière preuve
> déjà produite et datée dans le dépôt (marquée **[REPRIS, non rejoué]**, avec sa date d'origine). Un chiffre
> repris n'est jamais présenté comme mesuré aujourd'hui.
> **Branche** : `dev_back_ia`. La CI de ce dépôt n'exécute que le job `api` sur les branches `dev_back_*`
> (voir §7) — les suites front, E2E et SonarQube de cette session ont donc été rejouées **localement**, pas
> lues depuis un run CI de cette branche.

---

## 0. Synthèse

| # | Type de test | Résultat | Statut | Preuve |
|---|---|---|---|---|
| 1 | Unitaires/fonctionnels API (Jest) | **1732/1732**, couverture 82,94 % | ✅ [REJOUÉ] | §1.1 |
| 2 | Unitaires/fonctionnels front (Vitest) | **738/738**, couverture 59,5 % | ✅ [REJOUÉ] | §1.2 |
| 3 | Accessibilité — statique (RGAA outillé) | **0/83** non-conformité | ✅ [REJOUÉ] | §4.1 |
| 4 | Accessibilité — runtime axe-core (jsdom) | **20/20** (inclus dans #2) | ✅ [REJOUÉ] | §4.2 |
| 5 | Accessibilité — contraste réel (Playwright) | 8/8 pages | ✅ [REPRIS, 2026-08-30] | §4.3 |
| 6 | Accessibilité — audit manuel 106 critères RGAA | **60/106** verdicts posés, 9 NC corrigées, 3 candidats ouverts | 🟡 En cours [REPRIS, 2026-08-31] | §4.4 |
| 7 | E2E parcours authentifiés (Playwright, `QA.03`/`QA.05`) | 5/5 | ✅ [REPRIS, 2026-08-30, reconfirmé CI 2026-09-01] | §2 |
| 8 | Charge (k6, `QA.06`) | 3 258 req., 0 échec, p95 3,45 ms | ✅ [REPRIS, 2026-08-30] | §3 |
| 9 | Sécurité OWASP Top 10 (audit manuel) | 8 corrigées + 4 corrigées en suivi (M-00b.07b), 1 priorité moyenne ouverte (`A07-M1`) | 🟡 [REPRIS, 2026-06-23 → 2026-07-06] | §5.1 |
| 10 | Sécurité — vulnérabilités SonarQube (scan auto) | 13 → 3 restantes, dont la CRITICAL corrigée | ✅ [REPRIS, 2026-08-30] | §5.2 |
| 11 | Couverture SonarQube (analyse serveur) | 63,9 % | 🟡 [REPRIS, 2026-08-29 — pas de `SONAR_TOKEN` local] | §6 |
| 12 | Lint (ESLint) API + front | 0 erreur (API + front) | ✅ [REJOUÉ] | §1.3 |

**Lecture** : les lignes 1, 2, 3, 4, 12 sont mesurées le jour même de ce rapport. Les lignes 5 à 11 s'appuient
sur des preuves déjà produites, chacune datée et référencée — aucune n'a été rejouée dans cette session, pour
ne pas remonter une stack Docker complète (E2E/charge) ni dépendre d'un accès SonarQube absent en local. Le
détail de chaque ligne, sa limite et sa date exacte suivent ci-dessous.

---

## 1. Tests unitaires et fonctionnels

### 1.1 API (Jest)

```
Test Suites: 96 passed, 96 total
Tests:       1732 passed, 1732 total
```

Couverture (`--coverage`, v8) :

| Statements | Branches | Functions | Lines |
|---|---|---|---|
| 82,94 % (5426/6542) | 69,64 % (2090/3001) | 83,29 % (753/904) | 83,31 % (5030/6037) |

### 1.2 Front (Vitest)

```
Test Files  47 passed (47)
     Tests  738 passed (738)
```

Couverture (`--coverage`, v8) :

| Statements | Branches | Functions | Lines |
|---|---|---|---|
| 59,5 % (10909/18333) | 76,64 % (1418/1850) | 47,69 % (321/673) | 59,5 % (10909/18333) |

**Note sur les deux couvertures** : elles ne sont pas comparables à celle rapportée par SonarQube (§6) — les
dénominateurs diffèrent (fichiers inclus/exclus, seuils). Elles sont mesurées ici avec l'outillage natif de
chaque runner (Jest côté API, `@vitest/coverage-v8` côté front), sans lien avec l'analyse serveur.

### 1.3 Lint

`npx eslint .` : **0 erreur** sur l'API (1 avertissement isolé, sur un fichier généré par la couverture,
hors code source) et **0 erreur/avertissement** sur le front.

---

## 2. Tests E2E — parcours authentifiés (`QA.03` / `QA.05`)

**[REPRIS, non rejoué]** — dernière exécution connue : 2026-08-30 (job `e2e_and_load`, commit `71ce5ee`,
« 5 passed », 4 min 24 s), reconfirmée verte le 2026-09-01 sur un commit ultérieur (`914d37e`) via l'API
GitHub publique. Détail complet, méthode et limites : [docs/RAPPORT_TESTS_QA.md](RAPPORT_TESTS_QA.md) §1-2.

Non rejoué dans cette session : nécessite une stack Docker complète (`docker compose --profile dev up`) et
des comptes de test seedés — hors périmètre d'une consolidation documentaire. Le code des specs
(`my_memo_master_front/e2e/journeys.spec.js`) n'a reçu aucune modification depuis la dernière exécution
verte (vérifiable par `git log`).

---

## 3. Test de charge (`QA.06`, k6)

**[REPRIS, non rejoué]** — même contrainte que §2 (stack Docker requise). Dernière exécution : 2026-08-30,
**3 258 requêtes, 0 échec (< 1 % de seuil), p95 = 3,45 ms (seuil < 800 ms), 0 réponse 429**. Détail, contexte
d'exécution (limiteur de débit désactivé, hors production) et limites (pas de test de rupture) :
[docs/RAPPORT_TESTS_QA.md](RAPPORT_TESTS_QA.md) §3.

---

## 4. Accessibilité RGAA

Quatre niveaux d'outillage, documentés en détail dans [docs/AUDIT_RGAA.md](AUDIT_RGAA.md).

### 4.1 Statique — [REJOUÉ 2026-09-02]

```
node scripts/audit-a11y.mjs
Audit accessibilité RGAA — 83 fichiers .vue analysés
RGAA 11.1 — champ sans nom accessible : 0
RGAA 1.1  — image sans alt : 0
RGAA 7.1  — clic sans équivalent clavier : 0
RGAA 11.9 — bouton symbole sans nom accessible : 0
RGAA 8.3  — <html lang> : fr
Total non-conformités détectées : 0
```

### 4.2 Runtime axe-core (jsdom) — [REJOUÉ 2026-09-02]

**20/20** tests verts (`test/a11y/axe.test.js`, inclus dans la suite Vitest complète du §1.2).

### 4.3 Contraste réel (Playwright/Chromium) — [REPRIS, 2026-08-30]

**8/8 pages** vertes (`e2e-a11y/contrast.spec.js`), non rejoué ici : nécessite un `vite build` +
`vite preview` dédiés. Aucune modification de page publique depuis cette date qui justifierait un doute sur
le résultat.

### 4.4 Audit manuel des 106 critères RGAA 4.1.2 — [REPRIS, 2026-08-31, EN COURS]

**60/106 verdicts posés** (statut du document lui-même : *« journal de travail resumable, pas un livrable
final »* — aucun taux de conformité global n'est donc citable). Sur cette portion auditée : **9
non-conformités trouvées et corrigées** le 2026-08-31 (navigation sans nom accessible, tableaux sans
`<caption>`/`scope`, regroupements de champs sans `<fieldset>`, `autocomplete` manquant, `alt` décoratif
incorrect — vérifié après correctifs : 705/705 tests, 0 régression, 0/79 audit statique). **3 candidats
restent ouverts** par choix (`9.2`, `8.6`, `12.7` — nécessitent une confirmation visuelle/navigation réelle
ou un arbitrage éditorial, non traités ici). Détail : [docs/AUDIT_RGAA_106.md](AUDIT_RGAA_106.md).

---

## 5. Sécurité

### 5.1 Audit manuel OWASP Top 10 — [REPRIS, 2026-06-23 → 2026-07-06]

[docs/SECURITY_AUDIT_OWASP.md](SECURITY_AUDIT_OWASP.md) : **8 vulnérabilités corrigées** dans la session
d'origine (routes sans `authMiddleware`, énumération d'emails, token non cryptographique, Swagger exposé en
production), puis **4 de plus corrigées en suivi** (`M-00b.07b` : refresh token en clair, durée de JWT trop
longue, `Storage.delete` sans vérification de propriétaire, code de vérification email sans expiration) et
**3 corrigées le 2026-07-06** (MIME spoofing, tentatives d'auth non loggées, CSP absente). Reste ouvert à
priorité moyenne : `A07-M1` (pas de révocation JWT en cas de compromission), non traité à ce jour.

### 5.2 Vulnérabilités SonarQube (scan automatique) — [REPRIS, 2026-08-30]

**13 → 3 vulnérabilités restantes**, dont la vulnérabilité CRITICAL (secrets `.env` embarquables dans
l'image API) **corrigée**. Pas de réanalyse dans cette session (pas de `SONAR_TOKEN` en local, même
limitation que §6).

---

## 6. Couverture — analyse SonarQube serveur

**[REPRIS, 2026-08-29]** — dernière analyse effectivement lue : **63,9 %**, quality gate évalué à cette
date. Non rejoué : aucun `SONAR_TOKEN` disponible dans cet environnement (limitation déjà documentée dans
les comptes rendus de pilotage successifs). À ne pas confondre avec les couvertures Jest/Vitest du §1,
mesurées en local le jour même avec un périmètre et des exclusions différents.

---

## 7. État CI/CD au moment de ce rapport

Dernier commit (`ec4341f`, poussé le 2026-09-02T15:36Z) : check-runs GitHub —
`setup` ✅, `test_and_lint (api)` ✅, `SonarQube Analysis` **skipped**, `Parcours E2E + charge` **skipped**.

Ce n'est pas une anomalie : `.github/workflows/ci.yml` (job `setup`) ne fait tourner que le service `api`
sur les branches `dev_back_*` (ici `dev_back_ia`), et les jobs `sonarqube`/`e2e_and_load` sont conditionnés
à `github.ref == main` (ou `staging` pour le second) — ils ne se déclenchent jamais sur une branche de
développement. C'est pourquoi les suites front (§1.2), l'audit statique (§4.1) et le lint front (§1.3) ont
été rejoués **localement** dans cette session plutôt que lus depuis un run CI de cette branche.

---

## 8. Reproduire

```sh
# Unitaires/fonctionnels + couverture
cd my_memo_master_api && npx jest --coverage
cd my_memo_master_front && npx vitest run --coverage

# Lint
cd my_memo_master_api && npx eslint .
cd my_memo_master_front && npx eslint .

# Accessibilité statique
cd my_memo_master_front && node scripts/audit-a11y.mjs

# Accessibilité runtime axe-core (inclus dans la suite Vitest ci-dessus, isolable)
cd my_memo_master_front && npx vitest run test/a11y/

# E2E, charge, contraste : voir docs/RAPPORT_TESTS_QA.md §4 et docs/AUDIT_RGAA.md §1
```

---

## 9. Limites de ce rapport

- **Ce document ne remplace aucun des rapports sources** (`RAPPORT_TESTS_QA.md`, `AUDIT_RGAA.md`,
  `AUDIT_RGAA_106.md`, `SECURITY_AUDIT_OWASP.md`) — il les indexe et les date, avec une exécution fraîche
  uniquement pour ce qui était rejouable sans infrastructure lourde (API/front/statique).
- **L'audit manuel des 106 critères RGAA n'est pas terminé** (60/106) : aucun taux de conformité global
  RGAA n'est donc énonçable comme définitif tant que ce chiffre n'atteint pas 106/106.
- **`A07-M1`** (absence de révocation JWT) reste une dette de sécurité connue et non traitée.
- **La couverture SonarQube (63,9 %) est antérieure** aux couvertures locales mesurées ici (82,94 % API,
  59,5 % front) — périmètres différents, non comparables terme à terme (déjà noté dans `DECISIONS.md`).
- **E2E, charge et contraste n'ont pas été rejoués** dans cette session — seules leurs dernières preuves
  datées sont reprises, avec leur date d'origine explicite à chaque section.
