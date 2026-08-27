# Compte rendu de pilotage — MyMemoMaster

**Date d'arrêté des mesures** : 2026-08-27
**Périmètre** : projet Odoo `MyMemoMasterRNCP` (id 15, 279 tâches) + dépôt Git + SonarCloud + suites de tests locales.
**Taux journalier retenu** : 300 €/JH. **Conversion** : 1 JH = 8 h (calendrier de ressource Odoo « Standard 40 hours/week », `hours_per_day = 8`).

---

## 1. Tableau de bord — les 7 indicateurs

| Dimension | Indicateur | Unité | Valeur mesurée | Fiabilité |
|---|---|---|---|---|
| Avancement | Tâches validées / total | % | **5,7 %** au sens de l'étape Odoo « validé » (16/279) — **60,6 %** au sens de l'état « Terminé » (169/279) — **92,3 %** sur le seul périmètre MVP (169/183) | ⚠️ Trois lectures divergentes (voir §2) |
| Coûts | JH consommés × 300 €/j | € | **330 712 €** (1 102,4 JH — charge planifiée des tâches terminées) ; enveloppe totale planifiée **341 212 €** (1 137,4 JH) | ⚠️ Proxy : aucune saisie de temps réel |
| Délais | Dates réelles vs Gantt prévisionnel | jours d'écart | **+127 j (médiane)** sur les 8 tickets appariables ; amplitude +73 à +216 j. Fin de Gantt 2026-05-08 dépassée de **111 jours** | ⚠️ Aucune date de fin réelle dans Odoo |
| Risques | Dépendances bloquantes non levées | nb | **185 liens** de dépendance ouverts, portés par **79 verrous** distincts, immobilisant **92 tâches** — plus **6 dépendances d'infrastructure** externes ouvertes | ✅ Mesure directe |
| RH | Charge par profil / capacité disponible | JH | **1 128,6 JH pour 254 JH de capacité = 444 %** sur un seul contributeur ; 3 contributeurs à 80,6 JH (31,7 %) ; 3 membres à 0 JH | ✅ Mesure directe |
| Qualité | Couverture de tests SonarQube | % | **0,0 %** (analyse SonarCloud du 2026-08-27 09:39 UTC) — couverture réelle non publiée : **86,6 %** mesurée localement sur l'API | ❌ Indicateur non alimenté |
| Qualité | Non-conformités RGAA | nb | **0** sur les 5 critères outillés (79 fichiers `.vue` ré-audités ce jour) | ⚠️ Périmètre outillé, pas les 106 critères |

---

## 2. Avancement — 92,3 % du MVP, 0 % du backlog

Le chiffre dépend entièrement de la définition retenue, et les trois définitions disponibles dans Odoo ne coïncident pas :

| Lecture | Numérateur / dénominateur | % |
|---|---|---|
| Étape Kanban « validé » | 16 / 279 | 5,7 % |
| État de tâche « Terminé » (`1_done`) | 169 / 279 | 60,6 % |
| État « Terminé » sur le périmètre MVP (blocs `M-*` et `S-*`) | 169 / 183 | 92,3 % |
| Idem, tâches élémentaires seules (hors Synthèses) | 157 / 168 | 93,5 % |

**Ce qui explique l'écart** : le dénominateur de 279 inclut 95 tâches des blocs `C-*` (confort) et `W-*` (souhaits) — chatbot, gamification, chat de groupe, connecteur ENT, tutorat — **toutes en étape « spécification », aucune démarrée, aucune chiffrée**. Elles constituent un backlog d'évolutions, pas un reste-à-faire engagé. Les mélanger au MVP fait perdre 32 points d'avancement.

**Anomalie de tenue du tableau** : seules 16 tâches portent l'étape « validé » alors que 169 sont à l'état « Terminé », et les blocs `M-00b` et `S-06` sont encore en étape « en cours » / « vérification » alors que leur contenu est livré et déployé en production. L'étape Kanban n'est pas maintenue à jour ; **l'état de tâche est le seul champ exploitable**.

**Reste à faire sur le MVP** : 11 tâches élémentaires, 280 h — dont l'essentiel du bloc `M-00b` (infrastructure, CI/CD, exploitation).

---

## 3. Coûts — 330 712 € consommés au barème

