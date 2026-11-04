# Maquettes UI — Profil gamifié

> Livrable **C-06.02** (feature list `C-06`, source planning `C-06.02`, V2, tâche « Analyse »).
> Périmètre strict de ce document : la **maquette de l'écran « Profil gamifié »** (niveau, série, badges,
> progression, calendrier d'activité, réglages de gamification). Hors périmètre : classements publics,
> monétisation, système de points complexe (voir `gamification_badges.md` §15). La **modale d'animation
> d'obtention** a son propre livrable et n'est ici qu'un point d'entrée (§9).
>
> **Nature du document** : maquette produite *avant* le code du front. Le noyau back-end (C-06.01) est livré :
> les données affichées existent déjà (`GET /badges`, `GET /badges/me/summary`, `GET /kpi/my`). Les écarts
> entre ce que la maquette suppose et ce que l'API fournit sont listés au §10.
>
> Sources de vérité : `diagrams/gamification_badges.md` (critères, catalogue, idées décidées) et le code
> existant (`ProfilePage.vue`, `KpiPage.vue`, `classroomFormat.js`, `base.css`).

---

## Sommaire

1. Contexte d'intégration et choix d'emplacement
2. Écran « Mon profil gamifié » — vue d'ensemble
3. Bandeau de niveau et de série
4. Vitrine et titre
5. Grille de badges (états)
6. Détail d'un badge
7. Calendrier d'activité
8. Réglages de gamification
9. États de l'écran
10. Données attendues et écarts avec l'API
11. Composants, store et fichiers à créer
12. Responsive et accessibilité
13. Parcours utilisateur
14. Hors périmètre et points à valider

---

## 1. Contexte d'intégration et choix d'emplacement

| Élément existant | Constat |
|---|---|
| `ProfilePage.vue` (route `/profile`) | Page de **compte** : informations, sécurité, double authentification, « Mes données », déconnexion, zone dangereuse. 499 lignes, déjà dense |
| `KpiPage.vue` (route `/kpi`) | « Ma progression » : section « Succès & Badges » en pastilles (aujourd'hui la seule vitrine des badges), puis révision, exercices, Leitner |
| `StatCard` | Carte de chiffre réutilisable (utilisée dans `KpiPage.vue`) |

**Choix proposé** : ne pas alourdir `ProfilePage.vue`. Le profil gamifié est une **page dédiée** `/profile/badges`
(nom de route `badges`), atteinte depuis trois points :

1. une **carte de synthèse « Mes succès »** ajoutée en tête de `ProfilePage.vue` (niveau, série, 3 derniers badges, lien « Voir tous mes badges ») ;
2. le lien « Voir tous » de la section « Succès & Badges » de `KpiPage.vue`, qui garde ses pastilles ;
3. la notification d'obtention (modale d'animation, §9).

Alternative écartée : tout mettre dans `ProfilePage.vue` — mélange réglages de compte et contenu motivant, et dépasse
la limite de lisibilité d'une page (règle du projet : une page ne dépasse pas quelques centaines de lignes).

Route privée (`meta.private: true`), titre « Mes badges ».

---

## 2. Écran « Mon profil gamifié » — vue d'ensemble

