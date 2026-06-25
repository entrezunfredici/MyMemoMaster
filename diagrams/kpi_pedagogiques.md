# Définition des indicateurs pédagogiques — KPI enseignant

> Document de référence pour la fonctionnalité **KPI pédagogiques** (S-01 / Sprint 8 — Analyse V1).
> Mis à jour après livraison S-01.01.

---

## 1. Contexte et objectif

L'enseignant doit pouvoir suivre la progression de ses groupes d'élèves et détecter rapidement les étudiants en difficulté. Ce document définit les indicateurs retenus, leurs règles de calcul, les seuils d'alerte et les droits d'accès.

---

## 2. Périmètre

| Fonctionnalité | Dans le périmètre S-01 |
|---|---|
| Agrégats de groupe (score moyen, étudiants actifs, décrochage) | ✅ |
| Tendances hebdomadaires (score groupe sur 4 semaines) | ✅ |
| Détail par étudiant (activité, scores, risque) | ✅ |
| Alertes décrochage (côté enseignant) | ✅ |
| Droits d'accès (enseignant/admin uniquement) | ✅ |
| Prédiction automatique complexe (ML) | ❌ hors version |
| Classement public des étudiants | ❌ hors version |
| Exports institutionnels | ❌ hors version |

---

## 3. Indicateurs définis

### 3.1 Agrégats de groupe

Retournés par `GET /api/v1/class-groups/:id/kpi` (existant, non modifié) :

| Indicateur | Définition | Type |
|---|---|---|
| `memberCount` | Nombre total de membres (enseignants + étudiants) | entier |
| `studentCount` | Nombre d'étudiants (role = student) | entier |
| `teacherCount` | Nombre d'enseignants (role = teacher) | entier |
| `pendingInvitations` | Invitations en attente de réponse | entier |
| `avgScore` | Score moyen des étudiants sur tous leurs résultats d'exercices (%), arrondi à 1 décimale. `null` si aucun résultat. | float \| null |

### 3.2 Indicateurs pédagogiques avancés

Retournés par `GET /api/v1/class-groups/:id/kpi/students` (nouveau) :

#### Niveau groupe

| Indicateur | Définition | Type |
|---|---|---|
| `activeStudentsCount` | Étudiants ayant eu ≥ 1 session de révision dans les 7 derniers jours | entier |
| `atRiskCount` | Étudiants avec au moins 1 critère de décrochage déclenché | entier |
| `scoreWeeklyTrend` | Évolution du score moyen du groupe sur les 4 dernières semaines ISO (lundi au dimanche). `null` si aucun résultat sur la semaine. | `{ weekStart: YYYY-MM-DD, avgScore: float\|null }[]` |

#### Niveau étudiant (tableau `students`)

| Indicateur | Définition | Type |
|---|---|---|
| `userId` | ID de l'étudiant | entier |
| `name` | Nom de l'étudiant | string |
| `email` | Email de l'étudiant | string |
| `lastActivityAt` | Date de la dernière session de révision (`YYYY-MM-DD`). `null` si aucune session. | string \| null |
| `daysInactive` | Nombre de jours depuis `lastActivityAt`. `null` si aucune session. | entier \| null |
| `avgScore` | Score moyen personnel sur tous les résultats d'exercices (%). `null` si aucun résultat. | float \| null |
| `scoreTrend` | Derniers 4 résultats d'exercices avec score (%) et date de complétion. | `{ score: float, completedAt: date }[]` |
| `atRisk` | `true` si au moins un critère de décrochage est déclenché | boolean |
| `atRiskReasons` | Liste des raisons de décrochage déclenchées | string[] |

---

## 4. Critères de décrochage (alertes)

Trois critères indépendants — tout critère déclenché met `atRisk = true`.

| Critère | Seuil | Message affiché | Source de données |
|---|---|---|---|
| **Inactivité** | Dernière session de révision > 7 jours | `"Inactif depuis N jours"` | `RevisionSession.date` |
| **Aucune session** | Aucune `RevisionSession` enregistrée | `"Aucune session de révision enregistrée"` | `RevisionSession` |
| **Baisse de score** | Baisse > 20 % entre les 2 derniers résultats (score[N-1] → score[N]) | `"Baisse de score de N%"` | `TestResult` |
| **Pas d'exercice récent** | L'étudiant a des résultats, mais aucun dans les 14 derniers jours | `"Aucun exercice complété depuis 14 jours"` | `TestResult.completedAt` |

### Constantes

```
AT_RISK_INACTIVE_DAYS    = 7   jours
AT_RISK_SCORE_DROP_PCT   = 20  %
AT_RISK_NO_EXERCISE_DAYS = 14  jours
```

---

## 5. Calcul des tendances hebdomadaires

La semaine ISO commence le **lundi**. L'algorithme :

1. Identifier les 4 dernières semaines ISO (de la plus ancienne à la plus récente).
2. Pour chaque résultat d'exercice de tous les étudiants du groupe : calculer le score en pourcentage (`score / total × 100`) et l'affecter à la semaine correspondante.
3. Retourner la moyenne des scores de la semaine, arrondie à 1 décimale. `null` si aucun résultat dans la semaine.

