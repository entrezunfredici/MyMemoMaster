# Documentation espace enseignant — Groupes classes et plannings

> Livrable S-03.12 — Documentation / V1  
> Périmètre : groupes, membres, invitations, sections/rendus, ressources, KPI de groupe, dashboard enseignant.  
> Sources de vérité : `services/ClassGroup*.service.js`, `services/Invitation.service.js`,  
> `stores/classGroups.js`, `pages/ClassroomEnseignantView.vue`.

---

## 1. Vue d'ensemble

L'espace enseignant de MyMemoMaster permet à un enseignant de **structurer sa classe** sous forme de groupes, d'y **inviter des étudiants**, de **diffuser des contenus pédagogiques** (sections, ressources), de **suivre les rendus**, et d'accéder aux **indicateurs d'engagement** de ses étudiants.

```
ClassGroup (groupe classe)
  ├── ClassGroupUsers          — membres (enseignants + étudiants, avec rôle)
  ├── Invitation               — invitations email en attente
  ├── ClassGroupSection        — sections (contenus de cours) et rendus (soumissions attendues)
  │     └── ClassGroupSubmission — soumissions des étudiants
  ├── ClassGroupResource       — documents partagés (PDF, Word, images, etc.)
  ├── CalendarEvent / EventOccurrence — séances planifiées du groupe
  └── Deadline                 — échéances du groupe (DS, exposés, etc.)
```

---

## 2. Acteurs et permissions

### Rôles système (roleId dans `User`)

| roleId | Libellé | Accès aux groupes |
|--------|---------|-------------------|
| 1 | Super Admin | Lecture/écriture sur tous les groupes |
| 2 | Étudiant | Lecture de ses propres groupes uniquement |
| 3 | Enseignant | Lecture de ses groupes, création de contenu dans ses groupes |
| 4 | Admin établissement | Lecture/écriture sur tous les groupes |

### Rôles de groupe (role dans `ClassGroupUsers`)

| role | Actions autorisées dans le groupe |
|------|----------------------------------|
| `teacher` | Créer/modifier/supprimer sections, ressources, échéances ; inviter des étudiants ; consulter les rendus et KPI |
| `student` | Lire sections et ressources ; soumettre des rendus ; consulter ses propres données |

### Tableau de permissions par action

| Action | Super Admin / Admin étab. | Enseignant du groupe | Étudiant du groupe | Non-membre |
|--------|:-:|:-:|:-:|:-:|
| Lister les groupes | ✓ (tous) | ✓ (les siens) | ✓ (les siens) | — |
| Voir un groupe + membres | ✓ | ✓ | ✓ | 403 |
| Créer un groupe | ✓ | — | — | — |
| Modifier / supprimer un groupe | ✓ | — | — | — |
| Ajouter / retirer un membre | ✓ | — | — | — |
| Changer le rôle d'un membre | ✓ | — | — | — |
| Inviter par email | ✓ | ✓ (étudiants seulement) | — | — |
| Voir les invitations du groupe | ✓ | ✓ | — | — |
| Créer une section ou rendu | ✓ | ✓ | — | — |
| Modifier / supprimer une section | ✓ | ✓ | — | — |
| Lire les sections | ✓ | ✓ | ✓ | 403 |
| Uploader une ressource | ✓ | ✓ | — | — |
| Lire les ressources | ✓ | ✓ | ✓ | 403 |
| Soumettre un rendu | — | — | ✓ | — |
| Supprimer sa propre soumission | — | — | ✓ (propriétaire) | — |
| Voir toutes les soumissions + statut | ✓ | ✓ | — (seulement la sienne) | — |
| Supprimer une soumission (gestion) | ✓ | ✓ | — | — |
| Consulter KPI groupe et analyses | ✓ | ✓ | — | — |

> **Règle clé** : un enseignant ne peut inviter que des étudiants (rôle `student`). Seul un admin peut affecter le rôle `teacher` via l'API.

---

## 3. Modèle de données

### 3.1 `ClassGroup`

| Champ | Type | Règle |
|-------|------|-------|
| `id` | INT PK | Auto-incrémenté |
| `name` | STRING | Obligatoire |
| `description` | TEXT | Optionnel |
| `level` | STRING | Optionnel (ex : "Terminale", "L1") |
| `code` | STRING | Optionnel (code classe interne) |
| `score` | FLOAT | Optionnel (score global calculé) |

