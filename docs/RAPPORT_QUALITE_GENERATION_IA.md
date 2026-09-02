# Rapport — Tests qualité génération (C-01.10)

> **Objet** : exécuter le protocole de validation empirique documenté en
> [diagrams/generation_ia_llm_benchmark.md §8](../diagrams/generation_ia_llm_benchmark.md#8-validation-empirique-nécessaire-avant-mise-en-production-hors-périmètre-dexécution-de-ce-ticket),
> resté non exécuté depuis C-01.03 et signalé comme dette dans `CHANGELOG_AGENT.md` (entrée C-01.04 du
> 2026-09-01 : *« le protocole de validation empirique plus complet [...] reste à exécuter avant toute
> mise en production »*).
> **Date d'exécution** : 2026-09-02 · **Exécutant** : agent IA, sur poste de développement, avec la
> vraie clé `MISTRAL_API_KEY` du `.env` du projet (contre le modèle réellement configuré,
> `mistral-small-latest`).
> **Rejouable** : `node scripts/quality-check-ai-generation.js` (`my_memo_master_api/`) — fait de
> vrais appels API payants (coût négligeable, voir §5), n'est **pas** inclus dans la suite Jest par
> défaut, au même titre que les specs Playwright de `e2e/`/`e2e-a11y/` côté front (raison identique :
> pas adapté à une exécution systématique en CI).
> **Artefact brut** : [docs/QUALITE_GENERATION_IA_RUN.json](QUALITE_GENERATION_IA_RUN.json) (sortie
> complète de l'exécution citée dans ce rapport — toutes les cartes générées, pas seulement les
> extraits cités ici).

---

## 1. Ce que ce rapport couvre, et ce qu'il ne couvre pas

Le prompt de génération (C-01.01) et le service qui l'exécute (C-01.04) sont déjà couverts par 96
tests unitaires avec le modèle **mocké** (`AiCardGeneration.service.test.js`,
`AiCardGenerationPipeline.service.test.js`) — ils vérifient que le code réagit correctement à des
réponses connues à l'avance (conformité de schéma, retry, gestion d'erreur réseau). Ce que ces tests
**ne peuvent pas** vérifier, par construction, c'est ce que le vrai modèle produit réellement face à
du contenu réel — c'est l'objet de ce rapport, à deux niveaux :

1. **Conformité de schéma en conditions réelles** — le modèle respecte-t-il le contrat de sortie
   (§4 de `generation_ia_prompt_cartes.md`) sur de vrais appels, retry inclus ?
2. **Garde-fous de qualité (§5 du même document), non couverts par la validation de schéma** —
   anti-hallucination (le `sourceExcerpt` cité existe-t-il vraiment dans le texte source ?),
   atomicité/absence de doublon, non-bourrage sur contenu insuffisant. Ces contrôles sont implémentés
   dans `helpers/aiGenerationQualityChecks.js` (fonctions pures, testées unitairement — 21 tests,
   `test/helpers/aiGenerationQualityChecks.test.js`, sans appel réseau) et appliqués aux résultats réels
   par le script de protocole.

**Hors périmètre de ce rapport** (rappel du OUT du ticket) : correction automatique des sorties de
mauvaise qualité, garantie de justesse absolue, ainsi que le jugement de pertinence pédagogique fine
— une lecture qualitative des cartes produites est faite ci-dessous, mais elle reste une relecture
assistée par IA, pas un jugement humain final (même limite que l'audit RGAA manuel délégué à l'agent).

---

## 2. Jeu de référence

7 fixtures, plusieurs matières et tailles, dont 2 cas limites délibérés (§8 du benchmark demande
« quelques matières, tailles variées ») :

| Fixture | Matière | Type | `cardCount` | Nature |
|---|---|---|---|---|
| `svt-photosynthese` | SVT | open | 3 | Nominal — reprend l'exemple de `generation_ia_prompt_cartes.md` §9 |
| `histoire-revolution` | Histoire | open | 4 | Nominal, texte plus long et dense en dates |
| `maths-pythagore-mcq` | Mathématiques | mcq | 3 | Nominal QCM |
| `anglais-source-sortie-fr` | Biologie | open | 2 | Texte source **en anglais**, sortie demandée en français (§5.4) |
| `contenu-insuffisant` | Physique | open | 5 | **Cas limite** — 1 phrase source pour 5 cartes demandées (§5.3) |
| `cardcount-disproportionne` | Chimie | open | 15 | **Cas limite** — 2 phrases source pour 15 cartes demandées (§5.3/§7) |
| `type-mixed` | Géographie | mixed | 4 | Le modèle choisit `open`/`mcq` carte par carte |

