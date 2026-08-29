# Compte rendu de pilotage — MyMemoMaster

**Date d'arrêté des mesures** : 2026-08-28
**Périmètre** : projet Odoo `MyMemoMasterRNCP` (id 15, 381 tâches) + planning d'équipe `17_planning_MyMemoMaster.xlsx` + dépôt Git + **instance SonarQube auto-hébergée** (cluster `pck-dkoyol2`, analyse du 2026-08-28) + suites de tests locales.
**Taux journalier retenu** : 300 €/JH. **Conversion** : 1 JH = 8 h.
**Calendrier de référence** : plan condensé — 3 jours travaillés (mardi, mercredi, jeudi) toutes les 3 semaines, du **07/10/2025** au **18/06/2026** (13 cycles, 39 JH par personne), puis reprise par le seul chef de projet à taux plein jusqu'au **21/07/2026**.
**Durées** : estimation « développeur junior », établie tâche par tâche sur les 192 lignes du planning d'équipe. **C'est un jugement argumenté, pas une mesure** — voir la réserve du §3.

> **Ce qui a changé depuis l'arrêté du 2026-08-27.** Le registre Odoo a été remis à plat : gabarit à 70 h/tâche remplacé par les durées du planning d'équipe, dates reposées sur le calendrier condensé, 6 blocs transverses créés (marketing, design, service IA, recette, pilotage, documentation), Synthèses alignées sur leurs enfants, étapes Kanban validées sur preuve. **Les sept indicateurs sont recalculés sur cette base.** Les valeurs de l'arrêté précédent (330 712 €, 1 137 JH, 281 % de surcharge) reposaient sur un chiffrage de gabarit et ne sont plus comparables.

---

## 1. Tableau de bord — les 7 indicateurs

| Dimension | Indicateur | Unité | Valeur mesurée | Fiabilité |
|---|---|---|---|---|
| Avancement | Tâches validées / total | % | **87,0 %** à l'étape « validé » sur le périmètre engagé (241/277) — dont **77,3 %** confirmés sur preuve (214/277) ; 68,9 % rapporté aux 350 sous-tâches | ⚠️ 27 validations reposent sur la déclaration, pas sur une preuve |
| Coûts | JH consommés × 300 €/j | € | **100 275 €** validés (334,2 JH) ; enveloppe planifiée **124 050 €** (413,5 JH) ; reste à faire **23 775 €** | ⚠️ Charge planifiée, aucune saisie de temps possible |
| Délais | Dates réelles vs Gantt prévisionnel | jours d'écart | **63 tâches** au-delà de leur échéance (1 058 h), dont 30 sur le seul bloc `IA` ; plan clos au 21/07/2026 | ⚠️ Le plan est condensé — voir §4 |
| Risques | Dépendances bloquantes non levées | nb | **183 liens** ouverts, **78 verrous** distincts, **91 tâches** immobilisées — plus **6 dépendances d'infrastructure** | ✅ Mesure directe |
| RH | Charge par profil / capacité disponible | JH | **411 JH pour 483 JH de capacité = 85 %**, réparti sur **7 profils** ; pointe à 113 % (SysAdmin) | ✅ Alimentable pour la première fois |
| Qualité | Couverture de tests SonarQube | % | **0,0 %** — analyse opérationnelle et mesurée en direct sur l'instance auto-hébergée, mais aucun rapport `lcov` publié ; couverture réelle **86,6 %** mesurée localement sur l'API | ❌ Indicateur non alimenté (la chaîne, elle, fonctionne) |
| Qualité | Non-conformités RGAA | nb | **0** sur les 5 critères outillés (79 fichiers `.vue`) | ⚠️ Périmètre outillé, pas les 106 critères |

**Ce que ce tableau ne dit pas et qu'il faut dire avec lui** : 27 tâches portent l'étape « validé » sur la seule foi du planning d'équipe et ne sont **pas confirmées par le dépôt** (§7.3). **Elles sont incluses dans les 87 %** — les en retirer ramène l'avancement à **77,3 %**. C'est l'écart entre « ce que l'équipe a déclaré » et « ce qui est démontrable », et il doit être énoncé avec le chiffre.

---

## 2. Avancement — 87 % du périmètre engagé