### 3.2 `ClassGroupUsers`

| Champ | Type | Règle |
|-------|------|-------|
| `classGroupId` | INT FK | → ClassGroup |
| `userId` | INT FK | → User |
| `role` | ENUM | `'teacher'` ou `'student'` |

Contrainte : `(classGroupId, userId)` est une clé composite — un utilisateur ne peut avoir qu'une seule entrée par groupe.

### 3.3 `ClassGroupSection`

| Champ | Type | Règle |
|-------|------|-------|
| `id` | INT PK | Auto-incrémenté |
| `classGroupId` | INT FK | → ClassGroup |
| `createdBy` | INT FK | → User (enseignant créateur) |
| `title` | STRING | Obligatoire |
| `type` | ENUM | `'section'` (contenu) ou `'rendu'` (soumission attendue) |
| `description` | TEXT | Optionnel |
| `dueDate` | DATE | Optionnel (date limite, pour les rendus) |

### 3.4 `ClassGroupResource`

| Champ | Type | Règle |
|-------|------|-------|
| `id` | INT PK | Auto-incrémenté |
| `classGroupId` | INT FK | → ClassGroup |
| `createdBy` | INT FK | → User |
| `title` | STRING | Obligatoire |
| `type` | ENUM | `'cours'`, `'carte_mentale'`, `'sujet'`, `'autre'` |
| `url` | STRING | URL S3 du fichier |
| `fileKey` | STRING | Clé S3 (préfixe `uploads/{userId}/`) |
| `originalName` | STRING | Nom de fichier d'origine |
| `mimeType` | STRING | Type MIME |
| `fileSize` | INT | Taille en octets |

### 3.5 `ClassGroupSubmission`

| Champ | Type | Règle |
|-------|------|-------|
| `id` | INT PK | Auto-incrémenté |
| `sectionId` | INT FK | → ClassGroupSection (type `rendu`) |
| `classGroupId` | INT FK | → ClassGroup |
| `studentId` | INT FK | → User |
| `url` | STRING | URL S3 du fichier soumis |
| `fileKey` | STRING | Clé S3 |
| `originalName` | STRING | Nom du fichier |
| `mimeType` | STRING | Type MIME |
| `fileSize` | INT | Taille en octets |

Une soumission est unique par `(sectionId, studentId)` — la re-soumission remplace l'ancienne (upsert).

### 3.6 `Invitation`

| Champ | Type | Règle |
|-------|------|-------|
| `id` | INT PK | Auto-incrémenté |
| `classGroupId` | INT FK | → ClassGroup |
| `invitedByUserId` | INT FK | → User (expéditeur) |
| `targetUserId` | INT FK | → User (optionnel : null si compte inexistant) |
| `targetEmail` | STRING | Email cible |
| `role` | ENUM | `'student'` ou `'teacher'` |
| `status` | ENUM | `'pending'`, `'accepted'`, `'declined'` |

---

## 4. Règles métier

### 4.1 Groupes (`ClassGroup`)

- **Création** : réservée aux admins (roleId 1 et 4). Un enseignant ne peut pas créer de groupe lui-même.
- **Modification** : réservée aux admins. Champs modifiables : `name`, `description`, `level`, `code`, `score`. Les autres champs sont ignorés (protection contre le mass assignment).
- **Suppression** : réservée aux admins.
- **Visibilité** : les admins voient tous les groupes ; les autres utilisateurs ne voient que les groupes dont ils sont membres.

### 4.2 Gestion des membres

- **Ajout direct** : réservé aux admins via `POST /:id/members`.
- **Mise à jour du rôle** : réservée aux admins. Si l'utilisateur est déjà membre mais avec un rôle différent, son rôle est mis à jour.
- **Suppression** : réservée aux admins.
- **Invitation par email** : enseignants du groupe + admins. Un enseignant ne peut inviter qu'avec le rôle `student`.
  - Si l'email correspond à un compte existant → ajout direct (`ClassGroupUsers`), invitation en attente annulée.
  - Sinon → invitation créée + email envoyé avec lien d'inscription.
  - À l'inscription d'un nouvel utilisateur, toutes ses invitations en attente sont automatiquement traitées (`processPendingEmailInvitations`).

