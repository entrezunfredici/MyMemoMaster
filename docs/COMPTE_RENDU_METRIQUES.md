# Compte rendu de pilotage — MyMemoMaster

> ⚠️ **Ce compte rendu est un arrêté au 2026-08-27. Les chiffres de charge et de délais qu'il contient ne décrivent plus l'état d'Odoo.** Le 2026-08-28, les 181 sous-tâches des blocs couverts par le planning d'équipe ont été redatées et rechiffrées sur des durées « dev junior » (voir `.agents/CHANGELOG_AGENT.md`) : la charge élémentaire passe de **1 209 JH à 262 JH** et la fenêtre de **2025-05-20 → 2026-05-08** à **2025-10-07 → 2026-07-21**. Les §3 (coûts), §4 (délais) et §6 (RH) sont à recalculer sur cette base ; les §2 (avancement), §5 (risques) et §7 (qualité) restent valables.

**Date d'arrêté des mesures** : 2026-08-27
**Périmètre** : projet Odoo `MyMemoMasterRNCP` (id 15, 279 tâches) + dépôt Git + SonarCloud + suites de tests locales.
**Taux journalier retenu** : 300 €/JH. **Conversion** : 1 JH = 8 h (calendrier de ressource Odoo « Standard 40 hours/week », `hours_per_day = 8`).
**Régime de travail retenu** (déclaré par le porteur du projet, non déductible des données Odoo — le calendrier de ressource y est à temps plein pour tout le monde) : **Frederic Macabiau à temps plein** ; **tous les autres contributeurs à 1 jour toutes les 3 semaines**. C'est cette asymétrie, et non le calendrier Odoo, qui sert de base à l'indicateur RH (§6) et à la lecture des délais (§4).

---

## 1. Tableau de bord — les 7 indicateurs

| Dimension | Indicateur | Unité | Valeur mesurée | Fiabilité |
|---|---|---|---|---|
| Avancement | Tâches validées / total | % | **83,6 %** sur le périmètre MVP au sens de l'étape Odoo « validé » (153/183) — **54,8 %** rapporté aux 279 tâches (153/279) — **92,3 %** au sens de l'état « Terminé » sur le MVP (169/183) | ⚠️ Deux lectures divergentes, écart résiduel de 16 tâches (voir §2) |
| Coûts | JH consommés × 300 €/j | € | **330 712 €** (1 102,4 JH — charge planifiée des tâches terminées) ; enveloppe totale planifiée **341 212 €** (1 137,4 JH) | ❌ Sans source : aucune saisie de temps, module Feuilles de temps absent de l'instance |
| Délais | Dates réelles vs Gantt prévisionnel | jours d'écart | **+127 j (médiane)** sur les 8 tickets appariables ; amplitude +73 à +216 j. Fin de Gantt 2026-05-08 dépassée de **111 jours** | ⚠️ Plan de référence solide (transcrit d'un planning *ex ante*, §4) mais aucune date de fin réelle dans Odoo |
| Risques | Dépendances bloquantes non levées | nb | **185 liens** de dépendance ouverts, portés par **79 verrous** distincts, immobilisant **92 tâches** — plus **6 dépendances d'infrastructure** externes ouvertes | ✅ Mesure directe |
| RH | Charge par profil / capacité disponible | JH | **1 137,4 JH planifiés pour 405,2 JH de capacité réelle = 281 %** à l'échelle de l'équipe ; **444 %** sur le seul contributeur à temps plein (1 128,6 / 254 JH) ; 3 contributeurs à 8,8 JH (52 %) ; 6 membres à 0 JH | ✅ Mesure directe, sur régime de travail déclaré |
| Qualité | Couverture de tests SonarQube | % | **0,0 %** (analyse SonarCloud du 2026-08-27 09:39 UTC) — couverture réelle non publiée : **86,6 %** mesurée localement sur l'API | ❌ Indicateur non alimenté |
| Qualité | Non-conformités RGAA | nb | **0** sur les 5 critères outillés (79 fichiers `.vue` ré-audités ce jour) | ⚠️ Périmètre outillé, pas les 106 critères |

---

## 2. Avancement — 83,6 % du MVP à l'étape « validé »

Le chiffre dépend du dénominateur retenu et du champ observé (étape Kanban ou état de tâche) :