---

## 6. Droits d'accès

| Rôle | Accès `/kpi` (agrégats) | Accès `/kpi/students` (détail pédagogique) |
|---|---|---|
| Admin plateforme (roleId = 1) | ✅ | ✅ |
| Étudiant (roleId = 2) | ❌ 403 | ❌ 403 |
| Enseignant (roleId = 3) | ✅ si membre du groupe avec role='teacher' | ✅ si membre du groupe avec role='teacher' |
| Admin établissement (roleId = 4) | ✅ | ✅ |
| Modérateur (roleId = 5) | ❌ 403 | ❌ 403 |

La vérification se fait en deux étapes :
1. Si `roleId ∈ {1, 4}` → accès autorisé directement.
2. Sinon → vérifier que `ClassGroupUsers` contient `{ classGroupId: groupId, userId: requesterId, role: 'teacher' }`.

---

## 7. Endpoint

### `GET /api/v1/class-groups/:id/kpi/students`

**Auth** : Bearer JWT requis.  
**Autorisation** : Admin (roleId 1/4) ou enseignant membre du groupe.

**Réponse 200 :**
```json
{
  "message": "Analyse pédagogique récupérée avec succès.",
  "data": {
    "activeStudentsCount": 2,
    "atRiskCount": 1,
    "scoreWeeklyTrend": [
      { "weekStart": "2026-06-01", "avgScore": 72.5 },
      { "weekStart": "2026-06-08", "avgScore": 68.0 },
      { "weekStart": "2026-06-15", "avgScore": 75.3 },
      { "weekStart": "2026-06-22", "avgScore": null }
    ],
    "students": [
      {
        "userId": 2,
        "name": "Alice Dupont",
        "email": "alice@example.com",
        "lastActivityAt": "2026-06-23",
        "daysInactive": 2,
        "avgScore": 78.5,
        "scoreTrend": [
          { "score": 80.0, "completedAt": "2026-06-10T10:00:00.000Z" },
          { "score": 77.0, "completedAt": "2026-06-18T14:30:00.000Z" }
        ],
        "atRisk": false,
        "atRiskReasons": []
      },
      {
        "userId": 3,
        "name": "Bob Martin",
        "email": "bob@example.com",
        "lastActivityAt": "2026-06-10",
        "daysInactive": 15,
        "avgScore": 55.0,
        "scoreTrend": [
          { "score": 70.0, "completedAt": "2026-06-01T09:00:00.000Z" },
          { "score": 55.0, "completedAt": "2026-06-08T11:00:00.000Z" }
        ],
        "atRisk": true,
        "atRiskReasons": [
          "Inactif depuis 15 jours",
          "Baisse de score de 21%",
          "Aucun exercice complété depuis 14 jours"
        ]
      }
    ]
  }
}
```

**Réponse 403 :** Accès refusé (rôle insuffisant).  
**Réponse 404 :** Groupe introuvable.  
**Réponse 500 :** Erreur serveur.

---

## 8. Sources de données

| Indicateur | Table Sequelize | Filtre |
|---|---|---|
| Membres (tous rôles) | `ClassGroupUsers` | `classGroupId = :id` (splitté en studentIds / teacherIds) |
| Profil étudiant | `User` | `userId IN (studentIds)`, attributs: userId, name, email |
| Activité révision | `RevisionSession` | `userId IN (studentIds)` |
| Tests assignés par les enseignants | `Deadline` | `createdBy IN (teacherIds)`, `testId NOT NULL` |
| Scores exercices enseignant | `TestResult` | `userId IN (studentIds)`, `testId IN (teacherTestIds)` |
| Invitations | `Invitation` | `classGroupId = :id, status = 'pending'` |

### Pourquoi passer par Deadline ?

Le modèle `Test` n'a pas de champ `createdBy`. Le seul lien traçable entre un test et son auteur enseignant est la table `Deadline` : quand un enseignant assigne un exercice à son groupe, il crée une `Deadline` avec `createdBy = teacherId` et `testId = l'exercice assigné`. Ainsi, **"exercice créé/assigné par l'enseignant" = test référencé dans une `Deadline` créée par un enseignant du groupe**.

Si aucun enseignant du groupe n'a assigné de test via Deadline, `avgScore` et `scoreTrend` retournent `null` / `[]` — comportement attendu (pas d'exercice enseignant disponible).

---

## 9. Limites et dette

- `avgScore` est calculé toutes matières confondues — pas de filtre par sujet pour l'instant.
- `lastActivityAt` est basé sur `RevisionSession.date` uniquement — les sessions Leitner et les exercices ne sont pas comptés comme activité.
- La tendance hebdomadaire est calculée à la volée à chaque requête — pas de cache. À optimiser si le groupe dépasse 100 étudiants.
- Si un enseignant crée un test sans l'assigner via Deadline, ce test n'est pas pris en compte dans les KPI.
- Pas de test BDD (intégration SQLite) — couverture unitaire suffisante pour le MVP.