```
┌─ MenuSidebar ─┐ ┌─ BadgesPage (/profile/badges) ─────────────────────────────────────────┐
│               │ │ ← Profil                                    Mes badges                  │
│  …            │ │                                                                          │
│  Profil ●     │ │ ┌─ Bandeau niveau ────────────────────────────────────────────────────┐ │
│               │ │ │ 🎖  Niveau Apprenti            « Cartographe » ▾ (titre affiché)     │ │
│               │ │ │ ▓▓▓▓▓▓▓░░░░░░░ 7 / 10 badges pour devenir Confirmé                   │ │
│               │ │ │ 🔥 Série : 12 jours   ·   Meilleure série : 21 jours                 │ │
│               │ │ └──────────────────────────────────────────────────────────────────────┘ │
│               │ │                                                                          │
│               │ │ ┌─ Ma vitrine ───────────────────────── [Modifier] ────────────────────┐ │
│               │ │ │  [ 🔥 7 jours ]    [ ⭐ Score parfait ]    [ + Ajouter un badge ]    │ │
│               │ │ └──────────────────────────────────────────────────────────────────────┘ │
│               │ │                                                                          │
│               │ │ ┌─ Mon activité ───────────────────────── 30 derniers jours : 19 j ────┐ │
│               │ │ │  calendrier d'activité (grille)                                      │ │
│               │ │ └──────────────────────────────────────────────────────────────────────┘ │
│               │ │                                                                          │
│               │ │ Tous (14) · Obtenus (7) · En cours (7)        Catégorie : Toutes ▾       │
│               │ │ ┌ Régularité ──────────────────────────────────────────────────────────┐ │
│               │ │ │ grille de badges                                                     │ │
│               │ │ └──────────────────────────────────────────────────────────────────────┘ │
│               │ │ ┌ Exercices ┐ ┌ Mémorisation ┐ ┌ Exploration ┐   (sections suivantes)  │
│               │ │                                                                          │
│               │ │ ┌─ Réglages de gamification ───────────────────────────────────────────┐ │
│               │ │ └──────────────────────────────────────────────────────────────────────┘ │
└───────────────┘ └──────────────────────────────────────────────────────────────────────────┘
```

Ordre des blocs : niveau → vitrine → activité → badges → réglages. Le contenu motivant passe avant les réglages.
Aucun bloc ne compare l'utilisateur à d'autres.

---

## 3. Bandeau de niveau et de série

```
┌─ LevelHeader ─────────────────────────────────────────────────────────────────────────┐
│  ┌──────┐   Niveau                                       Titre affiché                  │
│  │  🎖  │   Apprenti                                     ┌────────────────────────┐    │
│  └──────┘                                                │ Cartographe          ▾ │    │
│  ▓▓▓▓▓▓▓░░░░░░░  7 / 10 badges pour devenir Confirmé     └────────────────────────┘    │
│  ───────────────────────────────────────────────────────────────────────────────────  │
│  🔥 Série actuelle   12 jours          🏆 Meilleure série   21 jours                   │
│  Un jour de grâce protège ta série : 1 jour manqué par semaine ne la casse pas.       │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

| Élément | Source | Règle |
|---|---|---|
| Nom du niveau | `summary.level.name` | Débutant · Apprenti · Confirmé · Expert · Maître |
| Jauge | `summary.earnedCount` et palier suivant (`level.next.min`) | Texte « n / palier » **toujours affiché** (pas de jauge muette). Au niveau Maître : « Niveau maximum atteint » |
| Série | `summary.streakCurrent`, `streakBest` | « 0 jour » si la série est cassée, avec le message d'encouragement du §9 |
| Titre affiché (C1) | badge choisi parmi les badges obtenus | Liste déroulante : « Aucun titre » + libellés des badges obtenus. Visible de l'enseignant seulement si la visibilité est activée (§8) |
| Phrase sur le jour de grâce | statique | Explique la règle, évite la frustration |

La phrase d'aide est un texte permanent, pas une infobulle (accessible au clavier et au lecteur d'écran).

---

## 4. Vitrine et titre

Vitrine de **3 badges maximum** choisis parmi les badges obtenus (idée C5), affichée aussi sur la carte de synthèse du profil.

```
┌─ Ma vitrine ─────────────────────────────────────────────────────── [Modifier] ──────┐
│   ┌────────────┐     ┌────────────┐     ┌ ─ ─ ─ ─ ─ ─ ┐                              │
│   │     🔥     │     │     ⭐     │     │      +      │                              │
│   │  7 jours   │     │   Score    │     │  Ajouter    │                              │
│   │  de suite  │     │  parfait   │     │  un badge   │                              │
│   └────────────┘     └────────────┘     └ ─ ─ ─ ─ ─ ─ ┘                              │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