### 4.3 Sections et rendus (`ClassGroupSection`)

- Deux types : `section` (contenu de cours, lecture seule pour les étudiants) et `rendu` (soumission attendue).
- Création / modification / suppression : enseignants du groupe + admins.
- Champs modifiables : `title`, `type`, `description`, `dueDate` (protection mass assignment).
- Un rendu supprimé entraîne la suppression en cascade de toutes ses soumissions (à gérer au niveau base de données).

### 4.4 Ressources partagées (`ClassGroupResource`)

- Upload en 2 temps : `POST /storage/upload` → clé S3 retournée → `POST /:id/resources` avec les métadonnées.
- La clé S3 doit avoir le préfixe `uploads/{userId}/` (contrôle propriété S3, sécurité).
- Suppression : supprime l'objet S3 (via `DeleteObjectCommand`) **puis** la ligne en base.
- Taille maximum recommandée : 10 Mo (limitée côté front ; non enforced côté API en V1).
- Types de fichiers acceptés (front) : PDF, Word (.doc/.docx), PowerPoint (.ppt/.pptx), Excel (.xls/.xlsx), images.

### 4.5 Soumissions de rendus (`ClassGroupSubmission`)

- **Seuls les étudiants** membres peuvent soumettre. Un enseignant ou admin qui est membre du groupe ne peut pas soumettre.
- La re-soumission remplace l'ancienne : si une soumission existe déjà pour `(sectionId, studentId)`, elle est mise à jour. Si l'ancienne soumission avait une clé S3 différente, l'ancien fichier est supprimé de S3 avant la mise à jour.
- La section ciblée doit être de type `rendu` et appartenir au groupe — sinon retourne `null` (404).
- **Vue enseignant** (`GET /submissions/status`) : retourne deux listes — `submitted` (étudiants ayant rendu, avec metadata fichier) et `notSubmitted` (étudiants en attente).
- **Vue étudiant** (`GET /submissions`) : retourne uniquement sa propre soumission.

### 4.6 KPI de groupe

- Accessibles uniquement aux admins et aux enseignants du groupe.
- `GET /:id/kpi` retourne : `memberCount`, `studentCount`, `teacherCount`, `pendingInvitations`, `avgScore`, `atRiskStudents`, `scoreTrend`.
- `GET /:id/kpi/students` retourne l'analyse détaillée par étudiant : `activeStudentsCount`, `atRiskCount`, `scoreWeeklyTrend`, `students[]` (avec indicateurs d'engagement individuels).

---

## 5. Flux principaux

### 5.1 Création d'un groupe et invitation des étudiants

```
Admin
  → POST /class-groups                   (crée le groupe)
  → POST /class-groups/:id/members       (ajoute enseignant)
  → POST /class-groups/:id/invitations   (invite étudiants par email)
       │
       ├─ Email déjà inscrit → ajout direct dans ClassGroupUsers
       └─ Email inconnu → Invitation créée + email envoyé
                               └─ Étudiant s'inscrit → processPendingEmailInvitations()
                                                         → ClassGroupUsers créé automatiquement
```

### 5.2 Publication d'un rendu et collecte des soumissions

```
Enseignant
  → POST /class-groups/:id/sections      { type: 'rendu', title, dueDate }
  → GET  /class-groups/:id/sections      (liste toutes les sections)

Étudiant
  → POST /storage/upload                 (upload fichier → reçoit { url, key, mimetype, size })
  → POST /class-groups/:id/sections/:sectionId/submissions
         { url, fileKey, mimeType, originalName, fileSize }
         (upsert : crée ou remplace la soumission existante)

Enseignant
  → GET  /class-groups/:id/sections/:sectionId/submissions/status
         → { submitted: [...], notSubmitted: [...] }
  → GET  /storage/presign?key=...        (URL temporaire 15 min pour télécharger)
```

### 5.3 Partage d'une ressource

```
Enseignant
  → POST /storage/upload                 (upload fichier → reçoit { url, key, mimetype, size })
  → POST /class-groups/:id/resources
         { title, type, url, fileKey, mimeType, originalName, fileSize }

Étudiants et enseignants du groupe
  → GET  /class-groups/:id/resources     (liste)
  → GET  /storage/presign?key=...        (accès presigned URL pour ouvrir/télécharger)
```

