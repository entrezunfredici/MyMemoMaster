# Compte rendu de pilotage — MyMemoMaster

**Date d'arrêté des mesures** : 2026-08-30
**Périmètre** : projet Odoo `MyMemoMasterRNCP` (id 15, 350 tâches) + planning d'équipe `17_planning_MyMemoMaster.xlsx` + dépôt Git + **instance SonarQube auto-hébergée** (cluster `pck-dkoyol2`) + suites de tests locales, rejouées à cet arrêté.
**Taux journalier retenu** : 300 €/JH. **Conversion** : 1 JH = 8 h.
**Calendrier de référence** : plan condensé — 3 jours travaillés (mardi, mercredi, jeudi) toutes les 3 semaines, du **07/10/2025** au **18/06/2026** (13 cycles, 39 JH par personne), puis reprise par le seul chef de projet à taux plein jusqu'au **21/07/2026**.
**Durées** : estimation « développeur junior », établie tâche par tâche sur les 192 lignes du planning d'équipe. **C'est un jugement argumenté, pas une mesure** — voir la réserve du §3.

> **Ce qui a changé depuis l'arrêté du 2026-08-28.** Le registre Odoo a été remis à plat : gabarit à 70 h/tâche remplacé par les durées du planning d'équipe, dates reposées sur le calendrier condensé, 5 blocs transverses créés (marketing, design, recette, pilotage, documentation), Synthèses alignées sur leurs enfants, étapes Kanban validées sur preuve. **Les sept indicateurs sont recalculés sur cette base.** Les valeurs de l'arrêté précédent (330 712 €, 1 137 JH, 281 % de surcharge) reposaient sur un chiffrage de gabarit et ne sont plus comparables.
>
> **Correction du bloc `IA` (2026-08-28, tard).** Un bloc `[IA] Service IA` de 30 sous-tâches avait été créé depuis la feature `IA` du planning d'équipe. **C'était un doublon** : ces lignes décrivent le même travail que les blocs `C-01` et `C-02` déjà présents dans le registre — plusieurs sous-tâches y étaient littéralement identiques (« Gestion quotas et budget IA », « Pipeline traitement PDF/chunking/LLM »). Le bloc a été supprimé. **C'est la correction la plus structurante de cet arrêté** : elle retire 49 JH comptés deux fois et fait tomber l'écart entre avancement déclaré et avancement démontrable de 9,7 points à 1,2 point.
>
> **Trois chantiers clôturés depuis (2026-08-29 → 2026-08-30).** (1) **La couverture de tests est désormais publiée et mesurée par SonarQube** — 63,9 % le 2026-08-29, contre 0 % depuis l'origine du rapport ; l'action P0 correspondante est close. (2) **Les trois tâches `QA.03` / `QA.05` / `QA.06`, jusqu'ici déclarées sans aucune preuve dans le dépôt, sont désormais confirmées** : parcours E2E Playwright (5/5), test de charge k6 (3 258 requêtes, 0 échec) et rapport `docs/RAPPORT_TESTS_QA.md`, rejoués à chaque push CI sur `main`/`staging` — **le dernier écart entre avancement déclaré et démontrable (1,2 point) tombe à 0**. (3) **10 des 13 vulnérabilités SonarQube ont été corrigées le 2026-08-30**, dont la plus sérieuse : `my_memo_master_api/.env` (portant `AUTH_JWT_SECRET` et `SMTP_PASS`) n'était pas exclu de `.dockerignore` et pouvait s'embarquer dans une image construite en local puis poussée sur le dépôt Docker Hub public — corrigé. Les 3 vulnérabilités restantes sont documentées et argumentées une par une (§7.1.1). En prime, **un audit de contraste RGAA 3.2** a été ajouté le 2026-08-29 (8 pages publiques, Playwright + axe-core) : 1 non-conformité réelle trouvée et corrigée, 0 aujourd'hui.

---

## 1. Tableau de bord — les 7 indicateurs

