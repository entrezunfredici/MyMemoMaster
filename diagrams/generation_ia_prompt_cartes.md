# Documentation — Spécification prompt génération cartes : Génération de Leitner par IA

> Document de référence pour **C-01.01** (feature list `C-01`, source planning, V2).
> Périmètre strict de ce document : **le prompt de génération de cartes** — contrat d'entrée, contrat de sortie,
> règles de génération, garde-fous, cas d'erreur. Les autres éléments IN du feature list `C-01`
> (benchmark LLM, chunking PDF, quotas, écran de validation, parsing) sont **hors périmètre** :
> ce document les traite uniquement comme des interfaces amont/aval, sans les concevoir.
> Aucune implémentation n'existe à ce jour (`C-01` à 0/11 dans le registre Odoo) — document d'analyse pur.
> Sources de vérité pour le contrat réel de persistance : `models/Question.model.js`, `models/Response.model.js`,
> `models/LeitnerCard.model.js`, `pages/FlashcardsCardsPage.vue` (`handleCreate`).

---

## 1. Vue d'ensemble

Le prompt décrit ici est l'étape centrale du pipeline `C-01`, entre le contenu source déjà découpé et l'écran
de validation utilisateur :

```
[Contenu source]        [CE DOCUMENT]           [Hors périmètre]           [Hors périmètre]
  PDF importé      →     Prompt de          →    Parsing de la      →      Écran de
  ou texte collé         génération              sortie LLM en             validation
  ─────────────          de cartes               structure interne         (accept/edit/
  (Chunking PDF,         (ce document)           (Parsing)                 reject par carte)
  hors périmètre)                                                                │
                                                                                 ▼
                                                                    Persistance via les 3 endpoints
                                                                    existants (POST /questions,
                                                                    POST /responses, POST /leitnercards)
```

Règle non négociable, rappelée du périmètre OUT du ticket : **aucune carte proposée par le LLM n'est jamais
persistée directement**. La sortie du prompt est toujours un **brouillon** consommé par l'écran de validation ;
la persistance réutilise les mêmes appels API que la création manuelle (voir §6), aucune carte n'atteint
`LeitnerCard` sans passage explicite par cet écran.

---

## 2. Contrat d'entrée du prompt

| Paramètre | Type | Requis | Description |
|---|---|---|---|
| `sourceText` | string | oui | Un chunk de contenu déjà découpé en amont (Chunking PDF, hors périmètre). Ce document suppose un chunk cohérent (une section, pas un PDF entier) — aucune limite de taille n'est fixée ici, elle dépend du budget de tokens du modèle retenu par le Benchmark LLM (hors périmètre). |
| `subjectContext` | string \| null | non | Nom de la matière/sujet (`Subject.name`), donné pour aider le modèle à lever les ambiguïtés de vocabulaire — n'est jamais une source de contenu à elle seule. |
| `cardCount` | integer | oui | Nombre de cartes souhaité. Cible, pas une garantie stricte (voir §5.3 sur le contenu insuffisant). |
| `cardType` | `"open"` \| `"mcq"` \| `"mixed"` | non (défaut `"open"`) | Type de carte à produire, aligné sur les deux types déjà supportés par le modèle `Question` (voir §6). `"mixed"` laisse le modèle choisir carte par carte. |
| `outputLanguage` | string (code langue) | non (défaut `"fr"`) | Langue de sortie des cartes. Le contenu source peut être dans une autre langue (ex. PDF en anglais, cartes voulues en français). |

Ce contrat est celui du prompt lui-même, pas celui d'un endpoint HTTP — l'orchestration (quel service appelle
le LLM avec quels paramètres réseau) relève du Benchmark LLM et est hors périmètre.

---

## 3. Prompt

### 3.1 Prompt système

