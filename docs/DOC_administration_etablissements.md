# Documentation administration — Gestion des établissements et invitations

> S-04 · V1 · Lié aux US-16, US-22  
> Dernière mise à jour : 2026-07-04

---

## Sommaire

1. [Vue d'ensemble](#1-vue-densemble)
2. [Modèle de données](#2-modèle-de-données)
3. [Rôles et droits](#3-rôles-et-droits)
4. [API — Gestion des établissements](#4-api--gestion-des-établissements)
5. [API — Assignation du gérant](#5-api--assignation-du-gérant)
6. [API — Activation des comptes](#6-api--activation-des-comptes)
7. [API — Pilotage établissement](#7-api--pilotage-établissement)
8. [Audit trail — Référence des actions](#8-audit-trail--référence-des-actions)
9. [Flux complets](#9-flux-complets)
10. [Contraintes métier et gardes](#10-contraintes-métier-et-gardes)
11. [Dette connue et limitations V1](#11-dette-connue-et-limitations-v1)

---

## 1. Vue d'ensemble

La fonctionnalité **Gestion des établissements** permet à l'administrateur plateforme de :

- Créer et gérer des établissements (écoles, lycées, universités…)
- Assigner un gérant (admin établissement) par email — directement si le compte existe, par invitation sinon
- Activer / désactiver des comptes utilisateurs
- Consulter les statistiques de pilotage d'un établissement
- Auditer les actions effectuées dans le périmètre d'un établissement
- Modérer le contenu (ressources + sections) des groupes classes

---

## 2. Modèle de données

### Table `Etablissement`

| Colonne | Type | Contrainte | Description |
|---------|------|------------|-------------|
| `id` | INTEGER | PK, auto-increment | Identifiant |
| `name` | STRING | NOT NULL | Nom de l'établissement |
| `code` | STRING(20) | NOT NULL, UNIQUE | Code court (ex : `LVH-01`) |
| `adminId` | INTEGER | FK → User.userId, nullable | Gérant actuel (null si non assigné) |
| `createdAt` | DATE | NOT NULL | Date de création |
| `updatedAt` | DATE | NOT NULL | Dernière modification |

**Contrainte `code`** : lettres, chiffres, tirets, underscores uniquement (`/^[A-Z0-9_-]+$/i`). Max 20 caractères.

**Index** : `code` (unique), `adminId`

---

### Table `AuditLog`

| Colonne | Type | Contrainte | Description |
|---------|------|------------|-------------|
| `id` | INTEGER | PK, auto-increment | Identifiant |
| `actorId` | INTEGER | FK → User.userId, nullable | Utilisateur auteur de l'action |
| `action` | STRING(50) | NOT NULL | Code d'action (voir §8) |
| `entityType` | STRING(30) | NOT NULL | Type d'entité concernée |
| `entityId` | INTEGER | nullable | ID de l'entité |
| `metadata` | JSON | nullable | Données contextuelles |
| `createdAt` | DATE | NOT NULL | Horodatage |

**Index** : `actorId`, `(entityType, entityId)`, `createdAt`

---

### Table `User` — champs pertinents

| Colonne | Description |
|---------|-------------|
| `roleId` | 1=admin plateforme · 2=étudiant · 3=enseignant · 4=admin établissement |
| `isActive` | Compte actif (`true` par défaut) |
| `hasValidatedEmail` | Email vérifié (requis pour se connecter) |

---

## 3. Rôles et droits

| roleId | Label | Droits sur les établissements |
|--------|-------|-------------------------------|
| 1 | Admin plateforme | Accès complet : CRUD établissements, assignation, modération, audit de tous les établissements |
| 4 | Admin établissement | Accès limité à son établissement : stats, audit, contenu, activation comptes |
| 2 / 3 | Étudiant / Enseignant | Aucun accès aux routes d'administration établissement |

**Middleware d'authentification** : toutes les routes ci-dessous requièrent `Authorization: Bearer <JWT>` via `Auth.middleware.js`.

**Middleware de rôle** : `requireRole(1)` ou `requireRole(1, 4)` selon la route (voir §4–§7).

---

## 4. API — Gestion des établissements

### `GET /etablissements`

Liste tous les établissements.

| | |
|---|---|
| **Auth** | `requireRole(1)` |
| **Réponse 200** | `{ message, data: [{ id, name, code, adminId, admin: { userId, name, email } }] }` |

---

### `GET /etablissements/mine`

Récupère l'établissement du gérant connecté.

| | |
|---|---|
| **Auth** | `requireRole(4)` |
| **Réponse 200** | `{ message, data: { id, name, code, adminId, admin } }` |
| **Réponse 404** | Aucun établissement associé à ce compte |

---

### `GET /etablissements/:id`

Récupère un établissement par son ID.

| | |
|---|---|
| **Auth** | `requireRole(1, 4)` |
| **Paramètre** | `id` — entier positif |
| **Réponse 200** | `{ message, data: { id, name, code, adminId, admin } }` |
| **Réponse 403** | Un admin établissement (roleId=4) tente d'accéder à un établissement qui n'est pas le sien |
| **Réponse 404** | Établissement introuvable |

> **Règle roleId=4** : l'admin établissement ne peut accéder qu'à l'établissement dont il est `adminId`. Si l'`id` demandé ne correspond pas, la requête retourne 403.

---

### `POST /etablissements`

Crée un établissement.

| | |
|---|---|
| **Auth** | `requireRole(1)` |
| **Corps** | `{ name: string (max 100), code: string (max 20, alphanumérique), adminId?: integer \| null }` |
| **Réponse 201** | `{ message, data: { id, name, code, adminId } }` |
| **Réponse 409** | Code déjà utilisé par un autre établissement |

---

### `PUT /etablissements/:id`

Met à jour un établissement (patch partiel — seuls les champs présents sont modifiés).

| | |
|---|---|
| **Auth** | `requireRole(1)` |
| **Corps** | `{ name?: string, code?: string, adminId?: integer \| null }` |
| **Réponse 200** | `{ message, data }` |
| **Réponse 404** | Établissement introuvable |
| **Réponse 409** | Code déjà utilisé |

---

### `DELETE /etablissements/:id`

Supprime un établissement.

| | |
|---|---|
| **Auth** | `requireRole(1)` |
| **Réponse 200** | `{ message: "Établissement supprimé." }` |
| **Réponse 404** | Établissement introuvable |

---

## 5. API — Assignation du gérant

### `POST /etablissements/:id/assign-admin`

Assigne un gérant à un établissement. Deux cas selon l'existence du compte :

| | |
|---|---|
| **Auth** | `requireRole(1)` |
| **Corps** | `{ email: string (email valide) }` |

**Cas 1 — Compte existant** :  
Le user est promu `roleId=4` et devient `adminId` de l'établissement dans une transaction atomique.  
L'ancien admin (si existant) est rétrogradé à `roleId=2`.

**Cas 2 — Compte inexistant** :  
Une invitation `admin_etablissement` est créée et un email est envoyé. Si une invitation pendante existe déjà pour ce couple `(etablissementId, email)`, l'invitation n'est pas dupliquée et l'email **n'est pas renvoyé**.

**Réponses** :

| Code | Cas | Corps |
|------|-----|-------|
| 200 | Assignation directe | `{ message: "Gérant assigné avec succès.", data: { directlyAssigned: true, etab, user } }` |
| 200 | Invitation envoyée | `{ message: "Aucun compte trouvé pour …. Un email d'invitation a été envoyé.", data: { directlyAssigned: false, email } }` |
| 404 | Établissement introuvable | `{ message: "Établissement introuvable." }` |
| 409 | L'utilisateur est admin plateforme (roleId=1) | `{ message: "Impossible d'assigner un administrateur plateforme comme gérant d'établissement." }` |
| 409 | L'utilisateur gère déjà un autre établissement | `{ message: "Cet utilisateur est déjà gestionnaire d'un autre établissement." }` |

**Invariants maintenus par la transaction** :
- Si `user.update({ roleId: 4 })` échoue, `etab.update({ adminId })` est annulé et vice-versa.
- L'ancien admin perd `roleId=4` dans la même transaction.

---

### Flux invitation → inscription

Quand un utilisateur crée un compte avec l'email invité, `User.service._processPendingEmailInvitations()` :

1. Détecte l'invitation `admin_etablissement` pendante
2. Promeut l'utilisateur à `roleId=4`
3. Associe l'établissement (`adminId = userId`)
4. Marque l'invitation `accepted`

---

## 6. API — Activation des comptes

Ces routes permettent de gérer l'état actif des comptes utilisateurs.

### `PATCH /users/:id/activate`

Active un compte utilisateur.

| | |
|---|---|
| **Auth** | `requireRole(1, 4)` |
| **Paramètre** | `id` — ID utilisateur |
| **Réponse 200** | `{ message, data: user }` |
| **Réponse 404** | Utilisateur introuvable |
| **Réponse 403** | Accès refusé (voir gardes ci-dessous) |

---

### `PATCH /users/:id/deactivate`

Désactive un compte utilisateur.

| | |
|---|---|
| **Auth** | `requireRole(1, 4)` |
| **Paramètre** | `id` — ID utilisateur |
| **Réponse 200** | `{ message, data: user }` |
| **Réponse 404** | Utilisateur introuvable |
| **Réponse 403** | Accès refusé (voir gardes ci-dessous) |

**Gardes `setActive`** (dans `User.service.js`) :

| Condition | Résultat |
|-----------|----------|
| `targetId === actorId` | 403 — auto-désactivation interdite |
| `requesterRoleId === 4` et `target.roleId === 1` | 403 — un gérant ne peut pas agir sur un admin plateforme |
| `target.roleId === 1` et `requesterRoleId === 1` | 403 — un admin plateforme ne peut pas désactiver un autre admin plateforme via l'API |

> Pour désactiver un compte admin plateforme compromis, une intervention directe en base de données est nécessaire (décision volontaire — voir DECISIONS.md).

---

## 7. API — Pilotage établissement

### `GET /etablissements/:id/stats`

Statistiques de pilotage d'un établissement.

| | |
|---|---|
| **Auth** | `requireRole(1, 4)` |
| **Réponse 200** | Voir structure ci-dessous |
| **Réponse 403** | Admin établissement sur un établissement tiers |
| **Réponse 404** | Établissement introuvable |

**Structure de réponse** :

```json
{
  "groupCount": 3,
  "totalMembers": 47,
  "activeMembers": 44,
  "inactiveMembers": 3,
  "validatedAccounts": 42,
  "pendingInvitations": 5,
  "roleBreakdown": {
    "students": 38,
    "teachers": 9
  },
  "recentActivity": [
    {
      "id": 12,
      "action": "USER_INVITED",
      "entityType": "Invitation",
      "entityId": 7,
      "metadata": { "targetEmail": "alice@lycee.fr" },
      "createdAt": "2026-07-01T14:22:00.000Z",
      "actor": { "userId": 10, "name": "Dupont", "email": "admin@lycee.fr" }
    }
  ]
}
```

> **Périmètre** : les groupes sont scopés par `createdBy: adminId`. Voir §11 pour la limitation connue.

> **Déduplication** : un utilisateur présent dans plusieurs groupes est compté une seule fois. S'il est enseignant dans au moins un groupe, il est comptabilisé comme `teacher`.

---

### `GET /etablissements/:id/audit`

Journal d'audit scopé à l'admin de l'établissement.

| | |
|---|---|
| **Auth** | `requireRole(1, 4)` |
| **Query params** | Voir tableau ci-dessous |
| **Réponse 200** | `{ message, data: [AuditLog] }` |

**Paramètres de filtre** :

| Paramètre | Type | Défaut | Max | Description |
|-----------|------|--------|-----|-------------|
| `action` | string | — | — | Filtrer par code d'action (ex : `USER_INVITED`) |
| `entityType` | string | — | — | Filtrer par type d'entité (`User`, `Invitation`…) |
| `entityId` | integer ≥ 1 | — | — | Filtrer par ID d'entité (ignoré si non numérique) |
| `limit` | integer 1–500 | 100 | 500 | Nombre de résultats |

---

### `GET /etablissements/:id/content`

Liste l'ensemble du contenu (ressources + sections) pour modération.

| | |
|---|---|
| **Auth** | `requireRole(1, 4)` |
| **Réponse 200** | `{ message, data: { resources: [...], sections: [...] } }` |

Chaque ressource/section inclut : `id`, `title`, `createdAt`, `creator` (userId/name/email), `classGroup` (id/name).

---

### `DELETE /etablissements/:id/content/:contentType/:contentId`

Supprime un contenu pour modération.

| | |
|---|---|
| **Auth** | `requireRole(1, 4)` |
| **Paramètres** | `contentType`: `resource` ou `section` · `contentId`: entier positif |
| **Réponse 200** | `{ message: "Contenu supprimé." }` |
| **Réponse 404** | Établissement introuvable, ou contenu introuvable / hors établissement |
| **Réponse 403** | Admin établissement tente de modérer un autre établissement |

> **Cas particulier** : quand `adminId` est null (aucun gérant assigné), l'admin plateforme (roleId=1) peut supprimer tout contenu existant par ID (nettoyage de contenu orphelin).

---

## 8. Audit trail — Référence des actions

Les actions suivantes sont tracées dans `AuditLog` dans le périmètre de la gestion des établissements.

| `action` | `entityType` | `entityId` | `metadata` | Déclencheur |
|----------|-------------|------------|------------|-------------|
| `ADMIN_ETABLISSEMENT_ASSIGNED` | `Etablissement` | ID établissement | `{ adminId, adminEmail }` | `assignAdmin` — compte existant |
| `ADMIN_ETABLISSEMENT_INVITED` | `Invitation` | ID invitation | `{ targetEmail, etablissementId }` | `assignAdmin` — compte inexistant |
| `USER_ACCOUNT_ACTIVATED` | `User` | ID utilisateur | `{ previousIsActive }` | `setActive(true)` |
| `USER_ACCOUNT_DEACTIVATED` | `User` | ID utilisateur | `{ previousIsActive }` | `setActive(false)` |
| `USER_ROLE_CHANGED` | `User` | ID utilisateur | `{ roleId }` | `setRole` / `deleteRole` |
| `CONTENT_RESOURCE_REMOVED` | `ClassGroupResource` | ID ressource | `{ classGroupId, etablissementId }` | `deleteContent('resource', …)` |
| `CONTENT_SECTION_REMOVED` | `ClassGroupSection` | ID section | `{ classGroupId, etablissementId }` | `deleteContent('section', …)` |

> D'autres actions (`USER_INVITED`, `GROUP_CREATED`, `GROUP_MEMBER_ADDED`, etc.) peuvent apparaître dans les journaux selon les actions de l'admin.

---

## 9. Flux complets

### Flux 1 — Création et déploiement d'un établissement

```
Admin plateforme
  │
  ├── POST /etablissements              → crée l'établissement (code unique)
  │
  ├── POST /etablissements/:id/assign-admin  (email du gérant)
  │       ├── Compte existant → promote roleId=4 + update adminId (transaction)
  │       └── Compte inexistant → crée Invitation + envoie email
  │
  └── [gérant s'inscrit avec l'email invité]
          └── _processPendingEmailInvitations → roleId=4 + adminId = userId
```

---

### Flux 2 — Remplacement d'un gérant

```
Admin plateforme
  │
  └── POST /etablissements/:id/assign-admin  (email du nouveau gérant)
          ├── Vérifie que le nouvel admin n'est pas roleId=1
          ├── Vérifie que le nouvel admin ne gère pas déjà un autre établissement
          └── Transaction :
                ├── Ancien admin → roleId: 4 → 2
                ├── Nouveau admin → roleId: 2 → 4
                └── Etablissement → adminId = nouveau userId
```

---

### Flux 3 — Gestion d'un compte utilisateur problématique

```
Admin plateforme ou Admin établissement
  │
  ├── PATCH /users/:id/deactivate    → isActive = false
  │
  └── [l'utilisateur ne peut plus se connecter]
       (le login vérifie isActive avant d'émettre le JWT)
```

---

## 10. Contraintes métier et gardes

| Règle | Appliquée dans |
|-------|----------------|
| Un établissement ne peut avoir qu'un seul gérant (`adminId`) à la fois | Modèle + `assignAdmin` |
| Un utilisateur ne peut être gérant que d'un seul établissement | `assignAdmin` — `Etablissement.findOne({ adminId })` |
| Un admin plateforme (roleId=1) ne peut pas être assigné comme gérant | `assignAdmin` — garde `user.roleId === 1` |
| L'assignation d'un nouveau gérant révoque automatiquement l'ancien | `assignAdmin` — transaction avec `User.update({ roleId: 2 })` |
| L'invitation n'est créée qu'une fois par couple `(etablissementId, email)` en statut `pending` | `findOrCreate` sur `Invitation` |
| L'email d'invitation n'est envoyé qu'à la création (pas de re-send automatique) | Vérification du flag `created` retourné par `findOrCreate` |
| Un utilisateur ne peut pas se désactiver lui-même | `setActive` — `targetId === actorId` |
| Un admin plateforme ne peut pas désactiver un autre admin plateforme via l'API | `setActive` — `target.roleId === 1 && requesterRoleId === 1` |
| Un gérant ne peut pas désactiver un admin plateforme | `setActive` — `requesterRoleId === 4 && target.roleId === 1` |
| Les `limit` des journaux audit sont plafonnées à 500 | `getAuditLogs` — `Math.min(val, 500)` |
| Les `entityId` non numériques sont ignorés dans les filtres audit | `getAuditLogs` — `Number.isInteger()` |

---

## 11. Dette connue et limitations V1

### Limitation de scope par `createdBy: adminId`

Les fonctions `getStats`, `getContent` et `deleteContent` scontent les groupes par `ClassGroup.createdBy = adminId`. Cela signifie :

- Si l'admin est remplacé, les groupes créés par l'ancien admin **ne sont plus visibles** dans les stats/contenu du nouvel admin.
- Si l'admin a créé des groupes en dehors de son rôle de gérant, ils peuvent apparaître dans les stats.

**Solution V2** : ajouter une colonne `etablissementId` (FK) sur `ClassGroup` et migrer le scope vers cette FK.

---

### `_processPendingEmailInvitations` — gardes manquantes

La fonction `User.service._processPendingEmailInvitations()` (appelée à l'inscription) ne vérifie pas :
- Si le compte inscrit est roleId=1 avant la promotion
- Si l'utilisateur gère déjà un autre établissement
- L'atomicité de la transaction

Ce cas est peu probable en pratique (un admin plateforme n'est pas censé s'inscrire via une invitation gérant) mais constitue une dette à corriger.

---

### Pas de vue "tous les comptes de l'établissement"

La vue admin établissement affiche les membres du groupe courant. Il n'existe pas de vue listant l'ensemble des utilisateurs de l'établissement. À implémenter en V2 si besoin.

---

## Référence rapide

### Codes de retour `assignAdmin`

| Valeur service | HTTP | Signification |
|---|---|---|
| `null` | 404 | Établissement introuvable |
| `'platform_admin'` | 409 | Utilisateur est admin plateforme |
| `'already_admin'` | 409 | Utilisateur gère déjà un autre établissement |
| `{ directlyAssigned: true, … }` | 200 | Compte promu directement |
| `{ directlyAssigned: false, … }` | 200 | Invitation envoyée |

### Codes de retour `setActive`

| Valeur service | HTTP | Signification |
|---|---|---|
| `null` | 404 | Utilisateur introuvable |
| `false` | 403 | Action refusée (voir gardes §6) |
| `object` | 200 | Opération réussie |

### Codes de retour `deleteContent`

| Valeur service | HTTP | Signification |
|---|---|---|
| `null` | 404 | Établissement introuvable |
| `false` | 403 | Accès refusé |
| `'not_found'` | 404 | Contenu introuvable ou hors périmètre |
| `true` | 200 | Contenu supprimé |