| Dimension | Indicateur | Unité | Valeur mesurée | Fiabilité |
|---|---|---|---|---|
| Avancement | Tâches validées / total | % | **87,5 %** à l'étape « validé » sur le périmètre engagé (217/248) — **désormais intégralement confirmé sur preuve, aucun écart** ; 67,8 % rapporté aux 320 sous-tâches | ✅ Les trois dernières validations sans preuve sont désormais soutenues par le dépôt |
| Coûts | JH consommés × 300 €/j | € | **86 250 €** validés (287,5 JH) ; enveloppe planifiée **108 675 €** (362,3 JH) ; reste à faire **22 425 €** | ⚠️ Charge planifiée, aucune saisie de temps possible |
| Délais | Dates réelles vs Gantt prévisionnel | jours d'écart | **30 tâches** au-delà de leur échéance (598 h, 74,8 JH), dont 20 sur `C-01`/`C-02` ; plan clos au 21/07/2026 | ⚠️ Le plan est condensé — voir §4 |
| Risques | Dépendances bloquantes non levées | nb | **183 liens** ouverts, **78 verrous** distincts, **91 tâches** immobilisées — plus **6 dépendances d'infrastructure** | ✅ Mesure directe, revérifiée à cet arrêté |
| RH | Charge par profil / capacité disponible | JH | **362 JH pour 483 JH de capacité ≈ 75 %**, réparti sur **7 profils** ; pointe à 113 % (SysAdmin) | ⚠️ Total revérifié, répartition par profil non rejouée depuis le 2026-08-28 |
| Qualité | Couverture de tests SonarQube | % | **63,9 %** mesurée par l'instance auto-hébergée (analyse du 2026-08-29) ; reproduite en local ce jour à **81,4 % API / 58,9 % front** | ✅ La chaîne publie désormais réellement — quality gate en `ERROR` sur `new_coverage` (§7.1) |
| Qualité | Non-conformités RGAA | nb | **0** sur les 6 critères outillés (79 fichiers `.vue`, 20/36 composants sous axe-core, 8 pages en contraste réel) ; **audit manuel des 106 critères ouvert** — 23/106 verdicts posés, 2 non-conformités candidates trouvées (8.6, 12.7), à confirmer | ⚠️ Périmètre outillé élargi deux fois ce jour ; l'audit des 106 critères est **en cours** (22 %), pas conclu — voir §7.2 |

**Ce que ce tableau ne dit plus, et qu'il faut dire pour mémoire** : à l'arrêté du 2026-08-28, 3 tâches portaient l'étape « validé » sans preuve dans le dépôt, ce qui écartait avancement déclaré (87,8 %) et démontrable (86,6 %) de 1,2 point. **Ces trois tâches sont désormais couvertes par des tests rejouables en CI** (§7.3) : l'écart est refermé, et le léger recul de 87,8 % à 87,5 % vient uniquement d'une variation du périmètre engagé (+2 tâches) entre les deux arrêtés, pas d'un recul de qualité.

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

---

## 3. Coûts — 86 250 € validés sur une enveloppe de 108 675 €

| Base | Heures | JH | Coût à 300 €/JH |
|---|---|---|---|
| Charge planifiée (sous-tâches élémentaires, périmètre engagé) | 2 898 h | 362,3 | **108 675 €** |
| Dont à l'étape « validé » | 2 300 h | 287,5 | **86 250 €** |
| Reste à faire | 598 h | 74,8 | **22 425 €** |
| Backlog non chiffré (72 tâches) | — | — | **inconnu** |

**L'enveloppe recule légèrement (−525 €) par rapport à l'arrêté précédent**, dans la continuité du même mouvement — un très léger rééquilibrage entre périmètre engagé et backlog (§2), sans changement de méthode.

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
| Fin du plan | 21/07/2026 — dépassée de **40 jours** à la date d'arrêté |

**Répartition des 30 retards :**