Mode « Modifier » : chaque badge obtenu de la grille (§5) reçoit une case « Dans ma vitrine » (3 maximum ; au-delà
la 4ᵉ case est désactivée avec le texte « 3 badges maximum »). Boutons « Enregistrer » / « Annuler ».
Vitrine vide : texte « Choisis jusqu'à 3 badges à mettre en avant. » et un seul bouton « Choisir ».

---

## 5. Grille de badges (états)

Filtres : onglets **Tous / Obtenus / En cours** (en cours = non obtenus) et liste « Catégorie » (Régularité,
Exercices, Mémorisation, Exploration). Les badges sont regroupés par catégorie sous un titre `h3`.

### 5.1 Les trois états d'une carte

```
 OBTENU                          EN COURS (verrouillé)             SECRET (non obtenu)
┌─────────────────────────┐    ┌─────────────────────────┐       ┌─────────────────────────┐
│ 🔥                      │    │ 📚                      │       │ ❔                      │
│ 7 jours de suite        │    │ 10 exercices            │       │ Badge secret            │
│ Pratiquer 7 jours       │    │ Compléter 10 séries     │       │ Continue à pratiquer    │
│ consécutifs             │    │ d'exercices             │       │ pour le découvrir       │
│                         │    │                         │       │                         │
│ ✔ Obtenu le 12 oct.     │    │ ▓▓▓▓▓░░░░░  4 / 10      │       │                         │
│ ● Commun                │    │ ● Commun                │       │ ● Rareté inconnue       │
└─────────────────────────┘    └─────────────────────────┘       └─────────────────────────┘
```

| État | Aspect | Texte |
|---|---|---|
| Obtenu | Fond de la teinte de rareté (50), bordure pleine, icône en couleur | « Obtenu le [date] » |
| En cours | Fond neutre, icône estompée mais **texte à contraste normal** | `progress.current / progress.target` + barre |
| Secret | Fond neutre, icône « ❔ », libellé générique | Aucune indication du critère |

Pas de badge « perdu » ni de notification de perte (principe 5 du document de définition).

### 5.2 Rareté

Trois raretés, portées par `rarity`. La rareté est indiquée **par un libellé et par une forme**, jamais par la couleur seule :

| Rareté | Libellé | Pastille | Teinte (variables de `base.css`) |
|---|---|---|---|
| `common` | Commun | ● | gris (`gray-100` / `gray-700`) |
| `rare` | Rare | ◆ | bleu (`blue-50` / `blue-700`) |
| `epic` | Épique | ★ | violet (`purple-50` / `purple-700`) |

Aucune couleur en dur : tout passe par `var(--…)` ou les classes de palette du thème (règle `audit:colors`).

### 5.3 Grille

```
┌ Régularité ─────────────────────────────────────────────────────────────────────────┐
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐          │
│ │ ✨         │ │ 🔥         │ │ 🏆         │ │ 💯         │ │ 📅         │          │
│ │ Premier    │ │ 7 jours    │ │ 30 jours   │ │ Centurion  │ │ Régulier   │          │
│ │ élan       │ │ de suite   │ │ de suite   │ │            │ │            │          │
│ │ ✔ 3 oct.   │ │ ✔ 12 oct.  │ │ ▓▓░ 12/30  │ │ ▓░░ 12/100 │ │ ▓▓▓░ 14/20 │          │
│ └────────────┘ └────────────┘ └────────────┘ └────────────┘ └────────────┘          │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

Grille CSS à colonnes auto (cartes de 160 px minimum). Chaque carte est un **bouton** ouvrant le détail (§6).
Si un filtre ne laisse aucun badge dans une catégorie, la catégorie disparaît ; si rien ne reste : état « aucun résultat » (§9).

---

## 6. Détail d'un badge

Panneau modal (fond blanc explicite, convention du projet) ouvert au clic sur une carte.

```
┌─ Détail du badge ─────────────────────────────────────────────────────── [ ✕ ] ──────┐
│  ┌──────┐   10 exercices                                           ◆ Rare             │
│  │  📚  │   Compléter 10 séries d'exercices                                           │
│  └──────┘                                                                             │
│  ───────────────────────────────────────────────────────────────────────────────────  │
│  Progression      ▓▓▓▓▓▓░░░░  4 / 10                                                  │
│  Matières         Ce badge ne compte que : Maths, Physique        (si lié)            │
│  Obtenu avec      Maths, Physique                                  (si obtenu)         │
│  Obtenu le        12 octobre 2026                                  (si obtenu)         │
│  ───────────────────────────────────────────────────────────────────────────────────  │
│  [ Choisir comme titre ]   [ Ajouter à ma vitrine ]                (si obtenu)         │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

