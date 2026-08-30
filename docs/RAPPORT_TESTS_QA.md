# Rapport de tests — parcours E2E et charge (QA.03 · QA.05 · QA.06)

> **Objet** : lever les trois tâches QA relevées comme non confirmées au [§7.3 de COMPTE_RENDU_METRIQUES.md](COMPTE_RENDU_METRIQUES.md) — elles portaient l'étape « validé » alors que le dépôt ne contenait ni dépendance Playwright pour des parcours, ni outil de charge.
> **Date d'exécution** : 2026-08-29 · **Exécutant** : agent IA, sur poste de développement.
> **Rejouable** : job `e2e_and_load` de [.github/workflows/ci.yml](../.github/workflows/ci.yml), sur `main` et `staging`.

---

## 1. Ce qui est couvert, et ce qui ne l'est pas

| Tâche | Objet | Statut |
|---|---|---|
| `QA.03` | Parcours E2E étudiant | ✅ Couvert — 2 tests |
| `QA.05` | Parcours E2E enseignant | ✅ Couvert — 2 tests |
| `QA.06` | Rapport couvrant E2E et charge | ✅ Ce document |

**Ce que ces tests prouvent** : l'authentification établit une session utilisable ; les routes `private: true` deviennent accessibles avec elle et redirigent sans elle ; l'application rend **deux vues différentes selon le rôle** sur la même URL ; l'API tient une charge de 10 utilisateurs simultanés sans erreur.

**Ce qu'ils ne prouvent pas** : la justesse fonctionnelle de chaque écran. Ce sont des parcours de bout en bout, pas des tests de comportement métier — ceux-ci relèvent des 1 554 tests API et 689 tests front. Aucun test de rupture n'a été mené : on mesure un régime nominal, pas un point de saturation.

---

## 2. Parcours E2E — QA.03 et QA.05

Outil : Playwright (Chromium), config [my_memo_master_front/playwright.e2e.config.js](../my_memo_master_front/playwright.e2e.config.js), specs dans [my_memo_master_front/e2e/](../my_memo_master_front/e2e/).

### Résultat : 5 tests, 5 réussis (13,4 s)

| Test | Ce qu'il vérifie |
|---|---|
| QA.03 — se connecte et atteint les écrans privés | Connexion par le **formulaire réel**, puis `/flashcards`, `/subjects`, `/calendar` atteints sans redirection vers `/auth` |
| QA.03 — voit la vue **ÉTUDIANT** de l'espace classe | `/classroom` affiche « Rendus à remettre » **et pas** « Analyse pédagogique » |
| QA.05 — voit la vue **ENSEIGNANT** de l'espace classe | La même URL affiche « Analyse pédagogique » **et pas** « Rendus à remettre » |
| QA.05 — atteint le tableau de progression | `/kpi` accessible avec une session enseignant |
| Contrôle négatif — sans session | `/flashcards` renvoie vers `/auth` |

**Le contrôle négatif n'est pas décoratif.** Sans lui, rien ne prouverait que les quatre premiers tests doivent quoi que ce soit à l'authentification : une route restée ouverte les satisferait tout autant.

**Les assertions négatives non plus.** Vérifier que la vue enseignant est absente d'un parcours étudiant est ce qui distingue « la page s'affiche » de « le rôle est respecté ».

### Deux faits de domaine rencontrés

**Sans groupe classe, les rôles sont indiscernables.** `/classroom` affiche « Aucun groupe. » pour tous les rôles, tout le reste étant derrière `v-if="currentGroup"`. Un parcours qui ne crée pas de classe ne peut donc rien prouver sur les rôles. L'état est monté via l'API par [e2e/global-setup.js](../my_memo_master_front/e2e/global-setup.js) — pratique standard : *monter l'état par l'API, asserter par l'interface*.

**Un enseignant ne peut pas créer de groupe.** `ClassGroupService.create` n'autorise que les rôles 1 (admin plateforme) et 4 (admin établissement). Le parcours enseignant ne commence donc pas par « créer une classe » : c'est un administrateur qui la crée et y rattache l'enseignant. La préparation reproduit ce cheminement réel plutôt qu'un raccourci.

---

## 3. Test de charge — QA.06

Outil : k6 en conteneur (`grafana/k6`), scénario [load-tests/api-load.js](../load-tests/api-load.js). Journal brut : `load-tests/results/run.log`.

### Contexte d'exécution — à lire avant les chiffres

| Paramètre | Valeur |
|---|---|
| Cible | `http://api:3000` — **l'API directement**, sans passer par Traefik |
| Environnement | Stack `docker-compose` locale (poste de développement), **pas la production** |
| Montée en charge | 0 → 10 VU sur 30 s, palier 1 min, descente 15 s |
| Durée | 1 min 45 s |
| Limiteur de débit | **Désactivé** (`RATE_LIMIT_DISABLED=true`) |