| Bloc | Nb | Nature |
|---|---|---|
| `C-01` / `C-02` | **20** | Génération de Leitner et d'exercices par IA — non construite |
| `DOC` | 6 | Bilans et clôture documentaire |
| `M-00b` | 2 | Test de restauration, déploiement |
| `PIL` | 1 | Clôture de projet |
| `QA` | 1 | `QA.12` — corrections urgentes post-livraison (hotfix), non encore requise |

**Le retard a encore reculé, cette fois pour la bonne raison.** Il passe de 33 à **30 tâches** (83,2 JH → 74,8 JH) parce que `QA.03`, `QA.05` et `QA.06` sont désormais confirmées (§2, §7.3) : ce ne sont plus des tâches en attente de preuve, ce sont des tâches terminées. **C'est, cette fois, un vrai progrès d'exécution** — à la différence de la correction du doublon `IA` à l'arrêté précédent, qui n'était qu'une correction de mesure.

**Le retard restant est concentré et lisible** : **20 des 30 tâches sont la génération de contenu par IA** (`C-01`, `C-02`), qui n'est toujours pas commencée. Le reste est de la clôture — bilans, documentation, test de restauration — plus une tâche de hotfix qui n'a simplement pas encore eu lieu d'être déclenchée.

**Comment lire cet indicateur — et comment ne pas le lire.** Le plan de référence reste **volontairement condensé** : les deux années réelles du projet (premier commit le 2024-10-03) ont été ramenées à dix mois pour produire un Gantt lisible. **Un écart jour pour jour entre ce plan et la chronologie réelle du dépôt n'a donc aucun sens** : les deux calendriers ne mesurent pas la même durée. Ce que l'indicateur mesure, c'est le **reste-à-faire dont la date de livraison prévue est passée** — et à cet arrêté, ce chiffre coïncide exactement avec le reste-à-faire du §2 et du §3 (598 h), puisque la totalité du plan condensé est désormais échue.

---

## 5. Risques — 183 dépendances bloquantes ouvertes

