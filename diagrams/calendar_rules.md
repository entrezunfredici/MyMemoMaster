# Règles métier — Organisation personnelle et calendrier (M-03)

> Document de référence pour l'implémentation de M-03.  
> Décrit les règles métier, le modèle de données et les comportements attendus.  
> À mettre à jour si les règles évoluent.

---

## Vue d'ensemble

Le module **Calendrier** centralise trois types d'objets temporels :

| Objet | Créateur | Visibilité |
|-------|----------|------------|
| Événement de classe (cours, exam…) | Admin établissement | Tous les membres du groupe classe |
| Échéance (DS, devoir…) | Enseignant du groupe | Tous les membres du groupe classe |
| Séance de révision | Étudiant | Lui seul |

**Principe central** : la séance de révision est **un seul objet** affiché dans deux vues — calendrier et todo list. Pas de doublon.

**Principe de synchronisation** : chaque utilisateur possède un calendrier personnel qui agrège automatiquement les événements de ses groupes classes + ses propres séances de révision.

---

## Acteurs et permissions

### Admin établissement
- Crée et gère les groupes classes
- Crée et gère les événements dans les calendriers des groupes classes
- Voit tous les calendriers de tous les groupes
- Ne peut pas créer d'échéances ni de séances de révision

### Enseignant (`role: 'teacher'` dans ClassGroupUsers)
- Voit les événements des groupes classes dont il est membre (enseignant)
- Peut créer des échéances **uniquement sur les occurrences** des groupes dont il est enseignant
- Peut modifier/supprimer ses propres échéances
- Peut créer ses propres séances de révision (usage personnel)

### Étudiant (`role: 'student'` dans ClassGroupUsers)
- Voit les événements et échéances des groupes classes dont il est membre (lecture seule)
- Crée, modifie et supprime ses propres séances de révision
- Sa todo list affiche les séances de révision planifiées pour aujourd'hui

---

## Modèle de données

### Entités à créer

#### `ClassGroup` — Groupe classe

| Champ | Type | Règle |
|-------|------|-------|
| `id` | INT PK | — |
| `name` | STRING | Obligatoire, 2–100 chars |
| `description` | TEXT | Optionnel |
| `createdBy` | FK → User | Admin qui a créé le groupe |
| `createdAt` | DATE | Auto |

#### `ClassGroupUsers` — Membres d'un groupe (jointure)

| Champ | Type | Règle |
|-------|------|-------|
| `classGroupId` | FK → ClassGroup | Obligatoire |
| `userId` | FK → User | Obligatoire |
| `role` | ENUM('teacher', 'student') | Obligatoire |

> Contrainte : un utilisateur ne peut apparaître qu'une fois par groupe (unicité sur `classGroupId + userId`).

#### `CalendarEvent` — Événement de calendrier

| Champ | Type | Règle |
|-------|------|-------|
| `id` | INT PK | — |
| `name` | STRING | Obligatoire, 2–150 chars |
| `description` | TEXT | Optionnel |
| `type` | ENUM | `'cours'`, `'examen'`, `'autre'` |
| `classGroupId` | FK → ClassGroup | Obligatoire |
| `createdBy` | FK → User | Admin créateur |
| `recurrenceMode` | ENUM | `'manual'`, `'auto'` — voir règles ci-dessous |
| `recurrenceRule` | JSON | Non nul si `recurrenceMode = 'auto'` — voir format ci-dessous |

#### `EventOccurrence` — Occurrence d'un événement

> Qu'il soit récurrent (auto) ou à dates multiples (manuel), chaque séance est stockée comme une `EventOccurrence`. C'est ce qui est affiché dans les calendriers.

| Champ | Type | Règle |
|-------|------|-------|
| `id` | INT PK | — |
| `eventId` | FK → CalendarEvent | Obligatoire |
| `date` | DATEONLY | Obligatoire |
| `startTime` | TIME | Obligatoire |
| `endTime` | TIME | Obligatoire, doit être > `startTime` |

#### `Deadline` — Échéance

| Champ | Type | Règle |
|-------|------|-------|
| `id` | INT PK | — |
| `name` | STRING | Obligatoire, 2–150 chars |
| `type` | ENUM | `'ds'`, `'devoir'`, `'exposé'`, `'autre'` |
| `description` | TEXT | Optionnel |
| `occurrenceId` | FK → EventOccurrence | Obligatoire — liée à une séance spécifique |
| `dueDate` | DATEONLY | Obligatoire — date à laquelle l'échéance est due |
| `dueTime` | TIME | Optionnel — heure limite |
| `createdBy` | FK → User | Enseignant créateur |

> `occurrenceId` et `dueDate` sont indépendants : l'échéance est *annoncée dans* une séance mais peut être *due* à une date différente (ex : devoir annoncé le lundi, rendu le vendredi).

#### `RevisionSession` — Séance de révision (= todo item)

