# Documentation — Spécification types exercices générables : Génération d'exercices par IA

> Document de référence pour **C-02.01** (feature list `C-02`, source planning, V2, tâche « Analyse »).
> Périmètre strict de ce document : **quels types de questions d'exercice sont générables par IA, et selon
> quel contrat** (entrée du prompt, sortie par type, garde-fous propres à chaque type). Les autres éléments IN
> du feature list `C-02` (Service génération, Validation format, Mode dégradé, Interface de révision) sont
> **hors périmètre** : ce document les traite uniquement comme des interfaces amont/aval, sans les concevoir —
> conformément au point d'attention du ticket (« respecter le périmètre… sans étendre aux éléments hors
> version »).
> Aucune implémentation n'existe à ce jour pour `C-02` (0 ligne de code, 0/9 dans le registre Odoo côté
> `C-02` — seul `C-01`, feature voisine « Génération de Leitner par IA », est implémenté) — document
> d'analyse pur.
> Sources de vérité pour le contrat réel de persistance : `models/Test.model.js`, `models/Question.model.js`,
> `services/Test.service.js`, `diagrams/exercices_types_correction.md` (les 4 types de questions et leur
> correction, déjà en production pour la création manuelle d'exercices).
> S'appuie sur la méthode et le format déjà validés en `diagrams/generation_ia_prompt_cartes.md` (C-01.01,
> feature voisine) — mêmes principes (contrat calé sur la persistance existante, `sourceExcerpt` anti-
> hallucination, brouillon jamais persisté sans validation), appliqués ici aux 4 types d'exercices plutôt
> qu'aux 2 types de cartes Leitner.

---

## 1. Vue d'ensemble