| Lecture | Numérateur / dénominateur | % |
|---|---|---|
| **Périmètre engagé**, étape « validé » | **241 / 277** | **87,0 %** |
| **Idem, en ne retenant que le confirmé sur preuve** | **214 / 277** | **77,3 %** |
| Toutes sous-tâches élémentaires | 241 / 350 | 68,9 % |
| Backlog non chiffré (`C-03`→`C-06`, `S-07`, `W-*`) | 0 / 73 | 0 % |

**Deux chiffres, et il faut donner les deux.** 241 sous-tâches portent l'étape « validé », mais **27 d'entre elles n'y sont que sur la déclaration du planning d'équipe** : le dépôt ne confirme ni le service IA ni les tests E2E qu'elles décrivent (§7.3). L'avancement démontrable est donc de **77,3 %**, et l'écart de 9,7 points est exactement la mesure de ce qui est affirmé sans preuve.

**L'alignement des champs est réel mais asymétrique.** **Aucune tâche n'est à l'état « Terminé » sans porter l'étape « validé »** — c'est ce qui rendait l'indicateur illisible aux arrêtés précédents (5,7 % contre 92,3 % selon le champ lu) et c'est résorbé. En revanche, **27 tâches portent l'étape « validé » sans être à l'état « Terminé »** : ce sont précisément les 27 non confirmées, laissées dans cet état intermédiaire pour qu'elles restent repérables dans l'outil jusqu'à l'arbitrage.

**Les 214 confirmées l'ont été sur preuve dans le dépôt** — Dockerfiles, workflows CI/CD, `scripts/backup.sh`, `docs/RUNBOOK.md`, `docs/AUDIT_RGAA.md`, tags git, entrées datées du journal de livraison — et non sur le statut déclaré dans le planning.

