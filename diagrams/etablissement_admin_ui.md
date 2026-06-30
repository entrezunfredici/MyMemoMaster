# Maquettes UI — Espace admin établissement

> Document de référence pour la fonctionnalité **Gestion des établissements et invitations** (S-04 / Analyse V1).
> Livré dans le cadre de S-04.02 (Maquettes UI espace admin). User stories : US-16, US-22.
> Basé sur l'analyse S-04.01 (`diagrams/etablissement_admin_perimeter.md`).

---

## 1. Contexte et objectif

Ce document définit les maquettes ASCII de toutes les vues UI à créer ou modifier pour l'espace admin de MyMemoMaster. Il couvre deux espaces distincts :

1. **`ClassroomEtablissementView.vue` — enrichi** : vue existante pour l'admin établissement (roleId=4), étendue avec un système d'onglets ajoutant le tableau de bord et la gestion des utilisateurs.
2. **`AdminPlatformePage.vue` — nouveau** : page dédiée à l'admin plateforme (roleId=1) pour gérer les établissements et leurs admins.

---

## 2. Périmètre

| Fonctionnalité | Dans le périmètre S-04.02 |
|---|---|
| Tableau de bord admin établissement | ✅ |
| Onglet "Groupes" (refactoring navigation) | ✅ |
| Onglet "Utilisateurs" — liste + activer/désactiver | ✅ |
| Page admin plateforme `/admin` — CRUD établissements | ✅ |
| Page admin plateforme — liste utilisateurs plateforme | ✅ |
| Audit trail UI (logs) | ⏳ V2 — conception uniquement (section 7) |
| Facturation | ❌ hors version |
| SCIM / ENT | ❌ hors version |

---

## 3. Vue 1 — `ClassroomEtablissementView.vue` (étendue)

### 3.1 Architecture en onglets

La vue actuelle n'a pas d'onglets. L'extension ajoute une barre de navigation en haut. Le contenu existant (groupes + emploi du temps + membres) migre sous l'onglet **Groupes**.

```
┌─────────────────────────────────────────────────────────────────┐
│  ClassroomEtablissementView.vue                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┬──────────────────┬───────────────────┐    │
│  │  Tableau de bord │      Groupes     │   Utilisateurs    │    │
│  └──────────────────┴──────────────────┴───────────────────┘    │
│                                                                 │
│  [ Contenu de l'onglet actif — voir ci-dessous ]               │
└─────────────────────────────────────────────────────────────────┘
```

**Comportement des onglets :**
- Onglet actif : `border-b-2 border-primary text-primary font-semibold`
- Onglet inactif : `text-dark/60 hover:text-dark`
- Au montage : onglet "Tableau de bord" actif par défaut
- Aucune navigation de route — simple `ref activeTab`

---

### 3.2 Onglet "Tableau de bord"

Statistiques globales de l'établissement, calculées côté front depuis les stores déjà chargés.