| Lecture | Numérateur / dénominateur | % |
|---|---|---|
| Étape Kanban « validé », toutes tâches | 153 / 279 | 54,8 % |
| Étape Kanban « validé », périmètre MVP (blocs `M-*` et `S-*`) | 153 / 183 | **83,6 %** |
| Idem, tâches élémentaires seules (hors Synthèses) | 141 / 168 | 83,9 % |
| État de tâche « Terminé » (`1_done`), toutes tâches | 169 / 279 | 60,6 % |
| État « Terminé » sur le périmètre MVP | 169 / 183 | 92,3 % |

**Recadrage du tableau effectué le 2026-08-27** : les sous-tâches des 12 blocs dont la Synthèse était à l'étape « validé » étaient restées en « en cours » (120) ou « spécification » (17) alors que leur parent était validé. **137 tâches ont été repositionnées à l'étape « validé »** (blocs `M-00`, `M-01`, `M-02`, `M-03`, `M-04`, `M-05`, `M-06`, `S-01`, `S-02`, `S-03`, `S-04`, `S-05`). Les 137 étaient déjà toutes à l'état `1_done` — le repositionnement corrige une tenue de tableau en retard, il ne déclare terminé aucun travail qui ne l'était pas. L'étape « validé » passe ainsi de 16 à 153 tâches, et l'indicateur d'avancement de 5,7 % à 54,8 %.

**Ce qui explique l'écart au dénominateur** : les 279 tâches incluent 95 tâches des blocs `C-*` (confort) et `W-*` (souhaits) — chatbot, gamification, chat de groupe, connecteur ENT, tutorat — **toutes en étape « spécification », aucune démarrée, aucune chiffrée**. Elles constituent un backlog d'évolutions, pas un reste-à-faire engagé. Les mélanger au MVP fait perdre 29 points d'avancement.

**Écart résiduel entre étape et état : 16 tâches.** Elles sont à l'état « Terminé » mais pas à l'étape « validé », et se répartissent sur exactement deux blocs, dont la Synthèse n'est elle-même pas validée :

| Bloc | Étape de la Synthèse | Sous-tâches `1_done` hors « validé » |
|---|---|---|
| `M-00b` Infrastructure, CI/CD et exploitation | en cours | 9 (sur 13) |
| `S-06` Interpréteur de formules et grandeurs | vérification | 7 (sur 7) |

Ces deux blocs sont livrés et déployés en production. Leur passage à « validé » n'a pas été fait ici : il suppose de statuer sur le reste-à-faire de `M-00b` — **4 sous-tâches non terminées** (`M-00b.07b` audit sécurité final, `M-00b.09` sauvegardes auto, `M-00b.11` procédure de restore, `M-00b.12` documentation déploiement) — et de clore la vérification de `S-06`, dont les 7 sous-tâches sont pourtant toutes terminées. **C'est la dernière action à mener pour que l'étape Kanban et l'état de tâche donnent la même lecture.**

**Reste à faire sur le MVP** : 11 tâches élémentaires, 280 h — dont 4 sur le seul bloc `M-00b` (infrastructure, CI/CD, exploitation).

---

## 3. Coûts — 330 712 € de charge livrée, valorisée au barème

| Base | Heures | JH | Coût à 300 €/JH |
|---|---|---|---|
| Charge planifiée totale (tâches élémentaires) | 9 099 h | 1 137,4 | **341 212 €** |
| Dont tâches à l'état « Terminé » | 8 819 h | 1 102,4 | **330 712 €** |
| Reste à faire MVP | 280 h | 35,0 | **10 500 €** |
| Backlog `C-*` / `W-*` (95 tâches) | non chiffré | — | **inconnu** |

**Deux réserves, à énoncer avant tout usage de ces chiffres :**

1. **Ce sont des charges planifiées, pas du temps consommé — et il ne peut pas en être autrement.** Il n'y a jamais eu de saisie de temps sur ce projet, et l'instance Odoo ne permettrait pas d'en faire : **le module Feuilles de temps n'y est pas installé**. Le modèle `project.task` n'expose aucun champ d'heures effectives (seulement `allocated_hours`, `subtask_allocated_hours`, `working_hours_open`, `working_hours_close`), et aucun modèle de feuille de temps n'existe dans l'instance. L'indicateur n'est donc pas « non renseigné » : **il est sans source possible en l'état**. « JH consommés » est approximé par la charge planifiée des tâches passées à « Terminé » — une hypothèse qui suppose une exécution exactement conforme à l'estimation.
   **Le régime de travail réel rend cette hypothèse intenable en l'état** : la capacité de l'équipe sur la fenêtre de Gantt est de **405,2 JH** (§6), pour 1 102,4 JH réputés consommés. Le produit a bien été livré, ce qui ne laisse que deux lectures possibles — soit le travail s'est étalé au-delà de la fenêtre (ce que confirme le §4 : 111 jours au-delà de la fin de Gantt, et un dépôt actif depuis 2024-10), soit les estimations du gabarit sont supérieures au temps réellement passé. Les deux jouent probablement. **Le chiffre de 330 712 € doit donc être présenté pour ce qu'il est : la valorisation au barème de la charge planifiée livrée, et non une dépense constatée.**
