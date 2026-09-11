# Maquettes UI — Bibliothèque de ressources pédagogiques

> Livrable **C-03.02** (feature list `C-03`, source planning `C-03.02`, V2, US-17, tâche « Analyse »).
> Périmètre strict de ce document : la **maquette UI de la bibliothèque de ressources** (types de ressources,
> upload, partage par groupe, contrôle d'accès, bibliothèque de groupe) — pas d'extension hors version (LMS
> complet, versioning documentaire avancé, édition collaborative de fichiers restent hors périmètre).
>
> **Particularité de ce document — maquette rétroactive** : contrairement à la majorité des documents
> `diagrams/*_ui.md` de ce projet (produits *avant* le code, ex. `generation_ia_exercices_ui.md` pour C-02.02),
> l'implémentation de la bibliothèque de ressources existe déjà et est **en production** depuis le ticket
> S-03.08 (2026-06-26, modèle/service/controller) puis S-02.05 (2026-06-27, CRUD + 34 tests). Le feature list
> `C-03` liste cependant « Maquettes UI bibliothèque ressources » comme un livrable IN distinct de « Définition
> types ressources partageables » (C-03.01) — ce document comble ce trou de traçabilité en auditant l'écran
> réel et en le documentant sous forme de maquette, exactement le traitement appliqué à S-06.02 (« Maquettes UI
> éditeur de formules » — voir `CHANGELOG_AGENT.md`, entrée du 2026-07-19 : *"l'implémentation Vue réelle a
> précédé les maquettes"*). Ce n'est donc pas un document de conception préalable mais un **audit-maquette** de
> l'existant, qui sert aussi de check-list pour la dette identifiée (§9).

---

## 1. Contexte d'intégration

Deux vues sont concernées, toutes deux hébergées dans `ClassroomPage.vue` (routeur par rôle) :

| Vue | Fichier | Acteur | Section |
|---|---|---|---|
| Vue étudiant | `ClassroomEtudiantView.vue` | Étudiant | « Documents partagés » — lecture seule, colonne unique |
| Vue enseignant | `ClassroomEnseignantView.vue` | Enseignant / admin | « Partager un document » (formulaire) + « Documents partagés » (liste + suppression) — colonne droite |

Store Pinia commun aux deux vues : `stores/classGroupResources.js`.
API : `GET/POST/PUT/DELETE /class-groups/:id/resources` (`ClassGroupResource.controller.js`).

---

## 2. Vue étudiant — Bibliothèque (lecture seule)

### 2.1 Position dans la page

```
┌─ ClassroomEtudiantView ──────────────────────────────────────────────────┐
│  [Sélecteur de groupe]                                                    │
│  [Barre de recherche]                          (filtre sections/rendus    │
│                                                  uniquement, PAS les       │
│                                                  ressources — voir §9)     │
│  [A] Prochaines séances                                                   │
│  [B] Sections du cours                                                    │
│  [C] Rendus à remettre                                                    │
│  [D] Échéances à venir                                                    │
│  [E] Documents partagés               ← bibliothèque de ressources        │
│  [F] Partage de mes KPI                                                   │
└──────────────────────────────────────────────────────────────────────────┘
```

### 2.2 État — liste de ressources

```
┌─ Documents partagés ───────────────────────────────────────────────────────┐
│                                                                              │
│  📕  Chapitre 3 — Thermodynamique                                          │
│      Cours · M. Dupont · 2.4 Mo                          [Télécharger]     │
│                                                                              │
│  🖼  Schéma circuit électrique                                             │
│      Autre · M. Dupont · 340 Ko                           [Télécharger]     │
│                                                                              │
│  📝  Consignes DS n°2                                                       │
│      Sujet · Mme Lefebvre · 89 Ko                          [Télécharger]     │
│                                                                              │
│  📊  Carte mentale — Révolution française                                  │
│      Carte mentale · Mme Lefebvre · 1.1 Mo                 [Télécharger]     │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────┘
```

- Icône déterminée par `mimeType` (§4.2) — pas par le champ `type` métier.
- Bouton « Télécharger » affiché uniquement si `r.fileKey` est renseigné (une ressource peut n'être qu'un lien
  `url` sans fichier — voir §9, ce cas n'a pourtant aucun rendu dédié dans le template actuel).
- Tri : `createdAt DESC` (le plus récent en premier), imposé côté service (`ClassGroupResource.service.js`),
  aucun tri manuel côté front.

### 2.3 État — aucune ressource

```
┌─ Documents partagés ───────────────────────────────────────────────────────┐
│                                                                              │
│  Aucun document partagé.                                                   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────┘
```

### 2.4 État — chargement

```
┌─ Documents partagés ───────────────────────────────────────────────────────┐
│  Chargement...                                                             │
└──────────────────────────────────────────────────────────────────────────┘
```

> **Correctif d'audit (2026-09-08)** — la première version de ce document affirmait que le message "Aucune
> ressource correspondante." était mort code. Erreur de lecture : un second `computed filteredResources`
> (dédié aux ressources, distinct de celui des sections/rendus) filtre bien `resourceStore.resources` par
> `title`/`type` — la recherche fonctionne correctement sur les ressources. Point retiré de la liste de dette
> (§9).

---

## 3. Vue enseignant — Bibliothèque + gestion

### 3.1 Position dans la page

```
┌─ ClassroomEnseignantView — Colonne droite ────────────────────────────────┐
│                                                                             │
│  Créer une section / un rendu                    (existant)               │
│  Partager un document              ← formulaire d'ajout (NOUVEAU §3.2)    │
│  Documents partagés                ← liste + suppression (NOUVEAU §3.3)   │
│  Ajouter une échéance                             (existant)               │
│  Inviter un étudiant                              (existant)               │
│  Membres                                          (existant)               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Formulaire « Partager un document »

```
┌─ Partager un document ────────────────────────────────────────────────────┐
│                                                                             │
│  [Titre *________________________________]                                │
│                                                                             │
│  Type de ressource                                                        │
│  [Cours                                          ▼]                       │
│   (options : Cours | Carte mentale | Sujet / DS | Autre)                  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │        Glissez un fichier ici ou parcourez                        │   │
│  │        PDF, Word, PowerPoint, Excel — max 10 Mo                    │   │
│  │                                                                     │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│              [                    Partager                    ]          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Fichier sélectionné (avant envoi) :**

```
  ┌───────────────────────────────────────────────────────────────────┐
  │  chapitre3-thermo.pdf                                              │
  │  2.4 Mo                                                             │
  │  Retirer                                                            │
  └───────────────────────────────────────────────────────────────────┘
```

**Pendant l'upload :**

```
              [              Upload en cours...                ]   ← désactivé
```

**Erreur de validation locale (avant appel réseau) :**

```
  Le titre est requis.
  — ou —
  Sélectionnez un fichier à partager.
```

### 3.3 Liste « Documents partagés » (vue enseignant)

```
┌─ Documents partagés ──────────────────────────────────────────────────────┐
│                                                                             │
│  📕  Chapitre 3 — Thermodynamique                                         │
│      Cours · 2.4 Mo                                    [Ouvrir]  [×]      │
│                                                                             │
│  🖼  Schéma circuit électrique                                            │
│      Autre · 340 Ko                                    [Ouvrir]  [×]      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

```
┌─ Documents partagés ──────────────────────────────────────────────────────┐
│  Aucun document.                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Confirmation avant suppression (ajoutée le 2026-09-08) :**

```
┌─────────────────────────────────────────────────────┐
│  Supprimer la ressource                          [X]│
├─────────────────────────────────────────────────────┤
│  Supprimer « Chapitre 3 — Thermodynamique » ?        │
│  Cette action est irréversible.                       │
│                                                       │
│          [Annuler]      [Confirmer]                  │
└─────────────────────────────────────────────────────┘
```

- `[×]` ouvre une modale de confirmation générique (`ModalComponent`, pattern identique à la révocation KPI de
  `kpi_consent_ui.md` §2.4) avant d'appeler `resourceStore.delete(...)`. **Correctif d'audit (2026-09-08)** :
  la première version de ce document signalait l'absence de confirmation comme une incohérence isolée
  spécifique aux ressources ; en réalité, aucune action destructrice de `ClassroomEnseignantView.vue`
  (section, échéance, membre, ressource) n'avait de confirmation — c'était le comportement établi de toute la
  vue, pas une exception. La correction a donc porté sur les **4 actions** de la vue via une modale de
  confirmation générique partagée (`confirmModal` + `askConfirm(title, message, action)`), pas uniquement sur
  la suppression de ressource.
- `[Ouvrir]` visible uniquement si `r.fileKey` existe (même condition que le bouton Télécharger côté étudiant).
- Pas de bouton d'édition (titre/type/description) bien que `PUT /class-groups/:id/resources/:resourceId`
  existe côté API et soit testé (20 tests controller) — aucun point d'entrée front. Voir §9.

---

## 4. Détail des composants

### 4.1 Formulaire de partage (vue enseignant uniquement)

| Champ | Contrôle | Notes |
|---|---|---|
| Titre | `<input>` texte, requis | Validé côté front avant upload (`resourceForm.error`) et côté API (`max 150 car.`, `ClassGroupResource.validators.js`) |
| Type | `<select>` | 4 valeurs figées : `cours` / `carte_mentale` / `sujet` / `autre` — mêmes valeurs que C-03.01 (modèle), pas de type libre |
| Fichier | zone drag & drop + `<input type="file">` caché, `accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/*"` | Requis côté front (pas de ressource "lien seul" possible depuis ce formulaire malgré le champ `url` du modèle — voir §9) |
| Bouton | désactivé pendant `resourceStore.uploading` | Libellé passe à « Upload en cours... » |

### 4.2 Icône par type de fichier (`fileIcon(mimeType)`)

| `mimeType` | Icône |
|---|---|
| `application/pdf` | 📕 |
| `image/*` | 🖼 |
| contient `word`/`document` | 📝 |
| contient `presentation`/`powerpoint` | 📊 |
| contient `sheet`/`excel` | 📈 |
| absent ou autre | 📄 |

> L'icône dépend du **type MIME réel du fichier**, pas du champ `type` métier (`cours`/`carte_mentale`/…) — les
> deux informations sont affichées côte à côte (icône + libellé texte, §4.3) mais ne se recouvrent pas.

### 4.3 Libellé du type métier (`resourceTypeLabel(type)`)

| Valeur stockée | Libellé affiché |
|---|---|
| `cours` | Cours |
| `carte_mentale` | Carte mentale |
| `sujet` | Sujet |
| `autre` | Autre |

### 4.4 Taille de fichier (`formatFileSize(bytes)`)

| Plage | Format |
|---|---|
| `< 1024` | `X o` |
| `< 1024 * 1024` | `X Ko` (arrondi entier) |
| `≥ 1024 * 1024` | `X.X Mo` (1 décimale) |

### 4.5 Téléchargement / ouverture

| Action | Vue | Comportement |
|---|---|---|
| `[Télécharger]` (étudiant) | `downloadFile(fileKey)` | `GET /storage/presign?key=...&disposition=attachment` → redirection `window.location.href` vers l'URL présignée |
| `[Ouvrir]` (enseignant) | `openFile(fileKey)` | Même mécanisme de presign, sans le paramètre `disposition=attachment` (ouverture navigateur plutôt que téléchargement forcé) |

---

## 5. Store Pinia — `classGroupResources.js` (existant)

```javascript
// stores/classGroupResources.js
state: {
  resources: [],
  currentGroupId: null,
  uploading: false,
  _cache: {},              // { [groupId]: timestamp } — TTL 5 min
}

actions:
  fetchByGroup(groupId, force = false)     // GET /class-groups/:id/resources — cache TTL 5 min
  uploadAndCreate(groupId, file, metadata) // POST /storage/upload PUIS POST /class-groups/:id/resources
  delete(groupId, resourceId)              // DELETE /class-groups/:id/resources/:resourceId
```

- Pas d'action `update` malgré la route API disponible (§3.3, §9).
- `uploadAndCreate` est un flux en **deux appels réseau séquentiels** : si le premier (`storage/upload`)
  réussit mais le second (`resources`) échoue, le fichier reste orphelin sur S3 (aucun rollback) — dette déjà
  connue au niveau service (voir `classroom_enseignant.md` §4.4 : *"Pas de validation du fileKey côté API"*).

---

## 6. Flux utilisateur — scénario nominal

```
ENSEIGNANT
  1. Ouvre ClassroomEnseignantView → groupe "Terminale S1"
  2. Renseigne le titre "Chapitre 3 — Thermodynamique"
  3. Sélectionne le type "Cours"
  4. Glisse un PDF dans la zone de dépôt (ou clique pour parcourir)
  5. Clique "Partager"
  6. Toast : "Ressource ajoutée."
  7. La ressource apparaît en tête de "Documents partagés" (tri par date desc)

ÉTUDIANT
  1. Ouvre ClassroomEtudiantView → groupe "Terminale S1"
  2. Voit "Chapitre 3 — Thermodynamique" dans "Documents partagés"
  3. Clique "Télécharger" → URL présignée S3 → téléchargement direct

ENSEIGNANT — suppression
  1. Clique [×] sur une ressource
  2. Suppression immédiate (aucune confirmation) — fichier S3 supprimé puis ligne BDD
  3. La ressource disparaît de la liste enseignant ET étudiant (au prochain fetch, TTL 5 min sinon)
```

---

## 7. Contrôle d'accès (rappel — déjà couvert par C-03.01, resitué ici pour la maquette)

| Action | Étudiant membre | Enseignant du groupe | Admin (roleId 1/4) | Non-membre |
|---|---|---|---|---|
| Lire la bibliothèque | ✓ | ✓ | ✓ | 403 |
| Partager une ressource | — | ✓ | ✓ | 403 |
| Modifier une ressource (API only, §9) | — | ✓ | ✓ | 403 |
| Supprimer une ressource | — | ✓ | ✓ | 403 |

Aucune notion de "propriétaire unique" : un enseignant peut supprimer une ressource partagée par un autre
enseignant du même groupe (contrôle par `role = teacher` sur le groupe, pas par `createdBy`).

---

## 8. Responsive et accessibilité

| Point | État actuel |
|---|---|
| Mobile | Colonnes empilées (grille `space-y-4` / `grid` du parent) — formulaire et liste prennent toute la largeur |
| Zone drag & drop | `role="button"` + `tabindex="0"` + gestion `Enter`/`Espace` — accessible clavier |
| Champs formulaire | `aria-label` sur titre, type, zone de dépôt, input fichier caché, bouton suppression |
| Fond | `bg-white` explicite sur les cartes (règle projet) |
| Contraste erreur | `text-secondary` (orange) pour les messages d'erreur — cohérent avec les autres formulaires de la page |

---

## 9. Points d'attention (dette identifiée par l'audit)

> **Historique de cette section (2026-09-08)** — la version initiale listait 5 points. Deux ont été revus après
> vérification approfondie du code : le point "recherche ne filtre pas les ressources" était une erreur de
> lecture (retiré, voir §2.4) ; le point "pas de confirmation avant suppression" a été corrigé le jour même,
> étendu aux 4 actions destructrices de `ClassroomEnseignantView.vue` plutôt qu'à la seule ressource (voir §3.3
> et `DECISIONS.md`). Les 3 points suivants restent des points d'attention **non corrigés** (hors périmètre
> d'un ticket d'analyse UI) :

- **Pas d'UI d'édition** (titre/type/description) alors que `PUT /class-groups/:id/resources/:resourceId`
  existe et est testé côté API — dette d'UI pure, aucun blocage technique identifié.
- **Champ `url` du modèle inatteignable depuis le formulaire actuel** — le formulaire de partage impose un
  fichier (`resourceForm.file` requis), alors que le modèle `ClassGroupResource` et le validateur acceptent une
  ressource composée uniquement d'une `url` (lien externe, sans fichier). Aucun rendu dédié dans le template
  pour une ressource sans `fileKey` (`[Télécharger]`/`[Ouvrir]` ne s'affichent pas, aucune alternative "Ouvrir
  le lien").
- **Pas de filtre par type de ressource** dans la bibliothèque (ni étudiant ni enseignant) — la liste est plate,
  sans regroupement ni filtre par `cours`/`carte_mentale`/`sujet`/`autre` malgré la maquette KPI/navigation par
  sujet du projet qui utilise ce pattern ailleurs (`ui_navigation_sujet.md`, `TagSelectorComponent`).
- **Taille max 10 Mo affichée mais non appliquée côté API** — déjà noté dans `classroom_enseignant.md` §4.4 ;
  en cas de désynchronisation avec `MAX_UPLOAD_SIZE_MB` (dette similaire relevée en C-02.02 §11 côté génération
  IA), le message affiché serait inexact.

**Corrigé le 2026-09-08** : confirmation avant suppression, généralisée aux 4 actions destructrices de
`ClassroomEnseignantView.vue` (section/rendu, échéance, membre, ressource) via une modale de confirmation
générique partagée (`confirmModal` + `askConfirm(title, message, action)`, `ModalComponent` réutilisé). Voir
§3.3 et l'entrée `DECISIONS.md` du même jour.

---

## 10. Liens

| Fichier | Rôle |
|---|---|
| `diagrams/classroom_enseignant.md` §4.4/§5.3 | Modèle de données, règles métier, endpoints (S-03.12) |
| `my_memo_master_api/models/ClassGroupResource.model.js` | Modèle (C-03.01) |
| `my_memo_master_api/services/ClassGroupResource.service.js` | Logique métier back (C-03.01) |
| `my_memo_master_api/controllers/ClassGroupResource.controller.js` | Endpoints CRUD |
| `my_memo_master_api/validators/ClassGroupResource.validators.js` | Validation entrée |
| `my_memo_master_front/src/pages/ClassroomEtudiantView.vue` | Vue étudiant (§2) |
| `my_memo_master_front/src/pages/ClassroomEnseignantView.vue` | Vue enseignant (§3) |
| `my_memo_master_front/src/stores/classGroupResources.js` | Store (§5) |
