# Analyse UI — Navigation par sujet et tags (S-05.02)

> Document de référence pour S-05 / V1 — Catégorisation par sujets.  
> Décrit les patterns UI implémentés pour la navigation par sujet et la gestion des tags.  
> Sources de vérité : `ItemListLayout.vue`, `TagSelectorComponent.vue`, `MindmapsListView.vue`, `FlashcardsPage.vue`, `ExercisesPage.vue`.

---

## 1. Vue d'ensemble

La fonctionnalité de catégorisation par sujets et tags permet à l'utilisateur de :
- **Filtrer** ses contenus (cartes mentales, systèmes Leitner, exercices) par matière
- **Rechercher** un contenu par nom
- **Associer** des tags colorés à chaque contenu
- **Créer** des tags à la volée sans quitter le contexte

Trois types de contenus sont concernés : **Mind Maps**, **Flashcards (Leitner)**, **Exercices**.

---

## 2. Pattern principal — Page liste avec filtre sujet

Utilisé dans : `ExercisesPage.vue`, `FlashcardsPage.vue` (via `ItemListLayout.vue`)

```
┌──────────────────────────────────────────────────────────────────┐
│  [🔍 Rechercher un système…                              ] [+ Créer] │
├──────────────────────────────────────────────────────────────────┤
│  Filtrer par sujet :  [Maths] [Physique] [Histoire] [Réinitialiser] │
│  3 systèmes trouvés                                              │
├──────────────────────────────────────────────────────────────────┤
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐     │
│  │  Algèbre       │  │  Électro       │  │  Histoire      │     │
│  │  Maths         │  │  Physique      │  │  Histoire      │     │
│  │  ● révision    │  │  ● circuits    │  │  ─────────     │     │
│  │  ● formules    │  │                │  │  0 cartes dues │     │
│  │  ─────────     │  │  ─────────     │  │                │     │
│  │  4 cartes dues │  │  2 cartes dues │  │  [Réviser]     │     │
│  │  [Réviser]     │  │  [Réviser]     │  │                │     │
│  └────────────────┘  └────────────────┘  └────────────────┘     │
└──────────────────────────────────────────────────────────────────┘
```

### Comportements

| Interaction | Résultat |
|---|---|
| Clic sur un badge sujet | Filtre actif (sujet en surbrillance bleue, compteur mis à jour) |
| Clic sur le même badge | Désactive le filtre |
| Clic "Réinitialiser" | Supprime le filtre sujet actif |
| Saisie dans la recherche | Filtre combiné (texte + sujet simultanément) |
| Aucun résultat | Message vide centré "Aucun [élément] trouvé." |

### États de la grille

```
─ Chargement ─────────────────────────────────
  Chargement des systèmes…

─ Vide (aucun contenu) ───────────────────────
  Aucun système trouvé.

─ Vide après filtre ──────────────────────────
  Aucun système trouvé. [Réinitialiser]
```

---

## 3. Pattern — Card item (MenuItemComponent)

Chaque contenu est représenté par une card uniforme.

```
┌──────────────────────────────────────┐
│  Nom du contenu                      │
│  [Badge sujet]                       │
│                                      │
│  ┌─ slot stats ──────────────────┐  │
│  │  ● révision  ● maths          │  │  ← tags colorés (chips)
│  │  4 cartes dues / B1●● B2●     │  │  ← stats spécifiques
│  └───────────────────────────────┘  │
│                                      │
│  [Action principale]  [✎] [✕]       │
└──────────────────────────────────────┘
```

- Le **badge sujet** indique la matière (couleur primaire, texte court).
- Les **chips de tags** sont affichés avec leur couleur propre.
- Les **icônes ✎ / ✕** déclenchent les modals d'édition / confirmation de suppression.

---

## 4. Pattern — Sélecteur de tags (TagSelectorComponent)

Composant réutilisable utilisé dans tous les modals de création et d'édition.

### État vide

```
Tags (optionnel)

┌────────────────────────────────────────────────┐
│  Ajouter des tags…                          ▾  │
└────────────────────────────────────────────────┘
```

### Avec tags sélectionnés

```
┌───────────────────────────────────────────────────┐
│  [● révision ×]  [● maths ×]  cours…          ▾  │
└───────────────────────────────────────────────────┘
```

### Dropdown ouvert (frappe en cours)

```
┌───────────────────────────────────────────────────┐
│  [● révision ×]  cours…                       ▾  │
└───────────────────────────────────────────────────┘
┌───────────────────────────────────────────────────┐
│  ● cours d'anglais                                │
│  ● cours du soir                                  │
│  ───────────────────────────────────────────────  │
│  ● Créer « cours »                                │
└───────────────────────────────────────────────────┘
```

