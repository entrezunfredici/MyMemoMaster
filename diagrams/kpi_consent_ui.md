# Maquettes UI — Partage maîtrisé des KPI personnels

> Livrable S-02.02 — Analyse / V1 / Sprint 9  
> Basé sur le modèle défini dans `diagrams/kpi_consent_partage.md` (S-02.01).  
> API disponible depuis S-02.05 — implémentation front à livrer dans le ticket S-02 front dédié.

---

## 1. Contexte d'intégration

Deux vues sont concernées, toutes deux hébergées dans `ClassroomPage.vue` :

| Vue | Fichier | Acteur | Nouvelle section |
|---|---|---|---|
| Vue étudiant | `ClassroomEtudiantView.vue` | Étudiant | "Partage de mes KPI" (en bas de page) |
| Vue enseignant | `ClassroomEnseignantView.vue` | Enseignant | Onglet KPI personnels dans l'accordion étudiant |

---

## 2. Vue étudiant — Section "Partage de mes KPI"

### 2.1 Position dans la page

```
┌─ ClassroomEtudiantView ──────────────────────────────────────────────────┐
│  [Sélecteur de groupe]                                                    │
│  [Barre de recherche]                                                     │
│  [A] Prochaines séances                          (existant)               │
│  [B] Sections du cours                           (existant)               │
│  [C] Rendus à remettre                           (existant)               │
│  [D] Échéances à venir                           (existant)               │
│  [E] Documents partagés                          (existant)               │
│  [F] Partage de mes KPI          ← NOUVEAU (S-02.02)                     │
└──────────────────────────────────────────────────────────────────────────┘
```

### 2.2 État — aucun consentement accordé