| Base | Heures | JH | Coût à 300 €/JH |
|---|---|---|---|
| Charge planifiée totale (tâches élémentaires) | 9 099 h | 1 137,4 | **341 212 €** |
| Dont tâches à l'état « Terminé » | 8 819 h | 1 102,4 | **330 712 €** |
| Reste à faire MVP | 280 h | 35,0 | **10 500 €** |
| Backlog `C-*` / `W-*` (95 tâches) | non chiffré | — | **inconnu** |

**Deux réserves, à énoncer avant tout usage de ces chiffres :**

1. **Ce sont des charges planifiées, pas du temps consommé.** Aucune feuille de temps n'est saisie dans Odoo : le champ des heures effectives est vide sur les 279 tâches. « JH consommés » est donc approximé par la charge planifiée des tâches passées à « Terminé » — une hypothèse qui suppose une exécution exactement conforme à l'estimation.
2. **Correction appliquée sur une anomalie de saisie.** La tâche 1337 (`[M-06.15]`, correction sémantique par IA) porte 645 h, valeur recopiée du total de son bloc lors d'une édition externe le 2026-08-27 ; sa charge de gabarit est de 70 h. Le brut Odoo (9 674 h / 362 775 €) a été ramené à 9 099 h. **Sans cette correction, le coût est surévalué de 21 563 €.**

**Cohérence des totaux à surveiller** : les heures portées par les tâches « Synthèse » ne correspondent à la somme de leurs sous-tâches dans **aucun** des 16 blocs chiffrés (écarts de −995 h à +471 h). Toute restitution qui s'appuierait sur les totaux de bloc plutôt que sur les tâches élémentaires produirait un chiffre faux.

---

## 4. Délais — +127 jours d'écart médian

**Fenêtre prévisionnelle (Gantt Odoo)** : 2025-05-20 → 2026-05-08, soit 254 jours ouvrés.
**Réalité** : premier commit du dépôt le 2024-10-03, 174 journées de commits, dernière livraison le 2026-08-27 — soit **111 jours calendaires au-delà de la fin de Gantt**, avec du reste-à-faire encore ouvert.

**Mesure fine** : Odoo ne contient **aucune date de fin réelle** (champ `date_end` vide sur les 279 tâches), l'écart n'est donc pas calculable dans l'outil. Il a été reconstitué en appariant les codes de tickets du journal de livraison (`.agents/CHANGELOG_AGENT.md`, 95 entrées datées) avec les échéances Odoo. **8 tickets seulement** sont appariables avec une échéance :

| Bloc | Tickets appariés | Écart médian | Échéance Gantt la plus tardive | Livraison réelle la plus tardive |
|---|---|---|---|---|
| M-06 | 2 | +187 j | 2026-01-23 | 2026-08-27 |
| S-01 | 1 | +125 j | 2026-02-20 | 2026-06-25 |
| S-02 | 4 | +127 j | 2026-04-15 | 2026-06-27 |
| S-06 | 1 | +163 j | 2026-02-06 | 2026-07-19 |
| **Ensemble** | **8** | **+127 j** (min +73, max +216) | — | — |

**Interprétation** : le Gantt est un rétro-planning saisi le 2026-05-14, postérieurement au démarrage effectif du développement. Les deux calendriers ne décrivent donc pas la même chose — l'écart mesuré caractérise la distance entre le planning de référence du dossier et la chronologie réelle du dépôt, pas une dérive de pilotage constatée au fil de l'eau.

**Retards secs** : 6 tâches non terminées ont une échéance dépassée, pour 280 h (35 JH, 10 500 €).
**Angle mort** : 125 tâches élémentaires sur 254 n'ont ni date de début ni échéance — elles sont invisibles du Gantt et de tout calcul d'écart.

---

## 5. Risques — 185 dépendances bloquantes ouvertes

### 5.1 Dépendances de tâches (Odoo)