2. **Correction appliquée sur une anomalie de saisie.** La tâche 1337 (`[M-06.15]`, correction sémantique par IA) porte 645 h, valeur recopiée du total de son bloc lors d'une édition externe le 2026-08-27 ; sa charge de gabarit est de 70 h. Le brut Odoo (9 674 h / 362 775 €) a été ramené à 9 099 h. **Sans cette correction, le coût est surévalué de 21 563 €.**

**Cohérence des totaux à surveiller** : les heures portées par les tâches « Synthèse » ne correspondent à la somme de leurs sous-tâches dans **aucun** des 16 blocs chiffrés (écarts de −995 h à +471 h). Toute restitution qui s'appuierait sur les totaux de bloc plutôt que sur les tâches élémentaires produirait un chiffre faux.

---

## 4. Délais — +127 jours d'écart médian

**Fenêtre prévisionnelle (Gantt Odoo)** : 2025-05-20 → 2026-05-08, soit 254 jours ouvrés.
**Réalité** : premier commit du dépôt le 2024-10-03, 174 journées de commits, dernière livraison le 2026-08-27 — soit **111 jours calendaires au-delà de la fin de Gantt**, avec du reste-à-faire encore ouvert.

**Mesure fine** : Odoo porte le plan mais aucune trace du réalisé — **aucune date de fin réelle** (champ `date_end` vide sur les 279 tâches). L'écart n'est donc pas calculable dans l'outil. Il a été reconstitué en appariant les codes de tickets du journal de livraison (`.agents/CHANGELOG_AGENT.md`, 95 entrées datées) avec les échéances Odoo. **8 tickets seulement** sont appariables avec une échéance :

| Bloc | Tickets appariés | Écart médian | Échéance Gantt la plus tardive | Livraison réelle la plus tardive |
|---|---|---|---|---|
| M-06 | 2 | +187 j | 2026-01-23 | 2026-08-27 |
| S-01 | 1 | +125 j | 2026-02-20 | 2026-06-25 |
| S-02 | 4 | +127 j | 2026-04-15 | 2026-06-27 |
| S-06 | 1 | +163 j | 2026-02-06 | 2026-07-19 |
| **Ensemble** | **8** | **+127 j** (min +73, max +216) | — | — |

**Le plan de référence est antérieur à Odoo, et Odoo n'en est que la transcription.** Le point est décisif pour la validité de l'indicateur, et il est vérifiable dans les données : chaque tâche porte dans sa description un `ID source planning` (**253 tâches sur 279**) et, pour 129 d'entre elles, une ligne `Planning CSV: jj/mm/aaaa → jj/mm/aaaa`. **Sur 123 de ces 129 tâches, les dates du Gantt Odoo sont identiques au jour près à celles du planning amont.** Les 6 écarts s'expliquent : trois concernent les sous-tâches remontées à la racine du projet pour être visibles dans le Gantt (1126, 1335, 1336), dont les dates ont été ressaisies à cette occasion.

Les tâches portent également leur rattachement d'origine : **sprints MVP 1 à 7, sprints V1 8 et 9**, plus deux phases nommées — « **Été 2025 (solo)** » pour l'analyse et la conception, et « **Post 29/04/2026** » pour tout ce qui suit. Il y a donc bien eu une planification établie *ex ante*, structurée en sprints, dont Odoo est le report fidèle. **Comparer le réalisé à ce Gantt est légitime** : ce n'est pas un plan reconstruit après coup pour les besoins du dossier.

**Ce qu'Odoo n'apporte pas, en revanche, c'est le suivi.** L'outil a été peuplé le 2026-05-14, soit après la fin de la fenêtre qu'il décrit (2026-05-08) et après le dernier commit d'un contributeur autre que le porteur du projet (2026-04-29). Il porte le plan, jamais son exécution : d'où l'absence totale de `date_end` et la concentration de 99 % de la charge sur un seul nom (§6). Détail qui confirme la cohérence de l'ensemble : la borne « Post 29/04/2026 » inscrite dans le planning **coïncide exactement** avec le dernier commit de l'équipe — la fin de la phase collaborative était planifiée, elle n'a pas été subie.

