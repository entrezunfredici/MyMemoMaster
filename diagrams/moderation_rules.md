# Modération minimale — Définition des règles

> S-07.01 · V1 · Lié à US-23 · Tâche d'analyse
> Dernière mise à jour : 2026-11-01

Ce document fixe les règles de la modération minimale. Il ne contient aucun code : la file de traitement, le bouton « Signaler » et l'API sont livrés par les tickets suivants de S-07, qui s'appuient sur ces règles.

---

## Sommaire

1. [Objectif et périmètre](#1-objectif-et-périmètre)
2. [État de l'existant](#2-état-de-lexistant)
3. [Contenus signalables](#3-contenus-signalables)
4. [Motifs de signalement](#4-motifs-de-signalement)
5. [Acteurs et droits](#5-acteurs-et-droits)
6. [Cycle de vie d'un signalement](#6-cycle-de-vie-dun-signalement)
7. [Actions du modérateur](#7-actions-du-modérateur)
8. [File de traitement](#8-file-de-traitement)
9. [Garde-fous contre les abus](#9-garde-fous-contre-les-abus)
10. [Modèle de données cible](#10-modèle-de-données-cible)
11. [Endpoints à livrer](#11-endpoints-à-livrer)
12. [Audit trail](#12-audit-trail)
13. [Stratégie de tests](#13-stratégie-de-tests)
14. [Hors périmètre V1](#14-hors-périmètre-v1)
15. [Cadre légal](#15-cadre-légal)
16. [Décisions à valider](#16-décisions-à-valider)

---

## 1. Objectif et périmètre

**Objectif** : permettre à un utilisateur de signaler un contenu inapproprié vu dans l'application, et à un modérateur de le traiter selon des règles identiques pour tous.

| IN (V1) | OUT (V1) |
|---|---|
| Règles de modération (ce document) | Modération IA exhaustive |
| Signalements | Juridique automatisé |
| Actions du modérateur | Surveillance temps réel avancée |
| File de traitement | |
| Bouton « Signaler » | |

---

## 2. État de l'existant

Constaté dans le code le 2026-11-01 :

| Élément | État |
|---|---|
| Rôle `Modérateur` (`roleId = 5`) | Créé par seeder, **aucune route ne l'utilise** |
| Suppression de contenu par un admin (S-04.06) | Livrée : `GET /etablissements/:id/content` et `DELETE /etablissements/:id/content/:contentType/:contentId`, réservées aux rôles 1 et 4, avec audit |
| Audit trail | Livré : `AuditLog` + `AuditLogService` (`CONTENT_RESOURCE_REMOVED`, `CONTENT_SECTION_REMOVED`) |
| Désactivation d'un compte | Livrée : `PATCH` activate/deactivate (rôles 1 et 4) |
| Signalement, file de traitement, bouton « Signaler » | **N'existent pas** |
| Colonne `status`, `flagged` ou `moderatedBy` sur un contenu | N'existe pas (S-04.06 notait cette dette) |

Conséquence : la suppression et la désactivation de compte sont réutilisées telles quelles. Seuls le signalement et la file sont à créer.

---

## 3. Contenus signalables

Un contenu est signalable s'il est **créé par un utilisateur et visible par d'autres**.

| Contenu | Signalable | Remarque |
|---|---|---|
| `ClassGroupResource` (ressource d'un groupe classe) | Oui | Titre, description, URL, fichier |
| `ClassGroupSection` (section d'un groupe classe) | Oui | Titre, consigne |
| `ClassGroupSubmission` (rendu d'un étudiant) | Non | Visible seulement de l'étudiant et de son enseignant, qui peut déjà le gérer ; exclu comme en S-04.06 |
| Contenus personnels (cartes Leitner, cartes mentales, exercices) | Non | Non visibles des autres utilisateurs |
| Profil utilisateur | Non | Pas de contenu libre exposé en V1 |

**Diffusion réelle des groupes classe (vérifiée dans le code le 2026-11-01)** :

- **Groupe fermé.** Aucune route ne permet de rejoindre un groupe de soi-même : on y entre par ajout d'un admin (rôles 1 ou 4, `ClassGroupService.addMember`) ou par invitation nominative à une adresse email (`Invitation.service.js`).
- **Lecture réservée aux membres** et aux rôles 1 et 4 (`_isMember` dans `ClassGroupResource.service.js`, `findOne` dans `ClassGroup.service.js`). Pas d'accès anonyme, pas de lien public. Les routes passent toutes par `authMiddleware`.
- **Écriture réservée aux enseignants du groupe** (`role = 'teacher'`) et aux rôles 1 et 4 (`_canWrite`). Les étudiants ne créent ni ressources ni sections.
- **Conséquence pour la modération** : les contenus signalables ont pour auteurs des enseignants ou des admins, et les signalants sont les étudiants (et les autres enseignants) du même groupe. Un signalement contre un contenu d'un rôle 1 ou 4 est possible.
- **Écart à combler** : le rôle 5 (Modérateur) n'apparaît dans aucun de ces contrôles. Il n'a aujourd'hui accès à aucun groupe.
- **À vérifier à l'implémentation** : l'accès au fichier d'une ressource (`fileKey` sur S3). Je n'ai pas relevé de route de téléchargement dans l'API ; si le front obtient un lien direct, un contenu masqué resterait téléchargeable par qui connaît la clé.

Si un contenu personnel devient partageable, son type est ajouté à la liste ci-dessus (une valeur d'énumération et une branche du service).

---

## 4. Motifs de signalement

Liste fermée, pour que le tri soit possible sans lire du texte libre.

| Code | Libellé affiché | Exemple |
|---|---|---|
| `illegal` | Contenu illégal | Incitation à la haine, contenu violent ou sexuel |
| `harassment` | Harcèlement ou insulte | Propos visant une personne |
| `copyright` | Droits d'auteur | Cours ou sujet copié sans autorisation |
| `spam` | Spam ou publicité | Lien commercial sans rapport |
| `personal_data` | Données personnelles | Coordonnées, note ou copie nominative exposée |
| `other` | Autre | Précision obligatoire dans le commentaire |

Le signalant peut ajouter un commentaire (500 caractères maximum). Il est **obligatoire** pour `other`.

---

## 5. Acteurs et droits

| Acteur | Rôle | Signaler | Voir la file | Traiter |
|---|---|---|---|---|
| Étudiant | 2 | Oui | Non | Non |
| Enseignant | 3 | Oui | Non | Non |
| Admin établissement | 4 | Oui | Oui, **son établissement** | Oui, **son établissement** |
| Modérateur | 5 | Oui | Oui, **toute la plateforme** | Oui |
| Admin plateforme | 1 | Oui | Oui, toute la plateforme | Oui |

Règles :

- Le signalement exige d'être authentifié (`Auth.middleware.js`) et de **pouvoir voir le contenu** : un utilisateur qui n'est pas membre du groupe reçoit 403.
- On ne peut pas signaler son propre contenu (400).
- Le traitement passe par `requireRole(1, 4, 5)`. Pour le rôle 4, le périmètre est celui de S-04.06 (groupes créés par l'admin de l'établissement) ; le contenu hors périmètre répond 404, jamais 403, pour ne pas révéler son existence.
- Un modérateur ne peut **pas** désactiver un compte : il peut seulement retirer un contenu. La désactivation reste aux rôles 1 et 4, via la route existante.
- Le signalant n'est jamais révélé à l'auteur du contenu.
- **Accès du rôle 5 limité au dossier** : un modérateur voit le contenu signalé (via le dossier et son `contentSnapshot`), pas le groupe entier ni ses membres. Aucune modification de `_isMember` n'est nécessaire pour lui : c'est la route de la file qui sert le contenu. Principe de minimisation des données (RGPD).
- **Pas de juge et partie** : un modérateur, un admin ou un enseignant ne traite jamais un signalement visant son propre contenu (403). Un signalement visant un rôle 1 est traité par un autre rôle 1 ou par le rôle 5 ; un rôle 4 ne traite pas non plus un signalement visant un autre rôle 4 hors de son établissement (404, périmètre S-04.06).

---

## 6. Cycle de vie d'un signalement

```
            ┌──────────┐   prise en charge   ┌───────────┐
 création → │ pending  │ ──────────────────→ │ in_review │
            └────┬─────┘                     └─────┬─────┘
                 │ (chaque état ouvert peut aller directement à)
      ┌──────────┼───────────────┬──────────────────┐
      ▼          ▼               ▼                  │
┌───────────┐ ┌──────────┐  ┌──────────┐            │
│ dismissed │ │ actioned │  │  hidden  │ ───────────┘
│ sans suite│ │ retrait  │  │ masqué   │  restaurer → dismissed
└───────────┘ │ définitif│  │ ≤ 30 j   │  30 j écoulés → actioned (purge)
              └──────────┘  └──────────┘
```

| Statut | Sens | Transitions permises |
|---|---|---|
| `pending` | Reçu, personne ne s'en occupe | → `in_review`, `dismissed`, `actioned` |
| `in_review` | Pris en charge par un modérateur (`handledBy`) | → `dismissed`, `actioned` |
| `hidden` | Contenu masqué, en attente de purge (`purgeAt`) | → `dismissed` (restauration), `actioned` (retrait définitif manuel ou purge automatique) |
| `dismissed` | Rejeté ou contenu restauré : il respecte les règles | final |
| `actioned` | Contenu définitivement supprimé | final |

Règles :

- `dismissed` et `actioned` sont **finaux** ; `hidden` est le seul état ouvert qui se termine seul. Un nouveau signalement sur le même contenu crée un nouveau dossier.
- Une décision exige un `decisionNote` (motif en une phrase, 500 caractères maximum). Il sert de trace et n'est pas envoyé au signalant.
- Quand un contenu est masqué ou retiré, **tous** ses signalements ouverts le suivent en une opération (`hidden` ou `actioned`) ; restaurer le contenu passe tous les `hidden` en `dismissed`.
- Quand le contenu disparaît par une autre voie (suppression par son auteur, suppression de S-04.06), ses signalements ouverts passent à `actioned` avec la note « Contenu supprimé ».

---

## 7. Actions du modérateur

Le modérateur **choisit** entre masquage temporaire et retrait définitif.

| Action | Effet | Qui | Réversible |
|---|---|---|---|
| **Rejeter** | Statut → `dismissed`, contenu inchangé | 1, 4, 5 | Non (nouveau signalement possible) |
| **Masquer** | Contenu invisible des membres du groupe, statut → `hidden`, `purgeAt` = maintenant + 30 jours | 1, 4, 5 | **Oui, pendant 30 jours** |
| **Restaurer** | Contenu de nouveau visible, `hidden` → `dismissed` | 1, 4, 5 | — |
| **Retirer définitivement** | Suppression immédiate (service de S-04.06), statut → `actioned`, audit. Possible aussi depuis `hidden` | 1, 4, 5 | Non |
| **Suspendre le compte de l'auteur** | Désactive le compte (`UserService.setActive`), **sans clore le dossier** : le contenu reste à masquer ou retirer ; email motivé à l'auteur | 1, 4 | Oui (`PATCH /users/:id/activate`) |

Règles du masquage :

- **Purge automatique** : un job quotidien (`node-cron`, déjà approuvé) supprime les contenus dont `purgeAt` est dépassé, passe leurs signalements à `actioned` et trace l'opération. Si le modérateur n'a rien fait pendant 30 jours, la suppression devient définitive.
- **Délai fixe** : 30 jours maximum, non prolongeable, non paramétrable en V1.
- **Contenu masqué** : exclu des listes et des téléchargements pour les membres du groupe. Il reste visible de son auteur (bandeau « masqué par la modération ») et des modérateurs, pour que l'auteur puisse contester ou sauvegarder son travail. Le fichier n'est pas effacé du stockage avant la purge.
- Pas d'avertissement ni de sanction graduée : la désactivation manuelle suffit pour un volume faible.
- **Information de l'auteur** : à chaque masquage ou retrait, email court indiquant le contenu concerné, le motif de signalement, la décision, la date de suppression définitive pour un masquage, et l'adresse `support@my-memo-master.com` pour contester. Le nom du signalant et son commentaire ne sont jamais cités (voir §15).

---

## 8. File de traitement

Liste paginée des signalements, **tri par défaut** : statut ouvert d'abord, puis priorité, puis ancienneté.

**Priorité** (calculée, non stockée) :

| Priorité | Condition |
|---|---|
| Haute | motif `illegal`, ou au moins 3 signalants distincts sur le même contenu |
| Normale | tous les autres cas |

**Masqués** : une vue dédiée trie par `purgeAt` croissant et affiche les jours restants. Un contenu masqué depuis 23 jours ou plus est marqué « purge imminente ».

**Filtres** : statut, motif, type de contenu, établissement (rôles 1 et 5).

**Regroupement** : plusieurs signalements d'un même contenu s'affichent sur **une seule ligne** avec le nombre de signalants, pour qu'un contenu très signalé ne noie pas la file.

**Objectif de traitement** (indicatif, pas d'automatisation) : 72 h pour la priorité normale, 24 h pour la haute. Un signalement ouvert depuis plus de 72 h est marqué « en retard » dans la file.

**Prise en charge** : passer en `in_review` pose `handledBy`. Un autre modérateur voit qui s'en occupe mais peut le reprendre.

---

## 9. Garde-fous contre les abus

| Risque | Règle |
|---|---|
| Signalement répété du même contenu | Un utilisateur ne peut avoir qu'**un seul signalement ouvert** par contenu (409 sinon) |
| Signalement en rafale | Limite de **10 signalements par utilisateur et par 24 h** (429 au-delà) |
| Signalement de mauvaise foi | Pas de sanction automatique en V1 ; le taux de rejet par signalant est consultable dans les données pour une action manuelle |
| Contenu très signalé mais légitime | Aucun masquage automatique : seul un humain retire un contenu |
| Représailles | Le signalant n'est jamais exposé à l'auteur (§5) |
| Injection dans les commentaires | Texte brut, jamais rendu avec `v-html`, limité à 500 caractères, échappé par le middleware `sanitize` |

---

## 10. Modèle de données cible

Une seule table nouvelle, `ContentReport`, à créer par migration.

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| `id` | INTEGER | PK | Identifiant |
| `contentType` | STRING(30) | NOT NULL | `resource` \| `section` |
| `contentId` | INTEGER | NOT NULL | Identifiant du contenu |
| `classGroupId` | INTEGER | FK → ClassGroup, nullable | Groupe du contenu, conservé pour le périmètre établissement |
| `reporterId` | INTEGER | FK → User, NOT NULL | Signalant |
| `authorId` | INTEGER | FK → User, nullable | Auteur au moment du signalement |
| `reason` | STRING(30) | NOT NULL | Un des codes du §4 |
| `comment` | STRING(500) | nullable | Précision du signalant |
| `status` | STRING(20) | NOT NULL, défaut `pending` | Voir §6 |
| `handledBy` | INTEGER | FK → User, nullable | Modérateur ayant pris en charge |
| `decisionNote` | STRING(500) | nullable | Motif de la décision |
| `contentSnapshot` | JSON | nullable | Titre et description au moment du signalement |
| `resolvedAt` | DATE | nullable | Date de décision |
| `hiddenAt` | DATE | nullable | Date du masquage |
| `purgeAt` | DATE | nullable | Date de suppression définitive d'un contenu masqué (`hiddenAt` + 30 jours) |
| `createdAt` / `updatedAt` | DATE | NOT NULL | |

**Index** : `(status, createdAt)`, `(contentType, contentId)`, `reporterId`.
**Unicité** : `(reporterId, contentType, contentId)` pour les statuts ouverts (index partiel sous PostgreSQL ; contrôle en service pour SQLite).

**Colonnes à ajouter sur `ClassGroupResource` et `ClassGroupSection`** (migration) : `hiddenAt` (DATE, nullable) et `hiddenBy` (INTEGER, FK → User, nullable). Un contenu est masqué si `hiddenAt` n'est pas nul. Toutes les lectures faites par les membres filtrent `hiddenAt IS NULL` : c'est le principal risque de l'implémentation (un filtre oublié laisse un contenu masqué visible), à couvrir par un test par route de lecture. La date de purge reste dans `ContentReport.purgeAt`, source unique pour le job.

**Pourquoi un `contentSnapshot`** : le contenu est supprimé en cas d'action. Sans copie, le dossier ne dit plus ce qui a été retiré.

**Conservation** (voir §15) :

| Donnée | Durée | Mécanisme |
|---|---|---|
| Contenu supprimé (ligne en base, fichier) | Disparaît tout de suite de l'application ; reste **12 jours maximum dans les sauvegardes** | Politique de sauvegarde existante, aucune action |
| Dossier `ContentReport` (dont `contentSnapshot`) | **1 an après la décision** | Job quotidien de suppression des dossiers dont `resolvedAt` a plus d'un an |
| Entrées d'audit liées | Alignées sur le dossier (1 an) | Même job, ou politique d'`AuditLog` si elle existe (aucun nettoyage d'`AuditLog` n'existe aujourd'hui dans `jobs/`) |
| Dossier encore ouvert | Jusqu'à la décision | — |
**Pourquoi pas de clé étrangère sur `contentId`** : il pointe vers deux tables selon `contentType`.

---

## 11. Endpoints à livrer

Préfixe `/api/v1`. Chaque route est dans `routes/ContentReport.routes.js` et documentée en Swagger.

| Méthode | Route | Accès | Rôle |
|---|---|---|---|
| POST | `/content-reports` | Authentifié (2, 3, 4, 5, 1) | Créer un signalement |
| GET | `/content-reports` | `requireRole(1, 4, 5)` | File de traitement (filtres, pagination) |
| GET | `/content-reports/:id` | `requireRole(1, 4, 5)` | Détail d'un dossier |
| PATCH | `/content-reports/:id/claim` | `requireRole(1, 4, 5)` | Prendre en charge |
| PATCH | `/content-reports/:id/dismiss` | `requireRole(1, 4, 5)` | Rejeter |
| PATCH | `/content-reports/:id/hide` | `requireRole(1, 4, 5)` | Masquer 30 jours |
| PATCH | `/content-reports/:id/restore` | `requireRole(1, 4, 5)` | Restaurer un contenu masqué |
| PATCH | `/content-reports/:id/remove-content` | `requireRole(1, 4, 5)` | Retirer définitivement |
| PATCH | `/content-reports/:id/suspend-author` | `requireRole(1, 4)` | Suspendre le compte de l'auteur |

Codes de retour : 201 création · 400 validation ou auto-signalement · 403 contenu non visible · 404 introuvable ou hors périmètre · 409 doublon ou statut final · 429 limite atteinte.

**Livré par S-07.02** (`routes/ContentReport.routes.js`, documenté dans Swagger sous le tag `ContentReport`). Précisions d'implémentation :

- `GET /content-reports` renvoie `{ items, total, page, limit }` : une ligne par contenu signalé (`reportCount`, `reporterCount`, `priority`, `overdue`, `purgeAt`, `daysLeft`, `purgeImminent`). Statuts ouverts par défaut ; `status=hidden` trie par date de purge croissante. Filtres : `status`, `reason`, `contentType`, `etablissementId` (rôles 1 et 5), `page`, `limit` (100 maximum). Les signalements visant le contenu du demandeur n'y figurent pas.
- Les actions s'appliquent à **tous** les signalements ouverts du même contenu. `decisionNote` (500 caractères maximum) est obligatoire pour `dismiss`, `hide` et `remove-content`.
- Le rôle 5 ne peut signaler que ce qu'il voit : il n'est pas membre des groupes, donc `POST /content-reports` lui répond 403 sauf s'il est membre du groupe.
- **Accusé de réception** : la réponse `201` de l'API en tient lieu ; il n'y a pas d'email de confirmation à la création. Le signalant reçoit un email à la clôture (rejeté, masqué ou supprimé) ; l'auteur reçoit un email à chaque masquage ou suppression par un modérateur (adresse de contact dans le texte). Les envois sont best effort : un échec est journalisé et ne bloque pas la décision.
- **Contenu masqué** : filtré (`hiddenAt IS NULL`) dans `ClassGroupResource.findAll` et `ClassGroupSection.findAll` pour les membres, sauf l'auteur et les rôles 1 et 4. Le dépôt d'un rendu sur une section masquée est refusé. `GET /storage/presign` refuse (404) le fichier d'une ressource masquée, sauf à son auteur et aux rôles 1, 4 et 5.
- **Interface** (S-07.04, `my_memo_master_front`) : page `/moderation` réservée aux rôles 1, 4 et 5 (`ModerationPage`, composants dans `src/components/moderation/`) : file de traitement, fenêtre d'examen d'un dossier et actions selon le statut et le rôle (`helpers/moderation.js#availableActions`, mêmes règles que l'API). Le signalement par les utilisateurs est le bouton `ReportContentButton` (S-07.05).
- **Tâche planifiée** : `jobs/contentModeration.cron.js`, 04h00 UTC (`CONTENT_MODERATION_CRON_ENABLED=false` pour la désactiver, `CONTENT_REPORT_RETENTION_DAYS` pour la rétention, 365 par défaut).

---

## 12. Audit trail

Nouvelles actions pour `AuditLog` :

| Action | Contexte |
|---|---|
| `CONTENT_REPORT_CREATED` | Un signalement est créé |
| `CONTENT_REPORT_CLAIMED` | Un modérateur prend en charge |
| `CONTENT_REPORT_DISMISSED` | Rejet |
| `CONTENT_REPORT_HIDDEN` | Masquage (avec `purgeAt`) |
| `CONTENT_REPORT_RESTORED` | Restauration d'un contenu masqué |
| `CONTENT_REPORT_PURGED` | Suppression automatique à l'échéance |
| `CONTENT_REPORT_ACTIONED` | Retrait définitif manuel |
| `CONTENT_REPORT_AUTHOR_SUSPENDED` | Suspension du compte de l'auteur (la désactivation produit aussi `USER_ACCOUNT_DEACTIVATED`) |

Les retraits continuent de produire `CONTENT_RESOURCE_REMOVED` / `CONTENT_SECTION_REMOVED` (S-04.06). L'audit reste non bloquant, comme en S-04.06.

---

## 13. Stratégie de tests

Cette tâche d'analyse ne livre pas de code. Les tickets suivants couvriront :

| Couche | Cas nominaux | Cas limites | Erreurs |
|---|---|---|---|
| Service | création ; prise en charge ; rejet ; retrait avec clôture des autres signalements | commentaire à 500 caractères ; contenu supprimé entre-temps ; regroupement par contenu | doublon ouvert (409) ; auto-signalement ; statut final ; quota 24 h (429) ; hors périmètre rôle 4 (404) ; restauration d'un contenu non masqué (409) |
| Job de purge | purge à `purgeAt` dépassé ; contenu restauré la veille non purgé | exactement à l'échéance ; contenu déjà supprimé | échec d'une suppression : les autres sont traitées, erreur journalisée |
| Lecture des contenus | contenu masqué absent des listes et téléchargements des membres ; visible de l'auteur et des modérateurs | | un test par route de lecture |
| Controller | codes 201/200 | pagination vide | 400, 403, 404, 409, 429 |
| Validators | motif valide | `other` avec commentaire | motif inconnu ; `other` sans commentaire ; commentaire trop long |
| Front | bouton visible sur contenu d'autrui ; file filtrée | file vide | bouton absent sur son propre contenu |
| Accessibilité | nouvelle modale et nouvelle page dans `e2e-a11y` | | |

---

## 14. Hors périmètre V1

- Classification automatique par IA, détection de mots interdits
- Suivi juridique automatisé (délais de notification, registre de retraits à destination d'une autorité)
- Alertes en temps réel (websocket, notification push au modérateur)
- Masquage automatique par seuil de signalements (le masquage reste une décision humaine)
- Durée de masquage paramétrable ou prolongeable
- Appel de la décision par l'auteur
- Sanctions graduées, bannissement, score de réputation
- Signalement des rendus étudiants et des contenus personnels

---

## 15. Cadre légal

> **Réserve** : synthèse issue de recherches sur des sources secondaires (cabinets, commentaires, sites de conformité). Les textes officiels (Légifrance, EUR-Lex) n'ont pas été relus article par article. Ce n'est pas un avis juridique : à faire valider avant l'ouverture publique.

**Qualification** : MyMemoMaster est un SaaS. Pour les contenus déposés par les enseignants dans les groupes classe, il est **hébergeur** au sens de la LCEN et **service d'hébergement** au sens du règlement européen sur les services numériques (DSA), pas éditeur, tant que l'équipe ne choisit ni ne modifie ces contenus.

**Plateforme en ligne ?** D'après le code (§3), les groupes sont **fermés** : membres ajoutés ou invités nominativement, aucune lecture publique ni anonyme. Le DSA définit la plateforme en ligne par la diffusion d'informations **au public**, c'est-à-dire à un nombre potentiellement illimité de tiers. Une diffusion à un groupe fermé d'une classe ne répond vraisemblablement pas à cette définition : MyMemoMaster serait alors un **simple service d'hébergement**. Conséquences : les articles 11, 12, 16 et 17 s'appliquent, et la section propre aux plateformes (réclamations internes, signaleurs de confiance, etc.) ne s'applique pas, avec ou sans l'exemption de l'article 19. C'est une lecture, pas un avis : un établissement qui créerait des groupes très larges ou ouverts changerait l'analyse. À reconsidérer si un jour des contenus deviennent publics (page d'accueil, partage par lien).

**Adresse de contact officielle** : `support@my-memo-master.com` (point de contact DSA, contestation par l'auteur, signalements reçus hors bouton).

### LCEN (loi 2004-575, article 6)

- L'hébergeur n'est responsable d'un contenu illicite que s'il en a eu **connaissance** et n'a pas **agi promptement** pour le retirer ou en rendre l'accès impossible.
- Aucun délai chiffré dans la loi : le caractère « prompt » est apprécié au cas par cas (un retrait dans les trois semaines a été jugé prompt dans une décision commentée en 2026, mais la jurisprudence reste variable).
- Pas d'obligation générale de surveillance : une modération reposant sur les signalements est cohérente avec ce régime.
- Une notification n'a d'effet de connaissance que si elle contient les éléments prévus à l'article 6, I, 5. Une notification reçue par courrier ou email (hors bouton) doit être traitée comme un signalement de motif `illegal`.

### DSA (règlement UE 2022/2065)

- **Articles 11 et 12 (point de contact, représentant légal)** : s'appliquent à tous les intermédiaires. Le point de contact est `support@my-memo-master.com`, à publier dans les CGU et les mentions légales. Le représentant légal ne concerne que les fournisseurs établis hors de l'UE : à vérifier selon le siège de l'éditeur.
- **Article 16 (notification et action)** : mécanisme de signalement facile d'accès, par voie électronique, avec explication et désignation précise du contenu. Le bouton « Signaler » avec commentaire et identifiant de contenu y répond. Un accusé de réception et l'information du signalant sur la décision sont attendus.
- **Article 17 (motivation)** : toute restriction d'un contenu (masquage, retrait) ou d'un compte s'accompagne d'une **motivation claire** à l'auteur : fait visé, motif, voies de recours. L'email du §7 y répond.
- **Article 19** : les micro et petites entreprises (moins de 50 salariés et 10 M€ de chiffre d'affaires) sont dispensées de la section propre aux plateformes en ligne (dont le système interne de traitement des réclamations), mais **pas** des articles 11, 12, 16 et 17. Sans objet si MyMemoMaster n'est qu'un service d'hébergement (voir ci-dessus).

### Conséquences sur les règles

| Exigence | Réponse dans ce document |
|---|---|
| Mécanisme de signalement accessible | Bouton + `POST /content-reports` |
| Accusé de réception au signalant | **Ajout** : notification à la création |
| Information du signalant sur la décision | **Ajout** : notification à la clôture (rejeté, masqué, retiré), sans information sur l'auteur |
| Motivation à l'auteur | Email du §7 (masquage et retrait) |
| Voie de contestation | Adresse de contact dans l'email ; la restauration (§7) en est l'issue |
| Traçabilité | `ContentReport`, `contentSnapshot`, audit |
| Contenu manifestement illicite | Priorité haute (§8) ; masquage immédiat conseillé, sans attendre |
| Conservation | Contenu supprimé : 12 jours dans les sauvegardes. Dossier, `contentSnapshot` et audit : 1 an après la décision (§10) |

### Points d'attention

- Le masquage de 30 jours est compatible avec ce cadre (il restreint l'accès, il est motivé, il reste réversible) à condition que l'email à l'auteur parte **à chaque masquage**, pas seulement à la purge.
- Supprimer un contenu efface aussi une preuve : le `contentSnapshot` et l'audit survivent donc à la suppression, pendant 1 an après la décision. **Ce délai est une proposition de travail**, pas une exigence vérifiée : la LCEN impose aux hébergeurs de conserver certaines données d'identification des auteurs de contenus (un an, d'après le décret 2011-219, non relu), ce qui n'est pas la même chose que garder une copie du contenu. Le dossier peut être raccourci ou allongé sans changer le reste du design.
- Les **sauvegardes de 12 jours** contiennent encore un contenu supprimé : à indiquer dans la politique de confidentialité, et à ne pas restaurer sans rejouer les suppressions récentes.
- Les mentions légales et les CGU doivent décrire la procédure de signalement et l'adresse de contact.
- **SaaS et établissements** : si les établissements sont clients et que les contenus de leurs élèves et enseignants leur appartiennent, MyMemoMaster agit peut-être comme **sous-traitant** au sens du RGPD pour ces données. Le contrat avec l'établissement doit alors dire qui reçoit les signalements, qui décide du retrait, et que MyMemoMaster peut agir seul sur un contenu illicite. Non vérifié : aucun contrat client n'est dans le dépôt.

---

## 16. Décisions à valider

Statut au 2026-11-01 :

1. ✅ **Retrait ou masquage temporaire, au choix du modérateur.** Masquage de 30 jours au plus, réversible, puis suppression définitive (§7). *(Décidé.)*
2. ✅ **Le rôle 4 traite les signalements de son établissement ; le rôle 5 est global.** *(Validé.)*
3. ✅ **Cadre légal étudié** (§15). Les délais 24 h / 72 h restent un objectif interne : la loi n'en fixe pas.
4. ✅ **Email à l'auteur** : obligatoire à chaque masquage ou retrait (article 17 du DSA).
5. ✅ **Adresse de contact** : `support@my-memo-master.com`.
6. ✅ **Qualification** : SaaS ; groupes classe fermés d'après le code, donc simple service d'hébergement (§15). Reste à confirmer par un juriste.
7. ✅ **Conservation** : contenu supprimé gardé 12 jours dans les sauvegardes (donnée fournie) ; dossier, `contentSnapshot` et audit gardés 1 an après la décision (proposition de travail, §10 et §15).
8. **Sans réponse pour l'instant** : rôle de MyMemoMaster face aux établissements clients (contrat) et relecture juridique, faute de moyens. Le document les liste comme **risques résiduels** et non comme prérequis : ils ne bloquent pas l'implémentation. Pistes gratuites : fiches « entreprendre.service-public.fr » et CNIL sur l'hébergeur et le RGPD, modèles de CGU et de mentions légales, et la Direction générale des entreprises pour le DSA.
