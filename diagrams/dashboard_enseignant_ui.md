# Maquettes UI — Dashboard enseignant KPI pédagogiques

> Livrable S-01.02 — Analyse / V1 / Sprint 8  
> Basé sur les indicateurs définis dans `diagrams/kpi_pedagogiques.md` (S-01.01).

---

## 1. Contexte d'intégration

Le dashboard enseignant est intégré à la page existante **ClassroomPage.vue** (`/classroom`).  
La section analytics s'affiche uniquement en **vue professeur** (`viewRole === 'prof'`), sous les KPI de base existants et au-dessus du calendrier.

---

## 2. Hiérarchie des sections

```
┌─ ClassroomPage ──────────────────────────────────────────────────────────┐
│  [Sélecteur de groupe]                                                   │
│  ┌─ Colonne principale (2/3) ──────────────────────────────────────────┐ │
│  │  [A] Fiche groupe + KPI de base + Sections/Rendus  (existant)       │ │
│  │  [B] Analyse pédagogique  ← NOUVEAU (S-01.02)                       │ │
│  │  [C] Calendrier du groupe  (existant)                                │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│  ┌─ Sidebar droite (1/3) ──────────────────────────────────────────────┐ │
│  │  [D] Formulaires enseignant  (existant)                              │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Maquette [B] — Section "Analyse pédagogique"

### 3.1 Vue globale

```
┌─ Analyse pédagogique ─────────────────────────────── [Actualiser] ──────┐
│                                                                          │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────────┐ │
│  │      24        │  │      3  ⚠      │  │         72.5 %             │ │
│  │  Actifs (7j)  │  │   À risque     │  │   Score cette semaine      │ │
│  └────────────────┘  └────────────────┘  └────────────────────────────┘ │
│                                                                          │
│  Tendance des 4 dernières semaines                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │  2 juin  │  │  9 juin  │  │ 16 juin  │  │ 23 juin  │               │
│  │  72.5 %  │  │  68.0 %  │  │  75.3 %  │  │    —     │               │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘               │
│                                                                          │
│  Alertes décrochage (3)                                                  │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Bob Martin   [Inactif depuis 15j]  [Baisse de score de 21%]      │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Karim Sadi   [Aucune session de révision enregistrée]             │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  Tous les étudiants (5)                                                  │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  ✓ OK  │  Alice Dupont       │  78.5 %  │  il y a 2j         ▶   │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  ⚠ Risque │  Bob Martin      │  55.0 %  │  il y a 15j       ▼   │  │
│  ├────────────────────────────────────────────────────────────────────┤  │
│  │    Email : bob@test.com                                            │  │
│  │    Dernière activité : 2026-06-10                                  │  │
│  │    Derniers résultats : [80 %]  [55 %]                             │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│  ...                                                                      │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Détail des composants UI

### 4.1 Agrégats (ligne du haut)

| Tuile | Valeur | Couleur | Condition |
|---|---|---|---|
| Actifs (7j) | `activeStudentsCount` | `text-success` (vert) | toujours |
| À risque | `atRiskCount` | `text-secondary` (orange) si > 0, `text-success` si 0 | bordure orange si > 0 |
| Score cette semaine | `scoreWeeklyTrend[-1].avgScore` | `scoreTextClass(score)` | `—` si null |

### 4.2 Tendance hebdomadaire

4 tuiles en grille, une par semaine ISO (lundi → dimanche).

| Élément | Valeur | Style |
|---|---|---|
| Label | `jj mois` (ex : `23 juin`) | `text-[10px] text-dark/60` |
| Score | `avgScore + ' %'` ou `—` | `scoreTextClass` si valeur, sinon `text-dark/30` |
| Fond | `bg-light` si score présent, `bg-gray/20` si null | — |

### 4.3 Alertes décrochage

Affichée uniquement si `atRiskCount > 0`.  
Une carte par étudiant à risque, fond `bg-secondary/5`, bordure `border-secondary/30`.  
Chaque raison est affichée en badge `bg-secondary/10 text-secondary`.

### 4.4 Tableau étudiants (accordéon)

Chaque ligne est un bouton cliquable → déplie le détail.

**Ligne repliée :**
```
[badge statut] | Nom étudiant | score moyen % | il y a Xj | ▶
```

**Ligne dépliée (détail) :**
```
Email : ...
Dernière activité : YYYY-MM-DD
Derniers résultats : [score %] [score %] [score %] [score %]
```

Pas de résultats → `"Aucun exercice enseignant enregistré."`

---

## 5. Codes couleur

| Plage de score | Classe texte | Classe fond |
|---|---|---|
| ≥ 70 % | `text-success` | `bg-success` |
| 50–69 % | `text-dark` | `bg-primary` |
| < 50 % | `text-secondary` | `bg-secondary` |

---

## 6. États de la section

| État | Affichage |
|---|---|
| Chargement | `"Chargement..."` centré (texte `text-dark/60`) |
| Données disponibles | Section complète |
| Erreur API / groupe sans droits | `"Analyse non disponible pour ce groupe."` |
| Aucun étudiant | `"Aucun étudiant dans ce groupe."` à la place du tableau |
| Aucune alerte | Section alertes masquée (`v-if="atRiskStudents.length > 0"`) |

---

## 7. Comportement

- La section se charge automatiquement quand un groupe est sélectionné ET `viewRole === 'prof'`.
- Bouton "Actualiser" déclenche un rechargement manuel via `GET /class-groups/:id/kpi/students`.
- Les lignes du tableau sont indépendantes : plusieurs peuvent être ouvertes simultanément.
- La section est cachée pour les étudiants (`v-if="viewRole === 'prof'"`).

---

## 8. Accessibilité et responsive

- Les 3 tuiles agrégats passent en `grid-cols-3` (desktop) — sur mobile la 3e tuile prend 2 colonnes (`col-span-2 md:col-span-1`).
- La tendance hebdo reste en `grid-cols-4` (les 4 semaines s'affichent toujours côte à côte, les labels se raccourcissent).
- Le tableau étudiant est lisible sur mobile (les 3 infos de la ligne restent sur une seule ligne grâce à des gaps flexibles).

---

## 9. Hors périmètre (OUT)

- Graphiques visuels (barres, lignes) — aucune lib chart n'est dans la stack.
- Export PDF/CSV.
- Tri dynamique des colonnes.
- Filtre par matière ou par plage de dates.
- Notifications push en temps réel.