**L'écart était par ailleurs inscrit dans le plan lui-même.** Le Gantt répartit 1 137,4 JH de charge sur une fenêtre où la capacité de l'équipe est de 405,2 JH (§6) : il demande **2,8 fois** ce qui pouvait être produit. Un dépassement était donc structurellement certain avant la première ligne de code — les +127 jours médians ne mesurent pas un retard d'exécution, ils mesurent l'écart entre un planning établi au rythme d'un temps plein généralisé et une équipe dont un seul membre était à temps plein, les neuf autres travaillant 1 jour toutes les 3 semaines. **C'est la conclusion la plus solide de l'indicateur délais.**

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

## 6. RH — 281 % de la capacité réelle de l'équipe

**Capacité de référence, sur la fenêtre de Gantt (2025-05-20 → 2026-05-08, 50,4 semaines)** — le calendrier de ressource Odoo déclare tout le monde à temps plein, ce qui ne correspond pas au régime réel du projet :

| Régime | Capacité par personne | Personnes |
|---|---|---|
| Temps plein (jours ouvrés) | **254 JH** | 1 (Frederic Macabiau) |
| 1 jour toutes les 3 semaines | **16,8 JH** | 9 |
| | **Capacité totale équipe : 405,2 JH** | 10 |

*Majorant nominal : ce total suppose les 10 contributeurs présents sur toute la fenêtre, ce qu'ils n'étaient pas (§6.1).*

**Charge planifiée : 1 137,4 JH (9 099 h) — soit 281 % de la capacité de l'équipe.** Le plan tel qu'il est saisi demande près de trois fois ce que l'équipe pouvait produire sur la fenêtre, avant même de regarder sa répartition.

| Contributeur | Régime | Tâches élémentaires | Charge (h) | Charge (JH) | Capacité | Charge / capacité |
|---|---|---|---|---|---|---|
| Frederic Macabiau | temps plein | 252 | 9 029 | 1 128,6 | 254,0 | **444 %** |
| Achouak Dairak | 1 j / 3 sem | 1 | 70 | 8,8 | 16,8 | 52 % |
| Isra Guesmi | 1 j / 3 sem | 1 | 70 | 8,8 | 16,8 | 52 % |
| Ouassim Djekoun Hocine | 1 j / 3 sem | 1 | 70 | 8,8 | 16,8 | 52 % |
| Antho | 1 j / 3 sem | 0 | 0 | 0 | 16,8 | 0 % |
| Jorgelina | 1 j / 3 sem | 0 | 0 | 0 | 16,8 | 0 % |
| Léna Ricard | 1 j / 3 sem | 0 | 0 | 0 | 16,8 | 0 % |
| Gaia Ducournau | 1 j / 3 sem | 0 | 0 | 0 | 16,8 | 0 % |
| Ilias Ouandouri | 1 j / 3 sem | 0 | 0 | 0 | 16,8 | 0 % |
| Valentin Carles | 1 j / 3 sem | 0 | 0 | 0 | 16,8 | 0 % |

*Charges calculées sur les tâches élémentaires (hors Synthèses), tâche 1337 ramenée à 70 h conformément au §3. La tâche 1337 étant assignée à 4 personnes, ses 70 h sont comptées pour chacune — c'est l'unique charge des trois contributeurs à 8,8 JH.*

**Constats :**

- **252 des 254 tâches élémentaires sont assignées à la seule personne à temps plein**, pour 4,4 fois sa capacité individuelle. Les 100,8 JH théoriquement portés par les 9 autres ne sont mobilisés par aucune tâche — mais c'est la conséquence du §6.1, pas un choix d'affectation : au moment où le registre a été créé, ces contributeurs avaient déjà quitté le projet. **Ce tableau décrit une équipe d'une personne, avec neuf noms.**
- **Six des dix contributeurs portent 0 JH de charge élémentaire.** Ils n'apparaissent que sur des tâches « Synthèse », qui n'ont pas de charge propre. Ce n'est pas une négligence de saisie : ils avaient tous cessé de contribuer avant la création du projet Odoo — voir §6.1, qui est la clé de lecture de ce tableau.
- Les trois contributeurs à 8,8 JH ne doivent cette charge qu'à **une seule tâche partagée** (1337). Avant correction de son anomalie de saisie (645 h au lieu de 70 h, §3), ils apparaissaient à 80,6 JH — soit 480 % de leur capacité réelle, pour une tâche à laquelle ils n'ont pas contribué.
- Aucun profil (développeur, ops, designer…) n'est renseigné sur les contributeurs : la ventilation est nominative, pas par profil. **L'indicateur « charge par profil » n'est pas alimentable en l'état** — seule la lecture par personne est possible.