| Mesure | Valeur |
|---|---|
| Liens de dépendance non levés | **185** |
| Tâches immobilisées par ≥ 1 dépendance ouverte | 92 (dont 80 élémentaires) |
| Tâches verrouillantes distinctes (non terminées, bloquant d'autres) | 79 |

**Verrous les plus structurants :**

| Tâche verrouillante | Tâches bloquées | Étape |
|---|---|---|
| `[C-01.04]` Génération de Leitner par IA — Service | 11 | spécification |
| `[W-01.04]` Chatbot — Service conversationnel (RAG) | 4 | spécification |
| `[C-04.04]` Chat de groupe — API messages | 4 | spécification |
| `[C-01.03]` Génération de Leitner par IA — Benchmark | 4 | spécification |

**Lecture** : la totalité des blocages porte sur le backlog `C-*` / `W-*`, non démarré. **Aucune dépendance ouverte ne bloque le MVP** — le chiffre de 185 mesure la profondeur du backlog, pas un risque d'exécution immédiat.

### 5.2 Dépendances d'exploitation (hors Odoo, journal de livraison)

Six points bloquants ou à risque sont ouverts sur l'infrastructure, dont un **bloquant de niveau 1** :

| # | Dépendance non levée | Impact | Levée |
|---|---|---|---|
| 1 | Secrets GitHub `KUBECONFIG_PREPROD` / `KUBECONFIG_PROD` pointent l'ancien cluster | **Le déploiement continu échoue** | Régénérer les secrets |
| 2 | `metrics-server` non fonctionnel (certificats kubelet sans IP SAN) | Pas de `kubectl top`, pas de HPA, ressources API non mesurées | Décision utilisateur en attente |
| 3 | Kubeconfig `cluster-admin` stocké en secret CI | Compromission = pleins pouvoirs sur le cluster prod | ServiceAccount CI dédié (reporté) |
| 4 | Filtrage des plages Cloudflare non appliqué sur 80/443 | Origine joignable en direct | Nécessite un accès OpenStack non fourni |
| 5 | Envoi d'e-mails lié à l'IP de sortie du cluster autorisée chez Brevo | Un changement d'IP coupe les inscriptions | Surveillance après toute opération réseau |
| 6 | IP source réelle masquée par le SNAT du load balancer Octavia | Logs d'accès non exploitables | PROXY protocol ou élargissement `proxy-real-ip-cidr` |

---

## 6. RH — 444 % de charge sur un contributeur

Capacité de référence : **254 JH par personne** sur la fenêtre de Gantt (jours ouvrés).

| Contributeur | Charge (h) | Charge (JH) | Charge / capacité | Tâches élémentaires |
|---|---|---|---|---|
| Frederic Macabiau | 9 029 | 1 128,6 | **444,3 %** | 252 |
| Achouak Dairak | 645 | 80,6 | 31,7 % | 1 |
| Isra Guesmi | 645 | 80,6 | 31,7 % | 1 |
| Ouassim Djekoun Hocine | 645 | 80,6 | 31,7 % | 1 |
| Antho | 0 | 0 | 0 % | 0 |
| Gaia Ducournau | 0 | 0 | 0 % | 0 |
| Valentin Carles | 0 | 0 | 0 % | 0 |

**Constats :**

- **252 des 254 tâches élémentaires sont assignées à une seule personne**, pour 4,4 fois la capacité individuelle de la fenêtre. Le plan de charge tel qu'il est saisi n'est pas réalisable par l'équipe déclarée.
- Les 80,6 JH des trois contributeurs suivants proviennent **exclusivement de la tâche 1337**, dont les 645 h sont elles-mêmes l'anomalie de saisie décrite au §3. Corrigée à 70 h, leur charge tombe à **8,75 JH chacun (3,4 %)**.
- Trois membres de l'équipe n'apparaissent que sur des tâches « Synthèse », donc **avec 0 JH de charge élémentaire**.
- Aucun profil (développeur, ops, designer…) n'est renseigné : la ventilation est nominative, pas par profil. L'indicateur « charge par profil » **n'est pas alimentable en l'état**.

---

## 7. Qualité — couverture de tests et accessibilité

### 7.1 Couverture SonarQube : 0,0 %

L'analyse SonarCloud tourne bien à chaque push sur `main` (dernière : **2026-08-27 09:39 UTC**), mais **aucun rapport `lcov` ne lui est transmis** : la CI n'exécute pas les tests avec l'option de couverture et `sonar.javascript.lcov.reportPaths` n'est pas renseigné. L'indicateur affiche donc **0,0 %**, ce qui ne reflète pas l'état réel du projet.

**Couverture réellement mesurée le 2026-08-27** (exécution locale des suites) :

| Périmètre | Instructions | Lignes | Branches | Fonctions | Tests |
|---|---|---|---|---|---|
| API (Jest) | **86,6 %** | 87,21 % | 68,99 % | 85,91 % | 1 545 tests / 84 suites, tous verts |
| Front (Vitest) | non mesurable | — | — | — | 685 tests / 44 fichiers, tous verts |

La couverture front n'est pas mesurable sans ajouter la dépendance `@vitest/coverage-v8` (absente du projet — ajout à valider, conformément à la règle sur les dépendances externes).

**Autres mesures SonarCloud du jour** : 33 940 lignes de code, 9 bugs, 28 vulnérabilités, 704 code smells, 2,5 % de duplication, dette technique 4 594 min ≈ 9,6 JH (**≈ 2 873 €**). Notes : maintenabilité **A**, fiabilité **D**, sécurité **D**. Ces 37 anomalies (bugs + vulnérabilités) ne sont traitées dans aucun ticket ouvert.

### 7.2 Non-conformités RGAA : 0

Audit statique ré-exécuté ce jour sur **79 fichiers `.vue`** (contre 73 lors de la campagne du 2026-07-06) :

| Critère RGAA | Avant campagne | Aujourd'hui |
|---|---|---|
| 11.1 — champ sans nom accessible | 111 | **0** |
| 7.1 — clic sans équivalent clavier | 21 | **0** |
| 11.9 — bouton symbole sans nom accessible | 14 | **0** |
| 1.1 — image sans `alt` | 0 | **0** |
| 8.3 — langue de page | `fr` | `fr` |
| 13.x — zones `aria-live` | 1 fichier | 4 fichiers |
| **Total** | **135** | **0** |

Non-régression assurée par 4 tests axe-core exécutés à chaque push.

**Réserve de portée** : le zéro porte sur **5 critères outillés**, pas sur les 106 critères du RGAA 4. Trois angles morts subsistent : contrastes non mesurés (jsdom ne calcule pas les styles), aucun test lecteur d'écran réel (NVDA/VoiceOver), et axe-core limité à 4 composants montés isolément. **La formulation défendable est « 0 non-conformité sur le périmètre outillé », pas « site conforme RGAA ».**

---

## 8. Synthèse et actions recommandées

**Ce que disent les mesures** : le produit est livré et déployé (MVP à 92,3 %, production fonctionnelle, 2 230 tests verts, 0 non-conformité RGAA outillée). **Le pilotage, lui, est instrumenté à vide** — quatre des sept indicateurs ne sont pas alimentés par les données qu'ils supposent.

| Priorité | Action | Indicateur débloqué | Charge |
|---|---|---|---|
| **P0** | Régénérer les secrets `KUBECONFIG_*` | Risques (CD à l'arrêt) | < 0,5 JH |
| **P0** | Publier le `lcov` vers SonarCloud (couverture en CI + `sonar.javascript.lcov.reportPaths`) | Qualité — couverture passerait de 0 % à ~86 % | ~1 JH |
| **P1** | Aligner les étapes Kanban sur l'état réel des 169 tâches terminées | Avancement (une seule lecture au lieu de trois) | ~1 JH |
| **P1** | Corriger la tâche 1337 (645 h → 70 h) et réconcilier les totaux des 16 Synthèses | Coûts (−21 563 € d'écart), RH | ~0,5 JH |
| **P1** | Ouvrir un ticket sur les 9 bugs et 28 vulnérabilités SonarCloud | Qualité (fiabilité D, sécurité D) | à estimer |
| **P2** | Saisir les dates de fin réelles, ou acter que l'écart de délai se mesure hors Odoo | Délais (0 date réelle sur 279 tâches) | ~1 JH |
| **P2** | Renseigner un profil par contributeur et réassigner les 252 tâches concentrées | RH (« charge par profil » non alimentable) | ~1 JH |
| **P2** | Dater les 125 tâches élémentaires sans échéance | Délais (49 % du backlog hors Gantt) | ~1 JH |
| **P3** | Chiffrer les 95 tâches `C-*` / `W-*` | Coûts (reste à faire du backlog inconnu) | ~2 JH |

---

## Annexe — reproductibilité des mesures

| Indicateur | Commande / source |
|---|---|
| Avancement, coûts, délais, risques, RH | `odoo-plugin/odoo_cli.py read project.task` sur le projet 15 (279 tâches) |
| Couverture API | `cd my_memo_master_api && npx jest --coverage` |
| Tests front | `cd my_memo_master_front && npx vitest run` |
| Mesures SonarCloud | API publique `measures/component`, projet `entrezunfredici_MyMemoMaster` |
| Non-conformités RGAA | `cd my_memo_master_front && node scripts/audit-a11y.mjs` |
| Dates de livraison réelles | `.agents/CHANGELOG_AGENT.md` (95 entrées datées) + `git log` |
