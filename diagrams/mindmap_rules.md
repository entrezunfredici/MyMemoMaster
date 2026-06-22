# Analyse fonctionnelle — Éditeur de cartes mentales (Mind Maps)

> Document de référence pour M-01 / M-02.01.
> Décrit les règles métier, le modèle de données et les cas limites de la fonctionnalité.
> Sources de vérité : `services/Diagramme.service.js`, `stores/mindmapBuilder.js`, `pages/MindmapsPage.vue`.

---

## 1. Vue d'ensemble

L'éditeur de cartes mentales permet à chaque utilisateur de créer, visualiser, éditer et sauvegarder des cartes mentales organisées par matière (`Subject`).

Une carte mentale est composée de **nœuds** reliés par des **liens**, éventuellement regroupés dans des **zones** visuelles. L'ensemble est sérialisé en JSON et persisté dans la base de données sous l'entité `MindMap`.

```
Utilisateur
  └── N cartes mentales (MindMap)
         └── rattachées à 1 Subject (matière)
                └── mindMapJson → { title, nodes, links, zones }
```

---

## 2. Acteurs et permissions

Un seul acteur interagit avec les cartes mentales dans la version MVP.

### Étudiant (et tout utilisateur authentifié)

| Action | Règle |
|--------|-------|
| Lister ses cartes | `GET /diagrammes` → retourne uniquement les cartes dont `userId = req.user.id` |
| Lire une carte par ID | `GET /diagrammes/:id` → pas de vérification d'ownership (voir dette) |
| Créer une carte | `POST /diagrammes` → userId injecté depuis le JWT |
| Modifier une carte | `PUT /diagrammes/:id` → vérifie que `userId === req.user.id`, sinon 403 |
| Supprimer une carte | `DELETE /diagrammes/:id` → vérifie que `userId === req.user.id`, sinon 403 |
| Uploader une image | `POST /diagrammes/upload-image` → auth requise, stockage local |

> **Note** : il n'y a pas de partage de cartes mentales entre utilisateurs en MVP. Chaque carte appartient à un seul utilisateur.

---

## 3. Modèle de données

### 3.1 Entité `MindMap` (table BDD)

| Champ | Type | Règle |
|-------|------|-------|
| `idMindMap` | INT PK | Auto-incrémenté |
| `mmName` | STRING(50) | Obligatoire, 1–200 chars (validator) |
| `mindMapJson` | JSON | Obligatoire — structure complète de la carte |
| `userId` | FK → User | Obligatoire — propriétaire |
| `subjectId` | FK → Subject | Obligatoire — résolu via `resolveSubject()` |

> `timestamps: false` — pas de `createdAt` / `updatedAt` en base. La date de modification est gérée dans le JSON (`mindMapJson.updatedAt`).

### 3.2 Structure du `mindMapJson`

Le JSON stocke l'intégralité de la carte mentale. Format attendu par le store :

```json
{
  "title": "Titre de la carte",
  "subjectNodeId": "node-id-racine",
  "updatedAt": "2026-06-22T10:00:00.000Z",
  "nodes": {
    "<id>": {
      "id": "<id>",
      "label": "Libellé affiché",
      "type": "text",
      "content": "Contenu détaillé du nœud",
      "mastery": "undefined",
      "zoneId": null,
      "collapsed": false,
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
      "layout": { "x": 0, "y": 0, "radius": 260, "angle": 0 },
      "meta": { "isSubject": true, "parentId": null }
    }
  },
  "links": [
    {
      "id": "<id>",
      "from": "<nodeId>",
      "to": "<nodeId>",
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
  "zones": [
    {
      "id": "<id>",
      "name": "Zone thématique",
      "color": "#BFDBFE",
      "layout": { "x": 200, "y": 200, "width": 360, "height": 240 },
      "collapsed": false
    }
  ]
}
```

---

## 4. Règles métier

### 4.1 Rattachement à un sujet (`resolveSubject`)

Lors de la création d'une carte (`POST /diagrammes`), le `subjectId` est optionnel.

| Cas | Comportement |
|-----|-------------|
| `subjectId` fourni et valide | La carte est rattachée à ce sujet |
| `subjectId` fourni mais inexistant en base | Fallback vers "Sujet par défaut" |
| `subjectId` absent ou null | `Subject.findOrCreate({ name: 'Sujet par défaut' })` — création si nécessaire |

