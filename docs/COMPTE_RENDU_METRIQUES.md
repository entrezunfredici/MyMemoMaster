# Compte rendu de pilotage — MyMemoMaster

**Date d'arrêté des mesures** : 2026-09-03
**Périmètre** : projet Odoo `MyMemoMasterRNCP` (id 15, 350 tâches) + planning d'équipe `17_planning_MyMemoMaster.xlsx` + dépôt Git + **instance SonarQube auto-hébergée** (cluster `pck-dkoyol2`) + suites de tests locales, rejouées à cet arrêté.
**Taux journalier retenu** : 300 €/JH. **Conversion** : 1 JH = 8 h.
**Calendrier de référence** : plan condensé — 3 jours travaillés (mardi, mercredi, jeudi) toutes les 3 semaines, du **07/10/2025** au **18/06/2026** (13 cycles, 39 JH par personne), puis reprise par le seul chef de projet à taux plein jusqu'au **21/07/2026**.
**Durées** : estimation « développeur junior », établie tâche par tâche sur les 192 lignes du planning d'équipe. **C'est un jugement argumenté, pas une mesure** — voir la réserve du §3.

> **Ce qui a changé depuis l'arrêté du 2026-09-01 — vérification ciblée du registre Odoo demandée par l'utilisateur, pas un arrêté complet.** Objet de la session : relire les tâches et sous-tâches actuellement à l'étape « en cours » (`stage_id = 156`) dans le projet Odoo (id 15) et resynchroniser celles qui sont en réalité terminées. Reconnexion directe (`odoo-plugin/odoo_cli.py`, profil `bleu-canard`) : **350 tâches toujours au total**.
>
> **L'incohérence `QA.03`/`QA.05`/`QA.06` signalée à quatre arrêtés consécutifs (2026-08-28 → 2026-09-01) est résolue.** Les trois tâches portent désormais `state = "1_done"`, aligné avec leur étape « validé ». **Ce n'est pas un correctif de cette session** — l'incohérence était déjà résolue au moment de la relecture ; l'origine du changement n'a pas été investiguée ici (aucune commande d'écriture Odoo n'avait été exécutée sur ces trois tâches avant cet arrêté dans les sessions connues), à rapprocher du point de traçabilité déjà ouvert au §8 sur le commit `c874bc7`.
>
> **10 tâches relevées à l'étape « en cours » : 5 tâches « Synthèse » écartées (agrégats sans preuve propre), 1 sous-tâche corrigée, 4 laissées en l'état faute de preuve.** Détail :
>
> | Tâche | Constat | Action |
> |---|---|---|
> | `[M-00b.12]` Documentation déploiement et runbook | Preuve complète dans le dépôt : `docs/RUNBOOK.md`, config Traefik (`traefik/docker-compose.yml`), `scripts/backup.sh`, CI — déjà cités comme preuve de tâches validées au §2 | **Corrigée à cet arrêté**, sur confirmation explicite de l'utilisateur : `stage_id` → « vérification », `state` → `1_done` |
> | `[C-01.10]` Génération automatique de Leitner par IA — Tests qualité génération | Porte déjà `state = "1_done"` (case DoD entièrement cochée dans la description Odoo) **alors que le bloc `C-01` est mesuré à 0/11 dans le dépôt (§7.3)** — aucune trace de code de génération de Leitner par IA | **Non corrigée — signalée, pas traitée.** Incohérence en sens inverse de celle des `QA.0x` : ici c'est le registre qui affirme un acquis que le dépôt dément. Nécessite un arbitrage humain (case cochée par erreur/copiée d'un modèle de tâche, ou périmètre de la sous-tâche distinct de la génération elle-même ?) avant toute écriture |
> | `[PIL.15]` Finalisation livrables projet, archivage documentation | Aucune preuve d'archivage trouvée dans le dépôt ; échéance dépassée (2026-05-26) mais le projet reste ouvert (actions P0/P1 en cours au §8) | Laissée en l'état |
> | `[DOC.07]` Rapport de tests final consolidé (tous types de tests) | `docs/RAPPORT_TESTS_QA.md` existe mais son propre objet, énoncé en tête du document, se limite à `QA.03`/`QA.05`/`QA.06` (E2E + charge) — ne couvre pas unitaire/RGAA/Sonar en un rapport consolidé unique | Laissée en l'état |
> | `[DOC.13]` Démo fonctionnelle enregistrée (screencast parcours enseignant) | Un enregistrement vidéo n'est normalement pas versionné dans le dépôt Git — absence de preuve locale non probante en soi | Laissée en l'état, à confirmer par l'utilisateur (lien externe éventuel) |
>
> **Non recompté à cet arrêté** : Avancement, Coûts, Délais, RH, Risques (graphe de dépendances) et Qualité — seule la vérification ciblée demandée a été faite. Une tentative de recompte du graphe de dépendances a été écartée en cours de session : le script ad hoc cité aux arrêtés précédents (`analyze_odoo.py`) n'est pas versionné dans le dépôt et une reproduction indépendante a donné un résultat différent (175 liens / 88 tâches / 75 verrous, contre 183/91/78 cités) sans qu'il soit possible d'arbitrer laquelle des deux méthodologies est correcte sans retrouver le script d'origine — **les chiffres 183/91/78 du tableau de bord ci-dessous restent donc ceux du 2026-08-31, non confirmés ni infirmés ici**. Tous les autres indicateurs restent ceux du 2026-09-01.
>
> ---
>
> ## Mise à jour [2026-09-03, même jour] — tableau de bord recalculé intégralement, demande explicite de l'utilisateur
>
> **Correctif sur l'encadré ci-dessus, à corriger publiquement plutôt qu'à effacer** : `[C-01.10]` y était présenté comme une incohérence (« `state = "1_done"` alors que le bloc `C-01` est mesuré à 0/11 dans le dépôt ») en se fiant au texte encore en place plus bas dans ce document (§7.3, non révisé depuis le 2026-09-01) plutôt qu'à une relecture fraîche du dépôt. **C'était une erreur.** En creusant pour recalculer le tableau de bord, il apparaît que **le bloc `C-01` (Génération automatique de Leitner par IA) a été entièrement construit et déployé en production entre le 2026-09-01 et cet arrêté** — 21 commits, dont `88394a4`/`814f723`/`72725da`/`8924cbc`/`930dee2`/`4566965`/`d079293`/`6dfcd90` : intégration Mistral (`helpers/mistralConfig.js`), pipeline de génération (`services/AiCardGeneration*.service.js`), OCR/extraction PDF (`services/PdfExtraction.service.js`), quotas (`services/AiQuota.service.js`, `helpers/aiQuotaConfig.js`), 3 nouvelles tables (`AiGenerationBatch`, `AiGeneratedCard`, `AiUsageLog`), interface front (`stores/aiCardGeneration.js`), revue de sécurité/coût dédiée (`C-01.11`, 6 constats corrigés), et déploiement confirmé en prod (`.agents/CHANGELOG_AGENT.md`, entrée du 2026-09-03 : révision Helm 5, `MISTRAL_API_KEY` en place, endpoints publics vérifiés 200). `[C-01.10]` porte donc `state = "1_done"` **à raison** : c'est la même situation que ses 6 tâches sœurs `C-01.04`→`C-01.09`, toutes à l'étape « vérification » (finies côté dépôt, pas encore relues/validées côté registre) — pas une incohérence.
>
> **Odoo mis à jour en conséquence** (même mapping que `[M-00b.12]`, déjà validé par l'utilisateur dans l'encadré ci-dessus) : `[C-01.10]` passée de l'étape « en cours » à « vérification » (`stage_id` 156 → 159), `state` déjà à `1_done` inchangé.
>
> **Les 7 indicateurs recalculés depuis une extraction Odoo fraîche** (350 tâches, inchangé) **et un script de filtrage désormais réutilisable** — `odoo-plugin/reports/perimetre_engage.py`, qui reconstitue et fige le filtrage « périmètre engagé » (248 tâches : les 320 sous-tâches moins les 72 de backlog `C-03`→`C-06`/`S-07`/`W-*`), redérivé de mémoire à chaque arrêté depuis le 2026-08-28. **Précision de l'utilisateur, en session** : `odoo-plugin/` n'a pas vocation à faire partie du dépôt applicatif — c'est un outil de pilotage pour l'agent, pas un composant de MyMemoMaster, d'où son exclusion par `.gitignore` (racine, ligne 11), **volontaire et à conserver telle quelle**. Le script persiste donc sur ce poste sans être redérivé de mémoire à chaque arrêté, ce qui répond à l'intention de l'action P2 §8 (désormais close) même si rien de ce dossier ne transite par `git`/GitHub — voir aussi `.agents/CHANGELOG_AGENT.md` et `.agents/DECISIONS.md`, entrées du 2026-09-03. Sa sortie recoupe exactement les chiffres déjà publiés (248 engagées, 72 backlog, répartition par bloc identique) — la méthode reconstituée est donc fiable, y compris pour le graphe de dépendances : **175 liens / 88 tâches / 75 verrous, chiffres inchangés depuis le calcul indépendant plus haut dans cet encadré, désormais adoptés comme les chiffres officiels** (la réserve « 183/91/78 non confirmés ni infirmés » ci-dessus est levée — la baisse par rapport au 2026-08-31 est cohérente avec des tâches réellement validées entre-temps, pas un artefact de méthode).
>
> | Indicateur | Valeur à cet arrêté | Repère (2026-08-31/09-01) |
> |---|---|---|
> | Avancement (périmètre engagé) | **221/248 = 89,1 %** | 217/248 = 87,5 % |
> | Coûts — validé | **89 550 €** (298,5 JH) | 86 250 € (287,5 JH) |
> | Coûts — reste à faire | **19 125 €** (63,8 JH) | 22 425 € (74,8 JH) |
> | Délais — tâches en retard | **26** (510 h), dont 16 sur `C-01`/`C-02` (contre 20) | 30 (598 h), dont 20 sur `C-01`/`C-02` |
> | Risques — dépendances | **175 liens / 88 tâches / 75 verrous** | 183/91/78 |
> | RH — charge totale | 362,2 JH (inchangé, écart de 0,2 JH avec le planning contre 0,3 précédemment) | 362,3 JH |
> | Qualité — tests API | **1 768/1 768**, 82,44 % statements (+208 tests vs 1 560, portés par `C-01`) | 1 560/1 560, 81,49 % |
> | Qualité — tests front | **739/739**, 59,4 % statements (+31 tests, couverture en recul de −1,9 pt : nouvelle UI `C-01` pas encore totalement testée) | 708/708, 61,31 % |
> | Qualité — RGAA statique | **0/83** fichiers (+4 fichiers `C-01`, toujours 0 non-conformité) | 0/79 |
> | Qualité — `npm audit` API | **3 vulnérabilités modérées** (nouvelles, `qs`/`body-parser`/`express` — CVE publiée après la dernière analyse, sans lien avec `C-01`, correctif `npm audit fix` disponible) | 0 |
> | Qualité — `npm audit` front | 0 (inchangé) | 0 |
>
> **RH, détail par profil** : non rejoué (planning d'équipe `17_planning_MyMemoMaster.xlsx` inchangé, aucune réassignation) — seul le total (recalculé depuis Odoo) a été recroisé avec le total du planning, cohérence confirmée.
>
> **SonarQube** : toujours inaccessible (401 sans jeton sur `/api/measures/component`, `SONAR_TOKEN` absent de cette session) — les 63,9 % cités restent ceux du 2026-08-29, désormais distants d'environ **28 commits** (7 déjà signalés au 2026-09-01 + 21 commits supplémentaires depuis, dont tout `C-01`) : réserve qui continue de s'accumuler, toujours pas résorbable sans jeton. `test_and_lint`/`SonarQube Analysis`/`Parcours E2E + charge`/`Build and Push Docker Images` tous verts sur le dernier commit (`cd59d4f`, vérifié via l'API GitHub) ; `Deploy to Kubernetes (prod)`/`(preprod)` toujours `skipped` malgré une cause racine trouvée et corrigée par l'utilisateur entre-temps (`K8S_PROD_ENABLED` posée en Secret plutôt qu'en Variable GitHub, `.agents/CHANGELOG_AGENT.md` du 2026-09-03) — la prod a été rattrapée manuellement (`helm upgrade`, révision 5) plutôt que par un nouveau cycle CI/CD, donc pas encore revérifié sur push réel.
>
> **Audit manuel des 106 critères RGAA** : toujours 60/106 (57 %), inchangé — aucune session de continuation depuis le 2026-08-31 (`docs/AUDIT_RGAA_106.md` §1, ligne « État global » relue à cet arrêté).
>
> **Non recalculé, comme d'habitude à ce niveau de détail** : la ventilation RH par profil (§6) et les 7 dépendances d'exploitation hors Odoo (§5.2) — seul le point 1 (secrets K8s) a bougé, voir ci-dessus, non revérifié en détail.
>
> ---
>
> **Ce qui a changé depuis l'arrêté du 2026-08-31 — registre Odoo reconfirmé identique, mais un addendum, pas un arrêté complet.** Reconnexion directe à Odoo à cet arrêté (`odoo-plugin/odoo_cli.py`, profil `bleu-canard`) : **350 tâches toujours au total**, graphe de dépendances recompté **octet pour octet identique** (183 liens ouverts, 91 tâches immobilisées, 78 verrous distincts), `QA.03`/`QA.05`/`QA.06` toujours à `state = "01_in_progress"` malgré leur étape « validé » (même incohérence d'hygiène qu'aux trois arrêtés précédents, toujours pas traitée). **Ce qui n'a *pas* été refait à cet arrêté, à la différence des précédents** : la ventilation fine « périmètre engagé » (217/248 tâches, 2 898 h, répartition par bloc) n'a pas été re-dérivée depuis l'extraction brute — la reproduire exactement demande un script de filtrage (exclusion des tâches « Synthèse » et des blocs de backlog `C-03`→`C-06`/`S-07`/`W-*`) qui n'est pas versionné dans le dépôt et n'a pas été reconstitué ici. **Avancement, Coûts, Délais et RH sont donc repris tels quels du 2026-08-31** (non contredits par ce qui a été revérifié, mais pas recalculés à la décimale comme les arrêtés précédents le faisaient) — à traiter en priorité dans le prochain arrêté complet.
>
> **Quatre commits depuis le 2026-08-31**, tous verts en CI (`test_and_lint` API+front, `SonarQube Analysis`, `Parcours E2E + charge`, `Build and Push Docker Images` — vérifié via l'API GitHub, `check-runs` par SHA) : `8baf9f6`/`18b843f` (documentation `.agents/`, dont l'incident CD détaillé plus bas), `3589053` (`Question.statement` migré en `TEXT` + normalisation des messages d'erreur de validation dans `api.js`, déjà détaillés dans `.agents/CHANGELOG_AGENT.md`), et **`c874bc7`** — le correctif de cette session (voir encadré suivant). **`Deploy to Kubernetes (prod)` et `(preprod)` restent `skipped`** sur les quatre : `K8S_PROD_ENABLED`/`K8S_PREPROD_ENABLED` toujours à `false`, rien n'a été poussé sur les clusters — seules les images Docker `:latest` ont été reconstruites. **Point d'attention non résolu** : `c874bc7` a été committé **et poussé sur `origin/main`** pendant cette session sans qu'aucune commande `git commit`/`git push` n'y ait été exécutée par l'agent — signalé à l'utilisateur en session, origine non identifiée (aucun autre agent actif détecté sur la machine au moment du constat), à surveiller.
>
> **Nouvel incident production trouvé et corrigé (`c874bc7`), hors registre Odoo.** Signalement utilisateur : 500 en prod à la création d'une série d'exercices, malgré un message de succès affiché. Diagnostiqué en direct (`kubectl logs`, cluster `pck-dkoyol2`, disponible ce jour) : `Test.belongsToMany(Question, { through: 'testQuestions' })` référence sa table de jointure par simple chaîne, sans modèle Sequelize enregistré — Sequelize suppose alors `timestamps: true` par défaut et tente d'insérer `createdAt`/`updatedAt`, colonnes absentes de la vraie table (migration d'origine). **Confirmé isolé par métrique Prometheus** (`http_requests_total`, label `status_code`) : exactement 1 requête `POST /api/v1/questions/` en 500 sur 24 h glissantes, aucune autre route en 5xx sur la même fenêtre — dont les routes `/api/v1/kpi/*`, vérifiées saines sur demande explicite de l'utilisateur (uniquement 200/304/401). **Même défaut trouvé et corrigé préventivement sur 5 autres tables de jointure** (`TestTag`, `questionSubject`, `cardSystems`, `MindMapTag`, `LeitnerSystemTag`) avant qu'il ne se déclenche ailleurs. **Effet de bord front corrigé dans la foulée** (demande explicite de l'utilisateur) : `helpers/api.js` redirigeait toute l'app vers une page d'erreur plein écran sur **tout** vrai 500, y compris un appel secondaire après un succès déjà affiché — c'est ce qui a transformé ce bug en écran d'erreur malgré l'exercice bien créé ; retiré, chaque appelant garde sa propre gestion d'erreur déjà en place. Détail complet : `.agents/CHANGELOG_AGENT.md` (entrées du 2026-09-01), `.agents/DECISIONS.md`.
>
> **SonarQube — toujours non rafraîchi, réserve qui s'accumule depuis le 2026-08-29.** Tenté à cet arrêté : accès anonyme à l'API (`/api/measures/component`) → **401**, alors même que le projet est en visibilité publique dans l'instance (l'API l'exige quand même) ; logs du job CI `SonarQube Analysis` via l'API GitHub → **403** sans jeton. Aucun `SONAR_TOKEN` disponible dans cette session, comme à chaque arrêté précédent. **Les chiffres cités restent ceux de la dernière analyse effectivement lue (2026-08-29, 63,9 %)**, désormais antérieure de **7 commits** (contre 4 au 2026-08-31), tous verts en CI.
>
> **Qualité — seul indicateur réellement revérifié en direct à cet arrêté.** Suites de tests rejouées avec couverture : API **1 560/1 560** (identique), couverture 81,49 % statements (81,4 % au 2026-08-31, stable) ; front **708/708** (+5 vs 703), couverture 61,31 % statements (+1,56 pt vs 59,75 %). RGAA statique `node scripts/audit-a11y.mjs` → **0/79** (inchangé). Audit manuel des 106 critères RGAA → **toujours 60/106 (57 %)**, aucune session de continuation n'a eu lieu depuis le 2026-08-31. `npm audit --omit=dev` → **0 vulnérabilité** (API et front, inchangé).
>
> ***Pour mémoire, l'historique antérieur au 2026-08-31*** *reste dans les sections détaillées ci-dessous : remise à plat du registre Odoo, suppression du doublon `[IA]`, publication de la couverture SonarQube, confirmation de `QA.03`/`QA.05`/`QA.06` sur preuve dépôt, correctif de 10 vulnérabilités sur 13, audit de contraste RGAA 3.2, 9 non-conformités RGAA trouvées et corrigées le 2026-08-31 (dont 6.2, sévère).*

---

## 1. Tableau de bord — les 7 indicateurs

| Dimension | Indicateur | Unité | Valeur mesurée | Fiabilité |
|---|---|---|---|---|
| Avancement | Tâches validées / total | % | **89,1 %** à l'étape « validé » sur le périmètre engagé (221/248) ; 69,1 % rapporté aux 320 sous-tâches | ✅ **Recalculé à cet arrêté** depuis une extraction Odoo fraîche, avec le filtrage « périmètre engagé » désormais écrit dans un script réutilisable (`odoo-plugin/reports/perimetre_engage.py`, persiste sur ce poste — `odoo-plugin/` est un outil de pilotage hors `git` par choix délibéré, pas un composant de l'app) |
| Coûts | JH consommés × 300 €/j | € | **89 550 €** validés (298,5 JH) ; enveloppe planifiée **108 675 €** (362,2 JH) ; reste à faire **19 125 €** (63,8 JH) | ✅ **Recalculé à cet arrêté**, même script ; réserve structurelle inchangée : charge planifiée, aucune saisie de temps possible (§3) |
| Délais | Dates réelles vs Gantt prévisionnel | jours d'écart | **26 tâches** au-delà de leur échéance (510 h, 63,8 JH), dont 16 sur `C-01`/`C-02` (7+9, contre 20 au 2026-08-31) ; plan clos au 21/07/2026, dépassé de **44 jours** | ✅ **Recalculé à cet arrêté** — baisse portée par la construction du bloc `C-01` entre le 2026-09-01 et cet arrêté (voir encadré en tête) |
| Risques | Dépendances bloquantes non levées | nb | **175 liens** ouverts, **88 tâches** immobilisées, **75 verrous** distincts — plus **7 dépendances d'infrastructure** (inchangées, §5.2) | ✅ **Recalculé à cet arrêté**, méthodologie versionnée et recoupée (levée de la réserve ouverte plus tôt le même jour, voir encadré) ; baisse cohérente avec la hausse de l'avancement, pas un artefact |
| RH | Charge par profil / capacité disponible | JH | **362,2 JH pour 483 JH de capacité ≈ 75 %**, réparti sur **7 profils** ; pointe à 113 % (SysAdmin) | ✅ Total recalculé à cet arrêté (écart de 0,2 JH avec le planning, contre 0,3 précédemment) ; ⚠️ répartition par profil non rejouée (planning d'équipe inchangé depuis le 2026-08-28, aucune réassignation) |
| Qualité | Couverture de tests SonarQube | % | **63,9 %** mesurée par l'instance auto-hébergée (dernière analyse effectivement lue, 2026-08-29) ; reproduite en local à cet arrêté à **82,44 % API (1 768 tests) / 59,4 % front (739 tests)** | ⚠️ SonarQube toujours inaccessible (401, pas de jeton) — écart désormais d'environ **28 commits** ; couverture locale rejouée à cet arrêté (front en recul de 1,9 pt : nouvelle UI `C-01` pas encore totalement testée, voir encadré) |
| Qualité | Non-conformités RGAA / vulnérabilités dépendances | nb | RGAA : **0** sur les 6 critères outillés (**83** fichiers `.vue`, 20/36 composants sous axe-core) ; audit manuel des 106 critères — **toujours 60/106 (57 %)**, inchangé depuis le 2026-08-31. `npm audit` : **3 vulnérabilités modérées nouvelles côté API** (`qs`/`body-parser`/`express`, CVE publiée après la dernière analyse, correctif disponible) ; front toujours 0 | ✅ RGAA statique et `npm audit` rejoués à cet arrêté ; ⚠️ audit manuel des 106 critères sans session de continuation ; contraste RGAA 3.2 confirmé indirectement vert en CI, non rejoué en local |

**Ce que ce tableau ne dit plus, et qu'il faut dire pour mémoire** : à l'arrêté du 2026-08-28, 3 tâches portaient l'étape « validé » sans preuve dans le dépôt, ce qui écartait avancement déclaré (87,8 %) et démontrable (86,6 %) de 1,2 point. **Ces trois tâches sont désormais couvertes par des tests rejouables en CI** (§7.3) : l'écart est refermé depuis le 2026-08-30, et le reste tel quel à cet arrêté.

---

## 2. Avancement — 87,5 % déclaré, désormais 87,5 % démontrable

| Lecture | Numérateur / dénominateur | % |
|---|---|---|
| **Périmètre engagé**, étape « validé » | **217 / 248** | **87,5 %** |
| **Idem, en ne retenant que le confirmé sur preuve** | **217 / 248** | **87,5 %** — plus d'écart |
| Toutes sous-tâches élémentaires | 217 / 320 | 67,8 % |
| Backlog non chiffré (`C-03`→`C-06`, `S-07`, `W-*`) | 0 / 72 | 0 % |

**L'écart déclaré/démontrable est refermé.** À l'arrêté précédent, il restait à 1,2 point (87,8 % contre 86,6 %), porté par 3 tâches — `QA.03`, `QA.05`, `QA.06` — qui portaient l'étape « validé » sans rien dans le dépôt pour le soutenir. **Elles sont désormais rejouées à chaque push CI** : parcours E2E Playwright (`my_memo_master_front/e2e/journeys.spec.js`, 5/5), test de charge k6 (`load-tests/api-load.js`, 3 258 requêtes, 0 échec) et `docs/RAPPORT_TESTS_QA.md` — confirmé par le job `Parcours E2E + charge (QA.03/QA.05/QA.06)`, vert sur le commit de cet arrêté (`914d37e`, 2026-08-30T09:52:56Z → 09:57:24Z, vérifié via l'API GitHub). C'est la différence entre un registre qui reflète le réel et un registre qui reprend une déclaration — la même différence qui avait motivé la suppression du doublon `IA` à l'arrêté précédent.

**Le périmètre engagé a légèrement bougé** : 248 sous-tâches contre 246 précédemment (et 72 dans le backlog non chiffré contre 74). Deux sous-tâches ont changé de colonne entre les deux arrêtés ; l'effet net sur le taux d'avancement (87,8 % → 87,5 %) est de l'ordre du bruit, pas d'un recul.

**Le dénominateur à retenir reste 248, pas 320.** Les 72 sous-tâches du backlog appartiennent toujours aux blocs `C-03` (partage de ressources, 8), `C-04` (chat de groupe, 10), `C-05` (autocomplétions IA, 6), `C-06` (gamification, 8), `S-07` (modération, 7) et `W-01`→`W-04` (chatbot, résultats scolaires, centre d'aide, tutorat, 33). Elles ne portent **ni charge ni date** parce que le planning d'équipe ne les contient pas : c'est un backlog d'évolutions, pas un reste-à-faire engagé.

**L'alignement des champs reste réel mais asymétrique dans Odoo — un point d'hygiène à traiter.** Le champ `state` des tâches `QA.03`, `QA.05` et `QA.06` est toujours à `01_in_progress` dans Odoo, alors que leur étape (`stage_id`) est à « validé » **et** que le dépôt les confirme désormais. Le registre n'a pas été mis à jour pour refléter la clôture réelle — voir l'action correspondante en §8.

**Les 217 confirmées l'ont été sur preuve dans le dépôt** — Dockerfiles, workflows CI/CD, `scripts/backup.sh`, `docs/RUNBOOK.md`, `docs/AUDIT_RGAA.md`, `docs/RAPPORT_TESTS_QA.md`, tags git, entrées datées du journal de livraison — et non sur le statut déclaré dans le planning.

**Reste à faire sur le périmètre engagé** : 31 sous-tâches (248 − 217), dont **30 sont en retard sur le plan** (§4). Elles se concentrent sur trois ensembles — les **20 sous-tâches de `C-01`/`C-02`** (génération de contenu par IA, non construite), les 6 tâches de clôture documentaire, et `M-00b.11` (test de restauration).

**À cet arrêté (2026-08-31)** : recompté depuis une extraction Odoo fraîche — 217/248 identique au 2026-08-30. Voir l'encadré en tête de document sur les trois correctifs livrés dans l'intervalle, hors registre.

---

## 3. Coûts — 86 250 € validés sur une enveloppe de 108 675 €

| Base | Heures | JH | Coût à 300 €/JH |
|---|---|---|---|
| Charge planifiée (sous-tâches élémentaires, périmètre engagé) | 2 898 h | 362,3 | **108 675 €** |
| Dont à l'étape « validé » | 2 300 h | 287,5 | **86 250 €** |
| Reste à faire | 598 h | 74,8 | **22 425 €** |
| Backlog non chiffré (72 tâches) | — | — | **inconnu** |

**L'enveloppe recule légèrement (−525 €) par rapport à l'arrêté du 2026-08-28**, dans la continuité du même mouvement — un très léger rééquilibrage entre périmètre engagé et backlog (§2), sans changement de méthode. **Inchangée à cet arrêté** (2026-08-31), recomptée à l'identique depuis l'arrêté du 2026-08-30.

**Les trois réserves de l'arrêté précédent restent entières, sans changement.**

1. **Ce sont des charges planifiées, pas du temps consommé — et il ne peut pas en être autrement.** Il n'y a jamais eu de saisie de temps sur ce projet, et l'instance Odoo ne le permettrait pas : **le module Feuilles de temps n'y est pas installé**. `project.task` n'expose aucun champ d'heures effectives, et aucun modèle de feuille de temps n'existe. L'indicateur n'est pas « non renseigné », il est **sans source possible**. « JH consommés » est approximé par la charge des tâches passées à « validé ».

2. **Les durées sont une estimation, pas un relevé.** Elles proviennent d'une réestimation « profil junior » faite tâche par tâche sur les 192 lignes du planning d'équipe, qui déclarait 236,5 JH au total. Le rapport reste de l'ordre de **×1,74**, avec un écart assumé selon la nature du travail : les tâches de pilotage, de bilan et d'archivage bougent peu (×1,0-1,5), le développement et l'infrastructure doublent (×1,8-2,2). Chaque valeur est défendable individuellement ; l'ensemble reste une hypothèse.

3. **La répartition à l'intérieur d'un bloc est une convention.** Le planning d'équipe est au grain « une ligne par sprint et par personne » (192 lignes), le registre Odoo au grain « une sous-tâche par élément livrable » (320). La charge d'un bloc est donc divisée à parts égales entre ses sous-tâches, arrondie au quart de journée.

**Convergence avec le RH (§6)** : la charge totale engagée mesurée dans Odoo aujourd'hui (362,3 JH) et la charge nette déclarée par le planning d'équipe (362,0 JH, doublon `IA` retiré) ne s'écartent plus que de **0,3 JH** — contre 2 JH à l'arrêté précédent. Les deux sources continuent de converger à mesure que le registre se stabilise.

---

## 4. Délais — 30 tâches au-delà de leur échéance

**Plan de référence** : 07/10/2025 → 21/07/2026. **247 sous-tâches datées sur 320** ; les 72 non datées sont le backlog non chiffré du §2.

| Mesure | Valeur |
|---|---|
| Sous-tâches dont l'échéance est dépassée et qui ne sont pas terminées | **30** |
| Charge correspondante | 598 h (74,8 JH, **22 425 €**) |
| Fin du plan | 21/07/2026 — dépassée de **41 jours** à la date d'arrêté |

**Répartition des 30 retards :**

| Bloc | Nb | Nature |
|---|---|---|
| `C-01` / `C-02` | **20** | Génération de Leitner et d'exercices par IA — non construite |
| `DOC` | 6 | Bilans et clôture documentaire |
| `M-00b` | 2 | Test de restauration, déploiement |
| `PIL` | 1 | Clôture de projet |
| `QA` | 1 | `QA.12` — corrections urgentes post-livraison (hotfix), non encore requise |

**Le retard a encore reculé, cette fois pour la bonne raison.** Il passe de 33 à **30 tâches** (83,2 JH → 74,8 JH) parce que `QA.03`, `QA.05` et `QA.06` sont désormais confirmées (§2, §7.3) : ce ne sont plus des tâches en attente de preuve, ce sont des tâches terminées. **C'est, cette fois, un vrai progrès d'exécution** — à la différence de la correction du doublon `IA` à l'arrêté précédent, qui n'était qu'une correction de mesure.

**Inchangé depuis le 2026-08-30** — recompté à l'identique à cet arrêté. Les correctifs livrés entre les deux arrêtés (§0, encadré) sont des anomalies signalées directement par l'utilisateur, hors registre : ils n'ont ni tâche ni échéance Odoo, donc aucun effet sur cet indicateur.

**Le retard restant est concentré et lisible** : **20 des 30 tâches sont la génération de contenu par IA** (`C-01`, `C-02`), qui n'est toujours pas commencée. Le reste est de la clôture — bilans, documentation, test de restauration — plus une tâche de hotfix qui n'a simplement pas encore eu lieu d'être déclenchée.

**Comment lire cet indicateur — et comment ne pas le lire.** Le plan de référence reste **volontairement condensé** : les deux années réelles du projet (premier commit le 2024-10-03) ont été ramenées à dix mois pour produire un Gantt lisible. **Un écart jour pour jour entre ce plan et la chronologie réelle du dépôt n'a donc aucun sens** : les deux calendriers ne mesurent pas la même durée. Ce que l'indicateur mesure, c'est le **reste-à-faire dont la date de livraison prévue est passée** — et à cet arrêté, ce chiffre coïncide exactement avec le reste-à-faire du §2 et du §3 (598 h), puisque la totalité du plan condensé est désormais échue.

---

## 5. Risques — 183 dépendances bloquantes ouvertes

*Revérifié à cet arrêté (lecture directe d'Odoo, `odoo-plugin/odoo_cli.py`) : les chiffres sont strictement identiques à ceux du 2026-08-28, du 2026-08-30 et du 2026-08-31 — aucune dépendance levée ni ajoutée depuis.*

### 5.1 Dépendances de tâches (Odoo)

| Mesure | Valeur |
|---|---|
| Liens de dépendance non levés | **183** |
| Tâches immobilisées par ≥ 1 dépendance ouverte | **91** |
| Tâches verrouillantes distinctes | **78** |

**Verrous les plus structurants :**

| Tâche verrouillante | Tâches bloquées | Étape |
|---|---|---|
| `[C-01.04]` Génération de Leitner par IA — Service inférence | **11** | spécification |
| `[C-01.03]` Génération de Leitner par IA — Benchmark et choix du modèle | 4 | spécification |
| `[C-04.04]` Chat de groupe — API messages | 4 | spécification |
| `[W-01.04]` Chatbot — Service conversationnel (RAG, mémoire) | 4 | spécification |
| `[S-07.02]` Modération — API signalement de contenu | 3 | spécification |

**Lecture** : 89 des 91 tâches immobilisées appartiennent aux blocs `C-*`, `S-07` et `W-*`, c'est-à-dire au backlog non engagé. **Seules 2 tâches du périmètre engagé sont bloquées**, toutes deux dans `M-00b`. Le chiffre de 183 mesure la profondeur du backlog, pas un risque d'exécution immédiat.

### 5.2 Dépendances d'exploitation (hors Odoo, journal de livraison)

*Non rejoué intégralement à cet arrêté — seul le point n°1 a été recroisé avec le journal.* Six points bloquants ou à risque restaient ouverts sur l'infrastructure au 2026-08-28 :

| # | Dépendance non levée | Impact | Levée |
|---|---|---|---|
| 1 | Secrets GitHub `KUBECONFIG_PREPROD` / `KUBECONFIG_PROD` pointent l'ancien cluster | **Le déploiement continu échoue** | **Toujours ouvert** — vérification manuelle dans Settings → Secrets requise, non faite (voir note ci-dessous) |
| 2 | `metrics-server` non fonctionnel (certificats kubelet sans IP SAN) | Pas de `kubectl top`, pas de HPA, ressources API non mesurées | Décision utilisateur en attente |
| 3 | Kubeconfig `cluster-admin` stocké en secret CI | Compromission = pleins pouvoirs sur le cluster prod | ServiceAccount CI dédié (reporté) |
| 4 | Filtrage des plages Cloudflare non appliqué sur 80/443 | Origine joignable en direct | Nécessite un accès OpenStack non fourni |
| 5 | Envoi d'e-mails lié à l'IP de sortie du cluster autorisée chez Brevo | Un changement d'IP coupe les inscriptions | Surveillance après toute opération réseau |
| 6 | IP source réelle masquée par le SNAT du load balancer Octavia | Logs d'accès non exploitables | PROXY protocol ou élargissement `proxy-real-ip-cidr` |
| 7 | `K8S_PROD_ENABLED` / `K8S_PREPROD_ENABLED` (variables GitHub) restés à `false` | **La CD ne déploie plus automatiquement** — chaque `push` sur `main` build et pousse les images Docker, mais les jobs `Deploy to Kubernetes (prod)`/`(preprod)` sont `skipped` sans exception (vérifié sur les 4 derniers commits, `c874bc7` inclus) ; la prod n'a été rattrapée que par des `kubectl rollout restart` manuels, **3 fois documentées** (2026-08-27, 2026-08-28, 2026-08-31 — `.agents/CHANGELOG_AGENT.md`) | Décision d'exploitation explicitement laissée à l'utilisateur à chaque occurrence (« je gère ») — toujours ouvert à cet arrêté |

**Point 7, nouvellement ajouté à cet arrêté** — ce n'était pas un risque de sécurité mais un point d'hygiène CD non capturé dans les six points précédents malgré 3 occurrences déjà consignées ailleurs dans le dépôt. Ajouté ici car il correspond exactement à la définition de la ligne : une dépendance d'exploitation non levée, avec un impact direct et déjà matérialisé trois fois (la prod a servi du code obsolète entre chaque merge et le rattrapage manuel suivant).

**Sur le point 1** : le job `Deploy to Kubernetes (prod)` et `Deploy to Kubernetes (preprod)` des commits de cet arrêté (`6c3d02c`, `d86401c`) sont restés `skipped` (déploiement conditionné à `K8S_PROD_ENABLED`/`K8S_PREPROD_ENABLED`, tous deux à `false`) — cela ne prouve donc **rien** sur l'état des secrets, exactement comme au 2026-08-28 et au 2026-08-30. Seul `KUBECONFIG_SONAR`, posé depuis le bon fichier, s'est révélé fonctionnel en CI (`SonarQube Analysis`, vert sur les trois commits de cet intervalle). Le contrôle manuel des deux autres secrets reste à faire.

---

## 6. RH — 75 % de la capacité, ventilée par profil

*Total revérifié à cet arrêté (identique) ; la répartition par profil n'a pas été rejouée depuis le 2026-08-28, faute de changement du planning d'équipe depuis cette date — aucune réassignation n'a eu lieu en trois arrêtés.*

**Capacité de référence** : 13 cycles × 3 jours = **39 JH par personne** sur la fenêtre d'équipe, plus 15 jours ouvrés de juillet pour le chef de projet à taux plein.

| Profil | Effectif | Charge (JH) | Capacité (JH) | Taux |
|---|---|---|---|---|
| Dev Full Stack | 4 | 157,5 | 156,0 | **101 %** |
| Expert IA | 3 | 56,5 | 117,0 | 48 % |
| SysAdmin | 1 | 44,0 | 39,0 | **113 %** |
| Lead Tech | 1 | 31,5 | 39,0 | 81 % |
| Créa/Design | 1 | 27,5 | 39,0 | 71 % |
| Expert en marketing | 1 | 27,0 | 39,0 | 69 % |
| Chef de projet | 1 | 18,0 | 54,0 | 33 % |
| **Total** | **12** | **362,0** | **483,0** | **75 %** |

**Contrôle de cohérence, stable depuis le 2026-08-30.** Le registre Odoo porte toujours **362,3 JH** de charge sur le périmètre engagé (§3) contre 362,0 JH déclarés par le planning d'équipe — écart de **0,3 JH**, inchangé (contre 2 JH au 2026-08-28). Rien n'a bougé sur cette base depuis : les correctifs livrés entre les deux derniers arrêtés (encadré en tête de document) ne touchent ni le registre Odoo ni le planning d'équipe.

**Constats, inchangés depuis l'arrêté précédent** :

- **Le plan est réalisable, avec de la marge.** 75 % de la capacité collective. Ce n'est pas le même travail qui a été replanifié : c'est le même travail chiffré sur des durées crédibles, étalé sur un calendrier qui correspond au rythme réel de l'équipe.
- **Deux profils dépassent 100 %** — le SysAdmin (113 %) et les Dev Full Stack (101 %). Le dépassement est absorbé par le mécanisme de fin de plan : **14,5 JH, soit 12 tâches, sont réaffectées au chef de projet** en juillet, à taux plein.
- **Le profil le plus tendu est le SysAdmin**, seul sur 44 JH d'infrastructure. C'est aussi le profil sans redondance.
- **L'expertise IA est le profil le moins chargé** (3 personnes, 48 %) — cohérent avec l'état du produit : la correction sémantique par IA interne est livrée, la génération de contenu par API IA externe n'est pas commencée (§7.3).

---

## 7. Qualité — couverture de tests et accessibilité

### 7.1 Couverture SonarQube : 63,9 % (dernière mesure lue) — l'action P0 reste close

**Ce qui a changé depuis l'arrêté du 2026-08-28.** L'indicateur était à 0,0 % faute de rapport `lcov` transmis au scanner. C'est corrigé depuis le 2026-08-29 : Jest (API) et `@vitest/coverage-v8` (front, dépendance ajoutée) produisent chacun un `lcov.info`, transmis par artefact entre le job de tests et le job d'analyse, avec un préfixage de chemin (`sed` sur les lignes `SF:`) pour que Sonar les rattache aux bons fichiers — sans quoi l'échec est **silencieux** (0 % sans erreur).

**Dernière mesure confirmée par l'instance** (analyse du 2026-08-29, 21:07) :

| Métrique | Valeur |
|---|---|
| Couverture globale | **63,9 %** |
| Lignes | 62,5 % |
| Branches | 71,1 % |
| Lignes de code analysées (ncloc) | 33 638 |

**Conséquence non anticipée, toujours d'actualité** : le quality gate est passé de `OK` à `ERROR` sur la condition `new_coverage = 21,9 %` (seuil requis : 80) et `new_violations = 2`. Ce n'est pas une régression : cette condition n'était simplement jamais évaluée faute de données. **Sans effet sur la CI aujourd'hui** (le gate n'est pas imposé comme bloquant), mais le rendre bloquant ferait échouer le prochain push tant que la couverture du code nouveau ne dépasse pas 80 % — décision à trancher (§8).

**Reproduction locale à cet arrêté (2026-09-01)** :

| Périmètre | Statements | Branches | Fonctions | Lignes | Tests |
|---|---|---|---|---|---|
| API (Jest) | **81,49 %** | 67,15 % | 81,47 % | 81,83 % | **1 560 / 1 560**, 85 suites, tous verts (identique au 2026-08-31) |
| Front (Vitest) | **61,31 %** | 76,5 % | 47,27 % | 61,31 % | **708 / 708**, 45 fichiers, tous verts (+5 vs 2026-08-31) |

**Lecture** : API strictement identique en nombre de tests (le correctif `c874bc7` de cet arrêté ajoute 6 modèles Sequelize mécaniques sans logique propre à tester unitairement, et corrige un comportement déjà couvert côté controller/service) ; front +5 tests nets — 4 tests existants réécrits (`test/helpers/api.test.js`, la redirection `/error-server` retirée n'est plus ce qu'ils vérifient) et l'ajout net vient d'ailleurs dans l'intervalle. Couverture front en hausse (+1,56 pt statements) : la suppression de la branche `router.push` dans `api.js` retire du code mort de couverture (moins de lignes non exécutées à compter), pas un effet d'ajout de tests cible.

**Non revérifié à cet arrêté, réserve qui s'accumule depuis le 2026-08-29** : 3 analyses SonarQube de plus depuis le dernier arrêté (`3589053`, `18b843f`, `c874bc7`), toutes vertes en CI (confirmé via l'API GitHub, tâche `SonarQube Analysis (auto-hébergé)` verte sur chacune) — mesures précises non relues en direct. **Deux tentatives faites à cet arrêté pour lever la limitation, toutes deux infructueuses** : (1) accès anonyme à l'API de mesures via `kubectl -n sonarqube port-forward` puis `curl /api/measures/component` sans jeton → **HTTP 401**, alors que le projet est en visibilité publique dans l'instance (la visibilité publique couvre l'UI, pas l'API, dont l'authentification reste forcée) ; (2) récupération des logs du job CI via l'API GitHub (`/actions/jobs/{id}/logs`) sans jeton → **HTTP 403**, même sur un dépôt public. `SONAR_TOKEN` reste absent de cette session locale. Les valeurs ci-dessus (63,9 %) restent donc celles de la **dernière analyse effectivement lue**, du 2026-08-29 — désormais antérieure de **7 commits** aux chiffres actuellement publiés sur l'instance, non recopiés ici sans les avoir vus.

#### 7.1.1 — Les vulnérabilités : de 13 à 3, une par une

Le nombre de vulnérabilités avait bougé entre les arrêtés (11 → 13) avec le code ajouté pour la recette QA et le contraste. **10 des 13 ont été corrigées le 2026-08-30** (commit `914d37e`), revues une par une plutôt qu'en masse :

| Règle | Nb | Sévérité | Traitement |
|---|---|---|---|
| `docker:S6470` | 1 | **CRITICAL** | Corrigé — voir §7.1.2 |
| `javascript:S2068` | 2 | MAJOR | Corrigé — mots de passe par défaut du seeder E2E supprimés, démarrage refusé si les variables manquent |
| `javascript:S2245` | 7 | MAJOR | Corrigé — `crypto.randomBytes`/`randomUUID`/`getRandomValues` remplacent `Math.random()` pour les noms de fichiers uploadés ; deux fonctions inutilisées supprimées |

**3 non corrigées, et pourquoi — argumentées, pas ignorées :**

- `javascript:S2245` — `ExerciseDetailPage.vue:309`, mélange de l'ordre d'affichage des réponses d'un exercice. **Pas sensible** : les réponses sont déjà toutes envoyées au client, la prévisibilité de l'ordre ne divulgue rien.
- `javascript:S5693` — limite d'upload à **10 Mo**, valeur explicite et raisonnable pour de l'image. La règle demande une revue, pas nécessairement un changement.
- `docker:S6471` — l'image `node` tourne en **root**. Durcissement réel et souhaitable, mais **non tenté** : l'entrypoint fait `npm install` et écrit dans `/app` (monté en volume en dev), un `USER` non-root pourrait casser le démarrage, et le démon Docker du poste était arrêté au moment du correctif — impossible à vérifier avant de le committer. À traiter dans un ticket dédié, avec test.

**Vérifications faites au moment du correctif** : API 1 554/1 554 ✅, front 689/689 ✅ (confirmé à nouveau ce jour, §7.1), les deux lints propres. La CI du commit est passée au vert sur les 13 checks (`test_and_lint` ×2, `SonarQube Analysis`, `Parcours E2E + charge`, `Build and Push Docker Images`, etc. — vérifié via l'API GitHub).

**Limites de l'instance, inchangées** : analyse restreinte à `main` (le multi-branches est absent de l'édition Community), et projet en visibilité publique dans l'instance — sans effet tant qu'aucun Ingress n'est posé.

**Complément vérifiable sans jeton, rejoué à cet arrêté** : `npm audit --omit=dev` (dépendances de production uniquement, même périmètre que celui utilisé en CI) → **0 vulnérabilité** sur l'API comme sur le front. Ceci ne se substitue pas à l'analyse SonarQube (qui couvre aussi le code applicatif, pas seulement les dépendances) mais confirme qu'aucune nouvelle vulnérabilité de dépendance n'a été introduite par les trois commits de maintenance.

#### 7.1.2 — La vulnérabilité CRITICAL est corrigée : secrets qui pouvaient s'embarquer dans l'image API

`docker:S6470` n'était pas un faux positif, et c'est désormais corrigé.

**Ce qui a été trouvé** : `my_memo_master_api/.dockerignore` ne contenait que `node_modules/`, `.git`, `.idea`, `Dockerfile*` — **`.env` n'y était pas**, alors que `my_memo_master_api/.env` porte `AUTH_JWT_SECRET`, `SMTP_USER` et `SMTP_PASS`. Le `COPY . .` du Dockerfile embarquait donc ces secrets dans toute image construite depuis un poste où ce fichier existe. Aggravant : la racine du dépôt portait une ligne `#.env` **commentée**, qui donnait l'illusion d'une exclusion.

**Portée réelle, mesurée et non supposée** : le CD construit depuis un `git checkout` propre, où `.env` est ignoré par git — **les images publiées par la CI ne contenaient donc pas le fichier**. Le risque valait pour toute image construite **en local** (`docker compose build`) puis poussée vers le dépôt Docker Hub `fredissimo/mymemomaster_api`, qui est **public**. Latent, pas réalisé.

**Corrigé** : `.env` et `.env.*` exclus sur les trois contextes de build (racine, API, front) ; la ligne commentée trompeuse retirée.

**À ne pas confondre avec le chiffre Dependabot** : GitHub signale des vulnérabilités de dépendances sur la branche par défaut, non recomptées à cet arrêté. Ce n'est pas contradictoire avec `npm audit --omit=dev` en CI — Dependabot compte aussi les dépendances de développement, qui n'entrent pas dans les images déployées.

### 7.2 Non-conformités RGAA : 0, sur un périmètre outillé inchangé — revérifié sans régression

**Audit statique, rejoué à cet arrêté** sur **79 fichiers `.vue`** (aucun fichier de plus depuis le 2026-08-30 : les trois commits de maintenance modifient des composants déjà existants) :

| Critère RGAA | Avant campagne | Aujourd'hui |
|---|---|---|
| 11.1 — champ sans nom accessible | 111 | **0** |
| 7.1 — clic sans équivalent clavier | 21 | **0** |
| 11.9 — bouton symbole sans nom accessible | 14 | **0** |
| 1.1 — image sans `alt` | 0 | **0** |
| **Total** | **135** | **0** |

Non-régression assurée par **20 tests axe-core** exécutés à chaque push (rejoués localement à cet arrêté : 20/20 verts, y compris sur `ModalComponent.vue` dont la fermeture au clic extérieur a changé de mécanisme le 2026-08-31 — aucune violation introduite).

**Le contraste (RGAA 3.2)**, outillé depuis le 2026-08-29. `e2e-a11y/contrast.spec.js` (Playwright + axe-core, rendu Chromium réel — le seul niveau qui calcule vraiment les styles) audite 8 pages publiques sans appel API au montage. **Premier passage : 1 non-conformité réelle trouvée** — `/forgot-password`, texte noir sur fond bleu (ratio 2,2:1 au lieu de 4,5:1 requis), causée par une classe Tailwind `text-white` qui ne générait aucun CSS dans ce build. Corrigée. **Non rejoué en local à cet arrêté** (nécessite un build + serveur de preview + navigateurs Playwright) mais confirmé indirectement vert : ce spec s'exécute dans le job CI `test_and_lint (front)`, vert sur les trois commits de l'intervalle (`6c3d02c`, `d86401c`, `d1ef46a`) — dernier passage local connu et confirmé : 8/8 pages conformes.

**Extension de la couverture axe-core (jsdom), 2026-08-29** : 4 composants ajoutés (`DropdownComponent`, `ToggleButton`, `PillComponent`, `TagSelectorComponent`), portant le total à 8. **2 non-conformités réelles trouvées et corrigées**, préexistantes et révélées par l'extension plutôt que par une régression : `ToggleButton.vue` (case à cocher sans nom accessible, RGAA 11.1, corrigée par une prop `ariaLabel` désormais requise) et `TagSelectorComponent.vue` (bouton flèche sans nom accessible, RGAA 11.9, corrigé par un `aria-label` dynamique).

**Nouvelle extension, 2026-08-30 — en réponse directe à « s'occuper des 106 critères ».** Plutôt qu'un audit manuel des 106 critères (chantier séparé, non engagé), l'outillage automatisable a été étendu : 12 composants de plus sous axe-core (`TodoWidget`, `MenuItemComponent`, `ItemListLayout`, `GuidedTourBannerComponent`, `MindMapNodePickerComponent`, `NotificationBellComponent`, `SubjectFilterComponent`, `SubjectSelectorComponent`, `ReminderWidget`, `FormulaHelperComponent`, `StudentDetailComponent`, `KpiAlertWidgetComponent`), portant le total à **20 composants sur 36** — les 16 restants, revus un par un, n'ont aucun élément interactif propre à évaluer. **Les 20 tests passent, 0 violation détectée par l'outil.**

Cette extension a aussi servi à **objectiver, sur deux cas réels, la limite de ce qu'un outil peut juger** : `TodoWidget.vue` (case à cocher dont le nom accessible ne tenait qu'à un `title` porté par le `<label>` ambiant, pas par le contrôle) et `MenuItemComponent.vue` (boutons éditer/supprimer nommés par les seuls glyphes `✎`/`✕`) **passaient tous les deux axe-core** — un nom accessible existe algorithmiquement dans les deux cas, mais n'est ni fiable (premier cas) ni pertinent pour un lecteur d'écran (second cas). Corrigés par cohérence avec le même correctif déjà appliqué ailleurs (`ToggleButton.vue`), pas parce qu'un outil l'exigeait. Détail : `docs/AUDIT_RGAA.md` §2 ter.

**Réserve de portée, affinée** : le zéro porte sur **6 critères outillés** (11.1, 7.1, 11.9, 1.1, 8.3, 3.2), toujours pas sur les 106 critères du RGAA 4 — et il ne peut pas en aller autrement par le seul outillage : une bonne part des critères restants (pertinence des intitulés hors contexte, cohérence de l'ordre de lecture, compatibilité lecteur d'écran réel) demande un jugement humain qu'aucun outil ne peut mécaniser de façon fiable, comme les deux cas ci-dessus le montrent concrètement. Deux angles morts documentés dans `docs/AUDIT_RGAA.md` restent entiers : aucun test lecteur d'écran réel, et le contraste n'est vérifié que sur 8 pages publiques sans API. **La formulation défendable reste « 0 non-conformité sur le périmètre outillé », pas « site conforme RGAA ».**

#### 7.2.1 — Audit manuel des 106 critères RGAA : 60/106, mis à jour le 2026-08-31 après l'arrêté ci-dessus

**Mise à jour post-arrêté** — l'utilisateur a explicitement demandé la poursuite de l'audit dans la même journée que la réédition de ce rapport, après avoir lu la synthèse ci-dessus. `docs/AUDIT_RGAA_106.md` est passé de 23/106 (22 %) à **60/106 (57 %)**. **5 non-conformités confirmées puis, sur demande explicite de l'utilisateur, corrigées le jour même** :

| Critère | Constat | Sévérité | Correctif |
|---|---|---|---|
| **6.2** | Navigation principale (`App.vue`, desktop et mobile) sans **aucun nom accessible** sur 8 de ses ~11 liens — icônes seules. Présent sur **toutes** les pages authentifiées. Invisible à l'outillage axe-core existant. | 🔴 Élevée | `aria-label` ajouté sur ~11 liens × 2 blocs + test de régression dédié (`test/App.test.js`) |
| 11.6 / 11.7 | Aucun `<fieldset>`/`<legend>` dans tout le dépôt malgré de vrais regroupements (QCM à choix radio, sélection de jours) | 🟠 Moyenne | `role="radiogroup"`/`"group"` + `aria-labelledby` sur les 5 regroupements identifiés |
| 5.4-5.7 | Aucun des 4 tableaux de données de l'app n'avait de `<caption>` ni de `scope` sur ses `<th>` | 🟠 Moyenne | `<caption>` (masqué visuellement) + `scope="col"` ajoutés aux 4 tableaux |
| 11.13 | `autocomplete` absent des formulaires de connexion/inscription/vérification email | 🟡 Faible | `autocomplete="email"`/`"current-password"`/`"new-password"` ajoutés |
| 1.2 | Illustration décorative avec `alt="Illustration"` au lieu de `alt=""`, sur 5 pages d'authentification | 🟡 Faible | Valeur par défaut de la prop `imageAlt` passée à `''` |

**Vérifié après correctifs** : `npx vitest run` → 705/705 (2 nouveaux tests), 0 régression ; `node scripts/audit-a11y.mjs` → 0/79 ; `npx eslint` sur les 14 fichiers modifiés → 0 erreur. Thématiques 1, 5, 6 closes **sans aucune non-conformité restante**.

**3 candidats restent ouverts**, non corrigés par choix (pas dans le lot proposé, ou nécessitant une confirmation avant correctif) : 9.2 (saut de niveau de titre, `CalendarPage.vue`), 8.6 (titres de route en anglais — pourrait être un choix éditorial, question à poser à l'utilisateur), 12.7 (lien d'évitement clavier — à confirmer par navigation réelle). Détail complet (preuves, correctifs, candidats) : `docs/AUDIT_RGAA_106.md`. Toujours **EN COURS**, à ne pas confondre avec un audit terminé — 46 critères restants à auditer, dont ceux qui exigent un rendu de page réel (zoom, tabulation, focus visible), non testés dans ces sessions (lecture de code uniquement).

**Méthode** : référentiel RGAA 4.1.2 **téléchargé depuis la source officielle** et extrait en texte (`pdftotext`), pas reconstitué de mémoire — un premier essai par récupération web s'est révélé tronqué et partiellement inexact sur 4 thématiques, écarté après vérification. 106 critères recomptés (9+2+3+13+8+2+5+10+4+14+13+11+12) pour confirmer la grille complète. Un échantillon de 15 pages a été proposé (à valider).

**État à cet arrêté** : **23 / 106 verdicts posés (22 %)**, tous avec preuve citée (fichier/ligne ou recherche exhaustive dans `src/`, jamais une estimation). Thématique 2 (Cadres) close en NA (aucun `<iframe>` dans le dépôt). Thématique 4 (Multimédia) très majoritairement NA (aucun `<video>`/`<audio>`).

**2 non-conformités candidates trouvées** — à confirmer visuellement avant correctif, donc **non comptées dans le « 0 » du tableau de bord** :

| Critère | Constat | Preuve |
|---|---|---|
| 8.6 (pertinence du titre de page) | 5 routes sur 27 ont un titre en anglais ou en casse incohérente (« Exercises », « Class Group », « register »…) dans une app francophone | `my_memo_master_front/src/router/routes.js`, lignes 18, 27, 135, 144, 214 |
| 12.7 (lien d'évitement clavier) | Aucun lien « aller au contenu » trouvé nulle part dans le code | Recherche exhaustive `src/`, 0 résultat |

**Effet de bord, hors RGAA** : `src/pages/AdminPage.vue` existe mais n'est référencé par aucune route ni aucun composant — code mort, signalé séparément.

**83 critères restants** : une partie se règle par recherche exhaustive supplémentaire (rapide), une autre exige un rendu réel de l'échantillon (tableaux, formulaires, navigation clavier, zoom, ordre de tabulation) — plus long. Poursuite prévue thématique par thématique dans les prochaines sessions (ordre détaillé : `docs/AUDIT_RGAA_106.md` §4).

### 7.3 Qualité de la déclaration : le dernier écart est refermé

**Ce qui reste de l'arrêté précédent** : la validation des tâches a été faite **sur preuve dans le dépôt**, pas sur le statut déclaré dans le planning. Trois tâches ne l'étaient pas encore au 2026-08-28.

**Ce qui a changé — les 3 dernières tâches sont désormais confirmées :**

| Tâche | Ce que le planning déclarait | Ce que le dépôt contient désormais |
|---|---|---|
| `QA.03`, `QA.05` | Tests E2E parcours étudiant et enseignant (Playwright) | `my_memo_master_front/e2e/journeys.spec.js` — 5 tests, 5 réussis (13,4 s), rejoués à chaque push CI |
| `QA.06` | Rapport de tests couvrant E2E et charge | `load-tests/api-load.js` (k6, 3 258 requêtes, 0 échec, p95 3,45 ms) + `docs/RAPPORT_TESTS_QA.md` |

Elles portent toujours l'étape « validé » dans Odoo, mais leur champ `state` interne y est resté à « en cours » — **incohérence d'hygiène du registre, pas d'avancement** : à traiter en synchronisant Odoo (§8), le dépôt faisant foi. **Revérifié à cet arrêté (lecture directe, `odoo-plugin/odoo_cli.py`), inchangé** : `QA.03`, `QA.05` et `QA.06` sont toujours à `state = "01_in_progress"` dans Odoo malgré leur étape « validé » — l'action de synchronisation du §8 reste ouverte, 4ᵉ arrêté consécutif sans traitement.

**Ce qui reste requalifié depuis l'arrêté précédent — l'architecture IA, inchangé.** Le planning d'équipe décrit un service IA auto-hébergé qui n'existe pas dans le dépôt. L'architecture réelle reste double :

| Usage | Modèle retenu | État |
|---|---|---|
| **Correction sémantique** | IA **interne** — `@xenova/transformers`, embeddings locaux exécutés dans le process de l'API Node | **Livré** — `services/Semantic.service.js`, ~37 tests, tâche `[M-06.15]` validée |
| **Génération de contenu** | **API IA externe** | **Non commencé** — blocs `C-01` (0/11) et `C-02` (0/9) |

**Le périmètre IA du projet reste donc** : une brique de correction livrée, une brique de génération non commencée.

---

## 8. Synthèse et actions recommandées

**Ce que disent les mesures** : le produit est livré et déployé — **87,5 %** du périmètre engagé à l'étape « validé » (chiffre repris du 2026-08-31, non recalculé à cet arrêté — voir réserve de méthode en tête de document), production fonctionnelle, **2 268 tests verts** (1 560 API + 708 front, +5 depuis le 2026-08-31), 0 non-conformité RGAA sur 6 critères outillés, revérifié sans régression. Le plan tient largement dans la capacité de l'équipe (75 %, non recontrôlé à cet arrêté).

**Ce qui a bougé depuis l'arrêté du 2026-08-31 — un addendum ciblé, pas un arrêté complet** :

| Indicateur | Au 2026-08-31 | À cet arrêté (2026-09-01) |
|---|---|---|
| Avancement, Coûts, Délais, RH | 87,5 % / 86 250 € / 30 tâches / 75 % | **Repris tel quel** — non recalculé à cet arrêté (voir réserve de méthode) |
| Risques (registre Odoo) | 183 liens / 78 verrous / 91 tâches | **Strictement identiques**, revérifié par lecture directe Odoo (`odoo_cli.py`) |
| Risques (infrastructure) | 6 dépendances non levées | **7** — ajout du gel de la CD (`K8S_*_ENABLED`, 3 occurrences déjà documentées, jamais inventorié ici avant cet arrêté) |
| Tests | 1 560 API + 703 front | **1 560 API + 708 front** (+5) — 4 tests réécrits (retrait de la redirection `/error-server`), reste net hors de cet intervalle |
| Couverture reproduite en local | 81,4 % API / 59,75 % front | 81,49 % API (+0,09 pt) / **61,31 % front** (+1,56 pt) |
| Couverture Sonar publiée | 63,9 % (analyse du 2026-08-29) | **Toujours 63,9 % citée** — accès anonyme testé et refusé (401), logs CI refusés sans jeton (403), 7 analyses de plus depuis, non relues |
| Vulnérabilités dépendances (`npm audit`) | 0 | **0**, rejoué à cet arrêté (API + front, périmètre production) |
| RGAA outillé | 6 critères, 0 non-conformité | **Inchangé**, revérifié (0/79 statique) |
| Audit manuel 106 critères | 60/106 (57 %) | **Inchangé** — aucune session de continuation depuis le 2026-08-31 |
| Incident production | — | **Nouveau, corrigé** : 500 à la création d'une série d'exercices (`testQuestions` sans modèle Sequelize dédié) + 5 tables de jointure au même défaut corrigées préventivement + effet de bord front retiré (`api.js`) — voir encadré en tête de document |
| Méthode | — | **Nouveau constat** : `c874bc7` a été committé et poussé sur `origin/main` sans commande git explicite dans cette session — origine non identifiée, signalé à l'utilisateur |

**La limite de méthode à assumer, inchangée** : ce rapport mesure un plan, pas un relevé. Aucune donnée de temps réel n'existe sur ce projet et l'outil ne permettrait pas d'en produire. Les 362,3 JH sont une estimation argumentée tâche par tâche ; les 86 250 € sont la valorisation au barème de la charge validée, **pas une dépense constatée**.

**Réserve propre à cet arrêté, plus large que d'habitude** : contrairement aux arrêtés du 2026-08-28 au 2026-08-31 qui recalculaient Avancement/Coûts/Délais/RH à la décimale depuis une extraction Odoo fraîche, **cet arrêté n'a revérifié en détail que Risques (registre) et Qualité**. Avancement/Coûts/Délais/RH sont repris à l'identique du 2026-08-31 sur la base d'une reverification partielle (350 tâches au total et graphe de dépendances identiques, ce qui rend un mouvement caché peu probable) mais **pas d'une recomputation complète** — le script de filtrage « périmètre engagé » (217/248, exclusion des tâches de synthèse et du backlog `C-*`/`S-07`/`W-*`) n'est pas versionné dans le dépôt et n'a pas été reconstitué à cet arrêté. **Une reconstitution de ce script mérite d'être ajoutée au dépôt** (ex. `odoo-plugin/reports/perimetre_engage.py`) pour que chaque arrêté cesse de redériver la même logique de mémoire.

**Réserve SonarQube, qui s'accumule depuis le 2026-08-29** : la mesure de couverture citée (63,9 %) est désormais antérieure à **7 commits**, tous verts en CI, dont les valeurs précises n'ont jamais pu être relues en direct sur l'instance faute de jeton local — deux tentatives de contournement à cet arrêté (accès anonyme, logs CI) ont toutes deux échoué (401 / 403). Un `SONAR_TOKEN` en variable d'environnement locale (ou un accès `gh` authentifié) résorberait cette réserve dès le prochain arrêté.

**Une seule action de la liste a été traitée à cet arrêté, et ce n'était pas prévu à son ouverture** : l'incident production `testQuestions` (signalé en session, hors plan d'actions ci-dessous) a occupé le temps de cet intervalle, au même titre que les correctifs hors registre des arrêtés précédents. Le plan d'actions est repris tel quel du 2026-08-31, **une ligne ajoutée** (K8S_PROD_ENABLED, déjà en P0 mais jamais formalisée comme risque au §5 avant cet arrêté).

| Priorité | Action | Indicateur débloqué | Charge |
|---|---|---|---|
| ~~P0~~ | ~~Arbitrer le périmètre IA~~ — fait le 2026-08-28 | Avancement, Délais, Coûts | — |
| ~~P0~~ | ~~Publier le `lcov` vers SonarQube~~ — fait le 2026-08-29, couverture 63,9 % confirmée | Qualité | — |
| ~~P0~~ | ~~Ajouter `.env`/`.env.*` à `my_memo_master_api/.dockerignore`~~ — fait le 2026-08-30, vulnérabilité CRITICAL corrigée | Qualité, Risques | — |
| ~~P1~~ | ~~Traiter les 8 `Math.random()` signalés~~ — fait le 2026-08-30 (`crypto.randomBytes`/`randomUUID`/`getRandomValues`) | Qualité | — |
| **P0** | Régénérer les secrets `KUBECONFIG_PREPROD` / `KUBECONFIG_PROD` — toujours non vérifiés | Risques (CD à l'arrêt) | < 0,5 JH |
| **P0** | Basculer `K8S_PROD_ENABLED`/`K8S_PREPROD_ENABLED` à `true` (ou arbitrer explicitement de les garder à `false`) — 3 rattrapages manuels déjà nécessaires, nouveau risque formalisé au §5.2 point 7 à cet arrêté | Risques (CD réellement continue) | < 0,1 JH (décision + bascule GitHub Settings) |
| **P0** | Déployer le correctif `c874bc7` (500 création série d'exercices) en prod — code corrigé et poussé, mais `Deploy to Kubernetes (prod)` reste `skipped` : sans action manuelle (`kubectl rollout restart` ou bascule ci-dessus), l'incident signalé par l'utilisateur reste reproductible en prod | Qualité (incident déjà corrigé mais pas encore livré) | < 0,1 JH |
| **P1** | Ouvrir un ticket sur les **9 bugs** Sonar (non retraités par le correctif du 2026-08-30, à recompter à la prochaine analyse) | Qualité (fiabilité) | à estimer |
| **P2** | Faire tourner l'image API sous un utilisateur non-`root` (`docker:S6471`) — non tenté faute de démon Docker actif pour tester | Qualité (durcissement) | ~0,5 JH |
| ~~P2~~ | ~~Synchroniser le champ `state` Odoo de `QA.03`/`QA.05`/`QA.06` (`01_in_progress` → `1_done`)~~ — constaté résolu au 2026-09-03 (origine du correctif non identifiée) | Hygiène du registre | — |
| ~~P2~~ | ~~Synchroniser `[M-00b.12]` (stage « en cours » → « vérification », state → `1_done`)~~ — fait le 2026-09-03, sur preuve dépôt (`docs/RUNBOOK.md`, Traefik, `scripts/backup.sh`, CI) | Hygiène du registre, Avancement | — |
| ~~P1~~ | ~~Arbitrer `[C-01.10]`~~ — **non fondée** : le bloc `C-01` a en réalité été construit et déployé entre le 2026-09-01 et le 2026-09-03 (voir encadré en tête) ; `state = "1_done"` était correct. Synchronisée comme ses 6 tâches sœurs (stage → « vérification ») le 2026-09-03 | Avancement | — |
| **P2** | Statuer sur `new_coverage` (quality gate) : le rendre bloquant ferait échouer tout push tant que le code nouveau n'atteint pas 80 % de couverture | Qualité (process) | décision |
| ~~P1~~ | ~~Statuer sur `C-01`~~ — **caduc, bloc construit et déployé** entre le 2026-09-01 et le 2026-09-03 (voir encadré en tête) ; 7 des 11 sous-tâches restent en retard sur le plan condensé malgré ça (livrées après leurs échéances 2025-11/2026-02), à documenter dans un prochain arrêté complet plutôt qu'à replanifier | — | — |
| **P1** | Statuer sur `C-02` (génération d'exercices par IA) : 9 tâches, 9 des 26 retards restants, toujours à l'étape « spécification » — les replanifier ou les sortir du périmètre engagé | Avancement, Délais, Coûts | ~0,5 JH |
| **P1** | Tester une restauration réelle depuis `scripts/backup.sh` (`M-00b.11`) | Risques, Avancement | ~0,5 JH |
| **P2** | Saisir le régime de travail réel dans les calendriers de ressource Odoo | RH | ~0,5 JH |
| **P2** | Réassigner les sous-tâches de développement aux intervenants du planning | RH | ~1 JH |
| **P3** | Chiffrer les 72 tâches de backlog `C-*` / `S-07` / `W-*` | Coûts (reste à faire du backlog inconnu) | ~2 JH |
| **P3** | Migrer les actions GitHub dépréciées (`checkout@v4`, `setup-node@v4`, etc. — ciblent Node 20, déprécié) avant leur retrait | Risques (CI) | à estimer |
| **P1** | Confirmer visuellement les 2 non-conformités RGAA candidates (8.6 titres en anglais, 12.7 absence de lien d'évitement) et corriger si confirmées | Qualité (RGAA) | ~0,5 JH |
| ~~P1~~ | ~~Corriger la non-conformité 6.2 (nav principale sans nom accessible)~~ — fait le 2026-08-31, `aria-label` + test de régression | Qualité (RGAA) | — |
| ~~P2~~ | ~~Corriger les non-conformités confirmées restantes (5.4-5.7, 11.6/11.7, 11.13, 1.2)~~ — fait le 2026-08-31 | Qualité (RGAA) | — |
| **P2** | Statuer sur les 3 candidats restants (9.2 saut de titre, 8.6 titres en anglais — question éditoriale à poser, 12.7 lien d'évitement) | Qualité (RGAA) | ~0,5 JH |
| **P2** | Poursuivre l'audit manuel des 106 critères RGAA (46 restants) — `docs/AUDIT_RGAA_106.md` | Qualité (RGAA) | plusieurs sessions |
| ~~P2~~ | ~~Versionner le script de filtrage « périmètre engagé »~~ — fait le 2026-09-03 : `odoo-plugin/reports/perimetre_engage.py`, recoupé avec les chiffres déjà publiés (248/72, répartition par bloc identique). `odoo-plugin/` reste exclu de `git` par choix délibéré (outil de pilotage pour l'agent, pas un composant de l'app — confirmé par l'utilisateur) : le script persiste sur ce poste, ce qui suffit à l'objectif (ne plus redériver de mémoire à chaque arrêté). **Dette assumée** : pas de test automatisé (`odoo-plugin/tests/`) sur ce script | Méthode (fiabilité des arrêtés) | — |
| **P2** | Corriger les 3 vulnérabilités modérées `npm audit` côté API (`qs`/`body-parser`/`express`, CVE publiée après la dernière analyse) — `npm audit fix` | Qualité (dépendances) | < 0,1 JH |
| **P2** | Fournir un `SONAR_TOKEN` (variable d'environnement locale ou secret accessible en session) — réserve de couverture SonarQube non résorbée depuis le 2026-08-29, 7 commits d'écart à cet arrêté | Qualité (fraîcheur des mesures) | < 0,1 JH |
| **P3** | Identifier l'origine du commit/push automatique `c874bc7` (aucune commande git explicite dans la session concernée) | Méthode (traçabilité) | à investiguer |

---

## Annexe — reproductibilité des mesures

| Indicateur | Commande / source |
|---|---|
| Connexion Odoo | `odoo-plugin/odoo_cli.py check` — rejoué à cet arrêté : `ok: true`, profil `bleu-canard`, utilisateur `superfred2468@gmail.com` |
| Risques (registre Odoo) | `odoo-plugin/odoo_cli.py read project.task --domain '[["project_id","=",15]]' --fields id,name,stage_id,state,date_deadline,allocated_hours,depend_on_ids --limit 400` (350 tâches) — rejoué à cet arrêté, **graphe de dépendances identique octet pour octet** au 2026-08-31 (183 liens ouverts, 91 tâches bloquées, 78 verrous, recalculé par script `analyze_odoo.py` ad hoc plutôt que relu à l'œil) |
| Avancement, coûts, délais, RH (221/248, 2 898 h, 75 %) | `cd odoo-plugin && python reports/perimetre_engage.py` — **script écrit le 2026-09-03**, rejoué à cet arrêté. Sortie recoupée avec les chiffres déjà publiés des arrêtés précédents (248/72 identique). `odoo-plugin/` (outil de pilotage, pas un composant de l'app) reste hors `git` par choix délibéré — le script persiste sur ce poste, ce qui suffit à l'usage |
| État `state` de `QA.03`/`QA.05`/`QA.06` | Filtré depuis la même extraction Odoo (`odoo_cli.py read project.task --domain '[["project_id","=",15],["name","like","QA.0"]]' --fields id,name,stage_id,state`) — rejoué le 2026-09-03 : `1_done` sur les trois, aligné avec l'étape « validé » (incohérence résolue, voir encadré en tête de document) |
| Tâches à l'étape « en cours » | `odoo_cli.py read project.task --domain '[["project_id","=",15],["stage_id","=",156]]' --fields id,name,stage_id,state,parent_id,date_deadline` — rejoué le 2026-09-03 : 10 tâches (5 « Synthèse », 5 sous-tâches réelles dont 1 corrigée, voir encadré en tête de document) |
| Accès SonarQube (mesures) | `kubectl -n sonarqube port-forward svc/sonarqube 19000:9000` puis `curl http://127.0.0.1:19000/api/measures/component?...` sans jeton — testé à cet arrêté : **HTTP 401** (l'instance répond `UP` sur `/api/system/status`, mais l'API de mesures exige une authentification même sur un projet en visibilité publique) |
| Accès logs CI SonarQube (sans jeton) | `curl https://api.github.com/repos/entrezunfredici/MyMemoMaster/actions/jobs/{id}/logs` — testé à cet arrêté : **HTTP 403** |
| État d'exécution CI d'un commit | `GET /repos/entrezunfredici/MyMemoMaster/commits/<sha>/check-runs` (API GitHub publique, sans jeton) — rejoué à cet arrêté sur `8baf9f6`, `18b843f`, `c874bc7` (le SHA court `3589053` seul ne renvoie aucun check-run : poussé dans le même lot que `18b843f`, GitHub n'attache les checks qu'à la tête de push) : tous verts sur `test_and_lint` (API+front), `SonarQube Analysis`, `Parcours E2E + charge`, `Build and Push Docker Images` ; `Deploy to Kubernetes (prod)`/`(preprod)` en `skipped` sur les trois. **Rejoué le 2026-09-03** sur `cd59d4f` (dernier commit) : mêmes jobs verts, `Deploy to Kubernetes (prod)`/`(preprod)` toujours `skipped` |
| Diagnostic de l'incident `testQuestions` | `kubectl logs -n mymemomaster mmm-prod-api-<pod> --since=30m` (deux pods) → `column question->testQuestions.createdAt does not exist` ; confirmé isolé par `kubectl port-forward -n mymemomaster svc/mmm-prod-prometheus 9090`, requête `sum by (route,status_code) (increase(http_requests_total{route=~".*question.*"}[24h]))` → 1 seule requête `/api/v1/questions/` en 500 sur 24 h ; KPI vérifiés sains par la même méthode sur `/api/v1/kpi/*` (200/304/401 uniquement) |
| Charge par profil | Rôles lus dans `17_planning_MyMemoMaster.xlsx`, feuille « Planning Sprints », croisés avec les durées junior — non rejoué à cet arrêté (planning inchangé depuis le 2026-08-28) |
| Capacité | 13 cycles × 3 jours (mardi/mercredi/jeudi, cycle de 3 semaines) + 15 jours ouvrés de juillet pour le chef de projet |
| Durées « junior » | Réestimation tâche par tâche des 192 lignes du planning — **jugement argumenté, non reproductible mécaniquement** |
| Mesures SonarQube | Instance auto-hébergée `pck-dkoyol2`, namespace `sonarqube` — `kubectl -n sonarqube port-forward svc/sonarqube 9000:9000`, puis `/api/measures/component`, `/api/issues/search`, authentifiés par le token `SONAR_TOKEN` (secret GitHub) — testé sans jeton à cet arrêté (voir lignes ci-dessus) : 401 |
| Couverture API | `cd my_memo_master_api && npx jest --coverage` — rejoué le 2026-09-03 : **1 768/1 768**, 82,44 % (+208 tests vs 2026-09-01, portés par `C-01`) |
| Tests front + couverture | `cd my_memo_master_front && npx vitest run --coverage` — rejoué le 2026-09-03 : **739/739**, 59,4 % (+31 tests, couverture en recul de 1,9 pt) |
| Non-conformités RGAA (statique) | `cd my_memo_master_front && node scripts/audit-a11y.mjs` — rejoué le 2026-09-03 : 0/83 fichiers (+4 vs 2026-09-01) |
| Non-régression axe-core | `cd my_memo_master_front && npx vitest run test/a11y/axe.test.js` — inclus dans le rejeu complet de la suite à cet arrêté : 20/20 |
| Contraste RGAA 3.2 | `cd my_memo_master_front && npm run build && npx playwright test -c playwright.config.js` — **non rejoué en local à cet arrêté** ; confirmé indirectement vert via le job CI `test_and_lint (front)` (qui l'exécute) sur les 4 commits de l'intervalle ; dernier passage local connu : 8/8 |
| Vulnérabilités de dépendances | `npm audit --omit=dev` (API et front) — rejoué le 2026-09-03 : **3 modérées côté API** (`qs`/`body-parser`/`express`, CVE publiée après la dernière analyse), 0 côté front |
| Audit manuel des 106 critères RGAA | Référentiel officiel : `curl https://accessibilite.numerique.gouv.fr/doc/RGAA-v4.1.2.pdf` puis `pdftotext -layout -enc UTF-8`. Verdicts et méthode détaillée : `docs/AUDIT_RGAA_106.md` — toujours 60/106 (57 %), inchangé depuis le 2026-08-31 (vérifié à cet arrêté par lecture de la ligne « État global » du document) |
| Absence de saisie de temps | `odoo_cli.py fields project.task --grep hours` (aucun champ d'heures effectives) et `odoo_cli.py models --grep timesheet` (aucun modèle) |
| Vérification des livrables | Recherche directe dans le dépôt : `Dockerfile`, `.github/workflows/`, `scripts/backup.sh`, `docs/RUNBOOK.md`, `docs/AUDIT_RGAA.md`, `docs/RAPPORT_TESTS_QA.md`, `config/swagger.config.js`, `git tag` |
| Absence du service IA | `grep -rliE "openai|mistral|anthropic" --include="*.js"` hors `node_modules` (0), `helm/templates/` (aucun déploiement IA), `.env.example` (aucune variable IA) |
| Commits depuis le dernier arrêté | `git log --oneline d1ef46a..HEAD` sur `main` à cet arrêté : `c874bc7`, `18b843f`, `3589053`, `8baf9f6` (rejoué) — recherche par mot-clé sur les 350 tâches Odoo (même méthode qu'aux arrêtés précédents) : aucune tâche ne correspond au correctif `testQuestions`/`api.js` de `c874bc7`, confirmant qu'il reste hors registre comme les correctifs précédents |