**Le dénominateur à retenir est 277, pas 350.** Les 73 sous-tâches restantes appartiennent aux blocs `C-03` (partage de ressources), `C-04` (chat de groupe), `C-05` (autocomplétions IA), `C-06` (gamification), `S-07` (modération) et `W-01`→`W-04` (chatbot, résultats scolaires, centre d'aide, tutorat). Elles ne portent **ni charge ni date** parce que le planning d'équipe ne les contient pas : c'est un backlog d'évolutions, pas un reste-à-faire engagé. Les inclure au dénominateur fait perdre 18 points d'avancement sans rien mesurer de plus.

**Reste à faire sur le périmètre engagé** : 36 sous-tâches, 634 h (79,2 JH). Elles se concentrent sur quatre ensembles — les 20 sous-tâches des blocs `C-01`/`C-02` (génération par IA, jamais construite), les 6 tâches de clôture documentaire, `M-00b.11` (test de restauration) et les bilans de fin de projet.

---

## 3. Coûts — 100 275 € validés sur une enveloppe de 124 050 €

| Base | Heures | JH | Coût à 300 €/JH |
|---|---|---|---|
| Charge planifiée (sous-tâches élémentaires) | 3 308 h | 413,5 | **124 050 €** |
| Dont validé sur preuve | 2 674 h | 334,2 | **100 275 €** |
| Reste à faire | 634 h | 79,2 | **23 775 €** |
| Backlog non chiffré (73 tâches) | — | — | **inconnu** |

**Trois réserves, à énoncer avant tout usage de ces chiffres.**

1. **Ce sont des charges planifiées, pas du temps consommé — et il ne peut pas en être autrement.** Il n'y a jamais eu de saisie de temps sur ce projet, et l'instance Odoo ne le permettrait pas : **le module Feuilles de temps n'y est pas installé**. `project.task` n'expose aucun champ d'heures effectives, et aucun modèle de feuille de temps n'existe. L'indicateur n'est pas « non renseigné », il est **sans source possible**. « JH consommés » est approximé par la charge des tâches passées à « validé ».

2. **Les durées sont une estimation, pas un relevé.** Les 411 JH proviennent d'une réestimation « profil junior » faite tâche par tâche sur les 192 lignes du planning d'équipe, qui en déclarait 236,5. Le rapport est de **×1,74**, avec un écart assumé selon la nature du travail : les tâches de pilotage, de bilan et d'archivage bougent peu (×1,0-1,5), le développement et l'infrastructure doublent (×1,8-2,2). Chaque valeur est défendable individuellement ; l'ensemble reste une hypothèse.

3. **La répartition à l'intérieur d'un bloc est une convention.** Le planning d'équipe est au grain « une ligne par sprint et par personne » (192 lignes), le registre Odoo au grain « une sous-tâche par élément livrable » (350). La charge d'un bloc est donc divisée à parts égales entre ses sous-tâches, arrondie au quart de journée. Dans `S-04`, où une seule ligne de planning alimente 13 sous-tâches Odoo, chacune reçoit 2 h — chiffre faible mais fidèle à ce que le planning contient.

**Ce qui a disparu par rapport à l'arrêté précédent** : le gabarit à 70 h par tâche, qui donnait le même prix à une documentation et à un moteur de correction sémantique, et l'anomalie de la tâche 1337 (645 h recopiés du total de son bloc, soit 21 563 € de surévaluation). La distribution des charges va désormais de 2 h à 40 h et suit la nature du travail.

---

## 4. Délais — 63 tâches au-delà de leur échéance

**Plan de référence** : 07/10/2025 → 21/07/2026. **277 sous-tâches datées sur 350** ; les 73 non datées sont le backlog non chiffré du §2.

| Mesure | Valeur |
|---|---|
| Sous-tâches dont l'échéance est dépassée et qui ne sont pas terminées | **63** |
| Charge correspondante | 1 058 h (132 JH, **39 675 €**) |
| Fin du plan | 21/07/2026 — dépassée de 38 jours à la date d'arrêté |

**Répartition des 63 retards :**

| Bloc | Nb | Nature |
|---|---|---|
| `IA` | **30** | Service IA — dont 24 déclarées faites mais non confirmées par le dépôt (§7.3) |
| `C-01` / `C-02` | 20 | Génération de Leitner et d'exercices par IA — jamais construites |
| `DOC` | 6 | Bilans et clôture documentaire |
| `QA` | 4 | Recette finale, dont 3 non confirmées |
| `M-00b` | 2 | Test de restauration, déploiement |
| `PIL` | 1 | Clôture de projet |

**Comment lire cet indicateur — et comment ne pas le lire.** Le plan de référence est **volontairement condensé** : les deux années réelles du projet (premier commit le 2024-10-03, dernier le 2026-08-28) ont été ramenées à dix mois pour produire un Gantt lisible, au rythme de 3 jours toutes les 3 semaines. **Un écart jour pour jour entre ce plan et la chronologie réelle du dépôt n'a donc aucun sens** : les deux calendriers ne mesurent pas la même durée.

Ce que l'indicateur mesure réellement, c'est le **reste-à-faire dont la date de livraison prévue est passée** : 63 tâches, 132 JH, concentrées à 79 % sur deux ensembles — le service IA et la génération par IA. Autrement dit, **le retard du projet est presque entièrement un retard sur le périmètre IA**, le reste étant de la clôture documentaire.

**Progrès méthodologique par rapport à l'arrêté précédent** : le plan précédent répartissait 1 137 JH sur une capacité de 405 JH, soit 2,8 fois le produisible — le dépassement était arithmétiquement certain avant la première ligne de code. **Le plan actuel tient dans la capacité de l'équipe** (85 %, §6). Un écart constaté aujourd'hui est donc un écart d'exécution, pas un vice de construction du plan.

---

## 5. Risques — 183 dépendances bloquantes ouvertes

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

## 6. RH — 85 % de la capacité, ventilée par profil

**C'est l'indicateur qui change le plus.** Aux arrêtés précédents, il était déclaré *non alimentable* : aucun profil n'était renseigné sur les contributeurs Odoo, et la ventilation ne pouvait être que nominative. Le planning d'équipe porte un **rôle par intervenant** : la charge par profil est donc calculable pour la première fois.

**Capacité de référence** : 13 cycles × 3 jours = **39 JH par personne** sur la fenêtre d'équipe, plus 15 jours ouvrés de juillet pour le chef de projet à taux plein.

| Profil | Effectif | Charge (JH) | Capacité (JH) | Taux |
|---|---|---|---|---|
| Dev Full Stack | 4 | 157,5 | 156,0 | **101 %** |
| Expert IA | 3 | 105,5 | 117,0 | 90 % |
| SysAdmin | 1 | 44,0 | 39,0 | **113 %** |
| Lead Tech | 1 | 31,5 | 39,0 | 81 % |
| Créa/Design | 1 | 27,5 | 39,0 | 71 % |
| Expert en marketing | 1 | 27,0 | 39,0 | 69 % |
| Chef de projet | 1 | 18,0 | 54,0 | 33 % |
| **Total** | **12** | **411,0** | **483,0** | **85 %** |

**Constats :**

- **Le plan est réalisable.** 85 % de la capacité collective, contre 281 % à l'arrêté précédent. Ce n'est pas le même travail qui a été replanifié : c'est le même travail chiffré sur des durées crédibles et étalé sur un calendrier qui correspond au rythme réel de l'équipe.
- **Quatre personnes dépassent 100 %** — Valentin Carles (113 %), Ilias Ouandouri (108 %), Hocine O. Djekoun (106 %), Gaïa Ducournau (105 %). Le dépassement est absorbé par le mécanisme de fin de plan : **14,5 JH, soit 12 tâches, sont réaffectées au chef de projet** en juillet, à taux plein. C'est ce qui ramène chacun dans sa capacité et ce qui explique le taux de 33 % du chef de projet sur la fenêtre d'équipe — il garde de la réserve pour absorber ce report.
- **Le profil le plus tendu est le SysAdmin**, seul sur 44 JH d'infrastructure (VPS, deux clusters Kubernetes, CI/CD, observabilité, sauvegardes). C'est aussi le profil sans redondance : aucune autre personne du plan ne porte de tâche d'infrastructure.
- **L'expertise IA est le profil le mieux doté** (3 personnes, 90 %) et pourtant celui dont les livrables sont les moins vérifiables (§7.3). L'écart n'est pas un problème de capacité.

---

## 7. Qualité — couverture de tests et accessibilité

### 7.1 Couverture SonarQube : 0,0 % — mais la chaîne d'analyse est désormais opérationnelle

**Ce qui a changé le 2026-08-28.** L'analyse a quitté SonarCloud pour une **instance SonarQube Community 26.8 auto-hébergée** sur le cluster Infomaniak `pck-dkoyol2` (namespace `sonarqube`, chart `helm-sonarqube/`, PostgreSQL 17 dédié, 3 PVC en `csi-cinder-sc-retain`). L'instance n'est **pas exposée sur Internet** : le runner GitHub l'atteint par un tunnel `kubectl port-forward` vers l'API Kubernetes, elle-même publique et authentifiée par kubeconfig.

**La chaîne est éprouvée**, ce qui n'était pas acquis : premier passage réel du job CI `sonarqube` au merge de `feat/sonarqube-k8s`, tâche `REPORT` en statut `SUCCESS` soumise **135 s après le push**, 7,1 s de calcul. Vérifié par l'API de l'instance, base de référence relevée à zéro analyse avant le push.

**Mesures de l'analyse du 2026-08-28**, **requêtées directement sur l'instance** (`/api/measures/component` via tunnel), comparées à la dernière analyse SonarCloud de la veille :

| Métrique | Auto-hébergé (28/08) | SonarCloud (27/08) |
|---|---|---|
| Lignes de code | 33 576 | 33 940 |
| Bugs | **9** | 9 |
| **Vulnérabilités** | **11** | **28** |
| Security hotspots | 0 | — |
| Code smells | 730 | 704 |
| Duplication | 2,5 % | 2,5 % |
| **Couverture** | **0,0 %** | 0,0 % |
| Dette technique | 4 743 min ≈ 79 h ≈ **2 964 €** | 4 594 min |
| Maintenabilité / Fiabilité / Sécurité | **A / D / D** | A / D / D |
| Quality gate | **OK** | — |

**Le quality gate passe, mais il ne dit presque rien.** Sa seule condition est `new_violations = 0` sur le code nouveau, et elle est satisfaite parce qu'aucun code nouveau n'a été analysé depuis la base de référence. **Il ne porte aucun jugement sur les 750 anomalies existantes** — un « OK » de quality gate n'est pas un état des lieux.

**L'indicateur demandé reste à 0 %, et le changement d'hébergement n'y est pour rien.** La cause est inchangée : le job `test_and_lint` exécute `npm run test` sans option de couverture, aucun artefact `lcov` n'est produit ni transmis, et `sonar.javascript.lcov.reportPaths` n'est pas renseigné dans `sonar-project.properties`. **L'action P0 reste entière** — c'est ~1 JH pour passer l'indicateur de 0 % à ~86 %.

**Couverture réellement mesurée** (exécution locale, 2026-08-27 — code applicatif inchangé depuis) :

| Périmètre | Instructions | Lignes | Branches | Fonctions | Tests |
|---|---|---|---|---|---|
| API (Jest) | **86,6 %** | 87,21 % | 68,99 % | 85,91 % | 1 545 tests / 84 suites, tous verts |
| Front (Vitest) | non mesurable | — | — | — | 685 tests / 44 fichiers, tous verts |

La couverture front n'est pas mesurable sans ajouter `@vitest/coverage-v8`, absente du projet.

#### 7.1.1 — Les 11 vulnérabilités, une par une

L'accès direct à l'instance a permis de les caractériser (`/api/issues/search`) plutôt que de s'en tenir au compte :

| Règle | Nb | Sévérité | Nature |
|---|---|---|---|
| `javascript:S2245` | **8** | MAJOR | « Make sure that using this pseudorandom number generator is safe here » — `Math.random()` dans `upload.middleware.js` (3), `mindmapImageUpload.js` (2), `functions.js` (2), `mindmap.js` (1) |
| `javascript:S5693` | 1 | MAJOR | Limite de taille de contenu à vérifier |
| `docker:S6471` | 1 | MINOR | L'image `node` tourne en `root` par défaut — `my_memo_master_api/Dockerfile:18` |
| `docker:S6470` | 1 | **CRITICAL** | `COPY . .` récursif — `my_memo_master_api/Dockerfile:25` |

**L'écart 11 / 28 s'explique, et il rend les deux chiffres non comparables.** Les 11 findings sont **tous** des règles de type « Make sure … is safe here » : ce sont, dans la terminologie Sonar, des **security hotspots** — des points à faire relire par un humain, pas des failles confirmées. Or l'instance auto-hébergée les classe en *vulnérabilités* et affiche **0 hotspot**, là où SonarCloud sépare les deux catégories. **Les deux plateformes ne rangent pas les mêmes règles au même endroit** : additionner ou comparer leurs compteurs n'a pas de sens. Ce qui est opposable, c'est la note de sécurité — **D dans les deux cas** — et le détail ci-dessus, qui lui ne dépend d'aucune convention de comptage. Les profils qualité de l'instance sont tous les « Sonar way » par défaut, sans personnalisation.

#### 7.1.2 — ⚠️ La vulnérabilité CRITICAL est réelle : secrets embarqués dans l'image API

`docker:S6470` n'est pas un faux positif. Vérification faite dans le dépôt :

- `my_memo_master_api/Dockerfile:25` fait `COPY . .` dans le stage de production ;
- `my_memo_master_api/.dockerignore` ne contient que `node_modules/`, `.git`, `.idea`, `Dockerfile*` — **`.env` n'y est pas** ;
- `my_memo_master_api/.env` existe et porte **`AUTH_JWT_SECRET`** et **`SMTP_PASS`**.

**Toute image construite depuis un poste de développement embarque donc ces secrets dans une couche.** Le fichier est bien ignoré par git (`.gitignore:1`), ce qui limite la portée : **les images construites par la CI, à partir d'un checkout propre, ne sont pas concernées** — le `.env` n'y existe pas. Le risque porte sur les builds locaux (`docker compose build`) et sur toute image qui en serait issue puis poussée.

**Correctif** : ajouter `.env` et `.env.*` à `my_memo_master_api/.dockerignore`. Quelques minutes, à faire avant toute publication d'image construite localement.

**À ne pas confondre avec le chiffre Dependabot** : GitHub signale 10 vulnérabilités sur la branche par défaut (7 hautes, 2 modérées, 1 basse). Cela ne contredit pas le « 0 vulnérabilité » de `npm audit --omit=dev` obtenu en CI — Dependabot compte aussi les dépendances de développement, qui n'entrent pas dans les images déployées.

**Limites de l'instance** : analyse restreinte à `main` (le multi-branches est absent de l'édition Community), et projet en visibilité publique dans l'instance — sans effet tant qu'aucun Ingress n'est posé.