```
Tu es un générateur de cartes de révision pour des étudiants post-bac, dans l'application MyMemoMaster.
Ton rôle est de transformer un extrait de contenu pédagogique en cartes de type question/réponse
pour un système de répétition espacée (méthode Leitner).

RÈGLES STRICTES :
1. N'utilise QUE les informations présentes dans le texte source fourni. N'invente jamais un fait,
   une date, une définition ou un chiffre absent du texte. Si une carte nécessiterait une information
   non présente dans le texte, ne la génère pas.
2. Une carte = une notion atomique. N'empile jamais plusieurs questions dans un même énoncé.
3. Ne produis jamais deux cartes portant sur exactement la même notion.
4. Formule les questions et réponses en langue {{outputLanguage}}, dans un registre neutre,
   sans jugement de valeur, sans contenu sensible, discriminatoire ou hors sujet. Si le texte source
   contient un tel passage, ignore-le plutôt que de le retranscrire dans une carte.
5. Chaque carte doit citer, dans le champ "sourceExcerpt", le passage exact du texte source qui
   justifie la carte (traçabilité pour la relecture utilisateur).
6. Réponds UNIQUEMENT avec un objet JSON conforme au schéma fourni. Aucun texte avant ou après le JSON.
```

### 3.2 Prompt utilisateur (template)

```
Voici un extrait de contenu pédagogique{{#if subjectContext}} (matière : {{subjectContext}}){{/if}} :

"""
{{sourceText}}
"""

Génère {{cardCount}} carte(s) de révision de type "{{cardType}}" à partir de ce texte,
en respectant strictement les règles du prompt système et le schéma JSON suivant :

{{JSON_SCHEMA}}
```

`{{JSON_SCHEMA}}` est le schéma reproduit en §4 — il est injecté tel quel dans le prompt (le rappeler
en toutes lettres au modèle réduit le risque de sortie non conforme, plus fiable qu'un simple renvoi
au nom du schéma).

---

## 4. Contrat de sortie du prompt

```json
{
  "cards": [
    {
      "statement": "string — l'énoncé de la carte (le recto)",
      "type": "open",
      "answer": "string — réponse de référence (type \"open\" uniquement)",
      "acceptedAnswers": ["string", "..."],
      "options": null,
      "sourceExcerpt": "string — extrait exact du texte source justifiant la carte"
    },
    {
      "statement": "string",
      "type": "mcq",
      "answer": null,
      "acceptedAnswers": null,
      "options": [
        { "text": "string", "correct": true },
        { "text": "string", "correct": false },
        { "text": "string", "correct": false }
      ],
      "sourceExcerpt": "string"
    }
  ],
  "warning": null
}
```

| Champ | Applicable à | Règle |
|---|---|---|
| `statement` | tous | Énoncé de la carte. Concis (recommandé ≤ 300 caractères — pas de limite technique côté `Question.statement`, mais une carte de révision doit rester lisible d'un coup d'œil). |
| `type` | tous | `"open"` ou `"mcq"`, jamais autre chose. |
| `answer` | `open` | Réponse principale, concise. `null` pour une carte `mcq`. |
| `acceptedAnswers` | `open` | Variantes de formulation acceptées en plus de `answer` (peut être vide). `null`/absent pour `mcq`. |
| `options` | `mcq` | 3 à 4 objets `{ text, correct }`. **Exactement une** option à `correct: true`. Les distracteurs doivent être plausibles (même registre, longueur comparable) sans être ambigus au point de rendre la bonne réponse indécidable. `null` pour `open`. |
| `sourceExcerpt` | tous | Extrait littéral du texte source. Sert de justification affichée à l'écran de validation (hors périmètre) — pas de contrainte de longueur imposée ici. |
| `warning` | racine | `null` si rien à signaler. Sinon message expliquant un écart au contrat (ex. moins de cartes que demandé faute de contenu suffisant — voir §5.3). |

Ce schéma est délibérément proche du contrat déjà accepté par les endpoints existants (voir §6) pour que
l'étape de Parsing (hors périmètre) n'ait qu'un mapping direct à faire, sans transformation complexe.

---

## 5. Règles de génération et garde-fous

### 5.1 Anti-hallucination

Le garde-fou n°1 du prompt système (§3.1) interdit explicitement d'inventer une information absente du texte
source. Le champ `sourceExcerpt` (§4) est le mécanisme de vérifiabilité : il permet à l'écran de validation
(hors périmètre) d'afficher côte à côte la carte proposée et le passage source, pour une relecture rapide par
l'utilisateur. Ce mécanisme ne **garantit** pas l'absence d'hallucination (aucun prompt ne le peut) — il rend
l'hallucination détectable par l'utilisateur, ce qui est le maximum atteignable pour cette tâche sans
correction humaine automatique (rappel du périmètre OUT du ticket).

### 5.2 Atomicité et absence de doublon