| Ligne | Donnée | Affichée si |
|---|---|---|
| Progression | `progress` | non obtenu |
| Matières (« ne compte que ») | `linkedSubjectIds` (noms à résoudre) | badge lié à au moins une matière |
| Obtenu avec | `earnedSubjects` | badge obtenu avec matières |
| Obtenu le | `earnedAt` | obtenu |
| Actions titre / vitrine | — | obtenu |

Fermeture : bouton ✕, touche Échap, clic hors du panneau. Le focus retourne à la carte d'origine.

---

## 7. Calendrier d'activité

Grille façon « contributions » (idée F6) des 12 dernières semaines : une colonne par semaine, une ligne par jour
(lundi en haut). Un jour d'activité (§5 du document de définition) est une case pleine ; le jour courant est cerclé.

```
┌─ Mon activité ───────────────────────────────── 30 derniers jours : 19 jours actifs ──┐
│        S36   S37   S38   S39   S40   S41   S42   S43   S44   S45   S46   S47          │
│  Lun   ■     ■     □     ■     ■     ■     ■     ■     □     ■     ■     ■            │
│  Mar   ■     □     ■     ■     ■     □     ■     ■     ■     ■     ■     ■            │
│  Mer   □     ■     ■     ■     □     ■     ■     ■     ■     ■     ■     ◉            │
│  Jeu   ■     ■     ■     □     ■     ■     ■     □     ■     ■     ■                  │
│  Ven   ■     ■     ■     ■     ■     ■     □     ■     ■     ■     ■                  │
│  Sam   □     □     ■     □     □     ■     □     ■     □     ■     □                  │
│  Dim   □     □     □     □     ■     □     □     □     ■     □     □                  │
│  ■ jour d'activité   □ pas d'activité   ◉ aujourd'hui                                 │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

Une seule teinte (actif / inactif) : le projet ne mesure pas l'intensité, et une échelle de couleurs ajouterait de la
comparaison à soi-même sans valeur. Chaque case porte un nom accessible (« mercredi 4 novembre : activité »). Une
**alternative textuelle** résume la grille (« 19 jours actifs sur les 30 derniers jours, série de 12 jours »).

---

## 8. Réglages de gamification

```
┌─ Réglages de gamification ───────────────────────────────────────────────────────────┐
│  Objectif quotidien           [ 10 ] cartes ou  [ 1 ] exercice            (A1)        │
│  Rappel si ma série est menacée   ( ) Désactivé  (●) … (opt-in, désactivé par défaut) │
│                                                                           (A7)        │
│  Montrer mes badges à mes enseignants   [ off ]                                       │
│     Un enseignant ne voit que les badges obtenus avec une matière dont tu as          │
│     autorisé le partage.                                                              │
│  Animations d'obtention       [ on ]                                                  │
│  Mode zen                     [ off ]    Masque badges, séries, objectifs et          │
│                                          messages d'encouragement.            (G4)    │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

| Réglage | Valeur par défaut | Remarque |
|---|---|---|
| Objectif quotidien | Désactivé | Alimente l'anneau de progression de l'accueil (hors de cet écran) |
| Rappel de série menacée | Désactivé (opt-in) | Aucun rappel sans accord explicite |
| Visibilité des badges pour l'enseignant | Désactivée | Complète le consentement KPI, ne le remplace pas |
| Animations d'obtention | Activées | Aussi coupées par `prefers-reduced-motion` |
| Mode zen | Désactivé | Voir §9, état « mode zen » |

