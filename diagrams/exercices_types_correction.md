# Documentation — Types de questions et correction : Séries d'exercices

> Document de référence pour M-06.14.  
> Décrit les 4 types de questions supportés, le flux de création, le player front-end et l'algorithme de correction serveur.  
> Sources de vérité : `services/Test.service.js`, `services/Semantic.service.js`, `pages/ExerciseDetailPage.vue`.

---

## 1. Vue d'ensemble

Un **exercice** (modèle `Test`) contient N **questions** (modèle `Question`). Chaque question porte un champ `content` (JSON stocké en TEXT) dont la structure dépend du type. La correction est intégralement calculée côté serveur : le client envoie ses réponses, le serveur renvoie le score et le détail par question.

```
[Test] ─< testQuestions >─ [Question]
  │
  ├── [TestResult]   (score, total, completedAt)
  ├── [Tag]          (étiquettes)
  └── [ClassGroup]   (groupes assignés)
```

---

## 2. Types de questions

Quatre types sont supportés. La valeur est stockée dans la colonne `type` (VARCHAR 20).

| Type | Valeur | Interaction utilisateur | Correction |
|------|--------|------------------------|------------|
| Réponse ouverte | `open` | Champ texte libre | Similarité sémantique (IA) |
| QCM | `mcq` | Boutons radio, une seule option | Comparaison d'index |
| Texte à trous | `fill_blank` | Champs inline dans un template | Comparaison exacte (insensible casse/espaces) |
| Remise en ordre | `reorder` | Sélection de fragments par clic | Comparaison d'ordre exact |

---

## 3. Structure JSON du champ `content` par type

### 3.1 `open` — Réponse ouverte

```json
{
  "correct_answer": "Paris"
}
```

- `correct_answer` : réponse de référence utilisée par le service sémantique.

### 3.2 `mcq` — Choix multiple (une seule bonne réponse)

```json
{
  "options": [
    { "text": "Madrid", "correct": false },
    { "text": "Paris",  "correct": true  },
    { "text": "Berlin", "correct": false }
  ]
}
```

- `options` : tableau d'objets `{ text, correct }`. Exactement un objet doit avoir `correct: true`.
- La réponse étudiante est l'**index** (entier) de l'option choisie.

### 3.3 `fill_blank` — Texte à trous

```json
{
  "template": "La capitale de la France est {{0}} et celle d'Allemagne est {{1}}.",
  "blanks": ["Paris", "Berlin"]
}
```

- `template` : phrase avec des marqueurs `{{n}}` (0-indexés) pour chaque trou.
- `blanks` : tableau des réponses correctes dans l'ordre des marqueurs.
- La réponse étudiante est un **tableau de chaînes** (`string[]`).

### 3.4 `reorder` — Remise en ordre

```json
{
  "fragments": ["le", "chat", "dort", "tranquillement"]
}
```

- `fragments` : liste ordonnée des fragments dans le bon ordre.
- Le player mélange les fragments avant affichage (Fisher-Yates côté client).
- La réponse étudiante est un **tableau de chaînes** correspondant à l'ordre choisi.

---

## 4. API — Créateur d'exercice

### 4.1 Créer un exercice

```
POST /api/v1/tests
Authorization: Bearer <token>

{
  "name": "Contrôle géographie",
  "subjectId": 3
}
```

- Réponse 201 : objet `Test` créé (sans questions).
- L'exercice est **privé** par défaut (`userId` = utilisateur connecté).

### 4.2 Ajouter une question à un exercice

```
POST /api/v1/questions
Authorization: Bearer <token>

{
  "statement": "Quelle est la capitale de la France ?",
  "questionPosition": 1,
  "type": "open",
  "content": { "correct_answer": "Paris" },
  "idTest": 12
}
```

Champs communs à tous les types :

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `statement` | string | oui | Énoncé affiché à l'étudiant |
| `questionPosition` | integer ≥ 0 | oui | Ordre d'affichage dans le test |
| `type` | `open` \| `mcq` \| `fill_blank` \| `reorder` | oui | Type de la question |
| `content` | object \| null | non | Données de correction (voir §3) |
| `idTest` | integer | non | Rattache la question à un test |
| `idCard` | integer | non | Rattache la question à une carte Leitner |

### 4.3 Assigner un exercice à un groupe

```
POST /api/v1/tests/:id/groups
Authorization: Bearer <token>        // propriétaire uniquement

{ "groupIds": [2, 5] }              // [] = redevient privé
```

---

## 5. Player questionnaire (front-end)

Le composant [`ExerciseDetailPage.vue`](../my_memo_master_front/src/pages/ExerciseDetailPage.vue) gère les 4 types dans un formulaire unique.

### Initialisation des réponses (`initAnswers`)

| Type | Structure initiale de `userAnswers[i]` |
|------|----------------------------------------|
| `open` | `''` (chaîne vide) |
| `mcq` | `null` |
| `fill_blank` | `Array(n).fill('')` — n = nombre de trous |
| `reorder` | `[]` — tableau de fragments sélectionnés |

