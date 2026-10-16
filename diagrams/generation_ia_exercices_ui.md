# Maquettes UI — Génération d'exercices par IA

> Document de référence pour **C-02.02** (feature list `C-02`, source planning, V2, tâche « Analyse »,
> extension US-05A, suite directe de C-02.01).
> Périmètre strict de ce document : **les maquettes UI du point d'entrée et de la configuration de la
> génération** — bouton, modal de configuration (source/matière/nombre/type), état de génération en cours et
> d'erreur. **L'Interface de révision (écran de validation des questions proposées) est un élément IN distinct
> du feature list `C-02` et n'est PAS maquettée ici** — contrairement à `C-01.02` (feature voisine), où le
> feature list ne nommait pas d'élément « Écran de validation » séparé et où la maquette avait donc couvert tout
> le parcours en un seul document. Ici, le feature list `C-02` liste explicitement « Interface de révision »
> comme IN à côté de « Maquettes UI génération exercices » (ce ticket) : les deux sont des livrables distincts.
> Ce document traite l'Interface de révision, le Service génération, la Validation format et le Mode dégradé
> uniquement comme des interfaces amont/aval (voir §8), conformément au point d'attention du ticket.
> S'appuie sur `diagrams/generation_ia_exercices_types.md` (C-02.01) pour le contrat d'entrée/sortie du prompt
> (`sourceText`/`subjectContext`/`questionCount`/`questionType`/`outputLanguage` → `questions[]` avec
> `statement`/`type`/`content`/`sourceExcerpt`, plus `warning`), repris tel quel dans la modal de configuration.
> Aucune implémentation n'existe à ce jour pour `C-02` (0 ligne de code) — document d'analyse pur, sur le modèle
> de `diagrams/generation_ia_ui.md` (C-01.02).
> Référence visuelle et point d'entrée réel : `pages/ExercisesPage.vue` (page en production, identité bleu
> `#1E3BA1`, modales `bg-white` explicite via les classes `modal-overlay`/`modal-panel`, règle `CONVENTIONS.md`).

---

## 1. Audit préalable — le point d'entrée réel n'est pas celui qu'on pourrait attendre

Avant de maquetter, audit du code existant de création d'exercice (règle d'`AGENT.md` — auditer avant de
concevoir) : deux candidats trouvés pour « la page de création d'exercice ».

| Fichier | Route | État réel |
|---|---|---|
| `pages/CreateTestPage.vue` | `/create-test` (`router/routes.js`) | **Code mort / orphelin** — aucun lien dans l'application ne pointe vers cette route (recherché dans tout `src/`, aucun `router-link`/`router.push` vers `create-test`). Utilise en plus un contrat obsolète (`type: 'text'`, un seul type de question, `POST /responses` — la table `Response` est pourtant réservée aux cartes Leitner depuis la décision du 2026-06-19, `DECISIONS.md`). **Écarté de ce document.** |
| `pages/ExercisesPage.vue` | `/exercises` (liste, lien depuis la navigation) | **Le vrai point d'entrée** — modal « Nouvel exercice »/« Modifier l'exercice » (§91-262 du fichier) avec les 4 types déjà branchés (`open`/`mcq`/`fill_blank`/`reorder`, sélecteur de type + sous-formulaire dédié par type), `POST /tests` puis `POST /questions` par question, exactement le contrat documenté en `exercices_types_correction.md` §4 et repris en C-02.01 §7. **Retenu comme base de ce document.** |