**Le limiteur désactivé change le sens des chiffres.** En fonctionnement normal, `apiLimiter` plafonne à 500 requêtes / 15 min par utilisateur (~33/min) sur tout `/api/v1`. Sans neutralisation, ce test aurait mesuré le limiteur et non l'API : plafond atteint en quelques secondes, tout le reste en 429. **Les résultats décrivent donc la capacité de l'API derrière le limiteur, pas le débit qu'un utilisateur peut réellement obtenir.**

De même, `/users/login` porte son propre `authLimiter` : le scénario ne se connecte **qu'une fois**, dans `setup()`. Marteler le login aurait mesuré l'anti-force-brute, déjà couvert par `security.test.js`.

### Résultats — tous les seuils tenus

| Métrique | Mesure | Seuil | |
|---|---|---|---|
| Requêtes HTTP | **3 258** (30,9 req/s) | — | |
| Taux d'échec | **0,00 %** (0 sur 3 258) | < 1 % | ✅ |
| Latence médiane | 1,76 ms | — | |
| Latence p90 | 2,92 ms | — | |
| **Latence p95** | **3,45 ms** | < 800 ms | ✅ |
| Latence max | 140,35 ms | — | |
| Réponses 429 | **0,00 %** | == 0 | ✅ |
| Assertions | **3 256 / 3 256** (100 %) | > 99 % | ✅ |
| Itérations | 814, 0 interrompue | — | |

Le seuil `rate_limited_responses == 0` est un **garde-fou de validité de la mesure**, pas un critère de performance : si des 429 apparaissaient, cela signifierait que le limiteur n'a pas été neutralisé et que tous les autres chiffres seraient à jeter.

Endpoints sollicités, tous vérifiés présents dans les routes : `GET /health` (hors limiteur), `GET /users/registration-status` (sans authentification), `GET /subjects` et `GET /users/:id` (authentifiés).

### Lecture

La latence p95 à 3,45 ms pour 230 fois moins que le seuil montre que l'API n'est pas sollicitée à un niveau significatif. **Ce test atteste d'une absence de régression grossière, pas d'une capacité de montée en charge.** Établir une capacité réelle demanderait un test de rupture sur une infrastructure représentative de la production — ce qui n'est pas l'objet de `QA.06` et n'a pas été fait.

---

## 4. Reproduire

```sh
# 1. Stack complète, avec comptes de test et limiteur neutralisé
SEED_E2E_USERS=true RATE_LIMIT_DISABLED=true \
  docker compose --profile dev up -d --build

# 2. Parcours E2E (QA.03 / QA.05)
cd my_memo_master_front && npm run test:e2e

# 3. Charge (QA.06)
docker run --rm -i --network my_memo_master_dev_network \
  -e BASE_URL=http://api:3000 \
  -e E2E_STUDENT_EMAIL=e2e-student@mymemomaster.local \
  -e E2E_STUDENT_PASSWORD='E2eStudent1234!' \
  grafana/k6 run - < load-tests/api-load.js
```

> **Sous Git Bash (Windows)** : l'option `--summary-export=/out/summary.json` échoue, MSYS réécrivant `/out/` en chemin Windows. Préfixer par `MSYS_NO_PATHCONV=1` ou se contenter du journal de sortie.

Le nom du réseau suit `ENVIRONMENT` : `my_memo_master_dev_network` en local, `my_memo_master_ci_network` en CI.

---

## 5. Limites et dette

- **Aucun test de rupture** : le régime testé (10 VU) est nominal. Le point de saturation reste inconnu.
- **Charge mesurée hors production** : stack Docker locale, base vide, limiteur désactivé, Traefik contourné. Rien de tout cela ne vaut pour l'infrastructure Kubernetes déployée.
- **Parcours volontairement courts** : ils attestent l'accès et la distinction des rôles, pas les fonctionnalités métier de chaque écran.
- **Les comptes de test sont créés par un seeder** ([20260829000001-seed-e2e-users.js](../my_memo_master_api/seeders/20260829000001-seed-e2e-users.js)) verrouillé par `SEED_E2E_USERS=true` **et** `NODE_ENV !== 'production'`. Les seeders étant rejoués au démarrage de chaque pod API, production comprise, ce double verrou n'est pas une précaution superflue.
- **Le job CI est limité à `main` et `staging`** : il monte la stack complète et coûte plusieurs minutes. Une régression introduite sur une branche de fonctionnalité n'est donc vue qu'à la fusion.
