# À faire — Page d'administration de la plateforme

**Statut** : LIVRÉE le 2026-10-18 (branche `dev_front_admin`) — page `/admin` : rôles, comptes, journal d'audit global. Ce document reste comme cahier des charges ; voir `.agents/CHANGELOG_AGENT.md` et `DECISIONS.md` (2026-10-18) pour le réalisé. Compléments livrés ensuite : filtres `action` et `limit` ajoutés à `GET /audit-logs`, désactivation / réactivation des comptes depuis la page. `GET /users` a dû être créé.
**Public** : administrateur plateforme uniquement (`roleId = 1`).

## Pourquoi

Il n'existe aucune page d'administration dédiée. L'administrateur plateforme travaille aujourd'hui dans l'onglet
« Plateforme » de `/classroom` (`ClassroomPlateformeView`), qui ne gère que les **établissements** : créer, modifier,
supprimer, puis par établissement les statistiques, le journal d'audit, la modération du contenu et le gérant.

L'API sait faire trois choses de plus, réservées au rôle 1, **qu'aucun écran n'expose** :

| Fonction | Routes API (toutes `requireRole(1)`) | Côté front aujourd'hui |
|---|---|---|
| Gestion des rôles | `POST /roles`, `PUT /roles/:id`, `DELETE /roles/:id` (lecture : `GET /roles`) | store `roles` existant et testé, **utilisé par aucun écran** |
| Rôle d'un compte | `POST /users/:id/role`, `PUT /users/:id/role`, `DELETE /users/:id/role` | rien |
| Journal d'audit **global** | `GET /audit-logs` | rien (seul le journal par établissement est affiché : `GET /etablissements/:id/audit`) |

Le lien « Administration » de la navigation mobile (`MobileNavComponent.vue`) pointe pour l'instant vers `/classroom`,
comme « Classe » ; il attend cette page.

## Contenu pressenti

1. **Rôles** — liste, création, renommage, suppression d'un rôle (attention : les identifiants 1 à 5 sont câblés dans
   `useRole` / `ROLE_IDS` et dans `requireRole(...)` ; interdire la suppression et le renommage des rôles système).
2. **Comptes** — recherche d'un utilisateur, affichage de son rôle, changement ou retrait de rôle. Garde-fou : un
   administrateur ne peut pas retirer son propre rôle d'administrateur plateforme (sinon plus personne ne peut administrer).
3. **Journal d'audit global** — filtres action / type d'entité / limite, comme le journal par établissement.

## Contraintes à respecter (conventions du projet)

- Route `/admin` avec `meta: { private: true, roles: [1] }` (le garde de `router/index.js` gère déjà `meta.roles`).
- Aucun appel `api.*` dans la page : stores / module `helpers/*Api.js` (règle ESLint `no-restricted-imports`).
- RGAA : tableaux avec `<caption>` et `scope`, actions en vrais `<button>`, fenêtres de confirmation avec `v-dialog`,
  ajout dans `e2e-a11y/pages.spec.js` ; tests de caractérisation d'abord.
- Brancher le lien « Administration » de `MobileNavComponent.vue` et celui de la navigation de bureau.
- Ne pas recréer `AdminPage.vue` à l'identique : l'ancienne page (supprimée le 2026-10-17) n'était qu'une version périmée de
  l'onglet « Plateforme ».