> Le sujet par défaut est créé automatiquement à la première carte sans sujet. Il n'est jamais supprimé automatiquement.

### 4.2 Sauvegarde automatique (auto-save)

La page `MindmapsPage.vue` implémente une sauvegarde automatique déclenchée par les modifications du store.

| Règle | Valeur |
|-------|--------|
| Délai de déclenchement après dernière modification | 1 500 ms |
| Signal de déclenchement | `mindmapStore.map.updatedAt` change ET `isDirty === true` |
| Condition de blocage | `isSaving`, `isExporting` ou `showExportModal` actif → la sauvegarde est replanifiée |
| Carte existante | `PUT /diagrammes/:id` |
| Nouvelle carte sans ID | `POST /diagrammes` → l'ID retourné est stocké pour les sauvegardes suivantes |

**Cycle de vie de `isDirty` :**
- `isDirty = true` à chaque action de modification (déplacement, ajout, suppression, style…) via `touch()`
- `isDirty = false` uniquement via `markSaved()`, appelé après confirmation de la réponse API

### 4.3 Création d'une nouvelle carte

Si l'utilisateur édite le canvas **sans** avoir sélectionné de carte existante :
1. L'auto-save tente un `POST /diagrammes`
2. Si le nom n'est pas encore défini, la modale "Nom de la carte mentale" s'affiche avant le premier `POST`
3. Après création, `currentDiagramId` est alimenté depuis la réponse `response.data.id || response.data.idMindMap`

### 4.4 Nommage

| Règle | Détail |
|-------|--------|
| Nom obligatoire au premier enregistrement | Modale `showExportModal` si `currentDiagramId === null` |
| Nom modifiable depuis la sidebar | Modale "Modifier le nom" → `PUT /diagrammes/:id` avec le JSON existant |
| Longueur nom | 1 à 200 caractères (validator `mmName`) |
| Titre dans le JSON (`mindMapJson.title`) | Synchronisé avec le nœud racine (`subjectNodeId`) |

### 4.5 Nœuds

