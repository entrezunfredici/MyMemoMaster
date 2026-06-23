# Documentation technique — Éditeur de cartes mentales

**Ticket** : M-02.14 · Feature list M-01 · MVP Sprint 6  
**Périmètre** : Canvas interactif, nœuds/branches, sauvegarde JSON, organisation par matière  
**Date** : 2026-06-23

---

## Table des matières

1. [Architecture générale](#1-architecture-générale)
2. [Format de données — mindMapJson](#2-format-de-données--mindmapjson)
3. [Back-end](#3-back-end)
   - 3.1 Modèle `MindMap`
   - 3.2 Service `DiagrammeService`
   - 3.3 Contrôleur `Diagramme.controller.js`
   - 3.4 Routes `/api/v1/diagrammes`
   - 3.5 Middleware `mindmapImageUpload.js`
4. [Front-end — couche pages](#4-front-end--couche-pages)
   - 4.1 `MindmapsPage.vue`
   - 4.2 `MindmapsListView.vue`
   - 4.3 `MindmapsEditorView.vue`
5. [Front-end — éditeur](#5-front-end--éditeur)
   - 5.1 `MindMapBuilder.vue`
   - 5.2 `MindMapBoard.vue`
   - 5.3 `MindMapNode.vue`
   - 5.4 `MindMapLink.vue`
   - 5.5 `MindMapZone.vue`
   - 5.6 `MindMapPalette.vue`
6. [State management — `mindmapBuilder.js`](#6-state-management--mindmapbuilderjs)
7. [Helpers — `mindmap.js`](#7-helpers--mindmapjs)
8. [Couverture de tests](#8-couverture-de-tests)
9. [Points d'attention et dette technique](#9-points-dattention-et-dette-technique)

---

## 1. Architecture générale

```
┌─────────────────────────────────────────────────────────┐
│  MindmapsPage.vue                                       │
│  ├─ MindmapsListView.vue       (vue liste)              │
│  └─ MindmapsEditorView.vue     (vue éditeur)            │
│       └─ MindMapBuilder.vue    (builder principal)      │
│            ├─ MindMapBoard.vue (canvas SVG)             │
│            │    ├─ MindMapZone.vue  (zones groupement)  │
│            │    ├─ MindMapLink.vue  (branches SVG)      │
│            │    └─ MindMapNode.vue  (nœuds SVG)         │
│            └─ MindMapPalette.vue   (panneau latéral)    │
└─────────────────────────────────────────────────────────┘
               ↕ Pinia store : useMindMapBuilderStore
```

**Flux de données** :
- `MindmapsPage` est le coordinateur de navigation. Il pilote `view` (`'list'` ou `'editor'`), pré-charge les matières via `useSubjectStore`, et transfère les payloads d'une vue à l'autre.
- `MindmapsEditorView` orchestre les sauvegardes API et le statut (`isDirty`). Il ne touche pas directement le store.
- `MindMapBuilder` reçoit un `mapPayload` en prop, déclenche `store.load()` ou `store.new()` via un watcher, et redélivre les événements `save` / `export` / `new-map` vers l'éditeur parent.
- `MindMapBoard` et `MindMapPalette` consomment le store directement — aucune prop de données descend dans ces composants.
- Tout état éditeur est centralisé dans `mindmapBuilder` (Pinia). Il n'y a pas de communication directe entre `MindMapBoard` et `MindMapPalette`.

**Persistence** : le contenu d'une carte est sérialisé en JSON (`serializeMindMap`) et stocké en base dans la colonne `mindMapJson` (type JSON/TEXT Sequelize).

---

## 2. Format de données — mindMapJson

Structure complète d'une carte sérialisée :

```json
{
  "id": "<uuid>",
  "title": "Nom de la carte",
  "subjectNodeId": "<uuid>",
  "disciplineIds": [],
  "zones": [
    {
      "id": "<uuid>",
      "name": "Zone A",
      "color": "#BFDBFE",
      "layout": { "x": 200, "y": 200, "width": 360, "height": 240 },
      "collapsed": false
    }
  ],
  "branchTypes": [
    { "id": "appartenance", "label": "Appartenance" },
    { "id": "composition",  "label": "Composition" },
    { "id": "definition",   "label": "Definition" },
    { "id": "calcul",       "label": "Calcul" },
    { "id": "causalite",    "label": "Causalite" },
    { "id": "correlation",  "label": "Correlation" }
  ],
  "nodes": {
    "<uuid>": {
      "id": "<uuid>",
      "label": "Titre du nœud",
      "type": "text",
      "content": "Contenu ou URL image",
      "mastery": "undefined",
      "idCard": null,
      "idSystem": null,
      "zoneId": null,
      "style": {
        "primaryColor": "#1E3A8A",
        "secondaryColor": "#C0C5D2",
        "shape": "bubble",
        "width": 220,
        "height": 120,
        "textColor": "#eef2ff",
        "fontSize": 14,
        "fontWeight": "normal",
        "fontStyle": "normal",
        "textDecoration": "none"
      },
      "layout": { "x": 400, "y": 350, "radius": null, "angle": null },
      "collapsed": false,
      "meta": { "isSubject": true, "order": 0 }
    }
  },
  "links": [
    {
      "id": "<uuid>",
      "from": "<uuid-nœud-source>",
      "to": "<uuid-nœud-cible>",
      "type": "appartenance",
      "direction": "forward",
      "order": 0,
      "style": {
        "primaryColor": "#1E3A8A",
        "secondaryColor": "#C0C5D2",
        "bezier": true
      },
      "interactions": {
        "transfersValue": false,
        "togglesVisibility": false
      }
    }
  ],
  "history": { "stack": [], "index": -1 },
  "updatedAt": "2026-06-23T10:00:00.000Z"
}
```

**Champs clés** :

| Champ | Type | Description |
|-------|------|-------------|
| `subjectNodeId` | UUID | Nœud racine — toujours présent. Centre du canvas. |
| `nodes` | Object (keyed by UUID) | Dictionnaire indexé par ID pour O(1) lookup. |
| `node.type` | `'text'` \| `'formula'` \| `'image'` | Détermine le rendu du contenu dans `MindMapNode`. |
| `node.content` | string | Texte libre, LaTeX, ou URL d'image selon `type`. |
| `node.mastery` | `'undefined'` \| `'low'` \| `'medium'` \| `'high'` | Synchronisé depuis Leitner quand `idCard` est renseigné. |
| `node.idCard` / `idSystem` | integer \| null | Lien vers une flashcard Leitner. Null si non lié. |
| `node.meta.isSubject` | boolean | Identifie le nœud racine pour la détection lors du chargement. |
| `links` | Array | Orientés `from → to`. Direction `'bidirectional'` possible. |
| `zones` | Array | Zones de regroupement visuel (rectangles dashed). |

---

## 3. Back-end

### 3.1 Modèle `MindMap`

**Fichier** : `my_memo_master_api/models/Diagramme.model.js`  
**Table Sequelize** : `MindMap`

| Colonne | Type | Contrainte |
|---------|------|-----------|
| `idMindMap` | INTEGER | PK, auto-increment |
| `mmName` | STRING(50) | NOT NULL |
| `mindMapJson` | JSON | NOT NULL — contient la carte complète sérialisée |
| `userId` | INTEGER | FK → `User.userId`, NOT NULL |
| `subjectId` | INTEGER | FK → `Subject.subjectId`, NOT NULL |

**Associations** : `belongsTo User`, `belongsTo Subject`.  
**Indexes** : `userId`, `subjectId`.  
**timestamps** : désactivés (`timestamps: false`).

### 3.2 Service `DiagrammeService`

**Fichier** : `my_memo_master_api/services/Diagramme.service.js`  
Instance singleton exportée (`module.exports = new DiagrammeService()`).

| Méthode | Signature | Description |
|---------|-----------|-------------|
| `findAll()` | `→ Promise<MindMap[]>` | Toutes les cartes (admin). |
| `findById(id)` | `(id) → Promise<MindMap\|null>` | Par PK. |
| `findOne(id)` | `(id) → Promise<MindMap\|null>` | Alias de `findById`. |
| `findByUser(userId, opts)` | `(userId, {subjectId?}) → Promise<MindMap[]>` | Cartes d'un utilisateur, filtre optionnel par matière. |
| `create(data)` | `(data) → Promise<MindMap>` | Création directe Sequelize. |
| `update(id, data)` | `(id, data) → Promise<MindMap>` | Trouve puis `.update()`. Lève `Error('Diagramme not found')` si absent. |
| `delete(id)` | `(id) → Promise<void>` | Trouve puis `.destroy()`. Lève `Error('Diagramme not found')` si absent. |
| `resolveSubject(subjectId?)` | `(id?) → Promise<number>` | Vérifie l'existence du sujet ou crée `'Sujet par défaut'`. Retourne l'ID résolu. |

### 3.3 Contrôleur `Diagramme.controller.js`

**Fichier** : `my_memo_master_api/controllers/Diagramme.controller.js`

| Handler | Méthode HTTP | Comportement |
|---------|-------------|-------------|
| `findAll` | GET | Retourne les cartes de l'utilisateur connecté (`req.user.id`), filtre `?subjectId=`. |
| `findOne` | GET | Retourne une carte par ID. 404 si absent ou si `userId` ≠ `req.user.id`. |
| `create` | POST | Résout le sujet via `resolveSubject`, crée et retourne la carte (201). |
| `update` | PUT | Met à jour `mmName` et `mindMapJson`. 404 si non trouvé. |
| `delete` | DELETE | Supprime après vérification du propriétaire. |
| `uploadImage` | POST | Reçoit le fichier depuis `mindmapImageUpload`, retourne l'URL. |

**Logique `uploadImage` — sélection de l'URL** :

```
if S3_BUCKET && req.file.key
  → url = req.file.location  (multer-s3)
     ou ${S3_PUBLIC_URL}/${S3_BUCKET}/${req.file.key}  (fallback)
  → pas de champ `path`
else (stockage local dev)
  → url = ${baseUrl}/api/uploads/mindmaps/${filename}
  → path = /api/uploads/mindmaps/${filename}
```

La réponse 201 contient : `{ message, url, path? (local only), key, size, mimetype }`.

### 3.4 Routes `/api/v1/diagrammes`

**Fichier** : `my_memo_master_api/routes/Diagramme.routes.js`

| Méthode | Chemin | Auth | Validation | Handler |
|---------|--------|------|-----------|---------|
| GET | `/diagrammes` | JWT | — | `findAll` |
| GET | `/diagrammes/:id` | JWT | — | `findOne` |
| POST | `/diagrammes` | JWT | `diagrammeValidators.create` | `create` |
| PUT | `/diagrammes/:id` | JWT | `diagrammeValidators.update` | `update` |
| DELETE | `/diagrammes/:id` | JWT | — | `delete` |
| POST | `/diagrammes/upload-image` | JWT | `mindmapImageUpload.single('image')` | `uploadImage` |

**Codes d'erreur `upload-image`** :
- `413` — fichier > 5 Mo (`LIMIT_FILE_SIZE`)
- `400` — type MIME non supporté (`INVALID_FILE_TYPE`)
- `500` — erreur multer inattendue

### 3.5 Middleware `mindmapImageUpload.js`

**Fichier** : `my_memo_master_api/middlewares/mindmapImageUpload.js`

Sélectionne dynamiquement le backend de stockage selon la présence de `S3_BUCKET` :

| Variable env | Absent | Présent |
|---|---|---|
| `S3_BUCKET` | diskStorage → `public/uploads/mindmaps/` | multerS3 → `mindmaps/<timestamp>-<random>.<ext>` |

**Types MIME acceptés** : `image/jpeg`, `image/png`, `image/gif`, `image/webp`.  
**Limite** : 5 Mo.  
**Clé S3** : `mindmaps/${Date.now()}-${random}${ext}` — préfixe distinct de `uploads/` (utilisé par `Storage.middleware.js`).

---

## 4. Front-end — couche pages

### 4.1 `MindmapsPage.vue`

**Fichier** : `my_memo_master_front/src/pages/MindmapsPage.vue`

Coordinateur de navigation. Gère l'état `view` (`'list'` | `'editor'`).

**État local** :

| Ref | Type | Rôle |
|-----|------|------|
| `view` | `'list'` \| `'editor'` | Vue active. |
| `editorDiagramId` | `number \| null` | ID de la carte en cours d'édition (null = nouvelle). |
| `editorDiagramMeta` | `object \| null` | Métadonnées (`mmName`, `subjectId`). |
| `editorMapPayload` | `object \| null` | JSON parsé de la carte, transmis à `MindmapsEditorView`. |

**Événements traités** :

| Émetteur | Événement | Action |
|----------|-----------|--------|
| `MindmapsListView` | `@open(diagram)` | Parse `mindMapJson`, remplit les refs, passe en vue `'editor'`. |
| `MindmapsListView` | `@create({name, subjectId})` | Initialise une carte vide, appelle `store.new(name)`, passe en `'editor'`. |
| `MindmapsEditorView` | `@back` | Repasse en `'list'`. |

### 4.2 `MindmapsListView.vue`

**Fichier** : `my_memo_master_front/src/components/mindmap/MindmapsListView.vue`

Affiche la liste des cartes via `ItemListLayout` + `MenuItem`. Gère les modales de création et renommage.

**Props** :

| Prop | Type | Description |
|------|------|-------------|
| `subjects` | `Array` | Liste des matières (pour le select des modales). |

**Événements émis** :

| Événement | Payload | Quand |
|-----------|---------|-------|
| `open` | `diagram` (objet complet) | Clic sur le bouton d'action d'une carte. |
| `create` | `{ name, subjectId }` | Validation de la modale de création. |

**Appels API** :

| Action | Méthode | Endpoint |
|--------|---------|---------|
| Chargement initial | GET | `diagrammes` |
| Renommer | PUT | `diagrammes/:id` |
| Supprimer | DEL | `diagrammes/:id` |

**Comportement notable** : la mise à jour après renommage est faite localement (mutation du tableau `diagrams`) pour éviter un rechargement réseau.

### 4.3 `MindmapsEditorView.vue`

**Fichier** : `my_memo_master_front/src/components/mindmap/MindmapsEditorView.vue`

Topbar de l'éditeur + orchestre la sauvegarde. Ne rend pas le canvas directement.

**Props** :

| Prop | Type | Description |
|------|------|-------------|
| `diagramId` | `number \| null` | Null = nouvelle carte. |
| `diagramMeta` | `object` | `{ mmName, subjectId }` |
| `mapPayload` | `object \| null` | JSON de la carte à charger dans le builder. |
| `subjects` | `Array` | Pour le select matière de la modale d'export. |

**Événements émis** : `back`.

**Indicateur de statut** (classe `.editor-save-status`) :

| Condition | Texte affiché |
|-----------|--------------|
| `isSaving === true` | `"Sauvegarde…"` |
| `isDirty === false && map.updatedAt` | `"Sauvegardé ✓"` |
| `isDirty === true` | *(aucun indicateur)* |
| Carte sans `updatedAt` | `"Nouvelle carte"` |

**Appels API** :

| Action | Méthode | Endpoint |
|--------|---------|---------|
| Sauvegarder existant | PUT | `diagrammes/:id` |
| Sauvegarder nouveau | POST | `diagrammes` |

---

## 5. Front-end — éditeur

### 5.1 `MindMapBuilder.vue`

**Fichier** : `my_memo_master_front/src/components/mindmap/MindMapBuilder.vue`

Composant racine de l'éditeur. Compose `MindMapBoard` (canvas) et `MindMapPalette` (panneau latéral) dans une grille `4fr / 1fr`.

**Props** :

| Prop | Type | Description |
|------|------|-------------|
| `mapPayload` | `Object \| String \| null` | Carte à charger. Déclenche `store.load()` via watcher. |
| `loading` | `Boolean` | Désactive les boutons d'action. |

**Événements émis** :

| Événement | Payload | Source |
|-----------|---------|--------|
| `save` | `store.exportPayload()` | Bouton "Sauvegarder" |
| `export` | `store.exportPayload()` | Bouton "Exporter" |
| `new-map` | `store.exportPayload()` | Bouton "Nouveau" |

**Méthodes exposées** (`defineExpose`) :

| Méthode | Description |
|---------|-------------|
| `getSerializedMap()` | Retourne `store.exportPayload()` — snapshot JSON de la carte. |
| `loadMap(payload)` | Charge un payload dans le store. |

**Logique de chargement** : un `watch` sur `props.mapPayload` (immediate: true) appelle `store.load(payload)` si le payload est défini, sinon `store.new('Nouvelle carte mentale')`.

### 5.2 `MindMapBoard.vue`

**Fichier** : `my_memo_master_front/src/components/mindmap/MindMapBoard.vue`

Canvas SVG interactif. Gère pan, zoom, drag nœuds, drag zones, sélection, création de liens et création rapide de nœuds.

**Interactions utilisateur** :

| Geste | Effet |
|-------|-------|
| Glisser un nœud | `store.moveNode(id, x, y)` |
| Clic sur nœud (mode select) | `store.selectNode(id, additive)` — `Ctrl/Cmd` = multi-sélection |
| Clic sur nœud (mode link) | Premier clic = `setPendingLinkSource`, second = `finalizePendingLink` |
| `Shift + clic` fond SVG | Crée un nœud enfant du nœud sélectionné à la position cliquée |
| Glisser fond SVG (bouton 0) | Pan après seuil de 5 px |
| Molette | Zoom centré sur le curseur (range 0.4×–3×) |
| Glisser zone | `store.updateZone(id, {layout})` |

**Visibilité** : les nœuds et liens des sous-arbres repliés sont masqués via `visibleNodeIds` (DFS depuis les nœuds `collapsed: true`).

**Centrage** : `centerOnSubject()` est appelé au montage et à chaque changement de `subjectNodeId`. Repositionne `pan` pour centrer le nœud racine dans le canvas.

**Coordonnées** : `toBoardCoords(event)` convertit les coordonnées écran en coordonnées board en tenant compte du pan et du zoom courants.

### 5.3 `MindMapNode.vue`

**Fichier** : `my_memo_master_front/src/components/mindmap/MindMapNode.vue`

Nœud SVG (`<g>`) avec corps `<rect>`, contenu `<foreignObject>`, bouton repliage et bouton ajout enfant.

**Props** :

| Prop | Type | Description |
|------|------|-------------|
| `node` | `Object` | Données complètes du nœud depuis le store. |
| `selected` | `Boolean` | Applique l'effet glow cyan. |
| `hasChildren` | `Boolean` | Affiche le bouton repliage (+/−). |

**Événements émis** : `node-pointerdown`, `toggle-collapse`.

**Types de nœud** :

| `node.type` | Rendu du contenu |
|-------------|-----------------|
| `'text'` | `<div>` éditable en double-clic (texte libre). |
| `'formula'` | `<div>` HTML KaTeX (double-clic → ouvre l'interpréteur via `store.openInterpreter()`). |
| `'image'` | Zone drag & drop — affiche `<img>` si `content` renseigné. |

**Formes** (`node.style.shape`) :

| Valeur | `border-radius` calculé |
|--------|------------------------|
| `'rect'` | 12px fixe |
| `'pill'` | `height / 2` |
| `'bubble'` | `min(width, height) / 4` |

**Édition inline** : double-clic sur titre → `input`, double-clic sur corps texte → `textarea`. Validation sur `blur` ou `Enter`, annulation sur `Escape`.

**Drag & drop image** :
1. `dragover` + `drop` sur la zone image.
2. Validation : MIME `image/*` + taille ≤ 5 Mo.
3. POST `diagrammes/upload-image` (multipart).
4. Résolution de l'URL : `payload.path` → `new URL(path, VITE_API_URL)` (local) ; sinon `payload.url` (S3).
5. `store.updateNode(id, { content: imageUrl })`.

**Auto-redimensionnement à l'image** (`handleImageLoad`) :  
À chaque chargement d'image (`@load`), calcule la hauteur naturelle proportionnelle dans la largeur courante du nœud. Appelle `store.updateNodeStyle` seulement si l'écart dépasse 2 px (évite les boucles de mise à jour déclenchant `isDirty`).

```
targetW = clamp(width, 180, 400)
imgH    = round((targetW - 24) * naturalH / naturalW)
targetH = max(120, 30 + imgH + 20)
```

**Création enfant** :
- Bouton `+` (affiché au hover/sélection) → `store.addNode` avec le nœud courant comme parent.
- `Shift + clic` sur le nœud → même comportement.

### 5.4 `MindMapLink.vue`

**Fichier** : `my_memo_master_front/src/components/mindmap/MindMapLink.vue`

Branche SVG (`<g>`) rendue comme courbe de Bézier cubique.

**Props** :

| Prop | Type | Description |
|------|------|-------------|
| `link` | `Object` | Données du lien (from, to, type, direction, style). |
| `source` | `Object` | Nœud source (position depuis `store.map.nodes[link.from]`). |
| `target` | `Object` | Nœud cible. |
| `selected` | `Boolean` | Épaissit le trait (2.5 → 4 px). |

**Événements émis** : `link-pointerdown`.

**Courbe de Bézier** :  
Offset de contrôle = `clamp(distance × 0.4, 120, 220)`. Les points de contrôle sont alignés sur l'angle source→cible pour une courbure naturelle.

**Label de branche** : affiché au milieu de la courbe si `link.type` est renseigné. Fond `secondaryColor` semi-transparent.

**Direction** :
- `'forward'` — flèche en bout de cible (`marker-end: arrow-forward`).
- `'bidirectional'` — flèche également en début (`marker-start: arrow-backward`).

### 5.5 `MindMapZone.vue`

**Fichier** : `my_memo_master_front/src/components/mindmap/MindMapZone.vue`

Rectangle de groupement visuel SVG (opacité 0.25, tirets, coins arrondis).

**Props** :

| Prop | Type | Description |
|------|------|-------------|
| `zone` | `Object` | `{ id, name, color, layout: { x, y, width, height } }`. |

**Événements émis** : `zone-pointerdown` — propagé à `MindMapBoard` pour le drag.

**Rendu** : le rectangle est centré sur `layout.x / layout.y` (même convention que les nœuds). Label en haut de la zone, non interactif.

### 5.6 `MindMapPalette.vue`

**Fichier** : `my_memo_master_front/src/components/mindmap/MindMapPalette.vue`

Panneau latéral de contrôle. Sections :

| Section | Contenu |
|---------|---------|
| Outil actif | Sélection `'select'` / `'link'` via `store.setTool()`. |
| Type de nœud | `'text'` / `'formula'` / `'image'` via `store.setNodeType()`. |
| Ajouter un nœud | Bouton → `store.addNode(...)` |
| Ajouter une zone | Bouton → `store.addZone(...)` |
| Style du nœud sélectionné | `primaryColor`, `shape`, `fontSize`, `fontWeight`, `fontStyle`, `textDecoration`, `textColor` → `store.updateNodeStyle()` |
| Mastery du nœud | Sélect `undefined/low/medium/high` → `store.updateNode({ mastery })` |
| Lien Leitner | Recherche flashcard → `store.linkCard()` / `store.unlinkCard()` |
| Type de lien | (lien sélectionné) `type`, `direction` → `store.updateLink()` |
| Supprimer | `store.removeNode()` / `store.removeLink()` / `store.removeZone()` |
| Interpréteur LaTeX | Bouton → `store.openInterpreter()` |
| Upload image | `input[type=file]` → POST `diagrammes/upload-image`, résolution URL identique à drag & drop. |

**Résolution d'URL image** (`resolveImageUrl`) :
```javascript
if (payload.path) return new URL(payload.path, VITE_API_URL).toString()  // local
if (payload.url)  return payload.url                                      // S3
```

---

## 6. State management — `mindmapBuilder.js`

**Fichier** : `my_memo_master_front/src/stores/mindmapBuilder.js`  
**Store Pinia** : `'mindmapBuilder'`

### État

| Propriété | Type | Valeur initiale | Description |
|-----------|------|-----------------|-------------|
| `map` | `Object` | `createBlankMindMap()` | Carte courante (nodes, links, zones…). |
| `tool` | `string` | `'select'` | Outil actif : `'select'` ou `'link'`. |
| `nodeType` | `string` | `'text'` | Type du prochain nœud à créer. |
| `selectedNodeIds` | `string[]` | `[]` | IDs des nœuds sélectionnés. |
| `selectedLinkId` | `string \| null` | `null` | ID du lien sélectionné. |
| `pendingLinkSource` | `string \| null` | `null` | Source d'un lien en cours de tracé. |
| `isDirty` | `boolean` | `false` | Vrai si la carte a des changements non sauvegardés. |
| `interpreterOpen` | `boolean` | `false` | Contrôle la modale LaTeX. |

### Getters

| Getter | Retourne |
|--------|---------|
| `nodesArray` | `Object.values(map.nodes)` |
| `selectedNode` | Le nœud sélectionné si `selectedNodeIds.length === 1`, sinon `null`. |
| `selectedNodes` | Tableau des nœuds sélectionnés. |

### Actions principales

| Action | Description |
|--------|-------------|
| `load(raw)` | Normalise le JSON brut, applique `applyRadialLayout` si aucune position existante, `syncCardMasteries`. |
| `new(title)` | Crée une carte vierge avec nœud racine. |
| `exportPayload()` | Deep-clone de la carte (`serializeMindMap`). |
| `addNode({label, type, content, parentId, position})` | Crée un nœud, calcule position angulaire (golden angle), crée le lien parent→enfant. Retourne l'ID. |
| `addLink({from, to, type, direction})` | Crée une branche. Déduplique (from+to identiques ignorés). |
| `addZone({name, color, x, y, width, height})` | Ajoute une zone de groupement. |
| `moveNode(id, x, y)` | Met à jour `layout.x/y`. Appelle `touch()`. |
| `updateNode(id, payload)` | Merge partiel sur le nœud. Recalcule `secondaryColor` si `mastery` change. |
| `updateNodeStyle(id, style)` | Merge sur `node.style`. |
| `updateLink(id, payload)` | Merge partiel sur le lien. |
| `updateZone(id, payload)` | Merge `name`, `color`, `collapsed`, `layout`. |
| `removeNode(id)` | Supprime le nœud et tous les liens qui y sont attachés. |
| `removeLink(id)` | Supprime le lien. |
| `removeZone(id)` | Supprime la zone, nullifie `zoneId` sur les nœuds concernés. |
| `selectNode(id, additive?)` | Sélection simple ou multi (`Ctrl`). |
| `toggleCollapse(id)` | Bascule `node.collapsed`. |
| `setPendingLinkSource(nodeId)` | Démarre le mode tracé de lien. |
| `finalizePendingLink(targetId)` | Finalise le lien et réinitialise `pendingLinkSource`. |
| `linkCard(nodeId, idCard, idSystem)` | Lie une flashcard Leitner au nœud. |
| `unlinkCard(nodeId)` | Délie la flashcard, remet `mastery: 'undefined'`. |
| `syncCardMasteries()` | Async — récupère les niveaux Leitner via API et met à jour `mastery` + `secondaryColor` des nœuds liés. |
| `openInterpreter()` / `closeInterpreter()` | Contrôle la modale LaTeX. |
| `touch()` | Passe `isDirty = true` et met à jour `map.updatedAt`. |
| `markSaved()` | Passe `isDirty = false`. |

---

## 7. Helpers — `mindmap.js`

**Fichier** : `my_memo_master_front/src/helpers/mindmap.js`

Fonctions pures sans effet de bord — entièrement importables dans les tests.

| Fonction | Signature | Description |
|----------|-----------|-------------|
| `createId()` | `() → string` | UUID via `crypto.randomUUID()` ou fallback `mm-<random>`. |
| `createBlankMindMap(title?)` | `(string?) → MindMapObject` | Carte vierge avec un nœud racine centré en (400, 350). |
| `normalizeMindMap(raw)` | `(any) → MindMapObject` | Normalise depuis : format natif `{nodes, links}`, format GoJS `{nodeDataArray, linkDataArray}`, ou JSON string. |
| `applyRadialLayout(map, opts?)` | `(MindMapObject, {spacing?, levelSpacing?, centerX?, centerY?}?) → MindMapObject` | BFS depuis le nœud racine, distribue les nœuds par niveau sur des arcs. Paramètres par défaut : `spacing=180`, `levelSpacing=220`. |
| `serializeMindMap(map)` | `(MindMapObject) → Object` | Deep-clone JSON. |
| `ensureSecondaryColor(node)` | `(Node) → Node` | Applique `masteryColors[node.mastery]` à `node.style.secondaryColor`. |
| `boxColorToHex(bigintColor)` | `(number) → string` | Convertit un entier Leitner (couleur) en hex CSS (`#rrggbb`). |
| `boxLevelToMastery(level)` | `(number) → string` | Niveau 0 → `'undefined'`, 1 → `'low'`, 2-3 → `'medium'`, 4+ → `'high'`. |

**Constantes exportées** :

| Constante | Description |
|-----------|-------------|
| `masteryColors` | Map `mastery → couleur hex` (undefined/low/medium/high). |
| `masteryList` | Tableau `{id, label}` pour les selects UI. |
| `defaultBranchTypes` | 6 types de branche prédéfinis. |
| `defaultShapes` | 3 formes : bubble, rect, pill. |

**Compatibilité GoJS** : `normalizeMindMap` détecte `nodeDataArray` + `linkDataArray` et migre automatiquement vers le format natif. Préserve positions (`loc`), couleurs et styles.

---

## 8. Couverture de tests

### Front-end (Vitest)

| Fichier de test | Composant testé | Nb tests |
|----------------|----------------|----------|
| `test/components/MindmapsListView.test.js` | `MindmapsListView.vue` | 13 |
| `test/components/MindmapsEditorView.test.js` | `MindmapsEditorView.vue` | 13 |
| `test/components/MindMapNode.test.js` | `MindMapNode.vue` | 18 |
| `test/components/MindMapPalette.test.js` | `MindMapPalette.vue` | 18 |
| *(autres)* | Board, Link, Zone, Builder... | ~38 |
| **Total** | | **~100** |

**Patterns de test utilisés** :
- `createTestingPinia({ createSpy: vi.fn, stubActions: true })` pour le store.
- `vi.hoisted()` pour les mocks de module (`@/helpers/api`, `vue-toastification`).
- Stubs manuels pour `ItemListLayout`, `MenuItem`, `MindMapBuilder` (évite le canvas SVG dans les tests unitaires pages).
- `nextTick` importé depuis `vue` (non depuis `vitest`).

### Back-end (Jest)

Les tests API du module `Diagramme` couvrent les routes CRUD. La route `upload-image` est testée via supertest avec un fichier mock.

---

## 9. Points d'attention et dette technique

### Stockage images — mode hybride S3 / local

Le middleware `mindmapImageUpload.js` sélectionne le backend selon `S3_BUCKET` au démarrage. En dev sans S3, les images sont servies via `app.use('/api/uploads', express.static(...))`. En prod (S3 Infomaniak), l'URL publique `req.file.location` est utilisée directement.

**Attention** : si le bucket Infomaniak n'a pas de politique de lecture publique sur le préfixe `mindmaps/`, les URLs retournées renverront 403. À configurer côté hébergeur.

### Résolution d'URL image côté front

`resolveImageUrl` (palette) et `handleImageDrop` (node) appliquent la même règle :
- `payload.path` présent → URL locale reconstruite depuis `VITE_API_URL`.
- `payload.url` → utilisé tel quel (S3 ou URL externe).

Conséquence : les cartes sauvegardées en local dev contiennent des URLs `http://localhost/api/uploads/...` dans `mindMapJson`. Elles seront invalides si rechargées en prod S3. Envisager une migration des URLs existantes.

### Pas d'URL présignées

Les images S3 sont exposées en URL publique directe. Si une politique de bucket plus restrictive est appliquée, il faudra générer des URLs présignées (TTL) côté serveur à la demande.

### Absence de pagination / lazy loading

`findByUser` retourne toutes les cartes de l'utilisateur sans pagination. À surveiller si le volume grossit.

### Undo/Redo non implémenté

`map.history.stack` est présent dans la structure de données mais aucune action du store ne l'alimente. C'est une dette identifiée.

### `mindmapCreation.js` — helper non documenté ici

`getNodeLabel(type)` est importé dans `MindMapNode` et `MindMapBoard` depuis `@/helpers/mindmapCreation`. Ce helper retourne le label par défaut selon le type de nœud. Il n'est pas couvert dans cette documentation.