Ce constat change la forme de la maquette par rapport à `generation_ia_ui.md` (C-01.02) : `FlashcardsCardsPage.vue`
est une page dédiée aux cartes d'**un système déjà créé** (`idSystem` connu), alors que la modal
« Nouvel exercice » d'`ExercisesPage.vue` crée le `Test` et ses questions **en une seule soumission finale** —
rien n'est persisté avant le clic sur « Créer l'exercice » (`form.questions` n'est qu'un état local tant que
`submitCreate()` n'a pas été appelé). Cette différence structure tout le flux ci-dessous (voir §4).

---

## 2. Contexte et objectif

Aujourd'hui, une question d'exercice se crée une par une dans la modal « Nouvel exercice »/« Modifier
l'exercice » d'`ExercisesPage.vue` : un sélecteur de type puis un sous-formulaire dédié (`open`/`mcq`/
`fill_blank`/`reorder`), ajoutée à la liste récapitulative locale `form.questions`. Ce document maquette
l'ajout d'un second chemin d'alimentation de cette même liste : génération assistée par IA à partir d'un
contenu fourni par l'utilisateur, produisant des questions candidates — jamais ajoutées automatiquement à
`form.questions` sans un geste explicite de l'utilisateur (rappel du périmètre OUT : « Correction officielle
sans relecture »/« Génération illimitée »), et de toute façon jamais persistées avant la soumission finale du
formulaire parent (§1).

---

## 3. Périmètre

| Élément | Dans le périmètre C-02.02 (maquette) |
|---|---|
| Point d'entrée (bouton dans la modal « Nouvel exercice »/« Modifier l'exercice ») | ✅ |
| Modal de configuration (source, matière, nombre/type de questions) | ✅ maquette — pas le contrat d'appel réseau |
| État de génération en cours et d'erreur | ✅ maquette |
| Interface de révision (liste des questions proposées, accept/edit/reject) | ❌ **hors périmètre — élément IN distinct du feature list `C-02`**, traité uniquement comme interface aval (§8) |
| Chunking PDF / extraction | ❌ hors périmètre — entrée déjà disponible |
| Service génération (LLM, parsing) | ❌ hors périmètre — élément IN distinct (§8) |
| Validation format | ❌ hors périmètre — élément IN distinct (§8) |
| Mode dégradé | ❌ hors périmètre — élément IN distinct (§8) |
| Endpoint(s) réels d'orchestration | ❌ hors périmètre — noms ci-dessous sont des hypothèses de nommage |
| Correction humaine automatique / génération sans validation | ❌ hors version (OUT du ticket) |

---

## 4. Flux général

```
ExercisesPage.vue — modal « Nouvel exercice »                              Formulaire parent
  │                                                                          (form.questions,
  │  [+ Ajouter une question]  [✨ Générer par IA]                          état local, rien
  │                                    │                                    en base avant
  │                                    ▼                                    submitCreate())
  │                          ┌──────────────────────┐   ┌──────────────────┐
  │                          │ Vue 1                │   │ Vue 2            │
  │                          │ Modal configuration  │ → │ État génération  │ → Interface de révision
  │                          │ (source, matière,    │   │ en cours         │   (hors périmètre —
  │                          │ nb/type de questions)│   │                  │   §8 : reçoit ici
  │                          └──────────────────────┘   └──────────────────┘   {questions[], warning})
  │                                    │                        │
  │                                    │ Annuler                │ Échec/annulation
  │                                    ▼                        ▼
  │                          Retour modal exercice      Retour Vue 1 (avec erreur,
  │                          (rien n'a changé)           champs conservés)
  ▼
Questions acceptées par l'Interface de révision (hors périmètre) → ajoutées à `form.questions`
(même représentation interne que l'ajout manuel, voir §7) → persistées uniquement au clic sur
« Créer l'exercice » (`submitCreate()`, déjà existant, inchangé)
```

Contrairement à `generation_ia_ui.md` (C-01.02, Vue 3 = écran plein remplaçant la page), le retour de
l'Interface de révision (hors périmètre) atterrit ici dans la modal « Nouvel exercice » elle-même : aucune
navigation de page, aucun remplacement d'écran — cohérence avec le fait que rien n'est persisté avant la
soumission finale (§1).

---

## 5. Vue 1 — Point d'entrée et modal de configuration

### 5.1 Point d'entrée — modal « Nouvel exercice »/« Modifier l'exercice »

Bouton ajouté à côté de « + Ajouter une question » (`ExercisesPage.vue` §116-122) :

