# Gamification — Définition du système de badges (critères)

> Ticket **C-06.01** · Feature list **C-06** · Version **V2** · Tâche d'analyse (aucun code livré).
> Sert de référence aux tickets d'implémentation de C-06 (moteur, API, profil, animation).
> Les valeurs chiffrées (seuils, paliers) sont des **propositions de travail** à valider (§16).
> **Avancement 2026-11-04** : le noyau back-end est codé (voir §18).

## Sommaire

1. Objectif et périmètre
2. État de l'existant
3. Principes de conception
4. Événements sources
5. Règles de calcul communes
6. Catalogue des badges (critères)
7. Niveaux et progression (sans système de points complexe)
8. Modèle de données cible
9. Moteur event-driven
10. API badges
11. Profil gamifié
12. Animation d'obtention
13. Vie privée, anti-triche, accessibilité
14. Stratégie de tests
15. Hors périmètre
16. Décisions à valider
17. Banque d'idées de gamification

---

## 1. Objectif et périmètre

Renforcer l'engagement dans la durée en récompensant la **régularité** et la **progression réelle**, pas le volume brut.

| Dans le périmètre (IN) | Hors périmètre (OUT) |
|---|---|
| Critères des badges (ce document) | Classements publics compétitifs |
| Profil gamifié | Monétisation (badges payants, boutique) |
| Moteur event-driven | Système de points complexe |
| API badges | |
| Animation d'obtention | |