### 6.1 Ce que corrobore le dépôt Git — et ce qu'Odoo n'a jamais vu

Le régime déclaré est cohérent avec l'activité observable, à condition de lire les jours de commit pour ce qu'ils sont — **un plancher d'activité, pas une mesure d'effort** (une journée de conception, de documentation ou d'infrastructure ne laisse pas nécessairement de commit) :

| Contributeur Git | Commits | Jours actifs | Premier commit | Dernier commit |
|---|---|---|---|---|
| Frederic Macabiau | 568 | **156** | 2024-10-03 | **2026-08-27** |
| Anthony Lalba | 133 | 29 | 2024-11-27 | 2026-04-29 |
| nicolaspoda | 83 | 10 | 2024-11-27 | 2025-05-27 |
| Gaia Ducournau | 28 | 11 | 2024-12-18 | 2026-04-29 |
| Quentin Guilhamasse | 21 | 9 | 2024-11-27 | 2025-05-28 |
| Jordan Quin | 20 | 8 | 2024-12-18 | 2025-05-28 |
| Georgie1502 | 11 | 5 | 2025-03-05 | 2026-02-25 |
| Autres (4 auteurs) | 10 | 7 | 2024-11-27 | 2026-04-29 |

**Trois observations, dont une qui conditionne la lecture de tout le §6 :**

1. **L'asymétrie de contribution est vérifiable indépendamment d'Odoo** : 156 journées actives pour le contributeur à temps plein contre 29 au maximum pour tout autre, et 65 contre 6 sur la seule fenêtre de Gantt — un rapport du même ordre que le rapport de capacité 254 / 16,8 déclaré.
2. **Le projet Odoo est postérieur à la phase collaborative.** Les 253 premières tâches ont été créées le **2026-05-14** ; le dernier commit d'un contributeur autre que Frederic Macabiau date du **2026-04-29**. Les 196 commits postérieurs à la création du registre sont **tous** de Frederic. Autrement dit, **Odoo n'a jamais observé le projet en équipe** — il a été mis en place quand celui-ci était déjà mené par une seule personne. Attention à ne pas en tirer la conclusion excessive : le **plan** qu'il porte, lui, est bien contemporain de la phase collaborative (il est transcrit d'un planning amont établi *ex ante*, §4). C'est l'**observation** qui manque, pas la planification.
3. **C'est ce qui explique les six contributeurs à 0 JH**, et non une négligence de saisie. Quatre auteurs Git (`nicolaspoda`, `Quentin Guilhamasse`, `Jordan Quin`, `Georgie1502` — 135 commits) n'ont pas de compte dans le projet Odoo, et les assignés qui en ont un mais aucune tâche chiffrée avaient cessé de contribuer avant sa création. Leur travail est réel et visible dans le dépôt ; il est simplement **hors du champ temporel du registre**.

> **Conséquence à énoncer avant tout usage du §6** : la capacité de 405,2 JH est un **majorant nominal**. Elle suppose les 10 contributeurs disponibles sur l'intégralité des 50,4 semaines, alors que la plupart ont quitté le projet en cours de fenêtre — trois d'entre eux dès mai 2025, c'est-à-dire à son ouverture. La surcharge réelle est donc **supérieure** aux 281 % affichés, sans qu'il soit possible de la chiffrer : Odoo ne porte aucune date d'entrée ou de sortie d'équipe, et l'absence de commit ne prouve pas l'absence du projet. **Les 281 % sont un plancher, pas une mesure.**

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

**Ce que disent les mesures** : le produit est livré et déployé — MVP à 92,3 % au sens de l'état de tâche, 83,6 % à l'étape « validé » après recadrage du tableau, production fonctionnelle, 2 230 tests verts, 0 non-conformité RGAA outillée.

