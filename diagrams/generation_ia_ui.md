# Maquettes UI — Génération de Leitner par IA

> Document de référence pour **C-01.02** (feature list `C-01`, source planning, V2, tâche « Analyse »).
> Périmètre strict de ce document : **les maquettes UI** du parcours de génération de cartes par IA — écrans,
> composants, flux d'interaction. Les autres éléments IN du feature list `C-01` (Prompt, Benchmark LLM,
> Parsing, Chunking PDF, Quotas) sont traités uniquement comme des **entrées/contraintes visuelles** (ex. un
> indicateur de quota affiché), sans être conçus ici.
> S'appuie sur `diagrams/generation_ia_prompt_cartes.md` (C-01.01) pour le contrat de sortie du prompt
> (`cards[].statement/type/answer/acceptedAnswers/options/sourceExcerpt`), repris tel quel dans les maquettes
> de l'écran de validation (§5).
> Aucune implémentation n'existe à ce jour (`C-01` à 0/11 dans le registre Odoo) — document d'analyse pur, sur
> le modèle de `diagrams/etablissement_admin_ui.md` (S-04.02).
> Référence visuelle : `FlashcardsCardsPage.vue` (page existante à étendre), identité bleu `#1E3BA1`, cartes
> `bg-white border border-gray-200 rounded-lg`, modales `bg-white` explicite (règle `CONVENTIONS.md`).

---

## 1. Contexte et objectif

Aujourd'hui, une carte Leitner se crée une par une depuis `FlashcardsCardsPage.vue` (formulaire manuel :
énoncé, réponse(s), type `open`/`mcq`). Ce document maquette l'ajout d'un second chemin de création :
génération assistée par IA à partir d'un contenu fourni par l'utilisateur (texte collé ou PDF), produisant un
**brouillon de cartes à valider** avant tout ajout au système Leitner — jamais d'ajout automatique (rappel du
périmètre OUT : « Génération sans validation utilisateur »).

---

## 2. Périmètre