```
┌───────────────────────────────────────────────────────────────────────┐
│  Nouvel exercice                                                  [X] │
├───────────────────────────────────────────────────────────────────────┤
│  Titre de l'exercice     [___________________________________]        │
│  Sujet                   [SVT ▼]                                       │
│  Tags (optionnel)        [...]                                         │
│                                                                         │
│  Questions                              [✨ Générer par IA] [+ Ajouter │
│                                                              une       │
│                                                              question] │
│  ┌─────────────────────────────────────────────────────────────┐      │
│  │ Question 1                                        Supprimer  │      │
│  │ Type  [Question ouverte ▼]                                   │      │
│  │ ...                                                           │      │
```

- Style aligné sur le bouton « ✨ Générer par IA » déjà établi côté cartes Leitner (`FlashcardsCardsPage.vue`,
  C-01.08) : `bg-primary hover:bg-primary/90 text-white font-bold py-2 px-4 rounded text-sm` — délibérément
  différent du style vert de « + Ajouter une question » (`bg-green-600`), pour distinguer visuellement une
  action IA d'un ajout manuel, cohérence cross-feature avec C-01.
- Disponible aussi bien en création (`isEditMode === false`) qu'en édition d'un exercice existant
  (`isEditMode === true`) — la modal « Nouvel exercice »/« Modifier l'exercice » est le même formulaire dans
  les deux cas (`ExercisesPage.vue` §92-260), la génération IA alimente `form.questions` de la même façon.