**Le fait structurant du projet est ailleurs** : le plan porte 1 137,4 JH pour une capacité d'équipe de 405,2 JH au mieux, dont 254 sur une seule personne à temps plein — les neuf autres contributeurs disposant d'un jour toutes les trois semaines, et la plupart ayant quitté le projet avant la fin de la fenêtre. **Le produit a donc été livré à ~92 % du MVP par un contributeur unique, sur un plan dimensionné pour une équipe à temps plein.** Cela explique en un seul énoncé le dépassement de délais (§4), l'impossibilité de lire les coûts comme une dépense (§3) et la surcharge de 444 % (§6).

**Et une limite de méthode à assumer d'emblée, en distinguant deux choses souvent confondues.** *Le plan* est solide : il a été établi *ex ante*, structuré en sprints (MVP 1-7, V1 8-9), et Odoo le transcrit au jour près sur 123 des 129 tâches vérifiables (§4). *Le suivi*, lui, n'a jamais existé : Odoo a été peuplé le 2026-05-14, après la fin de la fenêtre qu'il décrit, et **le module Feuilles de temps n'y est même pas installé**. C'est un **registre de planification, pas un outil de pilotage au fil de l'eau** — et c'est la cause commune de presque tous les angles morts recensés ici : pas de date de fin réelle, aucune donnée de temps consommé, pas de profil, 49 % des tâches sans échéance, contributeurs de la phase collaborative absents.

**Conséquence pratique** : sur les sept indicateurs demandés, **trois se mesurent réellement** (risques, avancement, qualité RGAA), **deux se mesurent contre un plan authentique mais sans réalisé** (délais, RH), et **deux n'ont aucune source dans les systèmes** (coûts, couverture SonarQube). C'est cette carte, plutôt que chaque indicateur pris isolément, qui devrait ouvrir la restitution.

| Priorité | Action | Indicateur débloqué | Charge |
|---|---|---|---|
| **P0** | Régénérer les secrets `KUBECONFIG_*` | Risques (CD à l'arrêt) | < 0,5 JH |
| **P0** | Publier le `lcov` vers SonarCloud (couverture en CI + `sonar.javascript.lcov.reportPaths`) | Qualité — couverture passerait de 0 % à ~86 % | ~1 JH |
| **P1** | ~~Aligner les étapes Kanban sur l'état réel des tâches terminées~~ — **fait le 2026-08-27** (137 sous-tâches repositionnées) ; reste à valider les blocs `M-00b` et `S-06` (16 tâches) | Avancement (deux lectures au lieu de trois ; alignement complet après `M-00b`/`S-06`) | ~0,2 JH restant |
| **P1** | Corriger la tâche 1337 (645 h → 70 h) et réconcilier les totaux des 16 Synthèses | Coûts (−21 563 € d'écart), RH | ~0,5 JH |
| **P1** | Ouvrir un ticket sur les 9 bugs et 28 vulnérabilités SonarCloud | Qualité (fiabilité D, sécurité D) | à estimer |
| **P1** | Saisir le régime de travail réel dans les calendriers de ressource Odoo (1 j / 3 sem pour 9 contributeurs) au lieu du « Standard 40 hours/week » | RH, Délais (tout replanning Odoo est aujourd'hui calculé à 2,8× la capacité réelle) | ~0,5 JH |
| **P2** | Saisir les dates de fin réelles, ou acter que l'écart de délai se mesure hors Odoo | Délais (0 date réelle sur 279 tâches) | ~1 JH |
| **P2** | Renseigner un profil (dév, ops, design…) sur chaque contributeur | RH (« charge par profil » non alimentable, seule la lecture nominative est possible) | ~1 JH |
| **P2** | Documenter la phase collaborative hors Odoo (11 contributeurs Git, 2024-10 → 2026-04), le registre ayant été créé après sa clôture | RH (les 6 contributeurs à 0 JH sont un artefact de périmètre temporel, pas une donnée) | ~0,5 JH |
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
| Jours actifs par contributeur | `git log --format='%an\|%ad' --date=short`, jours distincts par auteur après unification des alias (11 identités Git → 11 contributeurs) |
| Régime de travail (temps plein / 1 j par 3 sem) | **Déclaré par le porteur du projet**, non mesurable : les calendriers `resource.calendar` d'Odoo sont tous à « Standard 40 hours/week » |
| Antériorité du planning sur Odoo | Champs `ID source planning`, `Planning CSV` et `Contexte tâche` extraits des descriptions des 279 tâches, comparés à `planned_date_begin` / `date_deadline` |
| Absence de saisie de temps | `odoo_cli.py fields project.task --grep hours` (aucun champ d'heures effectives) et `odoo_cli.py models --grep timesheet` (aucun modèle) |