Les interrupteurs réutilisent `ToggleButton`. Chaque réglage est enregistré à l'action (pas de bouton global) avec
une confirmation par toast (`vue-toastification`).

---

## 9. États de l'écran

### 9.1 Compte neuf (aucun badge)

```
┌─ Bandeau niveau ──────────────────────────────────────────────────────────────────────┐
│  🎖 Niveau Débutant        ░░░░░░░░░░░░░░  0 / 5 badges pour devenir Apprenti          │
│  🔥 Série : 0 jour         Ta première pratique d'aujourd'hui lance ta série.           │
└────────────────────────────────────────────────────────────────────────────────────────┘
┌─ Ma vitrine ─────────────────────────────────────────────────────────────────────────┐
│  Obtiens ton premier badge pour le mettre en avant ici.                                │
└────────────────────────────────────────────────────────────────────────────────────────┘
Prochains badges :  [ 👣 Premier pas ]  [ 🃏 Première révision ]  [ ✨ Premier élan ]
```

Le bloc « Prochains badges » propose les 3 badges non obtenus les plus proches (plus forte progression relative).
Ton encourageant, jamais culpabilisant.

### 9.2 Série cassée

Texte : « Ta série est repartie à 0. Ta meilleure série reste de 21 jours — une nouvelle commence dès ta prochaine
pratique. » Aucun rouge, aucune icône d'alerte.

### 9.3 Mode zen