- Ouvre la modal de configuration (§5.2) **au-dessus** de la modal « Nouvel exercice » (empilement de modales,
  déjà le pattern utilisé pour la modal d'assignation groupes de la même page) plutôt qu'en la remplaçant —
  la modal parente reste montée (son état `form` n'est pas perdu).

### 5.2 Modal de configuration

```
┌─────────────────────────────────────────────────────────┐
│  Générer des questions par IA                        [X]│
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Source du contenu                                       │
│  (•) Coller du texte      ( ) Importer un PDF            │
│                                                           │
│  ┌─────────────────────────────────────────────────┐     │
│  │ Collez votre texte ici…                          │     │
│  │                                                   │     │
│  └─────────────────────────────────────────────────┘     │
│  1 240 caractères                                         │
│                                                           │
│  Matière (optionnel — contexte pour l'IA)                │
│  [SVT (pré-rempli depuis le sujet sélectionné)   ]        │
│                                                           │
│  Nombre de questions souhaité : 6                         │
│  [——●—————————]                                          │
│                                                           │
│  Type de question                                         │
│  (•) Mixte  ( ) Ouverte  ( ) QCM  ( ) Texte à trous       │
│  ( ) Remise en ordre                                       │
│                                                           │
│  ─────────────────────────────────────────────────       │
│  Quota restant aujourd'hui : 42 / 50 générations           │
│  (affichage uniquement — mécanisme réel hors périmètre)  │
│                                                           │
│              [Annuler]      [Générer les questions]      │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

| Champ | Contrôle | Notes |
|---|---|---|
| Source | radio `texte`/`pdf` | Même composant visuel que `AiGenerateCardsModalComponent.vue` (C-01.08) — drag & drop + `<input type="file" accept="application/pdf">` pour le PDF. **Aucune taille codée en dur dans cette maquette** (voir §11 — le composant Leitner existant code encore `10 Mo` en dur alors que le backend accepte désormais `MAX_UPLOAD_SIZE_MB`, 20 Mo par défaut, depuis le ticket du 2026-09-06 ; ne pas reproduire cette valeur figée dans le nouveau composant). |
| Matière | `<input type="text" maxlength="100">`, **pas** `SubjectSelectorComponent` | Pré-rempli avec le nom du sujet déjà sélectionné dans le formulaire parent (`subjectStore.subjects.find(s => s.subjectId === form.subjectId)?.name`) si `form.subjectId` est renseigné, sinon vide. Modifiable librement. Même choix que la décision C-01.08 du 2026-09-02 (`DECISIONS.md`) : c'est un simple indice textuel pour l'IA (`subjectContext`), pas une FK — cohérent bien que `form.subjectId` du parent soit ici une vraie FK (`SubjectSelectorComponent`), contrairement à `LeitnerSystem.subject`. |
| Nombre de questions | slider 1–20 | Même borne illustrative que C-01.08 (`MAX_CARD_COUNT`), pour cohérence visuelle cross-feature — pas une limite technique actée ici (dépend du Service génération/Mode dégradé, hors périmètre). |
| Type de question | radio `mixed`/`open`/`mcq`/`fill_blank`/`reorder`, **5 options** (contre 3 côté cartes Leitner) | Reprend exactement les valeurs `questionType` de `generation_ia_exercices_types.md` §2. Défaut **`mixed`** (pas `open`, à la différence du défaut cartes Leitner) — cohérent avec la décision de C-02.01 §3.2 (un exercice généré composé uniquement de questions `open` serait moins représentatif de ce qu'un enseignant construit à la main). `role="radiogroup"` + `aria-labelledby`, même pattern d'accessibilité que `AiGenerateCardsModalComponent.vue` et que le sélecteur `mcq` d'`ExercisesPage.vue` (RGAA 11.6/11.7). |
| Bouton principal | désactivé tant que la source est vide | Libellé change en `Génération…` pendant l'appel, transition directe vers Vue 2. |

---

## 6. Vue 2 — État de génération en cours

**Réutilisation intégrale, sans aucune modification, de `components/AiGenerationProgressModalComponent.vue`**
(C-01.08) : le composant ne connaît déjà ni les cartes ni Leitner (props `visible`/`status`/`errorMessage`,
événements `cancel`/`close`/`retry`, aucune référence à `idSystem` ou à un type de contenu précis) — c'est un
composant générique d'attente/erreur, directement réutilisable pour la génération d'exercices sans en modifier
une ligne :

```
┌─────────────────────────────────────────────────────────┐
│  Génération en cours…                                [X]│
├─────────────────────────────────────────────────────────┤
│              ⏳  Analyse de votre contenu...             │
│   ✓ Contenu reçu                                         │
│   ⏳ Génération des questions...                         │
│   ○ Préparation de la validation                         │
│   [Annuler]                                              │
└───────────────────────────────────────────────────────────┘
```

Seul le texte de l'étape 2 (« Génération des questions... » au lieu de « Génération des cartes... ») diffère à
l'affichage — un simple prop/slot texte suffirait si on voulait unifier totalement les deux usages, non
tranché ici (le composant actuel a ce texte en dur dans son template, voir §11).

En cas d'échec (timeout, erreur serveur, quota dépassé), même état d'erreur que C-01.08, réutilisé tel quel.

**Sur succès** : le composant referme le flux de configuration et transmet la réponse du Service génération
(`{ questions: [...], warning }`, contrat `generation_ia_exercices_types.md` §5) à l'Interface de révision —
la forme exacte de cette transmission (store Pinia partagé, événement émis vers `ExercisesPage.vue`, écran
dédié…) dépend de la conception de l'Interface de révision elle-même, **non faite ici** (hors périmètre, §8).

---

## 7. Ce que l'Interface de révision devra rendre à `form.questions` (interface, pas une conception)

Sans maquetter l'Interface de révision, ce document fixe le point de raccordement qu'elle devra respecter pour
que les questions générées rejoignent la modal « Nouvel exercice » : chaque question acceptée doit être
convertie dans la **même représentation interne** que `defaultQuestion()`/`contentToFormState()`
(`ExercisesPage.vue` §337-417, déjà existant, inchangé) — `{ statement, type, openAnswer, openAltAnswers,
mcqOptions, mcqCorrectIdx, fillTemplate, fillBlanks, reorderFragments }` — puis ajoutée à `form.questions` par
un simple `push`, exactement comme `addQuestion()` le fait pour une question manuelle. `contentToFormState`
lit déjà `content.accepted_answers` (cas `open`) : le contrat de sortie C-02.01 §5 (corrigé le 2026-09-06,
voir `DECISIONS.md`) s'aligne donc sans transformation supplémentaire à écrire pour ce champ.

Aucune question générée n'est envoyée à `POST /questions` par ce mécanisme — la persistance reste entièrement
gérée par `submitCreate()`/`submitEdit()` (déjà existants, inchangés), au clic final sur « Créer l'exercice »/
« Enregistrer les modifications ». Une question générée puis acceptée, si l'utilisateur ferme la modal sans
soumettre, est perdue — **exactement le même comportement qu'une question ajoutée manuellement aujourd'hui**,
pas une régression introduite par la génération IA.

---

## 8. Interfaces avec les éléments voisins du feature list `C-02` (hors périmètre de ce document)

| Élément IN du feature list | Interface avec ce document | Ce que ce document NE fixe PAS |
|---|---|---|
| Service génération | Exécute le prompt C-02.01 sur `sourceText`/paramètres saisis en Vue 1 (§5.2), renvoie `{ questions[], warning }` à la Vue 2 (§6) | Fournisseur/modèle, endpoint(s) réel(s), et surtout : **persiste-t-il un état côté serveur** (comme `AiGenerationBatch`/`AiGeneratedCard` en C-01) ou renvoie-t-il la réponse directement sans rien écrire en base ? Le flux maquetté ici (rien n'est persisté avant `submitCreate()`, §1/§7) rend une persistance serveur intermédiaire **non nécessaire** pour que ce parcours fonctionne — à la différence de C-01, où `FlashcardsCardsPage.vue` ajoute les cartes une par une à un système déjà existant. Une architecture plus simple (réponse HTTP synchrone, sans tables de brouillon) est donc plausible pour `C-02`, mais reste un choix du Service génération, pas une décision de cette maquette. Conséquence si ce choix est fait : pas de fonctionnalité « reprendre un brouillon » équivalente à celle de C-01 — acceptable car symétrique à la limite déjà présente pour l'ajout manuel de questions (§7). |
| Validation format | Vérifie la conformité de `{ questions[], warning }` avant de l'exposer à l'Interface de révision | Implémentation du validateur |
| Mode dégradé | Comportement si le Service génération est indisponible | Ce document ne fixe que l'état d'erreur déjà maquetté en Vue 2 (§6, réutilisé de C-01.08) comme point de sortie reconnaissable — le mode dégradé lui-même (proposer la création manuelle en substitution, déjà possible puisque c'est la même modal, §5.1) n'est pas conçu ici |
| Interface de révision | Reçoit `{ questions[], warning }` de la Vue 2 (§6), doit rendre des questions au format `form.questions` (§7) | Maquette, ergonomie, comportement accept/edit/reject. **Piste non maquettée mais notée pour référence future** : contrairement à `FlashcardsCardsPage.vue` (C-01, liste récap en lecture seule + modal d'édition séparée), la modal « Nouvel exercice » d'`ExercisesPage.vue` rend déjà un sous-formulaire **éditable inline** par type de question (§133-225 du fichier) — l'Interface de révision pourrait réutiliser ces mêmes blocs (extraits en composant partagé) plutôt qu'un écran de prévisualisation + modal d'édition séparée comme en C-01.02. Simple observation pour qui scopera ce ticket, pas une conception actée ici. |

---

## 9. Composants à créer et modifier

### 9.1 Composants à créer

| Composant | Fichier | Rôle |
|---|---|---|
| Modal de configuration | `components/AiGenerateExercisesModalComponent.vue` | Vue 1 — formulaire source/matière/nombre/type, calqué sur `AiGenerateCardsModalComponent.vue` avec 5 valeurs de type au lieu de 3 et un défaut `mixed` |

### 9.2 Composants réutilisés sans modification

| Composant | Réutilisation |
|---|---|
| `components/AiGenerationProgressModalComponent.vue` | Vue 2 intégrale — déjà générique, 0 changement nécessaire (§6) |
| `components/ModalComponent.vue` | Conteneur de la Vue 1 (`size="lg"`), empilée au-dessus de la modal « Nouvel exercice » (§5.1) |

### 9.3 Composants existants modifiés (bouton d'entrée uniquement)

| Composant | Modification |
|---|---|
| `pages/ExercisesPage.vue` | Ajout du bouton « ✨ Générer par IA » (§5.1) et du montage conditionnel de la Vue 1/Vue 2 — **pas** de modification d'`ItemListLayout.vue` (composant partagé avec `FlashcardsPage.vue`, §11) puisque le bouton vit dans la modal « Nouvel exercice », pas dans l'en-tête de liste. |

---

## 10. Store Pinia (squelette — contrat réseau hors périmètre)

```javascript
// stores/aiExerciseGeneration.js — nom provisoire, hypothèse de nommage, calqué sur stores/aiCardGeneration.js
state: {
  status: 'idle',          // 'idle' | 'generating' | 'error' | 'ready'
  proposedQuestions: [],   // contrat questions[] de generation_ia_exercices_types.md §5
  warning: null,
  errorMessage: null,
  quota: null,
}

actions: {
  generate(config)   // { sourceText | pdfFile, subjectContext, questionCount, questionType }
                      // → appel vers un endpoint d'orchestration non nommé ici (hors périmètre,
                      //   dépend du Service génération)
  fetchQuota()        // affichage uniquement, endpoint réel non tranché — éventuellement le même
                      // que C-01 (GET /ai-generation-batches/quota) si le quota reste un concept
                      // partagé cross-feature, à confirmer avec le Service génération
  reset()             // referme le flux de configuration sans rien avoir persisté
}
```

Pas d'action `promoteCard`/`promoteQuestion` équivalente à celle de `stores/aiCardGeneration.js` : la
persistance reste entièrement du ressort de `ExercisesPage.vue#submitCreate/submitEdit` (§7), le store de
génération ne fait que porter l'état du flux Vue 1/Vue 2, pas la promotion en base.

---

## 11. Points d'attention (dette et questions ouvertes)

- **Incohérence trouvée en marge de l'audit (§1), sans rapport direct avec `C-02`** : le composant Leitner
  `AiGenerateCardsModalComponent.vue` (C-01.08) code encore en dur `MAX_PDF_SIZE = 10 * 1024 * 1024` avec un
  commentaire « même plafond que `aiPdfUpload.middleware.js` » — ce plafond backend est devenu configurable via
  `MAX_UPLOAD_SIZE_MB` (défaut 20 Mo) depuis le ticket du 2026-09-06 (`helpers/uploadConfig.js`,
  `CHANGELOG_AGENT.md`), sans que le front ait été mis à jour en conséquence : le front Leitner refuse encore
  localement un PDF de 15 Mo que le backend accepterait désormais. **Non corrigé ici** (hors périmètre de
  C-02.02, concerne `C-01`) — signalé pour un futur ticket. Ce document a pris soin de ne **pas** reproduire
  cette valeur figée dans la nouvelle modal de configuration (§5.2).
- **Endpoint(s) d'orchestration non nommés** — comme en C-01.02, `generate(config)` du store (§10) est une
  intention d'API front, pas une décision d'architecture backend.
- **Architecture de persistance intermédiaire non tranchée** (§8, ligne Service génération) — avec ou sans
  tables de brouillon type `AiGenerationBatch`/`AiGeneratedCard`, choix qui conditionne l'existence ou non
  d'une fonctionnalité « reprendre un brouillon » pour les exercices.
- **Texte de l'étape 2 de la Vue 2** (§6) actuellement en dur dans `AiGenerationProgressModalComponent.vue`
  (« Génération des cartes... ») — resterait affiché tel quel si le composant est réutilisé sans modification ;
  un prop/slot texte permettrait de le personnaliser (« Génération des questions... »), non tranché ici (choix
  d'implémentation mineur, pas un point de maquette).
- **Limite chiffrée du slider « nombre de questions »** (§5.2) — 1 à 20 est une valeur illustrative reprise de
  C-01.08 pour cohérence visuelle, pas une limite technique actée.
- **Quota partagé ou dédié à `C-02`** (§10) — dépend d'un arbitrage côté Service génération/Mode dégradé, non
  fait ici ; le feature list `C-02` fourni ne nomme pas d'élément « Quotas » séparé, contrairement à `C-01`
  (voir aussi C-02.01 §12).