Un **exercice** (modèle `Test`) contient N **questions** (modèle `Question`), chacune portant un `type` parmi
4 valeurs déjà supportées par la création manuelle et la correction serveur (`exercices_types_correction.md`
§2) : `open`, `mcq`, `fill_blank`, `reorder`. Ce document spécifie, pour chacun de ces 4 types, si et comment
l'IA peut en proposer une génération à partir d'un contenu source — **sans inventer de 5ᵉ type** ni de
variante non persistable : le contrat de sortie de ce document est délibérément calé sur la structure JSON déjà
acceptée par `Question.content` (§3 d'`exercices_types_correction.md`), pas sur un format LLM-natif générique.

```
[Contenu source]        [CE DOCUMENT]              [Hors périmètre]         [Hors périmètre]
  PDF importé      →     Spécification des    →     Service génération  →   Interface de
  ou texte collé         types générables            (orchestration LLM,     révision
  ─────────────          (ce document :              hors périmètre)        (accept/edit/
  (Chunking/upload,      décision par type,                                  reject par
  hors périmètre —       prompt, schéma de                                   question)
  interface amont,       sortie, garde-fous)                                     │
  cf. §9)                                                                        ▼
                                                                      Persistance via les
                                                                      endpoints existants
                                                                      (POST /tests,
                                                                      POST /questions)
```

Règle non négociable, rappelée du périmètre OUT du ticket (« Correction officielle sans relecture ») : **aucune
question proposée par le LLM n'est jamais persistée directement**. La sortie de ce document est toujours un
**brouillon** consommé par l'Interface de révision (hors périmètre) ; la persistance réutilise les endpoints
existants de création d'exercice (voir §7), aucune question n'atteint `Question` sans passage explicite par
cette relecture.

---

## 2. Contrat d'entrée

| Paramètre | Type | Requis | Description |
|---|---|---|---|
| `sourceText` | string | oui | Contenu source déjà disponible en texte (upload PDF, texte collé — le traitement amont relève du Service génération, hors périmètre). Aucune limite de taille fixée ici. |
| `subjectContext` | string \| null | non | Nom de la matière, donné pour lever les ambiguïtés de vocabulaire — jamais une source de contenu à elle seule. |
| `questionCount` | integer | oui | Nombre de questions souhaité. Cible, pas une garantie stricte (voir §6.3). |
| `questionType` | `"open"` \| `"mcq"` \| `"fill_blank"` \| `"reorder"` \| `"mixed"` | non (défaut `"mixed"`) | Type de question à produire, aligné sur les 4 types déjà supportés par `Question.type` (§3). `"mixed"` laisse le modèle répartir les questions entre les 4 types selon ce que le contenu source justifie (voir §3.2) — défaut différent de `generation_ia_prompt_cartes.md` (`"open"`), justifié en §3.2. |
| `outputLanguage` | string (code langue) | non (défaut `"fr"`) | Langue de sortie des questions. |

Comme pour `generation_ia_prompt_cartes.md` §2, ce contrat est celui du prompt lui-même, pas d'un endpoint
HTTP — l'orchestration relève du Service génération (hors périmètre).

---

## 3. Types de questions générables

### 3.1 Décision par type

Les 4 types déjà persistables sont retenus, aucun n'est exclu de la génération IA — le ticket ne demande une
restriction sur aucun type précis, et exclure un type déjà supporté manuellement créerait une incohérence
sans justification fonctionnelle. En revanche, la **difficulté de génération fiable** et les **garde-fous
nécessaires** diffèrent nettement d'un type à l'autre :

| Type | Générable | Difficulté | Justification |
|---|---|---|---|
| `open` | ✅ | Faible | Une question + une réponse de référence — structure la plus proche de ce que produit déjà un LLM nativement. Point d'attention propre (§6.1) : la correction en production est **sémantique**, pas exacte (`exercices_types_correction.md` §6.1) — la réponse générée doit rester une formulation canonique complète, pas un mot-clé isolé. |
| `mcq` | ✅ | Moyenne | Nécessite des distracteurs plausibles mais non ambigus (même exigence que `generation_ia_prompt_cartes.md` §4 pour les cartes Leitner) — risque principal : un distracteur qui serait, au fond, également correct. |
| `fill_blank` | ✅ | Moyenne-haute | Le LLM doit produire un `template` cohérent avec des marqueurs `{{n}}` strictement séquentiels et un tableau `blanks` de longueur exactement égale — un désalignement entre les deux rend l'exercice injouable côté front (`ExerciseDetailPage.vue`, `exercices_types_correction.md` §5). Risque additionnel propre à ce type : un « trou » qui retire un mot tellement générique (article, mot de liaison) que la phrase reste devinable sans avoir compris la notion. |
| `reorder` | ✅ | Moyenne-haute | Le LLM doit produire une liste de `fragments` dont l'ordre est **le seul** ordre correct — un fragment ambigu (permutable avec un autre sans changer le sens) rend l'exercice à plusieurs solutions valides alors que la correction serveur n'en accepte qu'une (`exercices_types_correction.md` §6.2 « comparaison d'ordre strict »). |

**Aucun type n'est donc écarté**, mais `fill_blank` et `reorder` portent des garde-fous de cohérence structurelle
supplémentaires (§6.2, §6.3) qui n'ont pas d'équivalent pour les cartes Leitner (`open`/`mcq` uniquement) — ces
deux types n'existent pas dans le modèle `LeitnerCard`, `generation_ia_prompt_cartes.md` ne les couvre donc pas.

### 3.2 Répartition en mode `"mixed"`

Contrairement au `cardType` de `generation_ia_prompt_cartes.md` (défaut `"open"`, 2 valeurs possibles),
`questionType` défaut ici à `"mixed"` : un exercice généré composé uniquement de questions `open` serait moins
représentatif de ce qu'un enseignant construit manuellement (`exercices_types_correction.md` montre les 4 types
comme un ensemble cohérent, pas une hiérarchie). En mode `"mixed"`, le prompt système (§4.1, règle 9) demande au
modèle de choisir le type le plus adapté **par question**, notion par notion — jamais une répartition forcée en
proportions fixes (ex. « 25 % de chaque type »), qui produirait des questions artificielles pour combler un
quota de type plutôt que de refléter ce que le contenu source justifie naturellement.

---

## 4. Prompt

### 4.1 Prompt système

```
Tu es un générateur d'exercices de révision pour des étudiants post-bac, dans l'application MyMemoMaster.
Ton rôle est de transformer un extrait de contenu pédagogique en questions d'exercice, réparties entre
4 types possibles : question ouverte, QCM, texte à trous, remise en ordre.

RÈGLES STRICTES :
1. N'utilise QUE les informations présentes dans le texte source fourni. N'invente jamais un fait, une date,
   une définition ou un chiffre absent du texte. Si une question nécessiterait une information non présente
   dans le texte, ne la génère pas.
2. Une question = une notion atomique. Ne produis jamais deux questions portant sur exactement la même notion.
3. Formule les questions en langue {{outputLanguage}}, dans un registre neutre, sans jugement de valeur, sans
   contenu sensible, discriminatoire ou hors sujet. Si le texte source contient un tel passage, ignore-le
   plutôt que de le retranscrire dans une question.
4. Chaque question doit citer, dans le champ "sourceExcerpt", le passage exact du texte source qui la justifie
   (traçabilité pour l'Interface de révision, hors périmètre de ce document).
5. Pour le type "open" : "correct_answer" doit être une phrase complète et autoportante, jamais un mot ou
   groupe nominal isolé. Tu peux ajouter des variantes dans "accepted_answers" UNIQUEMENT si le texte source
   justifie réellement plusieurs formulations distinctes de la même notion (ex. une formule symbolique et son
   énoncé en toutes lettres) — jamais pour remplacer une réponse principale mal formulée.
6. Pour le type "mcq" : produis 3 à 4 options, dont EXACTEMENT une marquée correcte. Les distracteurs doivent
   être plausibles (même registre, longueur comparable) sans jamais être également défendables comme corrects.
7. Pour le type "fill_blank" : le champ "template" doit contenir des marqueurs "{{0}}", "{{1}}", etc.,
   strictement séquentiels à partir de 0, en nombre EXACTEMENT égal à la longueur du tableau "blanks". Ne
   retire jamais un mot dont l'absence laisse la phrase devinable sans connaître la notion (ex. jamais un
   simple article ou mot de liaison) — retire un terme porteur de sens (nom propre, terme technique, chiffre).
8. Pour le type "reorder" : le tableau "fragments" doit avoir un ordre unique et non ambigu — deux fragments
   ne doivent jamais pouvoir être permutés sans changer le sens de la phrase reconstituée.
9. Si "questionType" vaut "mixed", choisis le type le plus adapté à chaque question individuellement, en
   fonction de la nature de la notion source — jamais une répartition forcée en proportions fixes entre types.
10. Réponds UNIQUEMENT avec un objet JSON conforme au schéma fourni. Aucun texte avant ou après le JSON.
```

### 4.2 Prompt utilisateur (template)

```
Voici un extrait de contenu pédagogique{{#if subjectContext}} (matière : {{subjectContext}}){{/if}} :

"""
{{sourceText}}
"""

Génère {{questionCount}} question(s) d'exercice de type "{{questionType}}" à partir de ce texte, en
respectant strictement les règles du prompt système et le schéma JSON suivant :

{{JSON_SCHEMA}}
```

`{{JSON_SCHEMA}}` est le schéma reproduit en §5 — rappelé en toutes lettres dans le prompt, même stratégie que
`generation_ia_prompt_cartes.md` §3.2.

---

## 5. Contrat de sortie par type

```json
{
  "questions": [
    {
      "statement": "string — l'énoncé de la question",
      "type": "open",
      "content": { "correct_answer": "string", "accepted_answers": ["string", "..."] },
      "sourceExcerpt": "string"
    },
    {
      "statement": "string",
      "type": "mcq",
      "content": {
        "options": [
          { "text": "string", "correct": true },
          { "text": "string", "correct": false },
          { "text": "string", "correct": false }
        ]
      },
      "sourceExcerpt": "string"
    },
    {
      "statement": "string",
      "type": "fill_blank",
      "content": {
        "template": "string avec marqueurs {{0}}, {{1}}...",
        "blanks": ["string", "..."]
      },
      "sourceExcerpt": "string"
    },
    {
      "statement": "string",
      "type": "reorder",
      "content": { "fragments": ["string", "..."] },
      "sourceExcerpt": "string"
    }
  ],
  "warning": null
}
```

| Champ | Applicable à | Règle |
|---|---|---|
| `statement` | tous | Énoncé de la question. Concis (recommandé ≤ 300 caractères, même convention que `generation_ia_prompt_cartes.md` §4 — pas de limite technique côté `Question.statement`). |
| `type` | tous | `"open"`, `"mcq"`, `"fill_blank"` ou `"reorder"`, jamais autre chose. |
| `content.correct_answer` / `content.accepted_answers` | `open` | `correct_answer` : réponse de référence, **formulation canonique complète** (pas un mot-clé isolé — voir §6.1, la correction en aval est sémantique). `accepted_answers` : variantes optionnelles (peut être vide/absent) — *correction apportée le 2026-09-06 après audit du code réel* : `Test.service.js#_checkAnswer` compare en fait la réponse étudiante à **toutes** les formulations acceptées (`[content.correct_answer, ...content.accepted_answers]`) via `SemanticService.gradeSemantic(accepted[], user)`, la meilleure similarité l'emporte — `exercices_types_correction.md` §3.1 (qui ne documente que `correct_answer`) est donc obsolète sur ce point précis, voir `DECISIONS.md`. |
| `content.options` | `mcq` | 3 à 4 objets `{ text, correct }`. **Exactement une** option à `correct: true` (règle 6 du prompt système). |
| `content.template` / `content.blanks` | `fill_blank` | `template` : marqueurs `{{n}}` 0-indexés strictement séquentiels. `blanks` : tableau de longueur exactement égale au nombre de marqueurs, dans le même ordre (règle 7). |
| `content.fragments` | `reorder` | Fragments dans le **bon ordre** (le mélange pour l'affichage est fait côté front à la lecture, `exercices_types_correction.md` §5, hors périmètre de ce document) — ordre non ambigu (règle 8). |
| `sourceExcerpt` | tous | Extrait littéral du texte source, justification affichée à l'Interface de révision (hors périmètre). Même rôle qu'en `generation_ia_prompt_cartes.md` §4 — pas de contrainte de longueur imposée ici. |
| `warning` | racine | `null` si rien à signaler, sinon message expliquant un écart au contrat (ex. moins de questions que demandé — voir §6.3). |

Le champ `content` par question reprend **exactement** la forme déjà persistée dans `Question.content`
(`exercices_types_correction.md` §3), sans transformation intermédiaire à prévoir côté Validation
format/Service génération (hors périmètre) au-delà d'une vérification de conformité au schéma.

---

## 6. Règles de génération et garde-fous

### 6.1 `open` — Formulation canonique, pas mot-clé ; variantes en complément

Le garde-fou anti-hallucination (règle 1 du prompt système) et le mécanisme `sourceExcerpt` (règle 4) sont
repris à l'identique de `generation_ia_prompt_cartes.md` §5.1 — mêmes limites (détectable par relecture, pas
une garantie). Spécifique aux exercices : la correction serveur `open` n'est pas une comparaison textuelle
mais une similarité sémantique par embeddings, avec une zone de confiance haute à partir de 0,78 de cosine
similarity et une zone grise 0,55–0,78 dépendant d'un recouvrement de mots-clés (`Test.service.js#_checkAnswer`,
cas `open` — `exercices_types_correction.md` §6.1 documente les mêmes seuils). Une réponse de référence trop
courte ou réduite à un seul mot-clé dégraderait la qualité de cette comparaison en production (moins de signal
sémantique à comparer) — `content.correct_answer` doit donc être une phrase complète et autoportante, jamais un
simple mot ou groupe nominal isolé.