| Élément | Dans le périmètre C-01.02 (maquette) |
|---|---|
| Point d'entrée (bouton sur `FlashcardsCardsPage.vue`) | ✅ |
| Modal de configuration (source, matière, nombre/type de cartes) | ✅ maquette — pas le contrat d'appel réseau |
| État de génération en cours | ✅ maquette |
| Écran de validation (liste des cartes proposées, accept/edit/reject) | ✅ maquette — pas le détail fonctionnel complet (accept partiel, pagination…), voir §11 |
| Affichage d'un indicateur de quota | ✅ maquette d'affichage uniquement |
| Chunking PDF (extraction/découpage réel d'un PDF) | ❌ hors périmètre — traité comme une entrée déjà disponible |
| Benchmark LLM (modèle utilisé) | ❌ hors périmètre — invisible pour l'utilisateur final |
| Contrat du prompt | ❌ hors périmètre — voir `generation_ia_prompt_cartes.md` |
| Endpoint(s) réels d'orchestration | ❌ hors périmètre — noms d'endpoints ci-dessous sont des hypothèses de nommage, pas une décision |
| Correction humaine automatique | ❌ hors version (OUT ticket) |
| Génération sans validation | ❌ hors version (OUT ticket) — non négociable, voir §1 |

---

## 3. Flux général

```
FlashcardsCardsPage.vue                                                        Persistance
  │                                                                            (existante,
  │  [✨ Générer par IA]                                                       inchangée)
  ▼
┌─────────────────────┐   ┌──────────────────┐   ┌──────────────────────┐   ┌─────────────┐
│ Vue 1                │   │ Vue 2            │   │ Vue 3                │   │             │
│ Modal configuration  │ → │ État génération  │ → │ Écran de validation  │ → │ POST        │
│ (source, matière,    │   │ en cours         │   │ (accept/edit/reject  │   │ /questions  │
│ nb/type de cartes)   │   │                  │   │ carte par carte)     │   │ /responses  │
└─────────────────────┘   └──────────────────┘   └──────────────────────┘   │ /leitnercards│
        │                         │                         │               │ (×N cartes  │
        │ Annuler                 │ Échec/annulation        │ Annuler       │ acceptées)  │
        ▼                         ▼                         ▼               └─────────────┘
   Retour gestion            Retour Vue 1              Retour gestion
   des cartes                (avec erreur)             des cartes (rien
                                                         n'a été ajouté)
```

Aucune étape n'écrit en base avant la confirmation finale de la Vue 3 (Écran de validation) — cohérent avec
`generation_ia_prompt_cartes.md` §1 et §6.

---

## 4. Vue 1 — Point d'entrée et modal de configuration

### 4.1 Point d'entrée — `FlashcardsCardsPage.vue`

Bouton ajouté dans la barre d'en-tête existante, à côté de « + Ajouter une carte » :

```
┌───────────────────────────────────────────────────────────────────────┐
│  ← Retour           Système Leitner — Géographie          [✨ Générer│
│                                              [+ Ajouter une carte]  IA]│
├───────────────────────────────────────────────────────────────────────┤
│  Boîtes du système                                    [+ Ajouter une │
│  ...                                                          boîte] │
```

- Style aligné sur le bouton existant : `bg-primary hover:bg-primary/90 text-white font-bold py-2 px-5
  rounded-lg`, libellé `✨ Générer par IA`.
- Ouvre la modal de configuration (§4.2), taille `lg` (`ModalComponent`, `bg-white` explicite,
  `max-height: 90vh; overflow-y: auto`, convention déjà en place sur toutes les tailles de modale).

### 4.2 Modal de configuration

```
┌─────────────────────────────────────────────────────────┐
│  Générer des cartes par IA                          [X] │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Source du contenu                                       │
│  ( ) Coller du texte      (•) Importer un PDF            │
│                                                           │
│  ┌─────────────────────────────────────────────────┐     │
│  │  📄 Glissez un PDF ici ou [Parcourir...]         │     │
│  │  chapitre-photosynthese.pdf (2,3 Mo)        [×] │     │
│  └─────────────────────────────────────────────────┘     │
│                                                           │
│  Matière                                                  │
│  [SVT (pré-remplie depuis le système)          ▼]        │
│                                                           │
│  Nombre de cartes souhaité                                │
│  [——●—————————]  8                                       │
│                                                           │
│  Type de cartes                                           │
│  (•) Question ouverte  ( ) QCM  ( ) Les deux (mixte)      │
│                                                           │
│  ─────────────────────────────────────────────────       │
│  Quota restant ce mois-ci : 42 / 50 générations           │
│  (affichage uniquement — mécanisme réel hors périmètre)  │
│                                                           │
│              [Annuler]        [Générer les cartes]       │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

| Champ | Contrôle | Notes |
|---|---|---|
| Source | radio `texte` / `pdf` | Bascule vers un `<textarea>` (placeholder « Collez votre texte ici… », compteur de caractères) si `texte` sélectionné. |
| Fichier PDF | drag & drop + `<input type="file" accept="application/pdf">` | Un seul fichier. Le découpage réel (Chunking PDF) est hors périmètre — la maquette ne montre que l'upload. |
| Matière | `SubjectSelectorComponent` (existant, réutilisé) | Pré-rempli depuis `LeitnerSystem.subjectId` si connu, modifiable. |
| Nombre de cartes | slider 1–20 | Borne haute illustrative — la vraie limite dépend de l'arbitrage Quotas (hors périmètre). |
| Type de cartes | radio `open` / `mcq` / `mixed` | Reprend exactement les valeurs de `cardType` du contrat de prompt (`generation_ia_prompt_cartes.md` §2). |
| Bouton principal | désactivé tant que la source est vide | Libellé change en `Génération…` avec spinner pendant l'appel (transition directe vers Vue 2, pas un état intermédiaire dans cette même modal). |

---

## 5. Vue 2 — État de génération en cours

```
┌─────────────────────────────────────────────────────────┐
│  Génération en cours…                                [X]│
├─────────────────────────────────────────────────────────┤
│                                                           │
│              ⏳  Analyse de votre contenu...             │
│                                                           │
│   ✓ Contenu reçu                                         │
│   ⏳ Génération des cartes...                            │
│   ○ Préparation de la validation                         │
│                                                           │
│   [Annuler]                                              │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

- 3 étapes affichées à titre indicatif pour rassurer l'utilisateur sur un appel potentiellement long (LLM) —
  ne présument d'aucune API de suivi de progression réelle (streaming, polling…), hors périmètre.
- `[Annuler]` interrompt l'attente côté front (abandonne l'affichage, n'implique pas nécessairement d'annuler
  l'appel réseau sous-jacent — détail d'implémentation hors périmètre) et referme vers `FlashcardsCardsPage.vue`.