Une carte = une notion isolée (règle 2 du prompt système). Deux cartes ne doivent jamais porter sur la même
notion (règle 3) — à charge du prompt, pas d'une déduplication a posteriori côté application.

### 5.3 Contenu source insuffisant

Si le texte source ne permet pas de justifier `cardCount` cartes atomiques et non redondantes, le modèle doit
générer **moins de cartes plutôt que de combler** par paraphrase ou par une notion hors sujet, et le signaler
dans le champ `warning`. Un tableau `cards` vide (avec `warning` renseigné) est une sortie valide, jamais une
erreur.

### 5.4 Langue et neutralité

Sortie dans `outputLanguage` (défaut français) quelle que soit la langue du texte source. Contenu neutre :
aucun passage jugé sensible, discriminatoire ou hors sujet du texte source ne doit être repris dans une carte
(règle 4 du prompt système) — le modèle doit l'ignorer silencieusement plutôt que le signaler comme `warning`
(un `warning` par passage filtré serait bruyant sans valeur ajoutée pour l'utilisateur).

### 5.5 Nombre de cartes

`cardCount` est une cible, jamais une contrainte dure absolue (voir §5.3). Le prompt ne doit jamais produire
plus de cartes que demandé.

---

## 6. Mapping avec la persistance réelle (interface, pas une décision de ce document)

Aucune carte proposée n'est persistée avant validation utilisateur (écran de validation, hors périmètre). Une
fois une carte acceptée (éventuellement éditée) à l'écran de validation, la persistance peut réutiliser telle
quelle la séquence déjà utilisée par la création manuelle (`FlashcardsCardsPage.vue#handleCreate`), sans
nouvel endpoint dédié à la génération IA :

```
1. POST /questions
   { statement, questionPosition, type, content }
   — content = null pour "open", { options: [...] } pour "mcq"
   → idQuestion

2. (type "open" uniquement) POST /responses  — une fois par entrée de answer + acceptedAnswers
   { content, correction: true, idQuestion }

3. POST /leitnercards
   { idQuestion, idSystem, mindMapNodeId: null }
```

Le champ `sourceExcerpt` (§4) n'a pas d'équivalent dans ce contrat de persistance actuel — il ne sert qu'à la
relecture à l'écran de validation et n'a pas vocation à être stocké en base dans cette première version.

Cette réutilisation est une **hypothèse de travail**, pas une décision actée : la conception de l'orchestration
(qui appelle le LLM, avec quel service, sur quel endpoint) relève du ticket qui scope le Parsing/l'écran de
validation, pas de celui-ci.

---

## 7. Gestion des erreurs et cas limites

| Cas | Comportement attendu |
|---|---|
| Sortie non-JSON ou JSON ne respectant pas le schéma (§4) | Un retry, avec rappel explicite du schéma et de l'erreur de parsing rencontrée. Si le second essai échoue également, l'appel est un échec — aucune carte n'est proposée, aucun contenu partiel ou reconstruit approximativement n'est renvoyé à l'utilisateur. |
| `options` d'une carte `mcq` sans exactement une entrée `correct: true` | Sortie non conforme au schéma — traité comme le cas ci-dessus (retry puis échec), jamais corrigé silencieusement côté parsing (une correction silencieuse masquerait une génération défaillante). |
| Texte source vide, illisible (échec OCR en amont) ou hors sujet par rapport à `subjectContext` | Cas particulier de §5.3 : `cards: []` avec `warning` explicite, ce n'est pas une erreur technique. |
| `cardCount` demandé disproportionné par rapport à la taille du chunk (ex. 30 cartes sur 3 lignes de texte) | Le modèle génère le maximum de cartes atomiques justifiables et le signale via `warning` — jamais de duplication ou de paraphrase pour combler (§5.3). |

---

## 8. Interfaces avec les éléments voisins du feature list `C-01` (hors périmètre de ce document)

| Élément IN du feature list | Interface avec ce document | Ce que ce document NE fixe PAS |
|---|---|---|
| Chunking PDF | Fournit `sourceText` (§2) | Taille/stratégie de découpage, gestion des PDF multi-pages |
| Benchmark LLM | Choisit le modèle qui exécute ce prompt | Fournisseur, nom de modèle, format d'appel réseau, coût par appel |
| Quotas | Encadre le nombre d'appels à ce prompt | Limites chiffrées, mécanisme de comptage/blocage |
| Parsing | Consomme la sortie JSON (§4) | Implémentation du parseur, mapping technique exact vers les 3 appels API (§6 n'est qu'une hypothèse) |
| Écran de validation | Consomme `cards[]` et `warning` (§4), affiche `sourceExcerpt` (§5.1) | Maquette, ergonomie, comportement accept/edit/reject |

---

## 9. Exemple concret

**Entrée**

```json
{
  "sourceText": "La photosynthèse est le processus par lequel les plantes, les algues et certaines bactéries convertissent l'énergie lumineuse en énergie chimique. Elle se déroule principalement dans les chloroplastes, grâce à un pigment appelé chlorophylle. Le processus consomme du dioxyde de carbone et de l'eau, et produit du glucose et de l'oxygène.",
  "subjectContext": "SVT",
  "cardCount": 3,
  "cardType": "open",
  "outputLanguage": "fr"
}
```

**Sortie attendue**

```json
{
  "cards": [
    {
      "statement": "Qu'est-ce que la photosynthèse ?",
      "type": "open",
      "answer": "Le processus par lequel les plantes, algues et certaines bactéries convertissent l'énergie lumineuse en énergie chimique.",
      "acceptedAnswers": ["La conversion de l'énergie lumineuse en énergie chimique par les plantes, algues et certaines bactéries."],
      "options": null,
      "sourceExcerpt": "La photosynthèse est le processus par lequel les plantes, les algues et certaines bactéries convertissent l'énergie lumineuse en énergie chimique."
    },
    {
      "statement": "Dans quel organite cellulaire se déroule principalement la photosynthèse, et grâce à quel pigment ?",
      "type": "open",
      "answer": "Dans les chloroplastes, grâce à la chlorophylle.",
      "acceptedAnswers": [],
      "options": null,
      "sourceExcerpt": "Elle se déroule principalement dans les chloroplastes, grâce à un pigment appelé chlorophylle."
    },
    {
      "statement": "Quels sont les réactifs et les produits de la photosynthèse ?",
      "type": "open",
      "answer": "Réactifs : dioxyde de carbone et eau. Produits : glucose et oxygène.",
      "acceptedAnswers": [],
      "options": null,
      "sourceExcerpt": "Le processus consomme du dioxyde de carbone et de l'eau, et produit du glucose et de l'oxygène."
    }
  ],
  "warning": null
}
```

---

## 10. Périmètre

| IN (ce document) | OUT (rappel du ticket) |
|---|---|
| Prompt système + prompt utilisateur (§3) | Correction humaine automatique |
| Contrat d'entrée/sortie du prompt (§2, §4) | Garantie de justesse absolue (voir §5.1 — détectable, pas garanti) |
| Garde-fous de génération (§5) | Génération sans validation utilisateur (voir §1, règle non négociable) |
| Cas d'erreur du prompt lui-même (§7) | Conception du Benchmark LLM, du Chunking PDF, des Quotas, de l'écran de validation (§8) |

---

## 11. Points ouverts / dette

- **Aucun modèle LLM concret n'est arrêté** — ce prompt est écrit indépendamment du fournisseur, en anticipant
  un arbitrage du Benchmark LLM (hors périmètre). Le prompt système suppose un modèle capable de respecter un
  schéma JSON strict ; certains modèles nécessitent un mode "JSON strict"/"structured output" dédié plutôt
  qu'une simple instruction en langage naturel — à vérifier une fois le modèle choisi.
- **Aucun appel réel n'a été fait** — ce document n'a pas pu être validé empiriquement (pas d'intégration LLM
  existante dans le dépôt à ce jour ; le seul modèle IA embarqué, `@xenova/transformers`, sert à la correction
  sémantique des exercices, pas à la génération de contenu). Les exemples du §9 sont illustratifs, pas mesurés.
- **Le mapping de persistance (§6) est une hypothèse**, pas une décision : elle suppose que l'écran de
  validation appelle les 3 endpoints existants un par un plutôt qu'un futur endpoint de création en masse ; à
  confirmer/trancher au moment où le Parsing et l'écran de validation seront eux-mêmes scopés.
- **Aucune borne chiffrée sur `cardCount`** n'est fixée ici (ex. min/max acceptés) — dépend de l'arbitrage
  Quotas (hors périmètre).