Texte source complet de chaque fixture : `scripts/quality-check-ai-generation.js`.

---

## 3. Résultats mesurés

### 3.1 Vue d'ensemble

| Indicateur | Résultat |
|---|---|
| Taux de succès (schéma conforme, retry inclus) | **7/7 (100 %)** |
| Latence moyenne | **3 665 ms** (min 2 106 ms, max 6 805 ms) |
| `sourceExcerpt` réellement présent dans le texte source | **36/36 cartes (100 %)** |
| Doublons de notion détectés (heuristique, voir §4) | **5**, tous sur les 2 fixtures de contenu insuffisant |
| Cas de contenu insuffisant où le modèle a réduit le nombre de cartes + renseigné `warning` | **0/2** ⚠️ |

### 3.2 Par fixture

| Fixture | Résultat | Latence | Cartes | Observations |
|---|---|---|---|---|
| `svt-photosynthese` | ✅ | 2 398 ms | 3/3 | Conforme, atomique, sourcé — aucun écart |
| `histoire-revolution` | ✅ | 3 796 ms | 4/4 | Conforme, dates/faits corrects, aucun écart |
| `maths-pythagore-mcq` | ✅ (après 1 retry) | 5 170 ms | 3/3 | 1er essai : une carte renvoyée en `"open"` alors que `"mcq"` était demandé — **exactement le défaut trouvé et corrigé en C-01.04** (`validatePayload` avec `cardType`) ; le retry a fonctionné comme prévu, 2ᵉ essai conforme. MCQ finales : 3/3 options bien formées, 1 seule bonne réponse, distracteurs plausibles |
| `anglais-source-sortie-fr` | ✅ | 2 152 ms | 2/2 | Source en anglais, sortie en français propre — aucune fuite de langue, §5.4 respecté |
| `contenu-insuffisant` | ⚠️ | 3 230 ms | 5/5 | **§5.3 non respecté** — voir §4.1 |
| `cardcount-disproportionne` | ⚠️ | 6 805 ms | 15/15 | **§5.3 non respecté** — voir §4.1, 5 doublons détectés |
| `type-mixed` | ✅ | 2 106 ms | 4/4 | 3 `open` + 1 `mcq`, répartition cohérente avec le contenu, aucun écart |

---

## 4. Écart trouvé

### 4.1 §5.3 (contenu source insuffisant) non respecté — le modèle comble au lieu de réduire

Les deux cas limites construits pour tester explicitly la règle *« si le texte source ne permet pas
de justifier `cardCount` cartes atomiques et non redondantes, le modèle doit générer moins de cartes
[...] et le signaler dans `warning` »* (§5.3) ont tous les deux échoué à ce garde-fou précis, alors
que la conformité de schéma et l'anti-hallucination (§5.1, `sourceExcerpt`) restent respectées :

- **`contenu-insuffisant`** (1 phrase, 5 cartes demandées) : 5/5 cartes produites, `warning: null`.
  Les 5 cartes recyclent la même phrase source sous 5 angles (valeur, unité, contexte, reformulation
  de la question, reformulation de la consigne) — techniquement non-identiques au sens strict
  (aucune détectée par le détecteur de doublons, §4 ci-dessous) mais redondantes au sens de la règle
  « une carte = une notion atomique, jamais deux cartes sur la même notion » (§5.2).
