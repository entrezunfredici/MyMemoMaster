# Documentation — Algorithme et règles métier : Révision active par systèmes de Leitner

> Document de référence pour M-01.13.  
> Décrit l'algorithme implémenté, les règles métier et les cas limites.  
> Source de vérité : `services/LeitnerCard.service.js`.

---

## 1. Vue d'ensemble

Le système de Leitner divise les cartes en **5 boîtes numérotées**. Chaque boîte a un intervalle de révision croissant. Plus une carte est bien connue, plus elle avance dans les boîtes et moins elle est vue souvent.

```
Boîte 1 → Boîte 2 → Boîte 3 → Boîte 4 → Boîte 5
(fréquent)                              (rare)

Bonne réponse  → boîte suivante (max 5)
Mauvaise réponse → retour boîte 1
```

---

## 2. Entités impliquées

| Entité | Rôle |
|--------|------|
| `LeitnerSystem` | Conteneur créé par un utilisateur. Regroupe 5 boîtes et N cartes. |
| `LeitnerBox` | Boîte numérotée (`level` 1–5) avec son intervalle de révision (`intervall` en secondes). |
| `LeitnerCard` | Carte individuelle liée à une `Question`. Porte l'état de révision. |
| `Question` | Énoncé de la question. |
| `Response` | Réponse(s) correcte(s) (`correction: true`) associées à la question. |

---

## 3. Structure d'une carte (`LeitnerCard`)

| Champ | Type | Rôle |
|-------|------|------|
| `idBox` | FK → LeitnerBox | Boîte courante de la carte |
| `idQuestion` | FK → Question | Question associée |
| `fifo` | boolean | `true` si la carte doit être révisée (`false` en boîte 5 après plafonnement) |
| `next_review_at` | datetime | Prochain instant de révision. `null` = jamais révisée |
| `last_review_at` | datetime | Dernier instant de révision |
| `review_count` | integer | Nombre total de révisions |
| `correct_count` | integer | Nombre de bonnes réponses |
| `incorrect_count` | integer | Nombre de mauvaises réponses |

---

## 4. Algorithme de progression

### 4.1 Déclenchement

Une carte est présentée en session si :

```
next_review_at IS NULL          → jamais révisée, à présenter immédiatement
next_review_at <= maintenant    → intervalle écoulé, à réviser
```

Requête correspondante (`getDueCards`) :

```sql
SELECT * FROM LeitnerCard
  JOIN LeitnerBox ON LeitnerCard.idBox = LeitnerBox.idBox
WHERE LeitnerBox.idSystem = :systemId
  AND (LeitnerCard.next_review_at IS NULL OR LeitnerCard.next_review_at <= NOW())
```

### 4.2 Traitement d'une réponse

```
1. Récupérer la carte et sa boîte courante (level, idSystem)
2. Récupérer les réponses correctes (Response.correction = true) de la question
3. Évaluer la réponse de l'étudiant par comparaison sémantique (IA)
4. Calculer le nouveau niveau :
     isCorrect = true  → newLevel = min(currentLevel + 1, 5)
     isCorrect = false → newLevel = 1
5. Trouver la boîte cible : LeitnerBox { level: newLevel, idSystem }
6. Calculer next_review_at = maintenant + boîte_cible.intervall (secondes)
7. Mettre à jour la carte
```

### 4.3 Mise à jour des champs après révision

| Champ | Bonne réponse | Mauvaise réponse |
|-------|--------------|-----------------|
| `idBox` | boîte niveau + 1 (max 5) | boîte niveau 1 |
| `fifo` | `newLevel < 5` | `true` (retour boîte 1) |
| `next_review_at` | `now + intervall(newBox)` | `now + intervall(box1)` |
| `last_review_at` | `now` | `now` |
| `review_count` | + 1 | + 1 |
| `correct_count` | + 1 | inchangé |
| `incorrect_count` | inchangé | + 1 |

---

## 5. Calcul de `next_review_at`

```javascript
const now = dayjs();
const nextReviewAt = now.add(nextBox.intervall, "second").toDate();
```

`LeitnerBox.intervall` est **toujours en secondes**. Voir [DECISIONS.md](../agents/DECISIONS.md) pour la justification du choix secondes vs jours.

### Valeurs de référence

| Environnement | Boîte 1 | Boîte 2 | Boîte 3 | Boîte 4 | Boîte 5 |
|--------------|---------|---------|---------|---------|---------|
| Dev (test) | 10 s | 30 s | 60 s | 120 s | 300 s |
| Prod (recommandé) | 1 jour (86 400 s) | 3 jours (259 200 s) | 7 jours (604 800 s) | 14 jours (1 209 600 s) | 30 jours (2 592 000 s) |