> Objet unique affiché dans le calendrier ET dans la todo list. Aucune duplication.

| Champ | Type | Règle |
|-------|------|-------|
| `id` | INT PK | — |
| `name` | STRING | Obligatoire, 2–150 chars |
| `description` | TEXT | Optionnel |
| `date` | DATEONLY | Obligatoire |
| `startTime` | TIME | Obligatoire |
| `endTime` | TIME | Obligatoire, doit être > `startTime` |
| `userId` | FK → User | Étudiant propriétaire |

---

## Règles de récurrence (CalendarEvent)

### Mode `manual`
L'admin saisit chaque occurrence une par une (ou par sélection de dates sur un calendrier). Chaque date sélectionnée crée une `EventOccurrence`.

### Mode `auto`
L'admin définit une règle de récurrence. Les occurrences sont **générées et persistées** dans `EventOccurrence` à la création de l'événement.

Format du champ `recurrenceRule` (JSON) :

```json
{
  "frequency": "weekly",
  "days": ["monday", "wednesday"],
  "startDate": "2025-09-01",
  "endDate": "2026-06-30",
  "startTime": "08:00",
  "endTime": "10:00"
}
```

| Champ | Valeurs | Description |
|-------|---------|-------------|
| `frequency` | `"weekly"`, `"biweekly"`, `"monthly"` | Fréquence de répétition |
| `days` | Tableau de jours EN | Jours concernés (weekly/biweekly) |
| `startDate` / `endDate` | ISO date | Bornes de la récurrence |
| `startTime` / `endTime` | `"HH:mm"` | Heure commune à toutes les occurrences |

> Les occurrences générées tombant sur un jour férié ne sont pas filtrées automatiquement en MVP — l'admin peut supprimer manuellement les occurrences non désirées.

---

## Règles de synchronisation du calendrier personnel

Chaque utilisateur voit dans son calendrier l'**union** de :

1. **EventOccurrences** des `ClassGroup` dont il est membre (lecture seule)
2. **Deadlines** des `ClassGroup` dont il est membre, affichées sur leur `dueDate` (lecture seule)
3. **RevisionSessions** lui appartenant (`userId = req.user.id`) — lecture/écriture

La synchronisation est **en temps réel** (pas de cache côté client à synchroniser) : le calendrier charge les trois types à la volée pour la période affichée.

---

## Règles de la Todo list

La todo list affiche uniquement les **RevisionSessions** dont `date = aujourd'hui` (date locale de l'utilisateur).

- Une RevisionSession créée pour aujourd'hui apparaît **automatiquement** dans la todo list.
- Modifier l'heure/le nom d'une séance dans le calendrier met à jour la todo list (même objet).
- Supprimer une séance la retire des deux vues simultanément.
- Les événements de classe et les échéances **ne figurent pas** dans la todo list — ils sont visibles dans le calendrier uniquement.

---

## Règles de priorisation

En MVP, il n'y a pas de champ `priority` explicite. La priorisation est visuelle uniquement :

- Dans le calendrier, les objets sont triés par `startTime` pour les `RevisionSessions` et `dueTime` pour les `Deadlines`.
- La todo list trie les séances de révision par `startTime` croissant.

> Un champ `priority` (enum: low/medium/high) sur `RevisionSession` pourra être ajouté dans une itération future si besoin.

---

## Cas limites

| Cas | Comportement attendu |
|-----|---------------------|
| Étudiant sans groupe classe | Son calendrier n'affiche que ses propres RevisionSessions |
| Enseignant tente de créer une Deadline sur un groupe dont il n'est pas membre | 403 Interdit |
| Occurrence supprimée alors qu'une Deadline y est rattachée | Bloquer la suppression si des Deadlines existent (ou cascade selon choix d'implémentation) |
| RevisionSession avec startTime = endTime | 400 — endTime doit être strictement supérieur à startTime |
| RecurrenceRule génère 0 occurrence (dates invalides) | 400 — l'événement n'est pas créé |
| Un utilisateur est à la fois enseignant ET étudiant dans des groupes différents | Autorisé — roles distincts par groupe dans ClassGroupUsers |

---

## Dépendances et impact sur le modèle existant

### Nouveaux rôles à ajouter (table `Role`)
- `Enseignant` — nouveau rôle système à ajouter via seeder CLI

### Nouvelles entités (5 models + migrations)
- `ClassGroup`
- `ClassGroupUsers`
- `CalendarEvent`
- `EventOccurrence`
- `Deadline`
- `RevisionSession`

### Aucune modification des entités existantes
Les entités existantes (`User`, `Subject`, `LeitnerCard`, etc.) ne sont pas impactées.

---

## Hors périmètre MVP (M-03)

- Synchronisation avec un agenda externe (Google Calendar, iCal…)
- Notifications push / emails de rappel
- Planning d'établissement complet (emploi du temps global)
- Notifications mobiles natives
- Import/export de calendrier (iCal format)