### 5.4 Consultation des KPI enseignant

```
Enseignant
  → GET /class-groups/:id/kpi            (indicateurs agrégés du groupe)
  → GET /class-groups/:id/kpi/students   (analyse détaillée par étudiant)
       └─ si étudiant a donné son consentement KPI :
            → GET /kpi-consents/:studentId/access  (KPI individuels détaillés)
```

---

## 6. Interface enseignant — Vue ClassroomEnseignantView

### 6.1 Structure générale de la page

```
┌─ ClassroomEnseignantView ────────────────────────────────────────────────┐
│                                                                           │
│  [Groupe A]  [Groupe B]  [Groupe C]  ...   ← onglets groupes            │
│                                                                           │
│  ┌─ Colonne principale (2/3) ───────────────────────────────────────┐    │
│  │  [A] Analyse pédagogique (KPI + liste étudiants accordéon)       │    │
│  │  [B] Sections & Rendus   (liste + panneaux statut rendu)         │    │
│  │  [C] Échéances du groupe (liste + suppression)                   │    │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─ Sidebar (1/3) ─────────────────────────────────────────────────┐    │
│  │  Créer une section / rendu                                       │    │
│  │  Partager un document                                            │    │
│  │  Documents partagés (liste)                                      │    │
│  │  Ajouter une échéance                                            │    │
│  │  Inviter un étudiant                                             │    │
│  │  Membres du groupe + invitations en attente                      │    │
│  └───────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Section [A] — Analyse pédagogique

```
┌─ Analyse pédagogique ──────────────────────── [Actualiser] ─────────────┐
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────────────┐   │
│  │     24       │  │    3  ⚠      │  │          72.5 %             │   │
│  │ Actifs (7j)  │  │  À risque    │  │   Score cette semaine       │   │
│  └──────────────┘  └──────────────┘  └─────────────────────────────┘   │
│                                                                          │
│  Tendance 4 semaines                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │  2 juin  │  │  9 juin  │  │ 16 juin  │  │ 23 juin  │               │
│  │  72.5 %  │  │  68.0 %  │  │  75.3 %  │  │    —     │               │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘               │
│                                                                          │
│  Alertes décrochage (3)                                                  │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Bob Martin  [Inactif depuis 15j]  [Baisse score 21%]             │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  Étudiants (5)                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  ✓ OK    │  Alice Dupont  │  78.5 %  │  il y a 2j    ▶           │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  ⚠ Risque │  Bob Martin   │  55.0 %  │  il y a 15j   ▼           │  │
│  ├────────────────────────────────────────────────────────────────────┤  │
│  │    [Révision]  streak 2j  —  4 sessions/30j  —  [activité hebdo]  │  │
│  │    [Exercices] 12 tests   —  65 % moy.                            │  │
│  │    [Leitner]   48 cartes  —  72 % maîtrise                        │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