### Palette de couleurs (clic sur la pastille d'un chip)

```
Couleur — révision
┌──────────────────────────────┐
│  ● ● ● ● ●                  │
│  ● ● ● ● ●                  │
│  ● ● ● ● ●                  │
└──────────────────────────────┘
```

### Comportements

| Interaction | Résultat |
|---|---|
| Clic dans le champ | Ouvre le dropdown avec tous les tags |
| Frappe dans le champ | Filtre les tags en temps réel |
| Clic sur un tag dans le dropdown | Ajoute (coche ✓) ou retire le tag |
| Aucun résultat exact | Option "Créer « xxx »" apparaît |
| Entrée au clavier | Sélectionne le tag focalisé ou crée si aucun résultat |
| Backspace (champ vide) | Retire le dernier tag sélectionné |
| ↑ ↓ au clavier | Navigation dans le dropdown |
| Clic sur la pastille ● d'un chip | Ouvre la palette de 15 couleurs prédéfinies |
| Sélection d'une couleur | Persiste en base via `PUT /tags/:id` |
| Clic hors du composant | Ferme dropdown / palette |
| Clic sur ▾ ou zone vide du champ | Bascule ouvert / fermé |

---

## 5. Pattern — Sélecteur sujet dans les modals

Dans chaque modal de création/édition, le sujet peut être sélectionné ou créé à la volée.

```
─ Modal créer un système Leitner ──────────────────
  Nom *        [________________________]
  Sujet        [Maths            ▾]   [+ Nouveau]
  Tags         [● révision ×]  [Ajouter des tags… ▾]
  [Créer]  [Annuler]
```

- La liste de sujets est chargée depuis `GET /subjects`.
- Si l'utilisateur tape un nouveau nom dans le champ, un bouton "+ Créer" permet de l'ajouter directement.
- Le sujet reste optionnel (fallback "Sujet par défaut" côté API si absent).

---

## 6. Composant `ItemListLayout` — API props

| Prop | Type | Description |
|---|---|---|
| `search` | String | Valeur de la recherche texte (v-model) |
| `selectedSubjectId` | Number\|null | Sujet actif pour le filtre (v-model) |
| `subjects` | Array | Liste `[{ subjectId, name }]` pour les badges de filtre |
| `loading` | Boolean | Affiche l'état de chargement |
| `filteredCount` | Number | Nombre d'éléments après filtre (affiché sous les badges) |
| `searchPlaceholder` | String | Placeholder de la barre de recherche |
| `createLabel` | String | Libellé du bouton de création |
| `itemLabel` | String | Nom du type d'élément (ex: "système", "exercice") |
| `emptyMessage` | String | Message affiché si 0 résultat |

**Slots :**
- `default` — les cards filtrées (grille responsive 1/2/3 colonnes)
- `modals` — les modals/drawers du parent (portail hors flux)

**Événements :**
- `update:search` — mise à jour du texte de recherche
- `update:selectedSubjectId` — changement du filtre sujet
- `create` — clic sur le bouton de création

---

## 7. Périmètre V1

| Fonctionnalité | IN V1 | Notes |
|---|---|---|
| Filtre sujet dans les listes | ✅ | Tous les types de contenu |
| Tags colorés sur les contenus | ✅ | Mind Maps, Leitner, Exercices |
| Sélecteur tag réutilisable (Odoo-like) | ✅ | `TagSelectorComponent.vue` |
| Création de tag à la volée | ✅ | Depuis le sélecteur |
| Couleur modifiable par tag | ✅ | 15 couleurs prédéfinies |
| Recherche textuelle | ✅ | Combinée avec le filtre sujet |
| Filtre cross-contenu par tag | ❌ V2 | Pas de page "tous les contenus d'un tag" |
| Taxonomie officielle complexe | ❌ OUT | Hors périmètre MVP |
| Import sujets depuis référentiels externes | ❌ OUT | Hors périmètre MVP |

---

## 8. Flux utilisateur typique

```
1. Utilisateur ouvre FlashcardsPage
   └── Voit ses systèmes Leitner en grille
       └── Chaque carte montre le sujet et les tags

2. Il clique sur le badge "Maths"
   └── La grille se filtre sur les systèmes de Maths
       └── Le compteur indique "2 systèmes trouvés"

3. Il tape "algèbre" dans la recherche
   └── Filtre combiné : Maths + "algèbre"
       └── 1 système affiché

4. Il clique ✎ sur le système
   └── Modal d'édition s'ouvre
       └── Il modifie les tags via TagSelectorComponent
           ├── Sélectionne un tag existant (clic dans le dropdown)
           └── Crée un nouveau tag "formules" directement dans le sélecteur
```