- **`cardcount-disproportionne`** (2 phrases, 15 cartes demandées) : 15/15 cartes produites,
  `warning: null`, et **5 doublons détectés** par `findDuplicateStatements` — dont 3 cartes
  quasi-identiques (« Citez un état physique de l'eau. ») qui ne se distinguent que par leur réponse
  attendue (solide / liquide / gazeux), en violation directe de la règle 3 du prompt système (« Ne
  produis jamais deux cartes portant sur exactement la même notion »).

**Ce que ça signifie concrètement** : sur du contenu source réellement trop court pour le nombre de
cartes demandé, `mistral-small-latest` privilégie respecter `cardCount` à la lettre plutôt que la
règle de non-bourrage — l'inverse de ce que §5.3 demande. Le filet de sécurité anti-hallucination
tient (chaque carte reste sourcée par un extrait réel), mais le filet anti-redondance ne tient pas
sur ces deux cas.

**Ce que ça ne signifie pas** : les 5 cas nominaux (contenu proportionné à la demande) sont tous
conformes à 100 % sur les deux dimensions — l'écart est spécifiquement lié à la disproportion
contenu/demande, pas un défaut général du modèle ou du prompt.

### 4.2 Recommandation (non traitée dans ce ticket — hors périmètre « Correction »)

Deux pistes, non arbitrées ici (le OUT du ticket exclut la correction automatique, mais pas la
recommandation pour un futur ticket) :
1. **Renforcer la règle 5.3 dans le prompt système** — la reformuler en insistant explicitement sur
   l'interdiction de produire plusieurs cartes sur un même fait isolé même reformulé différemment.
2. **Filet de sécurité applicatif** — `findDuplicateStatements` (déjà écrit et testé pour ce rapport,
   `helpers/aiGenerationQualityChecks.js`) pourrait s'exécuter côté serveur après génération pour
   signaler ou filtrer les doublons avant l'écran de validation, indépendamment de la discipline du
   prompt. Piste la plus robuste (ne dépend pas du modèle), mais changerait le contrat de sortie du
   pipeline (C-01.05/07) — décision à prendre séparément, pas dans ce ticket de tests.

Aucun correctif n'a été appliqué dans la session initiale (le OUT du ticket C-01.10 exclut la
correction automatique, et une bascule de modèle ou de prompt mérite sa propre vérification) — sur
demande explicite de l'utilisateur, la piste 1 et la piste 2 ci-dessus ont finalement toutes les deux
été appliquées et revérifiées le même jour : voir §8.

---

## 5. Coût et faisabilité de la mesure

7 appels réels, modèle `mistral-small-latest` (tarif $0,15 / M tokens en entrée, $0,60 / M tokens en
sortie — `AiQuotaService`). Volumes en jeu (quelques centaines de tokens par appel, prompt système
compris) : coût total de l'exécution de l'ordre du millième de dollar, négligeable devant le budget
mensuel par défaut (20 $, `helpers/aiQuotaConfig.js`). Les appels ont été faits en appelant
directement `AiCardGenerationService#generateCards` (comme le script ponctuel de vérification C-01.04),
pas via l'endpoint HTTP `POST /ai-generation-batches` : aucune ligne `AiGenerationBatch` créée, aucune
consommation du quota quotidien par utilisateur (`AiQuotaService#checkQuota`, compté sur ces lignes).

---

## 6. Décision sur l'escalade de modèle (benchmark C-01.03 §6)

Le benchmark documentait une option d'escalade vers `mistral-medium-latest` *« si la validation
empirique montre un taux d'échec de conformité JSON ou une qualité de génération insuffisante avec
Small »*. Sur la base de cette exécution : **pas d'escalade recommandée**. Le taux de conformité de
schéma est de 100 % (retry inclus), l'anti-hallucination est parfaite (100 % des extraits cités sont
réels), et le seul écart trouvé (§4) est un problème de **discipline sur un cas limite spécifique**
(contenu très insuffisant), pas un problème de capacité générale du modèle — rien n'indique qu'un
modèle plus grand se comporterait différemment sur ce point précis sans que le prompt lui-même soit
d'abord renforcé (§4.2). Réévaluer cette conclusion si le renforcement du prompt ne suffit pas.

---

## 7. Vérifié (protocole initial, avant correctif)

- `npx jest test/helpers/aiGenerationQualityChecks.test.js` → **21/21** (fonctions de vérification de
  qualité, sans appel réseau).
- `npx jest` (suite complète API) → **1753/1753**, 0 régression (1732 + 21 nouveaux).
- `npx eslint` sur les fichiers créés → 0 erreur.
- Protocole empirique (§3) exécuté en conditions réelles le 2026-09-02, artefact brut archivé
  (`docs/QUALITE_GENERATION_IA_RUN.json`).

Ces chiffres correspondent à l'état **avant correctif** (§4-6 ci-dessus). Voir §8 pour la vérification
après correctif.

---

## 8. Correctif appliqué et revérifié (2026-09-02, suite à l'écart du §4)

Sur demande explicite de l'utilisateur, l'écart du §4 a été corrigé le jour même, avec deux mesures
complémentaires plutôt qu'une seule (défense en profondeur — la première dépend de la discipline du
modèle, la seconde non) :