### 7.2 Non-conformités RGAA : 0

Audit statique sur **79 fichiers `.vue`** :

| Critère RGAA | Avant campagne | Aujourd'hui |
|---|---|---|
| 11.1 — champ sans nom accessible | 111 | **0** |
| 7.1 — clic sans équivalent clavier | 21 | **0** |
| 11.9 — bouton symbole sans nom accessible | 14 | **0** |
| 1.1 — image sans `alt` | 0 | **0** |
| **Total** | **135** | **0** |

Non-régression assurée par 4 tests axe-core exécutés à chaque push.

**Réserve de portée** : le zéro porte sur **5 critères outillés**, pas sur les 106 critères du RGAA 4. Trois angles morts subsistent : contrastes non mesurés (jsdom ne calcule pas les styles), aucun test lecteur d'écran réel, axe-core limité à 4 composants montés isolément. **La formulation défendable est « 0 non-conformité sur le périmètre outillé », pas « site conforme RGAA ».**

### 7.3 Qualité de la déclaration : 27 tâches non confirmées

La validation des tâches a été faite **sur preuve dans le dépôt**, pas sur le statut déclaré dans le planning. Cette confrontation a fait apparaître un écart qu'il faut porter au dossier :

| Ensemble | Nb | Ce que le planning déclare | Ce que le dépôt contient |
|---|---|---|---|
| Bloc `IA` | **24** | Service IA autonome : architecture FastAPI/Python, intégration LLM, quotas et budget, prompts, déploiement K8s avec HPA, monitoring Prometheus, runbook ops, sécurisation par clé d'API | **Aucun service FastAPI**, aucun appel LLM (`openai`, `mistral`, `anthropic` : 0 occurrence), aucun déploiement IA dans `helm/`, aucune variable d'environnement IA. Ce qui existe : `services/Semantic.service.js`, correction sémantique par **embeddings locaux** (`@xenova/transformers`) exécutés **dans le processus de l'API Node**, documentés et couverts par ~37 tests |
| `QA.03`, `QA.05` | 2 | Tests E2E parcours étudiant et enseignant (Playwright) | Aucune dépendance `playwright` ni `cypress`, aucun dossier E2E |
| `QA.06` | 1 | Rapport de tests couvrant E2E et charge | Ni k6 ni Locust dans le dépôt |