*Revérifié à cet arrêté (lecture directe d'Odoo) : les chiffres sont strictement identiques à ceux du 2026-08-28.*

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

**Sur le point 1** : le job `Deploy to Kubernetes (prod)` et `Deploy to Kubernetes (preprod)` du commit de cet arrêté sont restés `skipped` (déploiement conditionné à `K8S_PROD_ENABLED`/`K8S_PREPROD_ENABLED`, tous deux à `false`) — cela ne prouve donc **rien** sur l'état des secrets, exactement comme au 2026-08-28. Seul `KUBECONFIG_SONAR`, posé depuis le bon fichier, s'est révélé fonctionnel en CI (`SonarQube Analysis`, vert). Le contrôle manuel des deux autres secrets reste à faire.

---

## 6. RH — 75 % de la capacité, ventilée par profil

*Total revérifié à cet arrêté ; la répartition par profil n'a pas été rejouée depuis le 2026-08-28, faute de changement du planning d'équipe entre les deux dates — aucune réassignation n'a eu lieu.*

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

**Contrôle de cohérence, resserré depuis l'arrêté précédent.** Le registre Odoo porte désormais **362,3 JH** de charge sur le périmètre engagé (§3) contre 362,0 JH déclarés par le planning d'équipe — un écart de **0,3 JH**, contre 2 JH au 2026-08-28. Les deux sources continuent de converger à mesure que les corrections s'accumulent (suppression du doublon `IA`, léger rééquilibrage backlog/engagé).

**Constats, inchangés depuis l'arrêté précédent** :

- **Le plan est réalisable, avec de la marge.** 75 % de la capacité collective. Ce n'est pas le même travail qui a été replanifié : c'est le même travail chiffré sur des durées crédibles, étalé sur un calendrier qui correspond au rythme réel de l'équipe.
- **Deux profils dépassent 100 %** — le SysAdmin (113 %) et les Dev Full Stack (101 %). Le dépassement est absorbé par le mécanisme de fin de plan : **14,5 JH, soit 12 tâches, sont réaffectées au chef de projet** en juillet, à taux plein.
- **Le profil le plus tendu est le SysAdmin**, seul sur 44 JH d'infrastructure. C'est aussi le profil sans redondance.
- **L'expertise IA est le profil le moins chargé** (3 personnes, 48 %) — cohérent avec l'état du produit : la correction sémantique par IA interne est livrée, la génération de contenu par API IA externe n'est pas commencée (§7.3).

---

## 7. Qualité — couverture de tests et accessibilité

### 7.1 Couverture SonarQube : 63,9 % — l'action P0 est close

**Ce qui a changé depuis l'arrêté du 2026-08-28.** L'indicateur était à 0,0 % faute de rapport `lcov` transmis au scanner. C'est corrigé depuis le 2026-08-29 : Jest (API) et `@vitest/coverage-v8` (front, dépendance ajoutée) produisent chacun un `lcov.info`, transmis par artefact entre le job de tests et le job d'analyse, avec un préfixage de chemin (`sed` sur les lignes `SF:`) pour que Sonar les rattache aux bons fichiers — sans quoi l'échec est **silencieux** (0 % sans erreur).

**Dernière mesure confirmée par l'instance** (analyse du 2026-08-29, 21:07) :

| Métrique | Valeur |
|---|---|
| Couverture globale | **63,9 %** |
| Lignes | 62,5 % |
| Branches | 71,1 % |
| Lignes de code analysées (ncloc) | 33 638 |

**Conséquence non anticipée, toujours d'actualité** : le quality gate est passé de `OK` à `ERROR` sur la condition `new_coverage = 21,9 %` (seuil requis : 80) et `new_violations = 2`. Ce n'est pas une régression : cette condition n'était simplement jamais évaluée faute de données. **Sans effet sur la CI aujourd'hui** (le gate n'est pas imposé comme bloquant), mais le rendre bloquant ferait échouer le prochain push tant que la couverture du code nouveau ne dépasse pas 80 % — décision à trancher (§8).

**Reproduction locale du jour (2026-08-30)**, après le correctif de vulnérabilités du même jour — code applicatif quasiment inchangé sur le périmètre testé :

| Périmètre | Statements | Branches | Fonctions | Lignes | Tests |
|---|---|---|---|---|---|
| API (Jest) | **81,4 %** | 67,15 % | 81,34 % | 81,73 % | **1 554 / 1 554**, 85 suites, tous verts |
| Front (Vitest) | **58,9 %** | 77,06 % | 47,76 % | 58,9 % | **689 / 689**, 44 fichiers, tous verts |

Ces chiffres (rejoués en local ce jour) sont quasi identiques aux premières publications du 2026-08-29 (81,41 % API, 58,91 % front) : la couverture n'a pas bougé, ce qui est cohérent avec un correctif de sécurité qui modifie des branches déjà testées plutôt que d'ajouter du code neuf non couvert.

**Non revérifié à cet arrêté** : l'analyse SonarQube du commit de ce jour (`914d37e`) s'est bien exécutée avec succès — confirmé via l'API GitHub, tâche `SonarQube Analysis (auto-hébergé)` terminée à 09:54:17Z — mais ses mesures précises (couverture, dette, notes) n'ont pas été relues en direct sur l'instance : l'accès à celle-ci nécessite un jeton (`SONAR_TOKEN`) conservé côté secret GitHub, non disponible dans cette session. Les valeurs ci-dessus (63,9 %) sont donc celles de la **dernière analyse effectivement lue**, du 2026-08-29 — antérieure de quelques heures au correctif de vulnérabilités.

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

#### 7.1.2 — La vulnérabilité CRITICAL est corrigée : secrets qui pouvaient s'embarquer dans l'image API

`docker:S6470` n'était pas un faux positif, et c'est désormais corrigé.

**Ce qui a été trouvé** : `my_memo_master_api/.dockerignore` ne contenait que `node_modules/`, `.git`, `.idea`, `Dockerfile*` — **`.env` n'y était pas**, alors que `my_memo_master_api/.env` porte `AUTH_JWT_SECRET`, `SMTP_USER` et `SMTP_PASS`. Le `COPY . .` du Dockerfile embarquait donc ces secrets dans toute image construite depuis un poste où ce fichier existe. Aggravant : la racine du dépôt portait une ligne `#.env` **commentée**, qui donnait l'illusion d'une exclusion.

**Portée réelle, mesurée et non supposée** : le CD construit depuis un `git checkout` propre, où `.env` est ignoré par git — **les images publiées par la CI ne contenaient donc pas le fichier**. Le risque valait pour toute image construite **en local** (`docker compose build`) puis poussée vers le dépôt Docker Hub `fredissimo/mymemomaster_api`, qui est **public**. Latent, pas réalisé.

**Corrigé** : `.env` et `.env.*` exclus sur les trois contextes de build (racine, API, front) ; la ligne commentée trompeuse retirée.

**À ne pas confondre avec le chiffre Dependabot** : GitHub signale des vulnérabilités de dépendances sur la branche par défaut, non recomptées à cet arrêté. Ce n'est pas contradictoire avec `npm audit --omit=dev` en CI — Dependabot compte aussi les dépendances de développement, qui n'entrent pas dans les images déployées.

### 7.2 Non-conformités RGAA : 0, sur un périmètre outillé élargi

**Audit statique, rejoué ce jour** sur **79 fichiers `.vue`** :

| Critère RGAA | Avant campagne | Aujourd'hui |
|---|---|---|
| 11.1 — champ sans nom accessible | 111 | **0** |
| 7.1 — clic sans équivalent clavier | 21 | **0** |
| 11.9 — bouton symbole sans nom accessible | 14 | **0** |
| 1.1 — image sans `alt` | 0 | **0** |
| **Total** | **135** | **0** |

Non-régression assurée par 4 tests axe-core exécutés à chaque push.

**Nouveau depuis le 2026-08-29 : le contraste (RGAA 3.2), outillé pour la première fois.** `e2e-a11y/contrast.spec.js` (Playwright + axe-core, rendu Chromium réel — le seul niveau qui calcule vraiment les styles) audite 8 pages publiques sans appel API au montage. **Premier passage : 1 non-conformité réelle trouvée** — `/forgot-password`, texte noir sur fond bleu (ratio 2,2:1 au lieu de 4,5:1 requis), causée par une classe Tailwind `text-white` qui ne générait aucun CSS dans ce build. Corrigée. **Rejoué ce jour : 8/8 pages conformes.**

**Extension de la couverture axe-core (jsdom), 2026-08-29** : 4 composants ajoutés (`DropdownComponent`, `ToggleButton`, `PillComponent`, `TagSelectorComponent`), portant le total à 8. **2 non-conformités réelles trouvées et corrigées**, préexistantes et révélées par l'extension plutôt que par une régression : `ToggleButton.vue` (case à cocher sans nom accessible, RGAA 11.1, corrigée par une prop `ariaLabel` désormais requise) et `TagSelectorComponent.vue` (bouton flèche sans nom accessible, RGAA 11.9, corrigé par un `aria-label` dynamique).

**Nouvelle extension, 2026-08-30 — en réponse directe à « s'occuper des 106 critères ».** Plutôt qu'un audit manuel des 106 critères (chantier séparé, non engagé), l'outillage automatisable a été étendu : 12 composants de plus sous axe-core (`TodoWidget`, `MenuItemComponent`, `ItemListLayout`, `GuidedTourBannerComponent`, `MindMapNodePickerComponent`, `NotificationBellComponent`, `SubjectFilterComponent`, `SubjectSelectorComponent`, `ReminderWidget`, `FormulaHelperComponent`, `StudentDetailComponent`, `KpiAlertWidgetComponent`), portant le total à **20 composants sur 36** — les 16 restants, revus un par un, n'ont aucun élément interactif propre à évaluer. **Les 20 tests passent, 0 violation détectée par l'outil.**

Cette extension a aussi servi à **objectiver, sur deux cas réels, la limite de ce qu'un outil peut juger** : `TodoWidget.vue` (case à cocher dont le nom accessible ne tenait qu'à un `title` porté par le `<label>` ambiant, pas par le contrôle) et `MenuItemComponent.vue` (boutons éditer/supprimer nommés par les seuls glyphes `✎`/`✕`) **passaient tous les deux axe-core** — un nom accessible existe algorithmiquement dans les deux cas, mais n'est ni fiable (premier cas) ni pertinent pour un lecteur d'écran (second cas). Corrigés par cohérence avec le même correctif déjà appliqué ailleurs (`ToggleButton.vue`), pas parce qu'un outil l'exigeait. Détail : `docs/AUDIT_RGAA.md` §2 ter.

**Réserve de portée, affinée** : le zéro porte sur **6 critères outillés** (11.1, 7.1, 11.9, 1.1, 8.3, 3.2), toujours pas sur les 106 critères du RGAA 4 — et il ne peut pas en aller autrement par le seul outillage : une bonne part des critères restants (pertinence des intitulés hors contexte, cohérence de l'ordre de lecture, compatibilité lecteur d'écran réel) demande un jugement humain qu'aucun outil ne peut mécaniser de façon fiable, comme les deux cas ci-dessus le montrent concrètement. Deux angles morts documentés dans `docs/AUDIT_RGAA.md` restent entiers : aucun test lecteur d'écran réel, et le contraste n'est vérifié que sur 8 pages publiques sans API. **La formulation défendable reste « 0 non-conformité sur le périmètre outillé », pas « site conforme RGAA ».**

#### 7.2.1 — Audit manuel des 106 critères RGAA : ouvert le 2026-08-30, 23/106 posés

**Ce qui a changé après cet arrêté, dans la même session.** Demande explicite de l'utilisateur : s'occuper des 106 critères eux-mêmes, au-delà de l'outillage. Ouvert dans un document dédié — [`docs/AUDIT_RGAA_106.md`](AUDIT_RGAA_106.md), marqué **EN COURS**, à ne pas confondre avec un audit terminé.

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

Elles portent toujours l'étape « validé » dans Odoo, mais leur champ `state` interne y est resté à « en cours » — **incohérence d'hygiène du registre, pas d'avancement** : à traiter en synchronisant Odoo (§8), le dépôt faisant foi.

**Ce qui reste requalifié depuis l'arrêté précédent — l'architecture IA, inchangé.** Le planning d'équipe décrit un service IA auto-hébergé qui n'existe pas dans le dépôt. L'architecture réelle reste double :

| Usage | Modèle retenu | État |
|---|---|---|
| **Correction sémantique** | IA **interne** — `@xenova/transformers`, embeddings locaux exécutés dans le process de l'API Node | **Livré** — `services/Semantic.service.js`, ~37 tests, tâche `[M-06.15]` validée |
| **Génération de contenu** | **API IA externe** | **Non commencé** — blocs `C-01` (0/11) et `C-02` (0/9) |

**Le périmètre IA du projet reste donc** : une brique de correction livrée, une brique de génération non commencée.

---

## 8. Synthèse et actions recommandées

**Ce que disent les mesures** : le produit est livré et déployé — **87,5 %** du périmètre engagé à l'étape « validé », **intégralement confirmé sur preuve pour la première fois**, production fonctionnelle, 2 243 tests verts (1 554 API + 689 front), 0 non-conformité RGAA sur 6 critères outillés. Le plan tient largement dans la capacité de l'équipe (75 %).

**Ce qui a été réparé depuis l'arrêté du 2026-08-28** :

| Indicateur | Au 2026-08-28 | Aujourd'hui |
|---|---|---|
| Avancement | 87,8 % déclaré, 86,6 % démontrable — 1,2 point d'écart | **87,5 % déclaré = 87,5 % démontrable** — écart refermé |
| Couverture Sonar | 0 % faute de `lcov` | **63,9 %**, chaîne de publication éprouvée — action P0 close |
| Délais | 33 tâches en retard | **30 tâches** — recul réel, pas une correction de mesure |
| Vulnérabilités Sonar | 11, dont 1 CRITICAL non traitée | **3, argumentées une par une** — la CRITICAL (secrets dans l'image) est corrigée |
| RGAA | 5 critères outillés | **6 critères outillés**, dont le contraste réel (3.2) pour la première fois ; **audit manuel des 106 critères ouvert** (23/106, 2 candidats NC) |
| Coûts (source) | Aucune saisie de temps | ❌ inchangé — module Feuilles de temps absent |
| Risques infra | Secrets `KUBECONFIG_*` non vérifiés | ❌ inchangé — toujours à vérifier manuellement |

**La limite de méthode à assumer, inchangée** : ce rapport mesure un plan, pas un relevé. Aucune donnée de temps réel n'existe sur ce projet et l'outil ne permettrait pas d'en produire. Les 362,3 JH sont une estimation argumentée tâche par tâche ; les 86 250 € sont la valorisation au barème de la charge validée, **pas une dépense constatée**.

**Une réserve propre à cet arrêté** : la mesure de couverture SonarQube (63,9 %) date du 2026-08-29, quelques heures avant le correctif de vulnérabilités du 2026-08-30 — l'analyse de ce dernier commit s'est bien exécutée avec succès (vérifié via l'API GitHub), mais ses valeurs précises n'ont pas pu être relues en direct sur l'instance dans cette session, faute de jeton d'accès local. Les chiffres de couverture et de qualité générale (bugs, dette, notes) affichés ici sont donc ceux de la dernière analyse **effectivement lue**, pas nécessairement les tout derniers.

| Priorité | Action | Indicateur débloqué | Charge |
|---|---|---|---|
| ~~P0~~ | ~~Arbitrer le périmètre IA~~ — fait le 2026-08-28 | Avancement, Délais, Coûts | — |
| ~~P0~~ | ~~Publier le `lcov` vers SonarQube~~ — fait le 2026-08-29, couverture 63,9 % confirmée | Qualité | — |
| ~~P0~~ | ~~Ajouter `.env`/`.env.*` à `my_memo_master_api/.dockerignore`~~ — fait le 2026-08-30, vulnérabilité CRITICAL corrigée | Qualité, Risques | — |
| ~~P1~~ | ~~Traiter les 8 `Math.random()` signalés~~ — fait le 2026-08-30 (`crypto.randomBytes`/`randomUUID`/`getRandomValues`) | Qualité | — |
| **P0** | Régénérer les secrets `KUBECONFIG_PREPROD` / `KUBECONFIG_PROD` — toujours non vérifiés | Risques (CD à l'arrêt) | < 0,5 JH |
| **P1** | Ouvrir un ticket sur les **9 bugs** Sonar (non retraités par le correctif du 2026-08-30, à recompter à la prochaine analyse) | Qualité (fiabilité) | à estimer |
| **P2** | Faire tourner l'image API sous un utilisateur non-`root` (`docker:S6471`) — non tenté faute de démon Docker actif pour tester | Qualité (durcissement) | ~0,5 JH |
| **P2** | Synchroniser le champ `state` Odoo de `QA.03`/`QA.05`/`QA.06` (`01_in_progress` → `1_done`) — le dépôt les confirme, le registre non | Hygiène du registre | < 0,1 JH |
| **P2** | Statuer sur `new_coverage` (quality gate) : le rendre bloquant ferait échouer tout push tant que le code nouveau n'atteint pas 80 % de couverture | Qualité (process) | décision |
| **P1** | Statuer sur `C-01`/`C-02` : 20 tâches, 20 des 30 retards restants — les replanifier ou les sortir du périmètre engagé | Avancement, Délais, Coûts | ~0,5 JH |
| **P1** | Tester une restauration réelle depuis `scripts/backup.sh` (`M-00b.11`) | Risques, Avancement | ~0,5 JH |
| **P2** | Saisir le régime de travail réel dans les calendriers de ressource Odoo | RH | ~0,5 JH |
| **P2** | Réassigner les sous-tâches de développement aux intervenants du planning | RH | ~1 JH |
| **P3** | Chiffrer les 72 tâches de backlog `C-*` / `S-07` / `W-*` | Coûts (reste à faire du backlog inconnu) | ~2 JH |
| **P3** | Migrer les actions GitHub dépréciées (`checkout@v4`, `setup-node@v4`, etc. — ciblent Node 20, déprécié) avant leur retrait | Risques (CI) | à estimer |
| **P1** | Confirmer visuellement les 2 non-conformités RGAA candidates (8.6 titres en anglais, 12.7 absence de lien d'évitement) et corriger si confirmées | Qualité (RGAA) | ~0,5 JH |
| **P2** | Poursuivre l'audit manuel des 106 critères RGAA (83 restants) — `docs/AUDIT_RGAA_106.md` | Qualité (RGAA) | plusieurs sessions |

---

## Annexe — reproductibilité des mesures

| Indicateur | Commande / source |
|---|---|
| Avancement, coûts, délais, risques | `odoo-plugin/odoo_cli.py read project.task --domain '[["project_id","=",15]]' --fields id,name,stage_id,state,date_deadline,allocated_hours,depend_on_ids` (350 tâches) — rejoué à cet arrêté |
| Charge par profil | Rôles lus dans `17_planning_MyMemoMaster.xlsx`, feuille « Planning Sprints », croisés avec les durées junior — non rejoué à cet arrêté |
| Capacité | 13 cycles × 3 jours (mardi/mercredi/jeudi, cycle de 3 semaines) + 15 jours ouvrés de juillet pour le chef de projet |
| Durées « junior » | Réestimation tâche par tâche des 192 lignes du planning — **jugement argumenté, non reproductible mécaniquement** |
| Mesures SonarQube | Instance auto-hébergée `pck-dkoyol2`, namespace `sonarqube` — `kubectl -n sonarqube port-forward svc/sonarqube 9000:9000`, puis `/api/measures/component`, `/api/issues/search`, authentifiés par le token `SONAR_TOKEN` (secret GitHub, non disponible en local à cet arrêté — l'instance répond `401` sans lui, vérifié) |
| État d'exécution CI d'un commit | `GET /repos/entrezunfredici/MyMemoMaster/commits/<sha>/check-runs` (API GitHub publique, sans jeton — le dépôt est public) |
| Couverture API | `cd my_memo_master_api && npx jest --coverage` — rejoué à cet arrêté : 1 554/1 554, 81,4 % |
| Tests front + couverture | `cd my_memo_master_front && npx vitest run --coverage` — rejoué à cet arrêté : 689/689, 58,9 % |
| Non-conformités RGAA (statique) | `cd my_memo_master_front && node scripts/audit-a11y.mjs` — rejoué à cet arrêté : 0/79 fichiers |
| Contraste RGAA 3.2 | `cd my_memo_master_front && npm run build && npx playwright test -c playwright.config.js` — rejoué à cet arrêté : 8/8 |
| Audit manuel des 106 critères RGAA | Référentiel officiel : `curl https://accessibilite.numerique.gouv.fr/doc/RGAA-v4.1.2.pdf` puis `pdftotext -layout -enc UTF-8`. Verdicts et méthode détaillée : `docs/AUDIT_RGAA_106.md` (23/106 posés à cet arrêté) |
| Absence de saisie de temps | `odoo_cli.py fields project.task --grep hours` (aucun champ d'heures effectives) et `odoo_cli.py models --grep timesheet` (aucun modèle) |
| Vérification des livrables | Recherche directe dans le dépôt : `Dockerfile`, `.github/workflows/`, `scripts/backup.sh`, `docs/RUNBOOK.md`, `docs/AUDIT_RGAA.md`, `docs/RAPPORT_TESTS_QA.md`, `config/swagger.config.js`, `git tag` |
| Absence du service IA | `grep -rliE "openai|mistral|anthropic" --include="*.js"` hors `node_modules` (0), `helm/templates/` (aucun déploiement IA), `.env.example` (aucune variable IA) |