```
┌─ Partage de mes KPI ──────────────────────────────────────────────────────┐
│                                                                            │
│  Vous n'avez autorisé aucun enseignant à consulter vos KPI personnels.    │
│                                                                            │
│  ┌─ Autoriser un enseignant ────────────────────────────────────────────┐ │
│  │  Enseignant :  [Choisir un enseignant du groupe        ▼]            │ │
│  │  Matière    :  [Toutes mes matières (accès global)     ▼]            │ │
│  │                                                                      │ │
│  │                                        [Accorder l'accès]           │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 État — consentements actifs

```
┌─ Partage de mes KPI ──────────────────────────────────────────────────────┐
│                                                                            │
│  Accès accordés (3)                                                        │
│                                                                            │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │  M. Dupont     Terminale S1   Toutes matières   27/06/2026         │   │
│  │                                                      [Révoquer]    │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │  Mme Lefebvre  Terminale S1   Physique          25/06/2026         │   │
│  │                                                      [Révoquer]    │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │  Mme Lefebvre  Terminale S1   Mathématiques     25/06/2026         │   │
│  │                                                      [Révoquer]    │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌─ Ajouter un accès ───────────────────────────────────────────────────┐ │
│  │  Enseignant :  [Choisir un enseignant du groupe        ▼]            │ │
│  │  Matière    :  [Toutes mes matières (accès global)     ▼]            │ │
│  │                (options : Toutes | Physique | Maths | …)             │ │
│  │                                        [Accorder l'accès]           │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

### 2.4 Modal de confirmation — révocation

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  Révoquer l'accès à Mme Lefebvre (Physique) ?       │
│                                                     │
│  Elle ne pourra plus consulter vos KPI de Physique  │
│  dans ce groupe.                                    │
│                                                     │
│          [Annuler]      [Révoquer]                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

> Si le consentement est global ("Toutes matières"), le message dit :
> "Elle ne pourra plus consulter l'ensemble de vos KPI personnels dans ce groupe."

### 2.5 États spéciaux

```
─ Aucun enseignant dans le groupe ──────────────────────────────────
  Aucun enseignant disponible dans ce groupe.

─ Tous les enseignants ont déjà accès ──────────────────────────────
  Tous les enseignants de ce groupe ont déjà accès à vos KPI.

─ Chargement ───────────────────────────────────────────────────────
  Chargement des partages…

─ Envoi en cours ───────────────────────────────────────────────────
  [Accorder l'accès]  → spinner + désactivé
```

---

## 3. Vue enseignant — KPI personnels dans l'accordion étudiant

### 3.1 Position dans la page

```
┌─ ClassroomEnseignantView — Section "Analyse pédagogique" ────────────────┐
│                                                                           │
│  [Agrégats groupe : Actifs / À risque / Score semaine]                   │
│  [Tendance hebdomadaire — 4 semaines]                                    │
│  [Alertes décrochage]                                                    │
│                                                                           │
│  Tous les étudiants (5)                                                   │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  ⚠ Risque │  Bob Martin   │  55 %  │  il y a 15j  │ [KPI]  ▼  │  │  ← accordion
│  ├────────────────────────────────────────────────────────────────────┤  │
│  │    [A] Résumé décrochage (StudentDetailComponent existant)         │  │
│  │    [B] KPI personnels partagés  ← NOUVEAU (S-02.02)               │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘
```

### 3.2 En-tête de ligne étudiant (avec badge consentement)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ✓ OK  │  Alice Dupont  │  78 %  │  il y a 2j  │  [KPI ✓]  ▶        │
└─────────────────────────────────────────────────────────────────────────┘
                                               ↑
                                  Badge vert si consentement accordé

┌─────────────────────────────────────────────────────────────────────────┐
│  ⚠ Risque │  Bob Martin  │  55 %  │  il y a 15j  │  [KPI —]  ▶      │
└─────────────────────────────────────────────────────────────────────────┘
                                               ↑
                                  Badge gris si pas de consentement
```

### 3.3 Panneau [B] — KPI personnels (consentement accordé)

```
┌─ KPI personnels partagés ───────────────────────────────────────────────┐
│                                                                          │
│  ┌── Révision ──────────────────────────────────────────────────────┐   │
│  │  Sessions planifiées  30     Complétées  22     Taux  73 %       │   │
│  │  Streak actuel        5 jours                                     │   │
│  │  Sessions (30j)       18     Complétées  14                       │   │
│  │  Temps total          6h 20                                       │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌── Exercices ─────────────────────────────────────────────────────┐   │
│  │  Total exercices  12    Score moyen  68 %    Tendance  +5 %      │   │
│  │  Meilleur         95 %  Moins bon    42 %                         │   │
│  │  Derniers résultats :  [95 %]  [72 %]  [68 %]  [42 %]           │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌── Leitner ───────────────────────────────────────────────────────┐   │
│  │  Total cartes  48    Maîtrise  52 %    À réviser  3              │   │
│  │  B1●●●  B2●●●●  B3●●  B4●●●●●  B5●●●                           │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌── Badges débloqués ──────────────────────────────────────────────┐   │
│  │  🔥 7 jours de suite    ⭐ Score parfait    📚 10 exercices       │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.4 Panneau [B] — KPI personnels (pas de consentement)

```
┌─ KPI personnels partagés ───────────────────────────────────────────────┐
│                                                                          │
│  Cet étudiant n'a pas encore partagé ses KPI personnels.                │
│                                                                          │
│  Il peut vous accorder l'accès depuis l'onglet "Partage de mes KPI"     │
│  dans sa vue étudiant.                                                   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.5 Panneau [B] — Chargement

```
┌─ KPI personnels partagés ───────────────────────────────────────────────┐
│  Chargement des KPI…                                                     │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Détail des composants

### 4.1 Formulaire d'accord (vue étudiant)

Deux `<select>` côte à côte :

**Sélecteur d'enseignant :**

| Comportement | Détail |
|---|---|
| Source | `GET /api/v1/class-groups/:id` — membres filtrés `role = 'teacher'` |
| Soumission | Appelle `POST /kpi/consent { teacherId, classGroupId, subjectId? }` |
| Succès | Toast "Accès accordé." + rechargement liste consentements |
| Erreur 404 | Toast "Cet enseignant n'est plus disponible dans ce groupe." |

**Sélecteur de matière :**

| Option | Valeur envoyée | Comportement |
|---|---|---|
| "Toutes mes matières" | `subjectId: null` (absent du body) | Consentement global |
| "Physique", "Maths", … | `subjectId: X` | Consentement filtré par matière |
| Source des matières | `GET /api/v1/subjects` ou matières connues de l'étudiant (`/kpi/my → subjects.list`) | |

> Les paires (enseignant, matière) déjà accordées sont filtrées du formulaire — pas possible d'accorder deux fois la même combinaison.

### 4.2 Bouton Révoquer

| Comportement | Détail |
|---|---|
| Clic | Ouvre modal de confirmation |
| Confirmation | `DELETE /kpi/consent/:teacherId/:classGroupId` |
| Succès | Toast "Accès révoqué." + retrait de la ligne |
| Erreur 404 | Toast "Consentement introuvable." |

### 4.3 Badge consentement (vue enseignant)

| État | Libellé | Style |
|---|---|---|
| Consentement accordé | `KPI ✓` | `bg-success/10 text-success text-xs rounded-full px-2 py-0.5` |
| Pas de consentement | `KPI —` | `bg-gray text-dark/40 text-xs rounded-full px-2 py-0.5` |

### 4.4 Blocs KPI personnels

Chaque bloc est un accordéon `<details>` ou une section conditionnelle.  
Les données viennent de `GET /kpi/student/:studentId?classGroupId=X`.  
Le store Pinia à créer : `kpiConsent.js`.

| Bloc | Données source | Champs affichés |
|---|---|---|
| Révision | `data.revision` | `totalPlanned`, `totalCompleted`, `completionRate`, `streakDays`, `sessionsLast30Days`, `completedLast30Days`, `totalMinutes` |
| Exercices | `data.exercises` | `totalTests`, `avgScore`, `maxScore`, `minScore`, `recentTrend`, `scoreHistory` (4 derniers) |
| Leitner | `data.leitner` | `totalCards`, `cardsByBox`, `mastery`, `cardsDue` |
| Discipline | `data.discipline` | `plannedThisWeek`, `completedThisWeek`, `disciplineScore` |
| Badges | `data.badges` | Badges `unlocked = true` uniquement |

---

## 5. Stores Pinia à créer

### `kpiConsent.js`

```javascript
// stores/kpiConsent.js
state: {
  consents: [],          // liste des consentements de l'étudiant connecté
                         // chaque entrée inclut : teacher, classGroup, subject (nullable)
  studentKpis: {},       // { [studentId]: kpiData } — cache par étudiant
  loading: false
}

actions:
  fetchMyConsents()                                       → GET /kpi/consent/my
  grantConsent(teacherId, classGroupId, subjectId?)       → POST /kpi/consent { teacherId, classGroupId, subjectId? }
  revokeConsent(teacherId, classGroupId, subjectId?)      → DELETE /kpi/consent/:t/:g[?subjectId=X]
  fetchStudentKpis(studentId, classGroupId)               → GET /kpi/student/:id?classGroupId=X
```

---

## 6. Flux utilisateur — scénario nominal

```
ÉTUDIANT
  1. Ouvre ClassroomEtudiantView → groupe "Terminale S1"
  2. Fait défiler jusqu'à "Partage de mes KPI"
  3. Sélectionne "M. Dupont" dans le menu déroulant
  4. Clique "Accorder l'accès"
  5. Toast : "Accès accordé à M. Dupont."
  6. La ligne "M. Dupont — Terminale S1" apparaît dans la liste

ENSEIGNANT (M. Dupont)
  1. Ouvre ClassroomEnseignantView → groupe "Terminale S1"
  2. Voit le badge [KPI ✓] sur la ligne de Bob Martin dans "Tous les étudiants"
  3. Clique pour ouvrir l'accordion
  4. Voit les KPI personnels (révision, exercices, Leitner, badges)

ÉTUDIANT — révocation
  1. Retourne dans "Partage de mes KPI"
  2. Clique [Révoquer] sur la ligne "M. Dupont"
  3. Confirme dans la modal
  4. La ligne disparaît
  5. M. Dupont voit à nouveau "Cet étudiant n'a pas encore partagé ses KPI."
```

---

## 7. Responsive et accessibilité

| Point | Règle |
|---|---|
| Mobile | La section "Partage de mes KPI" s'empile verticalement ; le select prend toute la largeur |
| Fond des modals | `bg-white` explicite (règle projet) |
| ARIA | `aria-expanded` sur l'accordion KPI ; `role="dialog"` sur la modal de révocation |
| Couleurs | `text-success` (vert) pour consentement actif, `text-secondary` (orange) pour absence |

---

## 8. Liens

| Fichier | Rôle |
|---|---|
| `diagrams/kpi_consent_partage.md` | Modèle de données, règles métier, endpoints (S-02.01) |
| `my_memo_master_api/services/KpiConsent.service.js` | Logique métier back (S-02.05) |
| `my_memo_master_api/routes/Kpi.routes.js` | Endpoints disponibles (S-02.05) |
| `my_memo_master_front/src/pages/ClassroomEtudiantView.vue` | Vue à modifier (section F) |
| `my_memo_master_front/src/pages/ClassroomEnseignantView.vue` | Vue à modifier (bloc B accordion) |
| `my_memo_master_front/src/stores/kpiConsent.js` | Store à créer |

---

## 9. Points d'attention pour l'implémentation

- Le select d'enseignants doit **exclure ceux qui ont déjà accès** — nécessite un `computed` croisant `members` (role=teacher) et `consents` (teacherIds déjà accordés).
- L'accordion KPI dans la vue enseignant est **lazy** : ne charger `fetchStudentKpis` qu'au premier clic sur l'accordion (pas au chargement de la page).
- Le cache `studentKpis[studentId]` doit être **invalidé** si l'étudiant change de groupe sélectionné.
- La révocation côté étudiant doit entraîner la **mise à jour du badge** côté enseignant au prochain rechargement (pas de temps réel en V1).