| Règle | Détail |
|-------|--------|
| Nœud racine (`isSubject: true`) | Un seul par carte, porteur du titre. Non supprimable (protection implicite — aucune règle explicite côté API) |
| Ajout d'un nœud enfant | Lié automatiquement au nœud sélectionné (ou au nœud racine par défaut) via un lien `appartenance` |
| Position automatique | Disposition radiale (angle d'or + rayon croissant selon le nombre de fils) |
| Position manuelle | Prioritaire sur la position automatique si `position.x` et `position.y` sont fournis |
| Style | Hérité du parent (couleur, taille de police) à la création ; modifiable individuellement |
| Repliage (`collapsed`) | Un nœud replié masque ses descendants visuellement (gestion front uniquement) |
| Maîtrise (`mastery`) | Valeur libre stockée dans le nœud — pilote la `secondaryColor` via `ensureSecondaryColor()` |
| Suppression d'un nœud | Supprime aussi tous les liens dont le nœud est source ou cible |

### 4.6 Liens

| Règle | Détail |
|-------|--------|
| Types de lien | `'appartenance'` (hiérarchique), extensible |
| Direction | `'forward'` par défaut |
| Doublon | Un lien `(from, to)` ne peut exister qu'une fois — vérifié dans `addLink()` |
| Lien sur soi-même | Interdit (`from === to` → retour null) |
| Suppression | Retire le lien du tableau `links` et réinitialise `selectedLinkId` si concerné |

### 4.7 Zones

Les zones sont des conteneurs visuels rectangulaires (pas de hiérarchie structurelle).

| Règle | Détail |
|-------|--------|
| Création | Nom + couleur + position/dimensions sur le canvas |
| Affectation d'un nœud à une zone | `assignNodeToZone(nodeId, zoneId)` — stocké dans `node.zoneId` |
| Suppression d'une zone | Détache tous les nœuds (`node.zoneId = null`) sans supprimer les nœuds |
| Repliage | `collapsed` sur la zone (gestion visuelle front) |

### 4.8 Upload d'image

| Règle | Valeur |
|-------|--------|
| Endpoint | `POST /api/v1/diagrammes/upload-image` |
| Formats acceptés | JPG, PNG, GIF, WEBP |
| Taille maximale | 5 Mo |
| Stockage | Local — `public/uploads/mindmaps/<filename>` |
| URL retournée | `<API_PUBLIC_URL>/uploads/mindmaps/<filename>` |
| Erreur taille | 413 — `"L'image dépasse la taille maximale autorisée de 5 Mo."` |
| Erreur format | 400 — `"Format d'image non supporté."` |

> Les images uploadées sont stockées localement. Elles ne passent pas par S3 et sont perdues si le conteneur Docker redémarre sans volume persistent.

---

## 5. Endpoints API

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| `GET` | `/api/v1/diagrammes` | JWT | Retourne les cartes de l'utilisateur connecté |
| `GET` | `/api/v1/diagrammes/:id` | JWT | Retourne une carte par son ID (pas de vérif ownership) |
| `POST` | `/api/v1/diagrammes` | JWT | Crée une nouvelle carte |
| `PUT` | `/api/v1/diagrammes/:id` | JWT | Modifie une carte (ownership vérifié) |
| `DELETE` | `/api/v1/diagrammes/:id` | JWT | Supprime une carte (ownership vérifié) |
| `POST` | `/api/v1/diagrammes/upload-image` | JWT | Upload une image pour insertion dans une carte |

**Codes de retour :**

| Code | Cas |
|------|-----|
| 200 | GET, PUT réussi |
| 201 | POST création réussie (carte ou image) |
| 204 | DELETE réussi |
| 400 | Validation échouée (`mmName` ou `mindMapJson` invalide) |
| 403 | Tentative de modification/suppression d'une carte appartenant à un autre utilisateur |
| 404 | Carte introuvable pour l'ID donné |
| 413 | Image > 5 Mo |
| 500 | Erreur serveur (loguée, message générique en réponse) |

---

## 6. Cas limites

| Cas | Comportement attendu |
|-----|---------------------|
| `subjectId` invalide à la création | `resolveSubject()` crée ou réutilise "Sujet par défaut" — jamais de 400 sur ce champ |
| Auto-save pendant l'affichage de la modale export | Replanifié après fermeture de la modale |
| `POST /diagrammes` retourne un ID inconnu (`data.id` absent) | `currentDiagramId` reste null → la prochaine auto-save retentera un `POST` (risque de doublon) |
| Modification du nom sans modification du canvas | `PUT` envoyé avec le `mindMapJson` existant en base |
| Nœud racine supprimé côté front | `subjectNodeId` est mis à jour vers le premier nœud restant, ou `null` si la carte est vide |
| Lien vers un nœud inexistant (`from` ou `to` absent) | `addLink()` est permissif — le nœud peut avoir été supprimé. Le rendu front gère l'absence |
| Canvas vide (aucun nœud) | `exportPayload()` retourne un objet valide avec `nodes: {}`, `links: []` |
| Accès à `GET /diagrammes/:id` avec l'ID d'une carte appartenant à un autre utilisateur | 403 Accès refusé |

---

## 7. Dette technique identifiée

| Item | Impact | Priorité |
|------|--------|----------|
| ~~`GET /diagrammes/:id` sans vérification d'ownership~~ | ~~N'importe quel utilisateur authentifié peut lire une carte par ID~~ — **Corrigé** | ~~Haute~~ |
| Images uploadées stockées localement sans volume Docker | Perte des images au redémarrage du conteneur | Moyenne |
| `POST /diagrammes` sans nom → risque de doublon si l'ID n'est pas retourné correctement | Cartes orphelines sans ID côté front | Faible |
| Nœud racine suppressible côté front (pas de garde API) | Carte sans racine logiquement incohérente | Faible |
| `timestamps: false` sur le modèle | Pas de `createdAt` en base — la date de modification n'est trackée qu'en JSON | Faible |

---

## 8. Hors périmètre MVP (M-01)

- Collaboration temps réel (édition simultanée par plusieurs utilisateurs)
- Génération automatique de carte par IA (depuis un cours ou un résumé)
- Partage public d'une carte (lien partageable)
- Export en image (PNG/SVG/PDF)
- Import depuis un format externe (FreeMind, XMind, etc.)
- Historique des versions d'une carte
- Templates de cartes prédéfinis