```
┌─ Mode zen activé ────────────────────────────────────────────────────────────────────┐
│  Les badges, séries et objectifs sont masqués. Tu les retrouveras quand tu voudras.   │
│  [ Désactiver le mode zen ]                                                            │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

Les badges continuent d'être comptés en arrière-plan (rien n'est perdu) ; seuls l'affichage, les notifications et
les animations sont coupés. Le réglage zen reste accessible.

### 9.4 Chargement, erreur, filtre vide

| État | Rendu |
|---|---|
| Chargement | `LoaderComponent` centré ; squelette de la grille non nécessaire (liste courte, 14 badges) |
| Erreur API | Bandeau « Impossible de charger tes badges. » + bouton « Réessayer » (le toast seul est insuffisant) |
| Filtre sans résultat | « Aucun badge ne correspond à ce filtre. » + bouton « Réinitialiser les filtres » |

### 9.5 Point d'entrée de l'animation d'obtention (hors périmètre de ce ticket)

À l'ouverture de l'application ou en fin de session, `GET /badges/me/recent` alimente la modale d'obtention (livrable
séparé). Sur cet écran, un badge obtenu et **non encore vu** porte une pastille « Nouveau » jusqu'à son marquage
comme vu (`PATCH /badges/me/seen`). Le marquage a lieu à l'ouverture de la page, pas au survol.

---

## 10. Données attendues et écarts avec l'API

### 10.1 Disponible aujourd'hui (C-06.01)

| Besoin de l'écran | Route | Champs utilisés |
|---|---|---|
| Liste des badges | `GET /badges` | `code`, `category`, `rarity`, `icon`, `label`, `description`, `scopable`, `linkedSubjectIds`, `earnedSubjectIds`, `earned`, `earnedAt`, `seenAt`, `progress {current,target}` |
| Niveau, série | `GET /badges/me/summary` | `level {name,next}`, `earnedCount`, `totalCount`, `streakCurrent`, `streakBest` |
| Badges non vus | `GET /badges/me/recent` | liste |
| Marquer comme vus | `PATCH /badges/me/seen` | `codes[]` |
| Badges pour la page KPI | `GET /kpi/my` | `badges[]` (même forme + `earnedSubjects`) |

### 10.2 Écarts : ce que la maquette suppose et que l'API ne fournit pas encore

| # | Besoin | Écart | Impact |
|---|---|---|---|
| E1 | Titre affiché (C1) et vitrine (C5) | Aucun champ ni route de préférence | `User` (ou table dédiée) + `PUT /badges/me/profile` |
| E2 | Calendrier d'activité (F6) | `UserActivityDay` existe mais aucune route de lecture | `GET /badges/me/activity?weeks=12` |
| E3 | Objectif quotidien (A1), rappel de série (A7), mode zen (G4), animations, visibilité enseignant | Aucun réglage persistant | Table ou colonnes de préférences + `GET/PATCH /badges/me/settings` |
| E4 | Noms des matières liées (`linkedSubjectIds`) | Seuls les identifiants sont renvoyés | Résoudre via le store des matières existant, ou ajouter `linkedSubjects` à `GET /badges` |
| E5 | « Prochains badges » (§9.1) | Calcul à faire côté front à partir de `progress` | Aucun écart API |
| E6 | Pastille « Nouveau » | `seenAt` est fourni | Aucun écart API |

Les écarts E1 à E3 modifient l'API ou le modèle : **à valider avant implémentation** (règle du projet sur les
interfaces publiques). La maquette de ces blocs est livrée pour fixer l'intention ; les blocs peuvent être
masqués tant que leur API n'existe pas (la page fonctionne sans vitrine, titre, calendrier ni réglages).

---

## 11. Composants, store et fichiers à créer

| Fichier | Rôle |
|---|---|
| `src/pages/BadgesPage.vue` | Page `/profile/badges`, assemblage des blocs (court, sans appel `api.*` direct) |
| `src/components/badges/BadgeLevelHeader.vue` | Bandeau niveau, jauge, série, titre |
| `src/components/badges/BadgeShowcase.vue` | Vitrine de 3 badges et mode de modification |
| `src/components/badges/BadgeGrid.vue` | Filtres, regroupement par catégorie |
| `src/components/badges/BadgeCard.vue` | Carte d'un badge (3 états) |
| `src/components/badges/BadgeDetailModal.vue` | Détail d'un badge |
| `src/components/badges/BadgeProgress.vue` | Barre de progression accessible (partagée avec le détail) |
| `src/components/badges/ActivityCalendar.vue` | Grille d'activité |
| `src/components/badges/GamificationSettings.vue` | Réglages et mode zen |
| `src/components/badges/ProfileBadgesSummary.vue` | Carte de synthèse insérée dans `ProfilePage.vue` |
| `src/stores/badges.js` | Store Pinia (`fetchAll`, `fetchSummary`, `markSeen`, cache court comme `classGroupResources`) |
| `src/helpers/badges.js` | Fonctions pures : `badgeState(badge)`, `rarityLabel`, `groupByCategory`, `filterBadges`, `nextBadges`, `levelProgress`, `formatEarnedDate` (testables sans composant) |
| `src/helpers/badgesApi.js` | Routes API (comme `flashcardsApi.js` / `mindmapApi.js`) |
| `src/router/routes.js` | Route `badges` |

Modifications de fichiers existants : `ProfilePage.vue` (carte de synthèse), `KpiPage.vue` (lien « Voir tous »,
pastilles inchangées), `routes.js`. Aucune dépendance externe : la jauge, la grille et le calendrier sont en CSS.

---

## 12. Responsive et accessibilité

### Responsive

| Largeur | Disposition |
|---|---|
| ≥ 1024 px | Grille de badges 4 à 5 colonnes ; niveau et titre côte à côte |
| 640–1023 px | 3 colonnes ; vitrine sur une ligne |
| < 640 px | 2 colonnes ; titre sous le niveau ; calendrier en défilement horizontal avec la semaine courante visible ; détail du badge en plein écran |

### Accessibilité (RGAA, conventions du projet)

- **Contraste** : texte ≥ 4,5:1 ; pas de `text-dark/60` ni de `slate-400` ; les icônes estompées d'un badge verrouillé ne portent jamais l'information seule, le texte garde son contraste.
- **Jauges** : élément `progress` natif (ou `role="progressbar"` avec `aria-valuenow/min/max`) **plus** le texte « 4 / 10 ».
- **Rareté et état** : libellé + forme (●, ◆, ★) + texte « Obtenu le … » ; jamais la couleur seule.
- **Grille** : liste (`ul`) de boutons ; chaque carte a un nom accessible complet (« 10 exercices, rare, non obtenu, 4 sur 10 »).
- **Filtres** : onglets avec `role="tablist"` / `aria-selected`, ou groupe de boutons radio dans un `fieldset` (comme le formulaire de signalement).
- **Modale** : `role="dialog"`, `aria-labelledby`, focus piégé puis rendu à la carte, Échap, fond blanc explicite.
- **Calendrier** : alternative textuelle ; cases avec nom accessible ; navigation par flèches optionnelle, mais le résumé textuel est obligatoire.
- **Mouvement** : aucune animation sur cet écran sauf un remplissage de jauge de 200 ms, supprimé sous `prefers-reduced-motion`.
- **Mode zen** : une zone `aria-live="polite"` annonce « Mode zen activé » / « désactivé ».
- **Titres** : `h1` « Mes badges », `h2` par bloc, `h3` par catégorie (pas de saut de niveau — non-conformité 9.2 déjà relevée par l'audit RGAA).
- **Outillage à ajouter** : la page à `e2e-a11y/pages.spec.js` (état vide), un état rempli sur le modèle de `classroom-filled.spec.js` (API simulée avec badges obtenus, en cours et vitrine), un test axe-core jsdom des composants isolés, et `npm run audit:a11y`.

---

## 13. Parcours utilisateur

**Nominal.** Marie ouvre « Mon profil » → la carte « Mes succès » affiche Apprenti, 12 jours de série et ses 3 derniers
badges → elle clique « Voir tous mes badges » → elle lit sa progression vers « 30 jours de suite » (12 / 30) → elle
ouvre « Score parfait » → elle le met en vitrine et le choisit comme titre → elle règle un objectif quotidien de
10 cartes.

**Compte neuf.** Le bandeau affiche Débutant et 0 badge, la vitrine invite à en obtenir un, « Prochains badges »
propose trois premiers pas faciles ; aucun message d'échec.

**Retour après une absence.** La série affiche 0 avec la meilleure série conservée ; le message encourage à
recommencer ; aucun badge n'est retiré.

**Mode zen.** L'utilisateur active le mode zen : la page n'affiche que le bandeau d'information et le bouton pour le
désactiver ; la carte « Mes succès » du profil et les pastilles de la page KPI sont masquées.

---

## 14. Hors périmètre et points à valider

### Hors périmètre de ce ticket

- Modale d'animation d'obtention (livrable séparé, §9.5 ne décrit que son point d'entrée).
- Anneau d'objectif quotidien et flamme de série dans l'en-tête de l'application (autres écrans, idées A1/A2).
- Classements, comparaisons entre élèves, monnaie, achats, partage sur réseaux sociaux.
- Interface d'administration des liens badge ↔ matières.
- Mise à jour du prototype interactif `docs/prototype/` et de ses captures (non régénérés).
- Idées reportées : avatars, thèmes, mascotte, sons, haptique, coopération, tableau enseignant.

### À valider

1. **Emplacement** : page dédiée `/profile/badges` plutôt que section de `ProfilePage.vue` (§1).
2. **Vitrine** limitée à 3 badges, **titre** unique (§3, §4).
3. **Calendrier** : 12 semaines, une seule teinte (§7).
4. **Prochains badges** : critère « plus forte progression relative » (§9.1).
5. **Écarts E1 à E3** : nouvelles routes et préférences à valider avant toute implémentation (§10.2).
6. **Mode zen** : masque la carte du profil et les pastilles de la page KPI (§9.3, §13).
7. **Objectif quotidien** : unités (cartes ou exercice) et valeurs par défaut (§8).