Pour `reorder`, les fragments sont mélangés via Fisher-Yates au chargement et stockés dans `shuffledFragments[i]`. `selectedFragments[i]` contient les **indices** dans le tableau mélangé.

### Soumission

Le client construit un tableau `answers` :

```js
answers = questions.map((q, i) => ({
  questionId: q.idQuestion,
  answer: userAnswers[i] ?? null
}))
```

Puis appelle `POST /api/v1/tests/:id/submit`.

---

## 6. Correction serveur (`Test.service.submitAnswers`)

### 6.1 Contrôle d'accès

Avant toute correction, le service vérifie que l'utilisateur a accès au test (même règle que `findOne`) :

1. Propriétaire du test (`test.userId === userId`) → accès autorisé.
2. Test legacy (`test.userId === null`) → accès autorisé.
3. Membre d'un groupe assigné (`ClassGroupUsers`) → accès autorisé.
4. Sinon → retourne `null` (contrôleur renvoie 404).

### 6.2 Algorithme par type

#### `open` — Correction sémantique

```
user = answer.trim()
si user est vide → { correct: false, points: 0 }
sinon → SemanticService.gradeSemantic(correct_answer, user)
          → { is_correct, score (0.0–1.0), explanation }
points = score (valeur décimale, non arrondie)
```

Seuils du service sémantique (modèle `all-mpnet-base-v2`) :

| Zone | Cosine similarity | Décision |
|------|-------------------|----------|
| Haute confiance | ≥ 0.78 | Correct |
| Zone grise | 0.55 – 0.78 | Correct si overlap mots-clés ≥ 0.30 |
| Basse confiance | ≤ 0.55 | Incorrect |

> La question `open` est la seule dont le score peut être décimal (entre 0.0 et 1.0 inclus). Les 3 autres types sont binaires (0 ou 1).

#### `mcq` — Comparaison d'index

```
idx = Number(answer)
correct = options[idx].correct === true
points = correct ? 1 : 0
```

#### `fill_blank` — Comparaison exacte insensible casse

```
correct = blanks.every((b, i) =>
  userBlanks[i].trim().toLowerCase() === b.trim().toLowerCase()
)
points = correct ? 1 : 0
```

#### `reorder` — Comparaison d'ordre strict

```
correct = fragments.length === userOrder.length
       && fragments.every((f, i) => f === userOrder[i])
points = correct ? 1 : 0
```

### 6.3 Score final et persistance

```
score = Σ(points) arrondi à 2 décimales
TestResult.create({ testId, userId, score, total: questions.length })
```

La réponse retournée au client :

```json
{
  "score": 2.8,
  "total": 4,
  "resultId": 42,
  "results": [
    {
      "questionId": 1,
      "correct": true,
      "correctAnswer": "Paris",
      "explanation": "Correct (similarity=0.95).",
      "semanticScore": 0.95,
      "points": 0.95
    },
    {
      "questionId": 2,
      "correct": true,
      "correctAnswer": "Berlin",
      "explanation": null,
      "semanticScore": null,
      "points": 1
    }
  ]
}
```

---

## 7. Scores et historique

### Modèle `TestResult`

| Colonne | Type | Description |
|---------|------|-------------|
| `resultId` | INTEGER PK | Identifiant auto-incrémenté |
| `testId` | INTEGER FK | Exercice concerné |
| `userId` | INTEGER FK | Étudiant qui a soumis |
| `score` | FLOAT | Score obtenu (décimal) |
| `total` | INTEGER | Nombre total de questions |
| `completedAt` | DATE | Date de soumission (défaut : NOW) |

### Règles de calcul du pourcentage (affichage)

```
pourcentage = Math.round((score / total) * 100)
seuil "succès" = score / total ≥ 0.5 (50 %)
```

### Routes historique

```
GET /api/v1/tests/:id/results    // résultats d'un test pour l'utilisateur connecté
```

L'historique est affiché dans `ExerciseDetailPage.vue` en tableau trié par date, avec badge vert/rouge selon le seuil 50 %.

---

## 8. Périmètre MVP — hors scope

| Fonctionnalité | Raison de l'exclusion |
|----------------|-----------------------|
| Correction IA avancée (feedback détaillé, hints) | Hors périmètre MVP M-06 |
| Banque publique d'exercices | Hors périmètre MVP M-06 |
| Notation officielle établissement (barème, pondération) | Hors périmètre MVP M-06 |
| Ownership sur `Question.update/delete` | Pas de `userId` sur le modèle `Question` — toute question est modifiable par tout utilisateur authentifié |

---

## 9. Entités impliquées

| Entité | Rôle |
|--------|------|
| `Test` | Conteneur de questions, lié à un sujet et optionnellement à des groupes |
| `Question` | Question individuelle. Porte `type` et `content` (JSON). |
| `TestResult` | Score persisté après chaque soumission |
| `ClassGroup` | Groupe classe. Un test peut être assigné à N groupes. |
| `ClassGroupUsers` | M2M User ↔ ClassGroup. Utilisé pour le contrôle d'accès. |
| `SemanticService` | Service singleton. Charge le modèle `all-mpnet-base-v2` en lazy-load. |