Ces 27 tâches **portent l'étape « validé » dans Odoo** — elles avaient reçu ce statut à leur création, depuis le planning — mais leur **état de tâche est resté « en cours »**, faute de preuve. Elles sont donc **incluses dans les 87 % du §2**, et les en retirer ramène l'avancement démontrable à **77,3 %**. Elles expliquent par ailleurs 30 des 63 retards du §4. **À arbitrer avant toute restitution** : si le service IA existe dans un dépôt séparé, il doit être référencé dans le dossier et les tâches validées ; sinon, le planning déclare un périmètre qui n'a pas été livré.

---

## 8. Synthèse et actions recommandées

**Ce que disent les mesures** : le produit est livré et déployé — 87 % du périmètre engagé à l'étape « validé », dont 77,3 % confirmés sur preuve, production fonctionnelle, 2 230 tests verts, 0 non-conformité RGAA outillée. Le plan tient désormais dans la capacité de l'équipe (85 %) et les deux champs d'avancement d'Odoo concordent enfin.

**Ce qui a été réparé depuis l'arrêté du 2026-08-27** : quatre des sept indicateurs étaient inexploitables, deux le sont encore.

| Indicateur | Au 2026-08-27 | Aujourd'hui |
|---|---|---|
| Avancement | 3 lectures divergentes (5,7 % / 60,6 % / 92,3 %) | **87 % déclaré, 77,3 % démontrable** — l'écart est nommé, plus subi |
| Coûts | Gabarit à 70 h/tâche, anomalie à 645 h | **Durées par nature de tâche**, de 2 h à 40 h |
| Délais | Plan à 2,8× la capacité, dépassement certain d'avance | **Plan réalisable**, l'écart mesure l'exécution |
| RH | « Non alimentable » — aucun profil renseigné | **7 profils, 85 % de capacité** |
| Coûts (source) | Aucune saisie de temps | ❌ inchangé — module Feuilles de temps absent |
| Couverture Sonar | 0 % faute de `lcov` | ❌ inchangé — mais la chaîne est auto-hébergée, éprouvée, et **les anomalies sont désormais caractérisées une par une** (§7.1) |