- En cas d'échec (timeout, erreur serveur, quota dépassé), remplace le contenu par un état d'erreur :

```
┌─────────────────────────────────────────────────────────┐
│  Génération en cours…                                [X]│
├─────────────────────────────────────────────────────────┤
│                                                           │
│              ⚠️  La génération a échoué                  │
│                                                           │
│   Quota de générations atteint pour ce mois-ci.          │
│   (message contextuel selon la cause — voir §11)         │
│                                                           │
│              [Fermer]          [Réessayer]               │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

---

## 6. Vue 3 — Écran de validation

Écran plein (pas une modal, contrairement aux vues précédentes) — remplace temporairement le contenu de
`FlashcardsCardsPage.vue`, avec un bouton retour explicite plutôt qu'une navigation de route dédiée.

```
┌───────────────────────────────────────────────────────────────────────┐
│  ← Annuler la génération        Cartes proposées (8)      [Tout       │
│                                                          accepter (8)]│
├───────────────────────────────────────────────────────────────────────┤
│  ✅ 5 acceptées   ✎ 1 modifiée   🗑 2 rejetées                        │
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │ ☑  Qu'est-ce que la photosynthèse ?                    [✎][🗑]│   │
│  │    → Le processus par lequel les plantes, algues et...        │   │
│  │    ▸ Source : « La photosynthèse est le processus par... »    │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │ ☑  Dans quel organite se déroule la photosynthèse ?    [✎][🗑]│   │
│  │    → Dans les chloroplastes, grâce à la chlorophylle.          │   │
│  │    ▸ Source : « Elle se déroule principalement dans... »       │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │ ☐  Quelle est la formule chimique du glucose ?         [✎][🗑]│   │
│  │    (rejetée — grisée, cochable à nouveau)                     │   │
│  │    ▸ Source : « ... »                                          │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ⚠️ Seulement 8 cartes ont pu être générées sur les 10 demandées     │
│     (contenu source insuffisant pour plus de cartes atomiques)      │
│                                                                       │
│                          [Annuler]   [Ajouter les 5 cartes ✓]       │
└───────────────────────────────────────────────────────────────────────┘
```

| Élément | Comportement |
|---|---|
| Case à cocher par carte | Coché par défaut à l'arrivée sur l'écran (toutes les cartes proposées sont acceptées par défaut, l'utilisateur désactive celles qu'il ne veut pas — moins de friction que tout décocher). |
| `[✎]` Modifier | Ouvre la Vue 4 (édition inline, §7). Une carte modifiée reste cochée et affiche un badge `✎ modifiée`. |
| `[🗑]` Rejeter | Décoche et grise la carte (pas de suppression visuelle définitive — l'utilisateur peut recocher). Équivalent à décocher, présenté séparément pour la clarté du geste. |
| `▸ Source` | Accordéon replié par défaut, affiche `sourceExcerpt` (contrat `generation_ia_prompt_cartes.md` §4) au clic — traçabilité anti-hallucination pour la relecture (voir `generation_ia_prompt_cartes.md` §5.1). |
| Bandeau `warning` | Affiché uniquement si le champ `warning` du contrat de sortie du prompt (§4 de `generation_ia_prompt_cartes.md`) est non nul — texte du LLM affiché tel quel ou reformulé, à trancher à l'implémentation. |
| `[Tout accepter]` | Coche toutes les cartes (utile après avoir tout décoché par erreur ou en partant d'un état par défaut différent). |
| Bouton principal | Libellé dynamique `Ajouter les N cartes` (N = nombre coché), désactivé si N = 0. |
| `[Annuler]` / `← Annuler la génération` | Referme l'écran sans rien persister — retour à `FlashcardsCardsPage.vue` inchangée. |

### 6.1 Carte de type `mcq`

Variante d'affichage pour une carte proposée de type QCM (options visibles sans les développer par défaut,
cohérent avec la densité de l'écran) :

```
│ ☑  Quelle est la capitale de la France ?                [✎][🗑]│
│    QCM · 3 options · bonne réponse : Paris                     │
│    ▸ Source : « ... »                                          │
```

---

## 7. Vue 4 — Édition d'une carte proposée

Réutilise la modal existante d'ajout/édition de carte (`FlashcardsCardsPage.vue`, formulaire déjà en place),
pré-remplie avec les valeurs proposées par l'IA plutôt qu'un formulaire vide :

```
┌───────────────────────────────────────────────────┐
│  Modifier la carte proposée                    [X]│
├───────────────────────────────────────────────────┤
│                                                   │
│  Énoncé                                           │
│  [Qu'est-ce que la photosynthèse ?_____________] │
│                                                   │
│  Réponse                                          │
│  [Le processus par lequel les plantes...______]  │
│                                                   │
│  Réponses alternatives acceptées (optionnel)      │
│  [+ Ajouter une variante]                        │
│                                                   │
│              [Annuler]     [Enregistrer]          │
│                                                   │
└───────────────────────────────────────────────────┘
```

Aucun nouveau composant : c'est la modal `handleCreate`/`handleUpdate` existante de `FlashcardsCardsPage.vue`
(§298-589 du fichier), le state initial change de source (proposition IA au lieu de champs vides), rien
d'autre.

---

## 8. Composants à créer et modifier

### 8.1 Composants à créer

| Composant | Fichier | Rôle |
|---|---|---|
| Modal de configuration | `components/leitner/AiGenerateCardsModal.vue` | Vue 1 — formulaire source/matière/nombre/type |
| État de génération | `components/leitner/AiGenerationProgressModal.vue` | Vue 2 — attente + erreur |
| Écran de validation | `pages/FlashcardsAiValidationPage.vue` (ou vue conditionnelle inline dans `FlashcardsCardsPage.vue`, à trancher à l'implémentation) | Vue 3 — liste des cartes proposées |

### 8.2 Composants réutilisés tels quels

| Composant | Réutilisation |
|---|---|
| `ModalComponent.vue` | Conteneur des Vues 1, 2 et 4 (tailles `lg`/`sm` selon le contenu) |
| `SubjectSelectorComponent.vue` | Sélecteur de matière (Vue 1) |
| Formulaire carte existant (`FlashcardsCardsPage.vue`) | Édition d'une carte proposée (Vue 4) |
| `FormulaTextComponent.vue` | Rendu de l'énoncé/réponse dans la liste de validation (cohérence avec l'affichage des cartes déjà créées) |

---

## 9. Store Pinia (squelette — contrat réseau hors périmètre)

```javascript
// stores/aiCardGeneration.js — nom provisoire, hypothèse de nommage
state: {
  status: 'idle',        // 'idle' | 'generating' | 'error' | 'ready'
  proposedCards: [],     // contrat cards[] de generation_ia_prompt_cartes.md §4
  warning: null,
  errorMessage: null,
}

actions: {
  generate(config)   // { source, subjectId, cardCount, cardType }
                      // → POST vers un endpoint d'orchestration non nommé ici (hors périmètre,
                      //   dépend du découpage Prompt/Benchmark LLM/Parsing/Chunking PDF)
  reset()             // referme l'écran de validation sans persister
}
```

La persistance des cartes acceptées (bouton `[Ajouter les N cartes]`, Vue 3) réutilise le contrat existant
décrit dans `generation_ia_prompt_cartes.md` §6 (3 appels API par carte, tels quels) — cette maquette ne
définit pas de nouvel endpoint de création en masse.

---

## 10. Comportements et interactions

```
FlashcardsCardsPage.vue
  │
  ├─ Clic [✨ Générer par IA]
  │        └─ Vue 1 (modal configuration) s'ouvre
  │           └─ Saisie source + matière + nombre + type
  │              └─ Clic [Générer les cartes]
  │                   └─ Vue 1 se ferme, Vue 2 (génération) s'ouvre
  │                      └─ Succès → Vue 2 se ferme, Vue 3 (validation) s'ouvre,
  │                                   toutes les cartes cochées par défaut
  │                      └─ Échec  → Vue 2 affiche l'état d'erreur
  │                                   └─ [Réessayer] → retour Vue 1 (champs conservés)
  │                                   └─ [Fermer] → retour FlashcardsCardsPage.vue
  │
  ├─ Sur Vue 3 (validation)
  │        ├─ Décoche une carte → exclue du compteur, du bouton principal
  │        ├─ Clic [✎] → Vue 4 (édition) → [Enregistrer] → carte mise à jour, badge « modifiée »
  │        ├─ Clic [🗑] → carte décochée + grisée
  │        ├─ Clic [Tout accepter] → toutes les cartes cochées
  │        └─ Clic [Ajouter les N cartes]
  │                 └─ Pour chaque carte cochée, séquentiellement (contrat generation_ia_prompt_cartes.md §6) :
  │                    POST /questions → POST /responses (si open) → POST /leitnercards
  │                 └─ Toutes réussies → toast succès, retour FlashcardsCardsPage.vue, liste rechargée
  │                 └─ Échec partiel → cartes en échec restent affichées avec un badge d'erreur,
  │                    cartes réussies retirées de la liste (comportement à confirmer à l'implémentation)
  │
  └─ Clic [Annuler]/[← Annuler la génération] à toute étape
           └─ Retour FlashcardsCardsPage.vue, aucune écriture en base
```

---

## 11. Points d'attention (dette et questions ouvertes)

- **Aucun endpoint d'orchestration n'est nommé/décidé** — `generate(config)` du store (§9) est une intention
  d'API front, pas une décision d'architecture backend ; dépend du découpage réel entre Chunking PDF,
  Benchmark LLM et Parsing (tous hors périmètre de ce document).
- **Comportement en cas d'échec partiel de persistance** (Vue 3, §10) — non tranché : garder les cartes
  échouées affichées avec retry individuel, ou tout annuler et redemander à l'utilisateur de relancer ? Point
  à trancher au moment de l'implémentation, pas une question de maquette UI.
- **Progression réelle de la Vue 2** — les 3 étapes affichées (§5) sont illustratives ; un appel LLM
  synchrone unique ne permet pas de vraie progression sans streaming/polling, hors périmètre de ce document.
- **Limite chiffrée du slider « nombre de cartes »** (Vue 1, §4.2) — 1 à 20 est une valeur illustrative,
  dépend de l'arbitrage Quotas (hors périmètre).
- **Écran de validation en page dédiée vs. vue conditionnelle inline** (§8.1) — non tranché, question
  d'architecture front à trancher à l'implémentation, sans impact sur les maquettes elles-mêmes.
- **`sourceExcerpt` (Vue 3, §6)** — affiché dans cette maquette comme un accordéon replié par défaut ; son
  existence dans le contrat de sortie du prompt est actée par `generation_ia_prompt_cartes.md` §4, sa mise en
  forme exacte ici reste indicative.