Les idées qui sortent de ce périmètre sont consignées au §17 (banque d'idées) et **ne sont pas engagées**.

---

## 2. État de l'existant

Audit du code au 2026-11-03.

| Élément | Constat |
|---|---|
| `KpiService._computeBadges` | 7 badges codés en dur, **recalculés à chaque appel** de `getMyKpis` / `getPersonalKpisForSubjects` : `streak7`, `streak30`, `perfectScore`, `tenTests`, `fiveSubjects`, `leitnerMastery`, `regular` |
| Persistance | **Aucune** : pas de table, pas de date d'obtention, donc ni notification, ni animation, ni historique |
| Perte possible | Un badge `streak7` se « perd » dès que la série retombe à 0 (calcul sur l'état courant) |
| Source de la série | `streakDays` compte les **créneaux planifiés** `RevisionSession.isDone`, pas la pratique réelle (une case cochée à la main compte) |
| Affichage | `KpiPage.vue` (pastilles) et `TeacherStudentKpi.vue` (badges débloqués, **visibles de l'enseignant** via le consentement KPI) |
| Pratique réelle journalisée | `TestResult` (+`durationSeconds`), `LeitnerReviewSession`, `MindMapViewSession`, `RevisionSession` |
| Moteur d'événements | Aucun ; seul BullMQ/Redis (rappels) existe |

Écarts à retenir :

1. Les badges actuels sont un **calcul d'affichage**, pas un état. Les persister change leur nature : à signaler (interface `GET /kpi/...` inchangée au départ, voir §10).
2. La série actuelle mesure le respect du planning. Un badge de régularité doit reposer sur la **pratique réelle** (cohérent avec la décision du 2026-09-04 sur `totalMinutes`).
3. Les badges apparaissent dans la vue enseignant : un badge persistant devient une donnée personnelle partagée, d'où le §13.

---

## 3. Principes de conception

1. **Récompenser l'effort, pas la performance seule** : au moins la moitié du catalogue repose sur la régularité et l'exploration, pour ne pas décourager les élèves en difficulté.
2. **Irréversible** : un badge obtenu ne se perd jamais (la série, elle, peut retomber).
3. **Date d'obtention conservée** (`earnedAt`) : base de l'historique, de la notification et de l'animation.
4. **Critères objectifs et vérifiables côté serveur** à partir de la pratique réelle journalisée ; jamais de déclaratif client.
5. **Pas de pression toxique** : pas de badge de « perte » ni de culpabilisation ; un « jour de grâce » protège la série (§5).
6. **Pas de badge exigeant la performance dans un groupe** (note de classe, rang) : serait un classement déguisé (OUT).
7. **Catalogue en code, état en base** : définitions versionnées dans le dépôt, seul l'obtention est stockée (§8).

---

## 4. Événements sources

Le moteur réagit à des événements déjà produits par l'application ; aucun nouveau suivi n'est nécessaire pour la V2.

| Événement | Origine (existant) | Données utiles |
|---|---|---|
| `exercise.submitted` | `TestResult.service#submitAnswers` | score, total, durée, matière, test privé ou de groupe |
| `leitner.session.completed` | `LeitnerReviewSession.service#create` | cartes revues, durée, `completed` |
| `leitner.card.moved` | `LeitnerCard.service` (changement de boîte) | boîte d'origine/arrivée |
| `mindmap.viewed` | `MindMapViewSession.service#create` | durée |
| `revision.session.validated` | `RevisionSession.service#validateMatchingSessions` | date |
| `content.created` | création carte, série, carte mentale, tag | type |
| `onboarding.completed` | `OnboardingState` | étapes |
| `ai.batch.imported` | `AiGenerationBatch.service` | nb éléments importés |
| `daily.tick` | job `node-cron` quotidien | date (badges fondés sur l'absence/le temps) |

---

## 5. Règles de calcul communes

| Règle | Définition |
|---|---|
| **Jour d'activité** | Jour calendaire (fuseau du serveur, voir §16) comptant au moins **une pratique réelle** : exercice soumis, session Leitner terminée avec ≥ 1 carte revue, ou consultation de carte mentale ≥ 60 s |
| **Série (streak)** | Nombre de jours d'activité consécutifs jusqu'à aujourd'hui ou hier |
| **Jour de grâce** | 1 jour manqué par fenêtre de 7 jours ne casse pas la série (proposition) |
| **Pratique d'un groupe** | Les exercices soumis dans le cadre d'un groupe comptent pour l'activité, mais **pas** pour les badges de score (cohérent avec `privateTestResults` du KPI) |
| **Séance planifiée** | Reste un indicateur du KPI « Prévu » ; ne déclenche aucun badge de régularité |
| **Seuil minimal d'un exercice** | ≥ 3 questions, sinon ignoré pour les badges de score (évite le « 100 % » sur une question) |
| **Idempotence** | Un badge est attribué au plus une fois par utilisateur (contrainte d'unicité) |

---

## 6. Catalogue des badges (critères)

Chaque badge a : `code` stable (clé d'unicité, ne change jamais), catégorie, critère, événement déclencheur. Les libellés sont en français.

### 6.1 Régularité

| Code | Libellé | Critère | Déclencheur | Existant |
|---|---|---|---|---|
| `streak3` | Premier élan | Série de 3 jours d'activité | `daily.tick`, pratique | nouveau |
| `streak7` | 7 jours de suite | Série de 7 jours | idem | **repris, critère changé** (pratique réelle) |
| `streak30` | 30 jours de suite | Série de 30 jours | idem | **repris, critère changé** |
| `streak100` | Centurion | Série de 100 jours | idem | nouveau |
| `regular` | Régulier | 20 jours d'activité sur 30 jours glissants | pratique | **repris, critère changé** (jours d'activité, plus créneaux planifiés) |
| `comeback` | Retour gagnant | Reprendre l'activité après ≥ 14 jours d'absence, puis 3 jours d'activité | pratique | nouveau |
| `earlyBird` / `nightOwl` | — | **Non retenus** (dépendent du fuseau et de l'heure, peu fiables, §15) | | |

### 6.2 Exercices

| Code | Libellé | Critère | Existant |
|---|---|---|---|
| `firstExercise` | Premier pas | 1ᵉʳ exercice soumis | nouveau |
| `tenTests` | 10 exercices | 10 séries soumises | repris |
| `fiftyTests` | 50 exercices | 50 séries soumises | nouveau |
| `perfectScore` | Score parfait | 100 % sur un exercice privé d'au moins 3 questions | repris, seuil minimal ajouté |
| `progress` | En progrès | Moyenne des 5 derniers exercices d'une matière supérieure d'au moins 15 points à celle des 5 précédents | nouveau |
| `retry` | Persévérant | Refaire un exercice déjà soumis et améliorer son score | nouveau |

### 6.3 Mémorisation (Leitner)

| Code | Libellé | Critère | Existant |
|---|---|---|---|
| `firstLeitner` | Première révision | 1ʳᵉ session Leitner terminée | nouveau |
| `leitnerMastery` | Maîtrise Leitner | ≥ 50 % des cartes d'un système en boîte 4 ou 5, avec au moins 20 cartes | repris, plancher de 20 cartes ajouté (50 % de 2 cartes ne prouve rien) |
| `box5` | Mémoire d'éléphant | 10 cartes arrivées en dernière boîte | nouveau |
| `hundredCards` | 100 cartes revues | 100 cartes corrigées au total | nouveau |
| `thousandCards` | 1 000 cartes revues | idem 1 000 | nouveau |
| `cleanSweep` | Tableau vide | Aucune carte due sur l'ensemble des systèmes au début d'une session, après en avoir eu ≥ 10 | nouveau |

### 6.4 Exploration et création

| Code | Libellé | Critère | Existant |
|---|---|---|---|
| `fiveSubjects` | Polyvalent | 5 matières distinctes pratiquées | repris |
| `firstMindmap` | Cartographe | 1ʳᵉ carte mentale créée avec ≥ 5 nœuds | nouveau |
| `firstCalendar` | Organisé | 1ʳᵉ séance de révision planifiée puis validée par pratique réelle | nouveau |
| `aiAssist` | Assisté | 1ᵉʳ lot IA importé (au moins 1 élément validé) | nouveau |
| `tourDone` | Bien guidé | Visite guidée (onboarding) terminée | nouveau |
| `mathWizard` | Matheux | 1ʳᵉ réponse correcte à une question à formule | nouveau |

### 6.5 Groupes de classe (rôle étudiant)

| Code | Libellé | Critère |
|---|---|---|
| `firstSubmission` | Rendu à temps | 1ᵉʳ dépôt avant l'échéance (`Deadline`) |
| `deadlineStreak` | Toujours à l'heure | 5 échéances de suite respectées |

Aucun badge de rang, de moyenne de classe ni de comparaison entre élèves (§3, point 6).

### 6.6 Secrets (révélés à l'obtention)

Objet de surprise, sans effet sur la progression : `palindrome` (une session un jour palindrome), `sunday` (4 dimanches de suite), etc. Facultatif en V2 ; liste à limiter à 3.

**Total proposé** : 7 badges existants repris (3 modifiés de critère) + ~25 nouveaux.

---

## 7. Niveaux et progression (sans système de points complexe)

Pas de monnaie ni de multiplicateurs (OUT). Un seul indicateur simple :

- **Niveau** = fonction du **nombre de badges obtenus** : Débutant (0–4), Apprenti (5–9), Confirmé (10–17), Expert (18–25), Maître (26+).
- **Rareté** d'un badge : `common` / `rare` / `epic` (champ du catalogue, purement visuel).
- **Progression** d'un badge non obtenu : `current / target` (ex. 4/7 jours), calculée par le moteur, affichée sur le profil.

Alternative écartée : points d'expérience par action (XP) : dérive vers une optimisation du volume, devient un système de points complexe, et demande un équilibrage permanent.

---

## 8. Modèle de données cible

Nouvelle table `UserBadge` (nom PascalCase, colonnes camelCase, `STRING` plutôt que `ENUM`, cf. DECISIONS 2026-06) :

| Colonne | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | |
| `userId` | INTEGER FK `User.userId` | `ON DELETE CASCADE` (suppression de compte, RGPD) |
| `badgeCode` | STRING(40) | clé du catalogue |
| `earnedAt` | DATE | |
| `seenAt` | DATE nullable | `null` = animation/notification pas encore vue |
| `context` | JSON nullable | valeur ayant déclenché (ex. `{ streakDays: 7 }`), pour audit |

Index unique `(userId, badgeCode)` (idempotence) ; index `(userId, seenAt)`.

Nouvelle table `UserBadgeProgress` **non retenue** : la progression se recalcule à la demande (§10). Seule exception à étudier : un compteur persistant `UserActivityDay (userId, date)` si le calcul de série sur les tables sources devient trop coûteux (§16).

Catalogue : fichier `my_memo_master_api/helpers/badges/catalog.js` (liste d'objets `{ code, category, rarity, icon, label, description, event, target, evaluate }`). Pas de table de définition en V2.

Réglage utilisateur : `User.badgesVisibleToTeachers` (BOOLEAN, défaut `false`), voir §13.

---

## 9. Moteur event-driven

```
 service métier ──emit──▶ badgeEvents (EventEmitter en mémoire)
                              │
                              ▼
                     BadgeEngine.handle(event)
                       ├─ badges concernés par event.type (index du catalogue)
                       ├─ evaluate(userId, event) → vrai/faux + progression
                       └─ attribution idempotente (UserBadge, contrainte unique)
                              │
                              ▼
                  notification in-app (Reminder/Notification existants)
```

- **Émission** : une ligne `badgeEvents.emit('exercise.submitted', {...})` dans chaque service source, **après** la réussite de l'écriture, **jamais bloquante** (best effort, erreur loguée via Winston, comme `LeitnerReviewSession`).
- **Évaluation** : chaque badge déclare `event` et une fonction `evaluate` pure (testable sans base).
- **Rattrapage** : script/commande `badges:backfill` qui rejoue les critères sur l'historique pour attribuer rétroactivement (utile au déploiement, les 7 badges existants étant déjà « débloqués » pour certains).
- **Job quotidien** (`jobs/badges.cron.js`, `node-cron`) pour les badges de temps (séries, `comeback`, `regular`).
- **File asynchrone BullMQ** : non retenue en V2 (volume faible, évaluation en quelques requêtes) ; à reconsidérer si la latence des services sources en pâtit.
- **Plusieurs pods** : l'unicité en base rend le moteur sûr en concurrence ; au pire une évaluation en double.

Alternative écartée : calcul à la volée à chaque lecture (état actuel) : impossible de notifier, de dater, d'animer, et la lecture du KPI coûte de plus en plus cher.

---

## 10. API badges

| Méthode | Route | Rôle | Description |
|---|---|---|---|
| GET | `/badges` | connecté | Catalogue avec, pour chaque badge : obtenu (`earnedAt`), progression `{ current, target }`, `seenAt`. Les secrets non obtenus sont masqués |
| GET | `/badges/me/recent` | connecté | Badges obtenus non encore vus (`seenAt` nul), pour l'animation |
| PATCH | `/badges/me/seen` | connecté | Marque comme vus (corps : `{ codes: [] }`, validé) |
| GET | `/badges/me/summary` | connecté | Niveau, nombre obtenu/total, série actuelle et meilleure série |
| PATCH | `/users/me/badge-visibility` | connecté | Active/désactive la visibilité enseignant |

Contraintes : routes protégées par `Auth.middleware.js`, validation `Badge.validators.js`, messages en français, Swagger, tag `Badge`. Les clés restent des **codes stables** (jamais d'identifiant numérique de définition).

**Compatibilité** : `kpis.badges` (tableau `{ id, label, description, icon, unlocked }`) est **conservé** et alimenté désormais depuis `UserBadge` ; `id` = `code`. Ajout non cassant (champs `earnedAt`, `progress`). **Interface publique modifiée : à valider avant implémentation.**

---

## 11. Profil gamifié

Maquettes détaillées : `diagrams/profil_gamifie_ui.md` (C-06.02) — page dédiée `/profile/badges`, carte de synthèse sur `ProfilePage.vue` et lien depuis `KpiPage.vue` :

- En-tête : niveau, jauge « n / total badges », série actuelle et meilleure série.
- Grille par catégorie (§6.1–6.6) : badge obtenu (couleur, date), badge verrouillé (grisé, progression `4 / 7`), secret (« ??? »).
- Filtre : tous / obtenus / en cours.
- Pas de comparaison avec d'autres utilisateurs.
- Vue enseignant : badges **uniquement si** l'étudiant a activé la visibilité (§13), en plus du consentement KPI par matière.

Le profil réutilise les composants existants (cartes `StatCard`, couleurs via variables CSS de `base.css`, aucune couleur en dur).

---

## 12. Animation d'obtention

- À l'ouverture de l'application ou en fin de session, `GET /badges/me/recent` ; pour chaque badge non vu, **modale** (fond blanc explicite) : icône, libellé, description, rareté ; confettis CSS légers.
- File d'attente : un seul badge à l'écran à la fois, bouton « Suivant » ; fermeture → `PATCH /badges/me/seen`.
- **Accessibilité** : `role="dialog"`, `aria-labelledby`, focus piégé, fermeture clavier (Échap) ; annonce `aria-live="polite"` ; **respect de `prefers-reduced-motion`** (aucune animation, simple apparition) ; contraste ≥ 4,5:1 ; ne repose jamais sur la couleur seule.
- Une animation par badge, durée ≤ 2 s, désactivable dans les réglages.
- Aucune dépendance externe (CSS uniquement). Ajout à `e2e-a11y/` des écrans concernés.

---

## 13. Vie privée, anti-triche, accessibilité

**Vie privée (RGPD)**
- Le badge est une donnée personnelle. Suppression de compte → `ON DELETE CASCADE` ; inclus dans `UserDataExport.service` (export) et import à définir.
- Visibilité enseignant : **désactivée par défaut**, choix explicite de l'étudiant, distinct du consentement KPI. Comportement actuel (badges visibles via KPI) à réaligner.
- Aucune donnée publique ni page de profil visible par d'autres élèves.

**Anti-triche**
- Critères calculés côté serveur depuis des enregistrements journalisés.
- Durées plancher : session Leitner ≥ 1 carte, consultation de carte mentale ≥ 60 s, exercice ≥ 3 questions.
- Plafond de comptage : un seul « exercice » par heure et par même test pour les compteurs de volume (évite de spammer un test).
- Cases `isDone` manuelles exclues des badges de régularité.

**Accessibilité & bien-être**
- Option « masquer la gamification » dans les réglages (désactive animations et notifications de badge).
- Jour de grâce, pas de badge de perte, pas de notification de série menacée par défaut (voir §17 pour l'idée optionnelle).

---

## 14. Stratégie de tests

| Niveau | Contenu |
|---|---|
| Unitaire (Jest) | Chaque `evaluate` du catalogue : cas nominal, limite exacte du seuil (6 vs 7 jours), cas non atteint, données vides |
| Unitaire | Calcul de série : jour de grâce, changement de mois, fuseau, jour d'activité unique, série cassée |
| Intégration (SQLite réelle, `test/bdd/`) | Événement → badge attribué ; **idempotence** (deux événements, un badge) ; concurrence ; suppression du compte |
| Contrôleur (supertest) | Auth 401, validation 400, `seen` sur un code inconnu, un utilisateur ne voit que ses badges |
| Rattrapage | `badges:backfill` rejouable sans doublon |
| Front (Vitest) | Grille, progression, file d'animation, `prefers-reduced-motion` |
| a11y | Modale d'obtention et profil dans `axe.test.js` et `e2e-a11y/` |
| Non-régression | `kpis.badges` garde sa forme (test de contrat) |

Nommage : `[fonction] - [contexte] - [résultat attendu]`.

---

## 15. Hors périmètre

- Classements publics, ligues, « top N », comparaison entre élèves.
- Monétisation (badges payants, cosmétiques achetables).
- Points d'expérience, monnaie virtuelle, multiplicateurs.
- Badges dépendant de l'heure de la journée (fuseau non fiable côté serveur).
- Partage sur réseaux sociaux (dépendance externe, RGPD).
- Éditeur de badges pour les enseignants (voir §17).
- Notifications push (canal « push-futur » du KPI non encore livré).

---

## 16. Décisions à valider

1. **Persister les badges** (table `UserBadge`) au lieu du calcul à la volée : change la nature des données et l'interface interne de `_computeBadges`.
2. **Critère de série** : pratique réelle et non plus créneaux planifiés (change `streak7`, `streak30`, `regular` pour les utilisateurs actuels). Les badges déjà « débloqués » sont-ils conservés par le rattrapage ?
3. **Jour de grâce** : 1 par 7 jours, ou aucun ?
4. **Fuseau horaire** du « jour d'activité » : serveur (UTC) ou fuseau de l'utilisateur ? (aucun fuseau n'est stocké aujourd'hui : proposition = fuseau du serveur, limite connue)
5. **Visibilité enseignant** des badges : désactivée par défaut (proposé), ce qui retire une information aujourd'hui visible.
6. **Seuils** de §6 et paliers de niveau de §7 : calibrage à confirmer sur les données de production.
7. **Table `UserActivityDay`** : à créer dès la V2 pour que la série ne parcoure pas trois tables ?
8. **Catalogue** : garder les ~25 nouveaux badges ou démarrer avec un sous-ensemble (proposition : régularité + exercices + Leitner en lot 1) ?
9. Badge « secret » en V2 ou plus tard.

**Découpage proposé des tickets suivants** : (1) migration + modèle + catalogue ; (2) moteur + émission d'événements + rattrapage ; (3) API ; (4) profil ; (5) animation ; (6) tests et revue.

---

## 17. Banque d'idées de gamification

Idées notées pour aller plus loin. **Aucune n'est engagée** ; classées par intérêt, avec leur position vis-à-vis du périmètre. Légende : ✅ cohérent V2 · 🟡 à arbitrer · ⛔ hors périmètre actuel.

### A. Motivation quotidienne — **toutes adoptées (2026-11-04), non codées**

Décision : les 7 idées A1 à A7 sont retenues. Précisions : A3 coexiste avec le jour de grâce du §5 (le jour de grâce joue en premier, le gel ensuite) ; A3 reste non achetable ; A7 reste en opt-in, désactivé par défaut. Le périmètre des tickets d'implémentation C-06 doit être élargi en conséquence (objectif quotidien, gel, défis, récapitulatif, rappel).

| # | Idée | Statut |
|---|---|---|
| A1 | **Objectif quotidien** réglable (ex. 10 cartes ou 1 exercice) avec anneau de progression sur l'accueil | **Décidé** |
| A2 | **Série visible** (flamme) dans l'en-tête avec jour de grâce | **Décidé** |
| A3 | **Gel de série** gagné par régularité (1 par 14 jours, non achetable) | **Décidé** |
| A4 | **Défi du jour** (« réviser une matière délaissée depuis 7 jours ») | **Décidé** |
| A5 | **Défis hebdomadaires** personnels (3 objectifs tirés selon l'usage) | **Décidé** |
| A6 | **Récapitulatif de la semaine** (carte résumé : jours actifs, cartes revues, progrès) par notification | **Décidé** |
| A7 | **Rappel bienveillant** si la série est menacée (opt-in, désactivé par défaut) | **Décidé** |

### B. Progression et maîtrise — **toutes adoptées (2026-11-04), non codées**

Décision : les 6 idées B1 à B6 sont retenues. B2 existe déjà au niveau du nœud ; seule la couverture agrégée reste à construire.

| # | Idée | Statut |
|---|---|---|
| B1 | **Arbre de compétences par matière** : chaque matière a son niveau (Novice → Expert) selon cartes maîtrisées et scores | **Décidé** |
| B2 | **Carte de maîtrise** : visualiser la couverture d'une matière (cartes mentales « colorées » selon la maîtrise Leitner) | **Décidé** |
| B3 | **Boîte Leitner animée** : la carte « monte » visuellement d'une boîte avec effet de célébration | **Décidé** |
| B4 | **Jalons de matière** (« 100 % des cartes du chapitre en boîte 3 ») | **Décidé** |
| B5 | **Mode examen blanc** chronométré avec badge de réussite | **Décidé** |
| B6 | **Rapport de progression** mensuel illustré | **Décidé** |

### C. Personnalisation et collection — C1, C5 décidées ; C2 à C4 en second temps ; C6 plus tard (2026-11-04)

| # | Idée | Statut |
|---|---|---|
| C1 | **Titre affiché** choisi parmi les badges obtenus (« Cartographe ») | **Décidé** |
| C2 | **Avatar / cadre** débloqué par badges (cosmétique non payant) | **Second temps** (bonne idée, décisions à prendre avant) |
| C3 | **Thèmes de couleur** débloqués (cohérent avec le thème CSS) | **Second temps** (bonne idée, décisions à prendre avant) |
| C4 | **Mascotte** qui réagit à la progression (accueil, fin de session) | **Second temps** (bonne idée, décisions à prendre avant) |
| C5 | **Vitrine** de 3 badges favoris sur le profil | **Décidé** |
| C6 | **Collections** de badges par saison (rentrée, partiels) | **Plus tard** |

### D. Coopération (sans classement) — **toutes reportées (plus tard)**

| # | Idée | Statut |
|---|---|---|
| D1 | **Objectif collectif de classe** (« la classe atteint 1 000 cartes cette semaine »), agrégé et anonyme | **Plus tard** |
| D2 | **Défis d'équipe** enseignant → groupe, avec récompense commune | **Plus tard** |
| D3 | **Badge de contribution** : ressource partagée jugée utile par les pairs | **Plus tard** |
| D4 | **Entraide** : réviser un jeu de cartes partagé par un camarade | **Plus tard** |
| D5 | **Défi entre amis** consenti, privé, sans classement public | **Plus tard** |
| D6 | **Badges décernés par l'enseignant** (encouragement manuel) | **Plus tard** |

### E. Pour l'enseignant — **toutes reportées (plus tard)**

| # | Idée | Statut |
|---|---|---|
| E1 | **Tableau de classe de l'engagement** (agrégé, pas nominatif sans consentement) | **Plus tard** |
| E2 | **Badges de classe** personnalisables par l'enseignant | **Plus tard** |
| E3 | **Alerte de décrochage** : élève sans activité depuis X jours (déjà proche des alertes KPI) | **Plus tard** |

### F. Ludification des mécaniques existantes — toutes décidées sauf F7 (plus tard)

| # | Idée | Statut |
|---|---|---|
| F1 | **Quêtes** à étapes (« Maîtriser le chapitre 3 » = créer 10 cartes, les réviser 3 jours, réussir 1 exercice) | **Décidé** |
| F2 | **Parcours guidé d'intégration** transformé en quête avec récompenses | **Décidé** |
| F3 | **Mode sprint** : 5 minutes de cartes à rythme soutenu | **Décidé** |
| F4 | **Bonus de première session du jour** (message d'encouragement, pas de points) | **Décidé** |
| F5 | **Feedback ludique sur la qualité des cartes générées par IA** (« carte validée ») | **Décidé** |
| F6 | **Calendrier d'activité** (grille façon contributions GitHub) sur le profil | **Décidé** |
| F7 | **Mini-jeux de révision** (association, texte à trous, vrai/faux chronométré) à partir des cartes | **Plus tard** |
| F8 | **Cartes « boss »** : les cartes les plus ratées regroupées en un défi à vaincre | **Décidé** |

### G. Mise en forme et ressenti — G2 et G4 décidées ; G1 et G3 en second temps

| # | Idée | Statut |
|---|---|---|
| G1 | **Sons** discrets (désactivés par défaut) à la bonne réponse et à l'obtention | **Second temps** (bonne idée, décisions à prendre avant) |
| G2 | **Messages d'encouragement** variés en fin de session | **Décidé** |
| G3 | **Haptique** sur mobile (Capacitor déjà présent) | **Second temps** (bonne idée, décisions à prendre avant) |
| G4 | **Mode « zen »** désactivant toute gamification | **Décidé** |

### Priorités suggérées après le lot badges

1. **A1 + A2** (objectif quotidien et série visible) : plus fort levier d'habitude pour un coût faible, s'appuient sur la définition de « jour d'activité » du §5.
2. **C1 + C5** (titre et vitrine) : exploitent directement les badges.
3. **F6** (calendrier d'activité) : donnée déjà disponible, très lisible.
4. **A4/A6** (défi du jour, récapitulatif) via le job et les rappels existants.
5. **F1** (quêtes) en second temps, une fois le moteur stabilisé.

Garde-fou commun : toute idée comparant des élèves entre eux, introduisant une monnaie ou un achat, ou traitant des données nominatives visibles d'un tiers doit repasser par une validation explicite (OUT / RGPD).

---

## 18. Avancement de l'implémentation (2026-11-04)

**Codé (back-end, lot 1)** : tables `UserActivityDay` et `UserBadge` (migration `20261104000001`), calcul de série avec jour de grâce (`helpers/badges/streak.js`), catalogue de 14 badges (`helpers/badges/catalog.js` : `streak3/7/30/100`, `regular`, `firstExercise`, `tenTests`, `fiftyTests`, `perfectScore`, `firstLeitner`, `hundredCards`, `thousandCards`, `leitnerMastery`, `fiveSubjects`), moteur (`Badge.service.js`, `badgeEvents.js`), émission depuis `Test.service#submitAnswers`, `LeitnerReviewSession.service#create` et `MindMapViewSession.service#create` (≥ 60 s), API `GET /badges`, `GET /badges/me/recent`, `GET /badges/me/summary`, `PATCH /badges/me/seen`, rattrapage `npm run badges:backfill`.

**Fusion `kpis.badges` / `UserBadge` (2026-11-04)** : `getMyKpis` lit `UserBadge` (format historique conservé, enrichi) avec rattrapage paresseux des comptes existants ; la vue filtrée par consentement de matières (`getPersonalKpisForSubjects`) montre les badges obtenus avec une matière consentie (§19) ; l'ancien calcul `_computeBadges` est supprimé.

**Pas encore codé** : front (profil, animation), visibilité enseignant (`PATCH /users/me/badge-visibility`), badges du catalogue hors lot 1 (`progress`, `retry`, `comeback`, `box5`, `cleanSweep`, exploration/création, groupes, secrets), job quotidien (inutile tant qu'aucun badge ne dépend de l'absence d'activité), export des badges dans `UserDataExport`, objectif quotidien, gel de série et autres idées A à G décidées.

**Écarts avec la définition** : (1) la meilleure série (et non la série courante) déclenche l'obtention, pour qu'un rattrapage n'efface pas une série passée ; la progression affichée est donc la meilleure série ; (2) les sessions Leitner partielles comptent comme pratique (leur `cardsReviewed` est ≥ 1 et correspond à des cartes réellement corrigées) ; (3) l'émission est attendue (`await`) mais ne lève jamais : quelques requêtes de plus sur la réponse des trois actions.

---

## 19. Badges liés à des matières (many-to-many) — décidé et codé le 2026-11-04

**Principe** : un badge peut être lié à zéro, une ou plusieurs matières ; une matière peut porter plusieurs badges. La relation est portée par la table `BadgeSubject (badgeCode, subjectId)`, unique sur le couple. Les badges vivent en code (`catalog.js`) : le lien utilise donc leur `badgeCode` stable, sans clé étrangère côté badge. Les matières sont communes à tous les utilisateurs (la table `Subject` n'a pas de propriétaire), le lien est donc global.

| Cas | Comportement |
|---|---|
| Badge sans matière liée | Badge **global** : critère calculé sur toute l'activité |
| Badge lié à une ou plusieurs matières | Le critère **ne compte que l'activité de ces matières** (somme sur l'ensemble des matières liées) |
| Visibilité enseignant, consentement global | Tous les badges, comme avant |
| Visibilité enseignant, consentement par matières | Badges **obtenus avec au moins une matière consentie** : les matières dont l'activité a permis l'obtention sont enregistrées dans `UserBadge.context.subjectIds` au moment de l'obtention. Le lien administrateur n'intervient pas dans la visibilité. Seules les matières consenties sont renvoyées |
| Délier ou relier un badge | Les badges déjà obtenus restent acquis ; seuls les critères futurs changent |

**Badges restreignables** (`scopable`) : ceux dont le critère se mesure par matière — `firstExercise`, `tenTests`, `fiftyTests`, `perfectScore`, `firstLeitner`, `hundredCards`, `thousandCards`, `leitnerMastery`. Les badges de série et de régularité (`streak*`, `regular`) reposent sur les jours d'activité, qui ne sont pas rattachés à une matière, et `fiveSubjects` compte justement les matières : ils ne peuvent pas être liés (refus 400).

**API** : `PUT /badges/:code/subjects` (rôle 1) avec `{ subjectIds: [] }` remplace les liens (liste vide = badge global) ; 404 badge inconnu, 400 badge non restreignable, matière inconnue ou corps invalide. `GET /badges` expose `scopable`, `linkedSubjectIds` (liens) et `earnedSubjectIds` (matières d'obtention).

**Visibilité par matière d'obtention (décision du 2026-11-04)** : le lien administrateur ne décide pas de ce qu'un enseignant peut voir. À l'obtention, le moteur enregistre les matières dont l'activité a contribué au badge (`contributors` dans le catalogue) : par exemple `perfectScore` ne retient que les matières où un 100 % a été obtenu, `leitnerMastery` que les systèmes réellement maîtrisés. Sous consentement par matières, l'enseignant voit un badge obtenu s'il a été obtenu avec **au moins une** matière consentie ; il ne reçoit que les matières consenties. Un badge sans matière (séries, régularité, `fiveSubjects`) n'est jamais montré dans ce cas. Les badges obtenus avant cet enregistrement n'ont pas de matières : `npm run badges:backfill` (méthode `repairEarnedSubjects`) les reconstruit depuis l'activité actuelle ; tant qu'il n'est pas passé, ils restent invisibles sous consentement par matières. Une migration SQL n'a pas été retenue (voir DECISIONS). Côté enseignant, la vue des KPI d'un étudiant affiche les noms des matières d'obtention sous chaque badge (`earnedSubjects`), que le consentement soit global ou par matières ; sous consentement par matières, seules les matières consenties sont listées.

**Lien et visibilité sont deux choses distinctes** : le lien restreint ce qui est *compté* ; les matières d'obtention déterminent ce qui est *montré*. Un badge global (non lié) obtenu avec Maths et Physique est donc visible avec le seul consentement Maths, mais ne révèle que Maths dans la réponse. Le total qu'il exprime (par exemple 10 exercices) peut en revanche inclure la Physique : lier le badge aux seules matières voulues supprime cet effet.

**Évolutions possibles grâce au many-to-many** : badges de filière (plusieurs matières), badges de matière (une seule), regroupements par thème, badges de chapitre si une entité chapitre apparaît.

**Aucun lien par défaut (décidé)** : les badges restent globaux tant qu'un administrateur ne les lie pas, et les badges non liables ne le seront jamais. La visibilité par matière d'obtention rend ce choix sans conséquence pour la confidentialité.

**Limites connues** : (1) un badge global peut exprimer un total incluant des matières non consenties (voir ci-dessus) ; (2) pas d'interface d'administration (API seule) ; (3) les jours d'activité ne sont pas rattachés à une matière, d'où l'exclusion des badges de série ; (4) la lecture des liens ajoute une requête à chaque évaluation.