`content.accepted_answers` (optionnel, §5) est comparé de la même façon : `_checkAnswer` construit un tableau
`[correct_answer, ...accepted_answers]` et retient la meilleure similarité obtenue sur l'ensemble — proche du
rôle de `acceptedAnswers` en `generation_ia_prompt_cartes.md` §4 pour les cartes Leitner (variantes de
formulation), à la différence que côté exercices chaque variante passe individuellement par la similarité
sémantique plutôt que par une comparaison exacte. Le prompt peut donc, quand une notion admet plusieurs
formulations réellement distinctes justifiées par le texte source (ex. une formule symbolique **et** son
énoncé en toutes lettres), proposer `accepted_answers` — jamais comme substitut à une réponse principale bien
formulée, seulement en complément.

### 6.2 `fill_blank` — Cohérence stricte template/blanks

Garde-fou propre à ce type, sans équivalent en `generation_ia_prompt_cartes.md` (absent du modèle
`LeitnerCard`) : le nombre de marqueurs `{{n}}` dans `template` doit être **exactement** égal à la longueur de
`blanks`, faute de quoi le player front (`ExerciseDetailPage.vue`, `exercices_types_correction.md` §5) ne peut
pas initialiser `userAnswers[i]` correctement. Ce garde-fou est énoncé dans le prompt (règle 7) ; sa
**vérification effective** (rejet d'une sortie non conforme) relève de la Validation format (hors périmètre de
ce document, qui n'en fixe que le contrat attendu).

### 6.3 Nombre de questions et contenu insuffisant

Même principe que `generation_ia_prompt_cartes.md` §5.3 : si le texte source ne permet pas de justifier
`questionCount` questions atomiques et non redondantes, le modèle génère **moins de questions plutôt que de
combler** par paraphrase, et le signale dans `warning`. Un tableau `questions` vide (avec `warning` renseigné)
est une sortie valide, jamais une erreur. `questionCount` est une cible, jamais une contrainte dure — le
prompt ne doit jamais produire plus de questions que demandé.

### 6.4 Langue et neutralité

Identique à `generation_ia_prompt_cartes.md` §5.4 : sortie dans `outputLanguage` (défaut français), contenu
neutre filtré silencieusement (règle 3), sans `warning` par passage filtré.

### 6.5 Absence de doublon entre types

Un risque propre au mode `"mixed"` (§3.2), absent du contrat à 2 types de `generation_ia_prompt_cartes.md` :
deux questions de types différents peuvent porter sur la même notion sous-jacente (ex. une question `open` et
une question `mcq` posant, au fond, la même question). La règle d'atomicité et d'absence de doublon (règle 2
du prompt système) s'applique **entre toutes les questions générées, tous types confondus**, pas seulement au
sein d'un même type.

---

## 7. Mapping avec la persistance réelle (interface, pas une décision de ce document)

Comme pour `generation_ia_prompt_cartes.md` §6, aucune question proposée n'est persistée avant validation
utilisateur (Interface de révision, hors périmètre). Une fois une question acceptée (éventuellement éditée),
la persistance peut réutiliser telle quelle la séquence déjà utilisée par la création manuelle d'exercice
(`exercices_types_correction.md` §4), sans nouvel endpoint dédié à la génération IA :

```
1. POST /tests                          (une fois, à la création de l'exercice — hors génération elle-même)
   { name, subjectId }
   → idTest

2. POST /questions                      (une fois par question acceptée)
   { statement, questionPosition, type, content, idTest }
   — content = mapping direct de content au §5, sans transformation
```

Plus simple que le mapping de `generation_ia_prompt_cartes.md` §6 (3 endpoints par carte Leitner, `content`
reconstruit à partir de champs séparés `answer`/`acceptedAnswers`/`options`) : ici, `content` du contrat de
sortie (§5) **est déjà** la structure attendue par `POST /questions`, aucune reconstruction n'est nécessaire —
conséquence directe du choix fait en §5 de caler le schéma de sortie sur le contrat de persistance existant.

Cette réutilisation reste, comme pour C-01.01, une **hypothèse de travail** : la conception de l'orchestration
réelle (Service génération) relève d'un ticket séparé et hors périmètre de celui-ci.

---

## 8. Gestion des erreurs et cas limites

| Cas | Comportement attendu |
|---|---|
| Sortie non-JSON ou JSON ne respectant pas le schéma (§5) | Un retry, avec rappel explicite du schéma et de l'erreur de parsing rencontrée. Si le second essai échoue également, échec explicite — aucune question n'est proposée, aucun contenu partiel ou reconstruit approximativement (même politique que `generation_ia_prompt_cartes.md` §7). |
| `options` d'une question `mcq` sans exactement une entrée `correct: true` | Sortie non conforme au schéma — même traitement que ci-dessus. |
| `fill_blank` avec un nombre de marqueurs `{{n}}` différent de la longueur de `blanks` | Sortie non conforme au schéma (§6.2) — même traitement (retry puis échec), jamais une correction silencieuse (ex. tronquer `blanks` ou ignorer un marqueur en trop) qui masquerait une génération défaillante. |
| `reorder` avec un seul fragment, ou des fragments strictement identiques | Sortie non conforme (un exercice de remise en ordre suppose au moins 2 fragments distincts) — même traitement. |
| Texte source vide, illisible ou hors sujet par rapport à `subjectContext` | Cas particulier de §6.3 : `questions: []` avec `warning` explicite, pas une erreur technique. |
| `questionCount` disproportionné par rapport à la taille du contenu source | Le modèle génère le maximum de questions atomiques justifiables et le signale via `warning` — jamais de duplication ou de paraphrase pour combler (§6.3). |

---

## 9. Interfaces avec les éléments voisins du feature list `C-02` (hors périmètre de ce document)

| Élément IN du feature list | Interface avec ce document | Ce que ce document NE fixe PAS |
|---|---|---|
| Service génération | Exécute ce prompt (§4) sur un modèle LLM, fournit `sourceText` en entrée (§2) | Fournisseur/modèle retenu, orchestration réseau, chunking d'un contenu source long — par analogie avec `C-01` (`generation_ia_llm_benchmark.md`, orientation Mistral AI déjà actée pour la feature voisine), une réutilisation du même service d'inférence (`AiCardGeneration.service.js`) est plausible mais **non actée ici**, à trancher au moment où le Service génération sera lui-même scopé. |
| Validation format | Vérifie la conformité de la sortie du LLM au schéma §5 avant de l'exposer à l'Interface de révision | Implémentation du validateur, politique de retry précise au-delà du principe déjà posé en §8 |
| Mode dégradé | Comportement de l'application quand le Service génération est indisponible (LLM en panne, quota épuisé…) | Mécanisme de repli (ex. proposer la création manuelle en substitution), messages utilisateur — ce document ne fixe que le contrat qu'un mode dégradé devrait reconnaître comme indisponible (§8) |
| Interface de révision | Consomme `questions[]` et `warning` (§5), affiche `sourceExcerpt` par question (§6.1) | Maquette, ergonomie, comportement accept/edit/reject — par analogie avec `generation_ia_ui.md` (C-01.02, Vue 3), une UI de relecture similaire (case à cocher par question, accordéon `sourceExcerpt`) est plausible mais non maquettée ici |

---

## 10. Exemple concret

**Entrée**

```json
{
  "sourceText": "La photosynthèse est le processus par lequel les plantes, les algues et certaines bactéries convertissent l'énergie lumineuse en énergie chimique. Elle se déroule principalement dans les chloroplastes, grâce à un pigment appelé chlorophylle. Le processus consomme du dioxyde de carbone et de l'eau, et produit du glucose et de l'oxygène.",
  "subjectContext": "SVT",
  "questionCount": 4,
  "questionType": "mixed",
  "outputLanguage": "fr"
}
```

**Sortie attendue**

```json
{
  "questions": [
    {
      "statement": "Qu'est-ce que la photosynthèse ?",
      "type": "open",
      "content": {
        "correct_answer": "Le processus par lequel les plantes, algues et certaines bactéries convertissent l'énergie lumineuse en énergie chimique.",
        "accepted_answers": ["La conversion de l'énergie lumineuse en énergie chimique par les plantes, algues et certaines bactéries."]
      },
      "sourceExcerpt": "La photosynthèse est le processus par lequel les plantes, les algues et certaines bactéries convertissent l'énergie lumineuse en énergie chimique."
    },
    {
      "statement": "Dans quel organite cellulaire se déroule principalement la photosynthèse ?",
      "type": "mcq",
      "content": {
        "options": [
          { "text": "Le noyau", "correct": false },
          { "text": "Les chloroplastes", "correct": true },
          { "text": "Les mitochondries", "correct": false }
        ]
      },
      "sourceExcerpt": "Elle se déroule principalement dans les chloroplastes, grâce à un pigment appelé chlorophylle."
    },
    {
      "statement": "Complétez : la photosynthèse consomme du ___ et de l'___, et produit du ___ et de l'___.",
      "type": "fill_blank",
      "content": {
        "template": "La photosynthèse consomme du {{0}} et de l'{{1}}, et produit du {{2}} et de l'{{3}}.",
        "blanks": ["dioxyde de carbone", "eau", "glucose", "oxygène"]
      },
      "sourceExcerpt": "Le processus consomme du dioxyde de carbone et de l'eau, et produit du glucose et de l'oxygène."
    },
    {
      "statement": "Remettez dans l'ordre les étapes de la définition de la photosynthèse.",
      "type": "reorder",
      "content": {
        "fragments": ["convertissent", "l'énergie lumineuse", "en énergie chimique"]
      },
      "sourceExcerpt": "convertissent l'énergie lumineuse en énergie chimique"
    }
  ],
  "warning": null
}
```

---

## 11. Périmètre

| IN (ce document) | OUT (rappel du ticket) |
|---|---|
| Décision de générabilité par type, 4/4 types retenus (§3) | Correction officielle sans relecture (voir §1, règle non négociable) |
| Prompt système + prompt utilisateur (§4) | Génération illimitée (interface avec Mode dégradé/Validation format, hors périmètre) |
| Contrat d'entrée/sortie par type (§2, §5) | Banque publique automatique — les exercices générés restent privés par défaut, propriété du créateur, comme tout `Test` (décision actée le 2026-06-28, `DECISIONS.md`) |
| Garde-fous de génération, génériques et propres à chaque type (§6) | Conception du Service génération, de la Validation format, du Mode dégradé, de l'Interface de révision (§9) |
| Cas d'erreur du prompt lui-même (§8) | |

---

## 12. Points ouverts / dette

- **Aucun appel réel n'a été fait** — comme `generation_ia_prompt_cartes.md`, ce document n'a pas pu être
  validé empiriquement (aucune intégration LLM branchée sur ce prompt à ce jour ; `C-01` a un service
  d'inférence opérationnel, `AiCardGeneration.service.js`, mais exécute le prompt cartes, pas celui-ci).
  L'exemple du §10 est illustratif, pas mesuré.
- **Orientation fournisseur étendue à `C-02` : Mistral AI**, pour la même raison RGPD qui a motivé le choix sur
  `C-01` (`DECISIONS.md`, 2026-09-01 puis 2026-09-06 — hébergement UE par défaut, pas de cadre de transfert
  international à mettre en place) — ce critère de conformité est indépendant du type de contenu généré
  (cartes ou exercices), l'étendre est donc une extrapolation directe, pas un nouvel arbitrage. **Ceci n'est
  toujours pas un Benchmark LLM** : le modèle précis dans la gamme Mistral reste à choisir spécifiquement pour
  ce prompt à 4 types (le profil de tâche diffère de celui de `C-01.03` — garde-fous de cohérence
  `template`/`blanks` et `fragments` en plus, potentiellement plus exigeants pour un modèle de petite taille
  qu'une simple extraction question/réponse) ; réutiliser tel quel `mistral-small-latest` (choix `C-01.03`)
  reste une hypothèse de départ raisonnable, pas une décision mesurée pour ce prompt précis. Le Benchmark LLM
  propre à `C-02` n'apparaît pas explicitement dans le périmètre IN fourni pour ce ticket — à traiter dans le
  cadre du Service génération (hors périmètre de ce document) s'il est jugé nécessaire.
- **Le mapping de persistance (§7) est une hypothèse**, pas une décision actée — comme pour C-01.01, à
  confirmer/trancher au moment où le Service génération et l'Interface de révision seront eux-mêmes scopés.
- **Aucune borne chiffrée sur `questionCount`** n'est fixée ici — dépend d'un futur arbitrage de quotas
  (non nommé explicitement dans le périmètre IN de `C-02` fourni, contrairement à `C-01` qui a un élément
  « Quotas » dédié — à clarifier si `C-02` en a besoin d'un propre ou réutilise celui de `C-01`).
- **Répartition en mode `"mixed"` (§3.2) non bornée** — rien n'empêche, en théorie, une sortie composée à
  100 % d'un seul type si le contenu source s'y prête naturellement ; accepté comme comportement voulu (reflet
  fidèle du contenu plutôt qu'un quota artificiel), mais à confirmer avec l'Interface de révision (l'utilisateur
  pourrait s'attendre à une certaine diversité visible à l'écran).