1. **Renforcement du prompt** (`AiCardGenerationService.buildSystemPrompt`/`buildUserPrompt`) — ajout
   d'une règle 7 explicite (« si le texte source ne permet pas d'atteindre le nombre de cartes demandé
   SANS enfreindre la règle 3 [pas de doublon de notion], génère moins de cartes ») et rappel du
   `cardCount` demandé directement dans le prompt utilisateur, à l'endroit où l'instruction de
   génération est donnée — plus efficace qu'une règle générique éloignée pour un LLM.
2. **Filet de sécurité applicatif**, indépendant du modèle — `dedupeCards`
   (`helpers/aiGenerationQualityChecks.js`, 4 tests) retire les cartes en doublon d'un batch déjà
   validé (garde la première occurrence de chaque notion) ; `AiCardGenerationService#generateCards`
   l'applique systématiquement après validation de schéma réussie, et complète `warning` en
   conséquence si des cartes ont été retirées (2 tests dédiés dans
   `test/services/AiCardGeneration.service.test.js`).

**Revérifié en conditions réelles** (même script, mêmes 7 fixtures, second run le 2026-09-02) :

| Fixture | Avant correctif | Après correctif |
|---|---|---|
| `contenu-insuffisant` | 5/5 cartes, `warning: null` | **2/5 cartes**, `warning` explicite citant la règle 3 |
| `cardcount-disproportionne` | 15/15 cartes, 5 doublons | **5/15 cartes** (le modèle s'est arrêté à 6 cartes valides ; le filet applicatif a filtré 1 doublon résiduel), `warning` combinant l'explication du modèle et celle du filet |

Les 5 fixtures nominales restent conformes après correctif, à une exception près sans lien avec le
correctif : `type-mixed` a échoué sur ce second run (une carte `mcq` avec 4 options toutes `correct:
true`, rejetée après retry comme prévu — `generateCards` a correctement refusé de renvoyer un brouillon
non conforme plutôt que de le laisser passer) — variance normale d'un modèle non déterministe
(`temperature: 0.3`), déjà documentée comme limite au §8, pas une régression du correctif. Écart mineur
et sans rapport observé au passage : sur `maths-pythagore-mcq`, une carte cite son `sourceExcerpt` avec
une ellipsis (`"..."`) tronquant la citation — non détecté comme « genuine » par le contrôle strict
(§1), formaté mais pas hallucination ; non traité ici (hors de la demande).

**Vérifié** : `npx jest test/services/AiCardGeneration.service.test.js test/helpers/aiGenerationQualityChecks.test.js`
→ **75/75** ; suite complète API `npx jest` → **1759/1759**, 0 régression (1753 + 6 nouveaux tests) ;
`npx eslint` sur les fichiers modifiés → 0 erreur ; artefact JSON du second run archivé (écrase le
premier — le premier run reste cité en détail aux §3-4 ci-dessus pour la traçabilité de l'écart trouvé).

**Décision sur l'escalade de modèle (§6), reconfirmée** : toujours pas d'escalade recommandée — l'écart
était bien un problème de discipline sur un cas limite, corrigé par le prompt + un filet applicatif, pas
un problème de capacité nécessitant un modèle plus grand.

---

## 9. Ce qui n'est PAS couvert

- **Échantillon volontairement petit** (7 fixtures, 1 exécution) — un taux de conformité mesuré sur 7
  appels n'est pas un taux statistiquement représentatif ; suffisant pour détecter un écart de
  comportement reproductible (§4), pas pour en chiffrer précisément la fréquence en production.
- **Un seul run** — pas de mesure de variance d'un appel à l'autre sur le même fixture (le modèle
  n'est pas déterministe, `temperature: 0.3`) ; un ré-échantillonnage du même fixture pourrait donner
  un résultat différent sur les cas limites.
- **Pertinence pédagogique jugée par l'agent IA**, pas par un enseignant ou l'utilisateur — cf. limite
  déjà posée en §1.
- **Chunking PDF réel non testé** — tous les fixtures sont du texte déjà découpé à la main, pas des
  chunks produits par le pipeline PDF (C-01.05) sur un vrai document.
- **Le correctif de la §4.2 a été appliqué et revérifié le même jour** (§8), sur demande explicite de
  l'utilisateur — ce n'est donc plus une limite de ce rapport, contrairement à sa version initiale.