```
┌─────────────────────────────────────────────────────────────────┐
│  [Tableau de bord] ▸  Groupes  ▸  Utilisateurs                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │      3       │  │     47       │  │      5       │          │
│  │   Groupes    │  │   Membres    │  │  Invitations │          │
│  │   classes    │  │   actifs     │  │  en attente  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │     44       │  │      2       │                            │
│  │   Comptes    │  │   Comptes    │                            │
│  │   validés    │  │  désactivés  │                            │
│  └──────────────┘  └──────────────┘                            │
│                                                                 │
│  ─────────────────────────────────────────────────────         │
│  Répartition des rôles                                          │
│                                                                 │
│  Étudiants  ████████████████░░░░  38  (80 %)                   │
│  Enseignants ████░░░░░░░░░░░░░░░░   9  (19 %)                  │
│  Admins     █░░░░░░░░░░░░░░░░░░░░   0  ( 1 %)                  │
│                                                                 │
│  ─────────────────────────────────────────────────────         │
│  Activité récente                                               │
│                                                                 │
│  • alice@lycee.fr     a rejoint Terminale G1  — il y a 2 j    │
│  • bob@lycee.fr       invitation envoyée      — il y a 3 j    │
│  • celine@lycee.fr    compte désactivé        — il y a 5 j    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Données sources :**

| Indicateur | Source |
|---|---|
| Groupes classes | `classGroupStore.groups.length` |
| Membres actifs | `classGroupStore.groups` → `g.members` dédupliqués par `userId` + `isActive = true` |
| Invitations en attente | `invitationStore.allInvitations.filter(i => i.status === 'pending').length` |
| Comptes validés | utilisateurs invités avec `hasValidatedEmail = true` |
| Comptes désactivés | utilisateurs invités avec `isActive = false` |
| Répartition rôles | dérivée des membres cross-groupes (roleId → label) |
| Activité récente | `etablissementStore.recentActivity` — 5 derniers événements |

> **Implémentation** : les stats sont calculées côté front depuis les stores existants. Pas de nouvel endpoint nécessaire pour les indicateurs de base. `recentActivity` nécessite un endpoint dédié (V2, lié à l'AuditLog).

---

### 3.3 Onglet "Groupes" (existant, migré)

**Aucun changement de comportement.** Le contenu actuel de `ClassroomEtablissementView.vue` est déplacé intégralement sous cet onglet.

```
┌─────────────────────────────────────────────────────────────────┐
│   Tableau de bord  ▸  [Groupes] ▸  Utilisateurs               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Groupes classes                         [+ Nouvelle classe]   │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ PRÉPA       │  │ PRÉPA       │  │ TERM.       │            │
│  │ MP2I-A      │  │ MP2I-B      │  │ G1          │            │
│  │ MP2I-A   ×  │  │ MP2I-B   ×  │  │ G1       ×  │            │
│  │ 18 membres  │  │ 15 membres  │  │ 27 membres  │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
│  [ Sélectionner un groupe pour gérer l'emploi du temps ]       │
│                                                                 │
│  ┌───────────────────────────────┐  ┌────────────────────────┐ │
│  │  Emploi du temps — MP2I-A     │  │  Inviter               │ │
│  │  [Nouveau créneau...]         │  │  [email]               │ │
│  │  Lun 09:00 Maths (8 séances) │  │  [Étudiant][Enseignant]│ │
│  │  Mer 14:00 Info  (6 séances) │  │  [Envoyer invitation]  │ │
│  └───────────────────────────────┘  ├────────────────────────┤ │
│                                     │  Membres (18)          │ │
│                                     │  Alice M.  Étud. [×]  │ │
│                                     │  Bob D.    Ens.  [×]  │ │
│                                     │  …                     │ │
│                                     └────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

*Référence : contenu existant de `ClassroomEtablissementView.vue` — aucune modification nécessaire dans ce sous-onglet.*

---

### 3.4 Onglet "Utilisateurs"

Vue cross-groupes de tous les utilisateurs que l'admin a invités, avec contrôle d'activation.

```
┌─────────────────────────────────────────────────────────────────┐
│   Tableau de bord  ▸  Groupes  ▸  [Utilisateurs]               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Utilisateurs de l'établissement             [+ Inviter]       │
│                                                                 │
│  Recherche : [___________________________]  Statut : [Tous ▼]  │
│                                             (Actifs / Désact.) │
│                                                                 │
│  ┌──────────────┬──────────────────┬──────────┬────────────┐   │
│  │ Nom          │ Email            │ Rôle     │ Statut     │   │
│  ├──────────────┼──────────────────┼──────────┼────────────┤   │
│  │ Alice Martin │ alice@lycee.fr   │ Étudiant │ ✅ Actif   │   │
│  │              │                  │          │ [Désactiver│   │
│  ├──────────────┼──────────────────┼──────────┼────────────┤   │
│  │ Bob Durand   │ bob@lycee.fr     │ Enseignant│ ✅ Actif  │   │
│  │              │                  │          │ [Désactiver│   │
│  ├──────────────┼──────────────────┼──────────┼────────────┤   │
│  │ Céline Roy   │ celine@lycee.fr  │ Étudiant │ 🚫 Désact. │   │
│  │              │                  │          │ [Réactiver]│   │
│  ├──────────────┼──────────────────┼──────────┼────────────┤   │
│  │ david@ex.fr  │ david@lycee.fr   │ —        │ ⏳ En attente│ │
│  │              │ (email non valid)│          │ Pas inscrit│   │
│  └──────────────┴──────────────────┴──────────┴────────────┘   │
│                                                                 │
│  [ Charger plus ] (pagination — 20 par page)                   │
└─────────────────────────────────────────────────────────────────┘
```

**Légende des statuts :**

| Icône | Signification | Condition |
|---|---|---|
| ✅ Actif | Compte actif et email validé | `isActive = true` ET `hasValidatedEmail = true` |
| 🚫 Désact. | Compte désactivé par l'admin | `isActive = false` |
| ⏳ En attente | Invitation envoyée, compte non créé | `Invitation.status = 'pending'` + pas de `User` |
| ⚠️ Non validé | Inscrit mais email non vérifié | `hasValidatedEmail = false` |

**Formulaire d'invitation rapide (bouton "+ Inviter") :**

```
┌───────────────────────────────────────────────────┐
│  Inviter un utilisateur                        [X]│
├───────────────────────────────────────────────────┤
│                                                   │
│  Email *                                          │
│  [________________________________________]       │
│                                                   │
│  Rôle *                                           │
│  [Étudiant ▼]  (Étudiant / Enseignant)           │
│                                                   │
│  Groupe (optionnel)                               │
│  [Sélectionner un groupe... ▼]                    │
│                                                   │
│              [Annuler]  [Envoyer l'invitation]    │
│                                                   │
└───────────────────────────────────────────────────┘
```

> **Note** : Si un groupe est sélectionné, l'invitation crée directement le membership. Si aucun groupe n'est sélectionné, l'utilisateur est invité à l'établissement sans être affecté à un groupe — il pourra être ajouté à un groupe ultérieurement depuis l'onglet Groupes.

**Modal de confirmation désactivation :**

```
┌───────────────────────────────────────────────────┐
│  Désactiver ce compte ?                        [X]│
├───────────────────────────────────────────────────┤
│                                                   │
│  Vous allez désactiver le compte de :             │
│  Alice Martin (alice@lycee.fr)                    │
│                                                   │
│  L'utilisateur ne pourra plus se connecter        │
│  à MyMemoMaster jusqu'à réactivation.             │
│                                                   │
│  Ses données sont conservées.                     │
│                                                   │
│              [Annuler]  [Désactiver]              │
│                                                   │
└───────────────────────────────────────────────────┘
```

---

## 4. Vue 2 — `AdminPlatformePage.vue` (nouvelle page)

Route : `/admin` · Access : `meta.roles: [1]` (admin plateforme uniquement)

### 4.1 Structure générale

```
┌─────────────────────────────────────────────────────────────────┐
│  Administration — MyMemoMaster                                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────────┬───────────────────┬──────────────────┐  │
│  │  Établissements    │   Utilisateurs    │   Logs (V2)      │  │
│  └────────────────────┴───────────────────┴──────────────────┘  │
│                                                                 │
│  [ Contenu de l'onglet actif ]                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### 4.2 Onglet "Établissements"

```
┌─────────────────────────────────────────────────────────────────┐
│  [Établissements] ▸  Utilisateurs  ▸  Logs (V2)                │
├─────────────────────────────────────────────────────────────────┤
│                                    [+ Nouvel établissement]     │
│                                                                 │
│  Recherche : [___________________________]                      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Lycée Victor Hugo                                      │   │
│  │  Code : LVH  ·  Admin : Jean Dupont (jean@lhv.fr)      │   │
│  │  3 groupes  ·  47 membres                              │   │
│  │                                      [Modifier]  [×]   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  École Nationale Supérieure                             │   │
│  │  Code : ENS01  ·  Admin : Marie Curie (m.c@ens.fr)     │   │
│  │  5 groupes  ·  120 membres                             │   │
│  │                                      [Modifier]  [×]   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  IUT de Lyon                                            │   │
│  │  Code : IUTLY  ·  Admin : (non assigné)                │   │
│  │  0 groupes  ·  0 membres                               │   │
│  │                                      [Modifier]  [×]   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Modal "Nouvel établissement" :**

```
┌───────────────────────────────────────────────────┐
│  Nouvel établissement                          [X]│
├───────────────────────────────────────────────────┤
│                                                   │
│  Nom de l'établissement *                         │
│  [________________________________________]       │
│                                                   │
│  Code (identifiant court, unique) *               │
│  [_______________]   ex: LVH, ENS01, IUT-LY       │
│                                                   │
│  Admin désigné *                                  │
│  [Rechercher par email ou nom...           ▼]     │
│   → affiche les utilisateurs avec roleId=4         │
│   → ou un utilisateur quelconque (le rôle sera    │
│     automatiquement mis à jour vers roleId=4)      │
│                                                   │
│              [Annuler]  [Créer]                   │
└───────────────────────────────────────────────────┘
```

**Modal "Modifier un établissement" :**

```
┌───────────────────────────────────────────────────┐
│  Modifier — Lycée Victor Hugo                  [X]│
├───────────────────────────────────────────────────┤
│                                                   │
│  Nom *                                            │
│  [Lycée Victor Hugo________________]              │
│                                                   │
│  Code *                                           │
│  [LVH____]                                        │
│                                                   │
│  Admin désigné                                    │
│  [Jean Dupont (jean@lhv.fr)              ▼]       │
│                                                   │
│  ⚠️  Changer l'admin révoquera les droits         │
│  de gestion de l'ancien admin.                    │
│                                                   │
│              [Annuler]  [Enregistrer]             │
└───────────────────────────────────────────────────┘
```

**Modal "Supprimer un établissement" :**

```
┌───────────────────────────────────────────────────┐
│  Supprimer cet établissement ?                 [X]│
├───────────────────────────────────────────────────┤
│                                                   │
│  Vous allez supprimer :                           │
│  Lycée Victor Hugo (LVH)                         │
│                                                   │
│  ⚠️  Cette action est irréversible.               │
│  Les groupes classes et leurs membres ne sont     │
│  PAS supprimés. Seule la fiche établissement      │
│  est retirée.                                     │
│                                                   │
│  Confirmez en tapant le code de l'établissement : │
│  [___________]   attendu : LVH                    │
│                                                   │
│              [Annuler]  [Supprimer]               │
└───────────────────────────────────────────────────┘
```

> **Règle** : la suppression est bloquée côté API si des groupes actifs existent. Le front affiche le nombre de groupes dans la fiche — si > 0, remplacer par le message "Supprimez ou transférez les 3 groupes avant de supprimer l'établissement."

---

### 4.3 Onglet "Utilisateurs" (admin plateforme)

Vue de tous les utilisateurs de la plateforme, sans restriction de scope.

```
┌─────────────────────────────────────────────────────────────────┐
│   Établissements  ▸  [Utilisateurs]  ▸  Logs (V2)              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Recherche : [___________________]  Rôle : [Tous ▼]            │
│                                     Statut : [Tous ▼]          │
│                                                                 │
│  ┌────────┬──────────────────┬──────────────────┬────────────┐  │
│  │        │ Nom              │ Email            │ Rôle       │  │
│  │Statut  │                  │                  │            │  │
│  ├────────┼──────────────────┼──────────────────┼────────────┤  │
│  │ ✅     │ Alice Martin     │ alice@lycee.fr   │ Étudiant   │  │
│  │        │                  │                  │ [×]        │  │
│  ├────────┼──────────────────┼──────────────────┼────────────┤  │
│  │ ✅     │ Jean Dupont      │ jean@lhv.fr      │ Admin étab.│  │
│  │        │                  │                  │ [×]        │  │
│  ├────────┼──────────────────┼──────────────────┼────────────┤  │
│  │ 🚫     │ Céline Roy       │ celine@lycee.fr  │ Étudiant   │  │
│  │        │                  │                  │ [Réactiver]│  │
│  ├────────┼──────────────────┼──────────────────┼────────────┤  │
│  │ ⚠️     │ Paul Nom         │ paul@mail.fr     │ Enseignant │  │
│  │        │ (email non valid.)│                 │            │  │
│  └────────┴──────────────────┴──────────────────┴────────────┘  │
│                                                                 │
│  [ < Préc. ]  Page 1 / 12  [ Suiv. > ]                        │
└─────────────────────────────────────────────────────────────────┘
```

**Actions disponibles (admin plateforme uniquement) :**

| Action | Déclencheur | Comportement |
|---|---|---|
| Désactiver | bouton `[×]` sur ligne active | Ouvre modal de confirmation → PATCH `/users/:id/deactivate` |
| Réactiver | bouton `[Réactiver]` sur ligne désactivée | PATCH direct sans confirmation → toast succès |
| Changer de rôle | sélecteur dropdown dans une future version | Non inclus en V1 (nécessite validation PO) |

---

### 4.4 Onglet "Logs" (V2 — conception uniquement)

```
┌─────────────────────────────────────────────────────────────────┐
│   Établissements  ▸  Utilisateurs  ▸  [Logs]                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ⏳ Fonctionnalité disponible en V2                             │
│                                                                 │
│  L'audit trail sera disponible ici une fois l'AuditLog         │
│  implémenté côté API. Les données seront filtrables par :       │
│  - Acteur (utilisateur ayant effectué l'action)                 │
│  - Type d'action (connexion, activation, invitation, etc.)      │
│  - Période                                                      │
│  - Établissement                                                │
│                                                                 │
│  Maquette de l'interface future :                               │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ 30/06 12:45  jean@lhv.fr   alice@lycee.fr désactivé   │     │
│  │ 30/06 10:30  jean@lhv.fr   bob@lycee.fr   invité      │     │
│  │ 29/06 09:15  admin@mmm.fr  LVH créé                   │     │
│  │ ...                                                    │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Composants à créer et modifier

### 5.1 Composants à créer

| Composant | Fichier | Rôle |
|---|---|---|
| Page admin plateforme | `pages/AdminPlatformePage.vue` | Coordinateur onglets admin plateforme |
| Onglet établissements | `pages/admin/AdminEtablissementsTab.vue` | Liste + CRUD établissements |
| Onglet utilisateurs (admin plat.) | `pages/admin/AdminUsersTab.vue` | Liste all users + activate/deactivate |
| Modal création établissement | `components/admin/EtablissementFormModal.vue` | Formulaire create/update partagé |

### 5.2 Composants à modifier

| Composant | Fichier | Modification |
|---|---|---|
| Vue établissement | `pages/ClassroomEtablissementView.vue` | Ajouter barre d'onglets + onglet "Utilisateurs" + onglet "Tableau de bord" |

---

## 6. Stores Pinia à créer

### 6.1 `stores/etablissements.js`

```javascript
// state
etablissements: []      // liste pour admin plateforme
current: null           // établissement sélectionné
loading: false

// actions
fetchAll()              // GET /etablissements  (admin plateforme)
create(data)            // POST /etablissements
update(id, data)        // PUT /etablissements/:id
remove(id)              // DELETE /etablissements/:id
```

### 6.2 `stores/adminUsers.js`

```javascript
// state
users: []               // tous les utilisateurs (admin plateforme)
invitedUsers: []        // utilisateurs invités par l'admin étab. (admin établissement)
loading: false
pagination: { page: 1, total: 0, perPage: 20 }

// actions
fetchAll(filters)        // GET /users (admin plateforme) — paginé
fetchInvited()           // GET /users?invitedBy=me (admin établissement)
activate(userId)         // PATCH /users/:id/activate
deactivate(userId)       // PATCH /users/:id/deactivate
```

---

## 7. Routes Vue Router

| Route | Composant | `meta.roles` | Description |
|---|---|---|---|
| `/admin` | `AdminPlatformePage.vue` | `[1]` | Espace admin plateforme |
| `/admin/etablissements` | (même page, onglet actif) | `[1]` | Onglet établissements |
| `/admin/users` | (même page, onglet actif) | `[1]` | Onglet utilisateurs |

**Entrée de navigation** : ajouter un lien "Administration" dans `NavbarComponent.vue` visible uniquement pour `isAdminPlateforme`.

**Guard** : le guard `meta.roles: [1]` existant dans `router/index.js` redirige vers `/` si roleId ≠ 1.

---

## 8. Comportements et interactions

### 8.1 Activation / désactivation d'un compte

```
Admin établissement (onglet Utilisateurs)
  │
  ├─ Clic [Désactiver] sur Alice Martin
  │        └─ Modal de confirmation s'ouvre (texte + bouton rouge)
  │           └─ Clic [Désactiver] dans la modal
  │                └─ PATCH /api/v1/users/55/deactivate
  │                   └─ 200 → toast "Compte de Alice Martin désactivé"
  │                          → ligne mise à jour (icône 🚫, bouton → [Réactiver])
  │                   └─ 403 → toast "Action non autorisée"
  │                   └─ 404 → toast "Utilisateur introuvable"
  │
  ├─ Clic [Réactiver] sur Céline Roy
  │        └─ PATCH direct (pas de confirmation)
  │           └─ 200 → toast "Compte de Céline Roy réactivé"
  │                  → ligne mise à jour (icône ✅, bouton → [Désactiver])
```

### 8.2 Création d'un établissement

```
Admin plateforme (onglet Établissements)
  │
  ├─ Clic [+ Nouvel établissement]
  │        └─ Modal s'ouvre (champs vides)
  │           └─ Saisie nom, code, recherche admin
  │              └─ Clic [Créer]
  │                   └─ POST /api/v1/etablissements { name, code, adminId }
  │                      └─ 201 → modal fermée, nouvelle carte en tête de liste
  │                      └─ 409 → "Ce code est déjà utilisé"
  │                      └─ 400 → messages de validation en ligne
```

### 8.3 Calcul des stats du tableau de bord

```javascript
// Calculé côté front depuis les stores
const stats = computed(() => {
  const allMembers = classGroupStore.groups.flatMap(g => g.members ?? [])
  const uniqueUsers = [...new Map(allMembers.map(m => [m.userId, m])).values()]
  return {
    totalGroups: classGroupStore.groups.length,
    totalMembers: uniqueUsers.filter(m => m.user?.isActive !== false).length,
    pendingInvitations: invitationStore.allInvitations.filter(i => i.status === 'pending').length,
    validatedAccounts: uniqueUsers.filter(m => m.user?.hasValidatedEmail).length,
    deactivatedAccounts: uniqueUsers.filter(m => m.user?.isActive === false).length,
  }
})
```

> **Prérequis** : le champ `isActive` doit être inclus dans la réponse de `GET /class-groups` (membres avec `include: [User]`). À vérifier lors de l'implémentation de la migration `isActive`.

---

## 9. Stratégie de tests

| Couche | Ce qui doit être testé |
|---|---|
| `etablissements.js` store | fetchAll (200, erreur), create (201, 409), update, remove |
| `adminUsers.js` store | fetchAll paginé, activate (200, 403), deactivate (200, 403) |
| `AdminPlatformePage.vue` | montage pour roleId=1, redirection pour roleId≠1 |
| Onglet établissements | liste affichée, modal création, 409 code dupliqué |
| Onglet "Utilisateurs" (admin étab.) | liste filtrée, toggle désactiver/réactiver, modal confirmation |

---

## 10. Liens vers l'implémentation (à créer)

| Fichier | Rôle |
|---|---|
| `pages/AdminPlatformePage.vue` | Nouveau coordinateur admin plateforme — à créer |
| `pages/admin/AdminEtablissementsTab.vue` | Onglet établissements — à créer |
| `pages/admin/AdminUsersTab.vue` | Onglet utilisateurs plateforme — à créer |
| `components/admin/EtablissementFormModal.vue` | Modal create/update — à créer |
| `pages/ClassroomEtablissementView.vue` | Refacto avec onglets + onglet Utilisateurs + onglet Tableau de bord — à modifier |
| `stores/etablissements.js` | Store CRUD établissements — à créer |
| `stores/adminUsers.js` | Store gestion utilisateurs admin — à créer |
| `router/routes.js` | Route `/admin` + `meta.roles: [1]` — à ajouter |
| `components/NavbarComponent.vue` | Lien "Administration" conditionné à `isAdminPlateforme` — à modifier |

---

## 11. Points d'attention

- **`isActive` dans les réponses API** : le champ `isActive` doit être inclus dans la réponse `GET /class-groups/:id/members` (via `include: [User]`). Sans ce champ, les statuts du tableau de bord et de l'onglet Utilisateurs ne peuvent pas être calculés.
- **Suppression établissement avec groupes** : le front doit afficher un message préventif si l'établissement a des groupes actifs, avant même que l'API ne renvoie une erreur.
- **Recherche admin dans le formulaire création** : utiliser `GET /users?q=email&roleId=4` pour filtrer les utilisateurs avec un rôle admin établissement. Si l'utilisateur sélectionné a roleId≠4, l'API doit mettre à jour son rôle automatiquement lors de la création de l'établissement.
- **Navigation depuis NavBar** : le lien `/admin` doit apparaître uniquement pour `isAdminPlateforme` (`roleId=1`). L'admin établissement (roleId=4) n'a pas accès à cette page.
- **Pagination AdminUsersTab** : avec un grand nombre d'utilisateurs, paginer à 20 par page. Ajouter `?page=X&limit=20` dans les paramètres de `GET /users`. L'endpoint actuel ne supporte peut-être pas la pagination — à vérifier lors de l'implémentation.
- **Fond blanc explicite** : tous les modals doivent avoir `bg-white` explicite (règle CONVENTIONS.md).