Le détail accordéon par étudiant affiche (si l'étudiant a partagé ses KPI) :
- **Révision** : streak, sessions planifiées/complétées, graphe hebdomadaire
- **Exercices** : nombre total, score moyen, min/max, tendance, 5 dernières évaluations
- **Leitner** : total cartes, taux de maîtrise, cartes dues, répartition par boîte
- **Matières** : nombre de systèmes Leitner et tests par sujet
- **Discipline** : plannifié vs complété sur 30j, score discipline
- **Badges** débloqués

### 6.3 Section [B] — Sections & Rendus

```
┌─ Sections & Rendus ────────────────────────────────────────────────────┐
│                                                                        │
│  [Section]  Introduction au cours          mer. 5 juin 2026     ···   │
│             Présentation des objectifs et du programme...              │
│                                                                        │
│  [Rendu]    Compte-rendu TP 1              ven. 14 juin 2026    ▼     │
│  ├──────────────────────────────────────────────────────────────────┤  │
│  │  Rendus reçus (3)          Pas encore rendu (2)                  │  │
│  │                                                                  │  │
│  │  Alice Dupont   rapport_tp1.pdf   1.2 Mo   [Télécharger]        │  │
│  │  Karim Sadi     tp1_final.docx    890 Ko   [Télécharger]        │  │
│  │  ...                                                             │  │
│  │                                                                  │  │
│  │  Bob Martin     (pas encore soumis)                             │  │
│  │  ...                                                             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 6.4 Section [C] — Échéances du groupe

```
┌─ Échéances ────────────────────────────────────────────────────────────┐
│                                                                        │
│  DS Maths Ch.3    [DS]    ven. 21 juin 2026    Test : Ch.3 Révision   │
│                                                              [Suppr.]  │
│  Exposé groupe    [Exposé] mer. 3 juil. 2026                           │
│                                                              [Suppr.]  │
└────────────────────────────────────────────────────────────────────────┘
```

### 6.5 Sidebar — Formulaires enseignant

```
┌─ Créer section / rendu ──────────────────────────────────────┐
│  Titre : [________________________]                           │
│  Type  : ( ) Section   (•) Rendu                             │
│  Description : [____________________]                         │
│  Date limite : [jj/mm/aaaa]  (visible si Rendu)             │
│                                         [Créer]              │
└──────────────────────────────────────────────────────────────┘

┌─ Partager un document ───────────────────────────────────────┐
│  Titre : [________________________]                           │
│  Type  : [Cours ▾]                                            │
│  ┌─────────────────────────────────────┐                     │
│  │  Glissez votre fichier ici          │                     │
│  │  ou cliquez pour sélectionner       │                     │
│  │  (PDF, Word, PowerPoint, Excel,     │                     │
│  │   images — max 10 Mo)               │                     │
│  └─────────────────────────────────────┘                     │
│                                       [Partager]             │
└──────────────────────────────────────────────────────────────┘

┌─ Inviter un étudiant ────────────────────────────────────────┐
│  Email : [____________________________]                       │
│                                       [Inviter]              │
│  ✓ Alice Dupont ajoutée au groupe.                           │
│  ✉ Invitation envoyée à bob@test.com.                        │
└──────────────────────────────────────────────────────────────┘

┌─ Membres du groupe (7) ──────────────────────────────────────┐
│  Alice Dupont    [étudiant]                                  │
│  Karim Sadi      [étudiant]           [Retirer]              │
│  Bob Martin      [étudiant]           [Retirer]              │
│  ...                                                         │
│  M. Laurent      [enseignant]                                │
│                                                              │
│  Invitations en attente (2)                                  │
│  sophie@lycee.fr    [pending]   invité le 12/06/2026         │
└──────────────────────────────────────────────────────────────┘
```

---

## 7. Endpoints API

### Groupes

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| `GET` | `/class-groups` | Membre | Liste les groupes visibles |
| `GET` | `/class-groups/:id` | Membre | Détail groupe + membres |
| `POST` | `/class-groups` | Admin | Créer un groupe |
| `PUT` | `/class-groups/:id` | Admin | Modifier un groupe |
| `DELETE` | `/class-groups/:id` | Admin | Supprimer un groupe |

### Membres

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| `POST` | `/class-groups/:id/members` | Admin | Ajouter un membre |
| `PUT` | `/class-groups/:id/members/:userId` | Admin | Changer le rôle |
| `DELETE` | `/class-groups/:id/members/:userId` | Admin | Retirer un membre |

### Invitations

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| `POST` | `/class-groups/:id/invitations` | Enseignant / Admin | Inviter par email |
| `GET` | `/class-groups/:id/invitations` | Enseignant / Admin | Lister les invitations du groupe |
| `GET` | `/invitations/mine` | Tout utilisateur | Mes invitations en attente |
| `PUT` | `/invitations/:id` | Utilisateur ciblé | Accepter / décliner |

### Sections et rendus

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| `GET` | `/class-groups/:id/sections` | Membre | Lister les sections |
| `POST` | `/class-groups/:id/sections` | Enseignant / Admin | Créer une section |
| `PUT` | `/class-groups/:id/sections/:sectionId` | Enseignant / Admin | Modifier |
| `DELETE` | `/class-groups/:id/sections/:sectionId` | Enseignant / Admin | Supprimer |

### Soumissions

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| `GET` | `/class-groups/:id/sections/:sectionId/submissions/status` | Enseignant / Admin | Statut rendu/pas rendu |
| `GET` | `/class-groups/:id/sections/:sectionId/submissions` | Membre | Soumissions (enseignant : toutes ; étudiant : la sienne) |
| `POST` | `/class-groups/:id/sections/:sectionId/submissions` | Étudiant | Soumettre / re-soumettre |
| `DELETE` | `/class-groups/:id/sections/:sectionId/submissions/:submissionId` | Propriétaire / Enseignant / Admin | Supprimer une soumission |

### Ressources partagées

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| `GET` | `/class-groups/:id/resources` | Membre | Lister les ressources |
| `POST` | `/class-groups/:id/resources` | Enseignant / Admin | Partager un fichier |
| `PUT` | `/class-groups/:id/resources/:resourceId` | Enseignant / Admin | Modifier les métadonnées |
| `DELETE` | `/class-groups/:id/resources/:resourceId` | Enseignant / Admin | Supprimer (S3 + BDD) |

### KPI pédagogiques

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| `GET` | `/class-groups/:id/kpi` | Enseignant / Admin | KPI agrégés du groupe |
| `GET` | `/class-groups/:id/kpi/students` | Enseignant / Admin | Analyse détaillée par étudiant |

### Événements et échéances

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| `GET` | `/class-groups/:id/events` | Membre | Séances du groupe |
| `GET` | `/class-groups/:id/deadlines` | Membre | Échéances du groupe |

### Accès fichiers (S3 privés)

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| `GET` | `/storage/upload` | Auth | Upload fichier → retourne `{ url, key, mimetype, size }` |
| `GET` | `/storage/presign?key=...` | Auth | Presigned URL (15 min) pour ouvrir ou télécharger |

---

## 8. Cas limites et comportements attendus

| Situation | Comportement |
|-----------|-------------|
| `GET /class-groups/:id` par un non-membre | 403 Accès refusé |
| `GET /class-groups/:id` — groupe inexistant | 404 Groupe introuvable |
| Invitation vers un email déjà membre du groupe | Ajout direct ignoré si même rôle ; rôle mis à jour si différent |
| Invitation vers un email avec invitation déjà pending | `findOrCreate` — invitation existante réutilisée, pas de doublon |
| Enseignant tente de soumettre un rendu | 403 Accès refusé (guard `_isTeacher` dans le service) |
| Soumission dans une section de type `section` | 404 Section de type rendu introuvable |
| Re-soumission avec un nouveau fichier | Ancien fichier S3 supprimé, soumission mise à jour |
| Suppression d'une ressource avec fichier S3 | `DeleteObjectCommand` envoyé avant suppression BDD |
| Suppression d'une ressource sans fichier S3 | Suppression BDD uniquement |
| `GET /kpi/students` sans aucun étudiant dans le groupe | `{ activeStudentsCount: 0, atRiskCount: 0, students: [] }` |
| Étudiant sans consentement KPI accordé | Pas de détail KPI dans l'accordéon — données non chargées |

---

## 9. Points d'attention et dette technique

| Priorité | Sujet | Description |
|----------|-------|-------------|
| Moyenne | Suppression en cascade des soumissions | La suppression d'une `ClassGroupSection` ne supprime pas les fichiers S3 associés aux soumissions — uniquement la ligne BDD (via `ON DELETE CASCADE`). Prévoir un hook `beforeDestroy` ou un nettoyage asynchrone. |
| Moyenne | Limite de taille upload non enforced côté API | Le front bloque à 10 Mo, mais l'API n'a pas de limite explicite en V1. À ajouter via `multer` si nécessaire. |
| Faible | Pas de pagination sur les listes | `GET /sections`, `GET /resources`, `GET /submissions` retournent toutes les entrées. Acceptable pour des classes de 30–40 étudiants, à paginer si usage plus large. |
| Faible | Pas de validation du `fileKey` côté API pour les ressources | Le front envoie la clé S3 retournée par `/storage/upload`. En V1, la correspondance `userId` est vérifiée pour les soumissions mais pas pour les ressources. |
| Information | Création de groupe réservée aux admins | Un enseignant ne peut pas créer de groupe lui-même — il doit passer par un admin établissement. Comportement voulu en V1 pour un usage institutionnel contrôlé. |
| Information | Score de groupe (`ClassGroup.score`) | Champ présent en base mais non calculé automatiquement en V1 — valeur définie manuellement par un admin. |