**La limite de méthode à assumer** : ce rapport mesure un plan, pas un relevé. Aucune donnée de temps réel n'existe sur ce projet et l'outil ne permettrait pas d'en produire. Les 413,5 JH sont une estimation argumentée tâche par tâche ; les 100 275 € sont la valorisation au barème de la charge validée, **pas une dépense constatée**.

| Priorité | Action | Indicateur débloqué | Charge |
|---|---|---|---|
| **P0** | **Arbitrer le périmètre IA** : le service existe-t-il dans un dépôt séparé ? Le référencer, ou corriger le planning | Avancement, Délais (30 des 63 retards) | < 0,5 JH |
| **P0** | Régénérer les secrets `KUBECONFIG_*` | Risques (CD à l'arrêt) | < 0,5 JH |
| **P0** | Publier le `lcov` vers SonarQube (couverture en CI + `sonar.javascript.lcov.reportPaths`) | Qualité — de 0 % à ~86 % | ~1 JH |
| **P0** | Ajouter `.env` et `.env.*` à `my_memo_master_api/.dockerignore` — `COPY . .` embarque `AUTH_JWT_SECRET` et `SMTP_PASS` dans toute image construite localement (§7.1) | Qualité, Risques — vulnérabilité CRITICAL confirmée | < 0,1 JH |
| **P1** | Traiter les **8 `Math.random()`** signalés (`upload.middleware.js`, `mindmapImageUpload.js`, `functions.js`, `mindmap.js`) : `crypto.randomUUID()` là où la valeur sert d'identifiant ou de nom de fichier | Qualité — 8 des 11 vulnérabilités | ~0,5 JH |
| **P1** | Ouvrir un ticket sur les **9 bugs** (3 `css:S4649` police générique, 2 `javascript:S3403` comparaison toujours fausse, 1 `reduce()` sans valeur initiale, 1 tri sans comparateur…) — note de fiabilité **D** | Qualité (fiabilité) | à estimer |
| **P2** | Faire tourner l'image API sous un utilisateur non-`root` (`docker:S6471`) | Qualité (durcissement) | ~0,5 JH |
| **P1** | Statuer sur les blocs `C-01`/`C-02` : ils portent charge et dates alors que la génération par IA n'est pas construite | Avancement, Coûts (20 tâches, 458 h) | ~0,5 JH |
| **P1** | Tester une restauration réelle depuis `scripts/backup.sh` (`M-00b.11`) | Risques, Avancement | ~0,5 JH |
| **P2** | Saisir le régime de travail réel dans les calendriers de ressource Odoo | RH (tout replanning y est encore calculé à temps plein) | ~0,5 JH |
| **P2** | Réassigner les 181 sous-tâches de développement aux intervenants du planning | RH (elles sont toutes au chef de projet ; les 6 blocs transverses ont des assignés nominatifs) | ~1 JH |
| **P3** | Chiffrer les 73 tâches de backlog `C-*` / `S-07` / `W-*` | Coûts (reste à faire du backlog inconnu) | ~2 JH |

---

## Annexe — reproductibilité des mesures

| Indicateur | Commande / source |
|---|---|
| Avancement, coûts, délais, risques | `odoo-plugin/odoo_cli.py read project.task --domain '[["project_id","=",15]]'` (381 tâches) |
| Charge par profil | Rôles lus dans `17_planning_MyMemoMaster.xlsx`, feuille « Planning Sprints », croisés avec les durées junior |
| Capacité | 13 cycles × 3 jours (mardi/mercredi/jeudi, cycle de 3 semaines) + 15 jours ouvrés de juillet pour le chef de projet |
| Durées « junior » | Réestimation tâche par tâche des 192 lignes du planning — **jugement argumenté, non reproductible mécaniquement** |
| Mesures SonarQube | Instance auto-hébergée `pck-dkoyol2`, namespace `sonarqube` — `kubectl -n sonarqube port-forward svc/sonarqube 9000:9000`, puis `/api/measures/component`, `/api/issues/search`, `/api/qualitygates/project_status` et `/api/qualityprofiles/search`, authentifiés par le token `SONAR_TOKEN` |
| Couverture API | `cd my_memo_master_api && npx jest --coverage` |
| Tests front | `cd my_memo_master_front && npx vitest run` |
| Non-conformités RGAA | `cd my_memo_master_front && node scripts/audit-a11y.mjs` |
| Absence de saisie de temps | `odoo_cli.py fields project.task --grep hours` (aucun champ d'heures effectives) et `odoo_cli.py models --grep timesheet` (aucun modèle) |
| Vérification des livrables | Recherche directe dans le dépôt : `Dockerfile`, `.github/workflows/`, `scripts/backup.sh`, `docs/RUNBOOK.md`, `docs/AUDIT_RGAA.md`, `config/swagger.config.js`, `git tag` |
| Absence du service IA | `grep -rliE "openai|mistral|anthropic" --include="*.js"` hors `node_modules` (0), `helm/templates/` (aucun déploiement IA), `.env.example` (aucune variable IA) |