> Les valeurs prod sont des recommandations — elles sont configurables par système via l'interface d'administration des boîtes.

---

## 6. Correction sémantique (IA)

La correction n'est pas binaire (bonne/fausse réponse exacte) : elle est **sémantique**.

```
Entrées :
  correct_answers[] → contenu des Response avec correction: true
  student_answer    → texte libre saisi par l'étudiant

Traitement :
  semanticService.gradeSemantic(correctAnswers, studentAnswer)
  → modèle NLP (@xenova/transformers) : similarité cosinus entre les embeddings

Sortie :
  { is_correct, score, explanation, decision_zone }
  score        → float [0, 1]
  decision_zone → "high" | "grey_zone" | "low"
  is_correct   → true si score dans "high", false sinon
```

La réponse affichée à l'utilisateur en cas d'échec est la concaténation des bonnes réponses :
```javascript
correction: correctAnswers.join(" / ")
```

---

## 7. Règles de session

### 7.1 Démarrage

```
1. GET /leitnercards/due/:systemId
   → retourne les cartes dues (next_review_at <= now OU null)
   → si 0 cartes : écran "Aucune carte à réviser"
2. Afficher les cartes dans l'ordre retourné par l'API
3. Pour chaque carte : afficher question → attendre réponse → soumettre → afficher feedback
```

### 7.2 Déroulement

```
Carte courante → textarea réponse → POST /leitnercards/response
  ↳ Feedback : score %, message "Excellent" ou "À revoir", réponse attendue si échec
  ↳ Bouton "Continuer" → carte suivante
  ↳ Dernière carte → écran "Session terminée"
```

### 7.3 Abandon de session

L'utilisateur peut quitter la session à tout moment via le bouton "← Retour". Une confirmation est demandée. Les révisions déjà soumises sont **persistées** (la progression n'est pas annulée).

---

## 8. Historique de révision

L'historique est cumulatif sur toute la vie de la carte :

```javascript
review_count    // total révisions toutes sessions confondues
correct_count   // total bonnes réponses
incorrect_count // total mauvaises réponses
last_review_at  // horodatage de la dernière révision
```

Il n'existe pas de table de log par révision en MVP — les compteurs globaux sont la seule trace. Un historique détaillé (date × résultat) est hors scope MVP.

---

## 9. Droits d'accès sur les cartes

Toute opération d'écriture (ajout, modification, suppression) passe par `resolveUserRights(userId, idSystem)` :

```
Propriétaire du système (LeitnerSystem.idUser === userId)
  → canAdd: true, canEdit: true, canDelete: true

Utilisateur partagé (LeitnerSystemsUsers)
  → canAdd:    LeitnerSystemsUsers.writeRight
  → canEdit:   LeitnerSystemsUsers.writeRight
  → canDelete: LeitnerSystemsUsers.shareWithAllRights

Non membre
  → canAdd: false, canEdit: false, canDelete: false → 403
```

La lecture (`getDueCards`, `getCardById`) n'est pas restreinte par droits au niveau service — la route est protégée par `authMiddleware` uniquement.

---

## 10. Cas limites

| Situation | Comportement |
|-----------|-------------|
| Carte en boîte 5, bonne réponse | Reste en boîte 5. `fifo = false`. `next_review_at` recalculé sur l'intervalle de la boîte 5. |
| Aucune réponse correcte définie sur la question | `correctResponse` retourne `null` → HTTP 404 "Carte ou réponse introuvable." |
| Boîte de niveau 1 introuvable au moment de l'ajout | `addCard` lève une erreur → HTTP 500 (problème de configuration du système). |
| Session vide (toutes les cartes révisées récemment) | `getDueCards` retourne `[]`. L'UI affiche "Aucune carte à réviser". |
| Nouvelle carte (jamais révisée) | `next_review_at: null` → visible immédiatement dans toute session. |

---

## 11. Endpoints API de référence

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/leitnercards/due/:systemId` | Cartes à réviser pour une session |
| `POST` | `/leitnercards/response` | Soumettre une réponse et avancer dans l'algo |
| `POST` | `/leitnercards` | Ajouter une carte (body: `idQuestion`, `idSystem`) |
| `PUT` | `/leitnercards/:id` | Modifier la question d'une carte |
| `DELETE` | `/leitnercards/:id` | Supprimer une carte |
| `GET` | `/leitnercards/leitnerboxes/:boxId` | Cartes d'une boîte |
| `GET` | `/leitnercards/:id` | Détail d'une carte |

Documentation interactive complète : `GET /api-docs` (Swagger UI).
