# Manuel d'utilisation — MyMemoMaster

**Version** : MVP (juillet 2026)
**Public** : utilisateurs finaux — étudiants, enseignants, gérants d'établissement.
**Application** : plateforme web de révision et de suivi pédagogique, accessible depuis un navigateur (ordinateur, tablette, mobile). L'application est installable sur mobile comme une application native (PWA) : depuis le navigateur, menu « Ajouter à l'écran d'accueil ».

> Ce manuel décrit l'utilisation de l'application. Pour l'installation technique et l'exploitation, voir le [README](../README.md) et le [RUNBOOK](RUNBOOK.md). Un guidage interactif (onboarding) et une page Tutoriels sont également intégrés à l'application.

---

## 1. Créer un compte et se connecter

### 1.1 Inscription

1. Ouvrez l'application et cliquez sur **S'inscrire** (page `/register`).
2. Renseignez votre **nom**, votre **email** et un **mot de passe**. Le mot de passe doit contenir au moins **10 caractères, une majuscule, un chiffre et un caractère spécial** — la jauge sous le champ indique sa robustesse.
3. Validez : un **email de vérification** vous est envoyé. Cliquez sur le lien qu'il contient (valable 30 minutes) pour activer le compte.
4. Sans cette vérification, la connexion est refusée.

[CAPTURE ICI : formulaire d'inscription avec la jauge de robustesse du mot de passe]

### 1.2 Connexion et session

- Connectez-vous sur `/auth` avec votre email et votre mot de passe.
- Votre session se renouvelle automatiquement tant que vous utilisez l'application ; vous restez connecté d'une visite à l'autre sur le même navigateur.
- **Mot de passe oublié** : lien « Mot de passe oublié » → saisissez votre email → un lien de réinitialisation vous est envoyé.

### 1.3 Première connexion : l'onboarding

À la première connexion, un parcours de prise en main vous présente les fonctionnalités principales et une liste de premières actions (créer un contenu, compléter son profil…). Vous pouvez le retrouver à tout moment via la page **Tutoriels** (`/tutorials`).

---

## 2. Réviser avec les flashcards (systèmes de Leitner)

Le système de Leitner est une méthode de révision par **répétition espacée** : chaque carte (question/réponse) se trouve dans une boîte ; une bonne réponse la fait monter d'une boîte (revue moins souvent), une mauvaise la renvoie en boîte 1 (revue plus souvent).

### 2.1 Créer un système et ses cartes

1. Page **Flashcards** (`/flashcards`) → **Nouveau système** : donnez-lui un nom (ex. « Vocabulaire anglais ») et associez-le à un sujet.
2. Ouvrez le système → **Gestion des cartes** : créez vos cartes en saisissant l'énoncé et la réponse. Plusieurs types sont possibles (réponse libre, QCM…).
3. Les **boîtes** sont créées automatiquement (5 par défaut) ; vous pouvez ajuster leur intervalle de révision dans la même page.

[CAPTURE ICI : page Flashcards avec un système et la modale de création de carte]

### 2.2 Réviser

1. Depuis la page Flashcards, lancez une **session de révision** : l'application vous présente uniquement les cartes **dues** (dont la date de révision est atteinte).
2. Saisissez votre réponse et validez : un feedback indique si la réponse est correcte (la correction par similarité sémantique tolère les reformulations pour les réponses libres) et la carte change de boîte en conséquence.
3. La session se termine quand toutes les cartes dues sont passées.

### 2.3 Planifier ses révisions

Sur chaque système, le bouton **+ Planifier** crée une séance de révision qui apparaît dans votre **calendrier** et votre **to-do list** du jour.

---

## 3. Cartes mentales

Page **Mindmaps** (`/mindmaps`) :

- **Créer** une carte mentale (nom + sujet), puis construire le schéma dans l'éditeur : `Maj + clic` sur le fond crée un nœud, le bouton **+** d'un nœud crée un enfant.
- Chaque nœud a un type (texte, formule mathématique, image, lien vers une flashcard), une couleur, un niveau de maîtrise.
- La palette latérale permet de modifier le nœud sélectionné ; l'**interpréteur de formules** permet de saisir des formules mathématiques rendues proprement.
- Des **zones** colorées permettent de regrouper visuellement des nœuds.
- L'enregistrement se fait depuis l'éditeur (bouton Enregistrer / modale de nom).

[CAPTURE ICI : éditeur de carte mentale avec palette et un nœud formule]

---

## 4. Exercices

### 4.1 Passer un exercice

1. Page **Exercices** (`/exercises`) : la liste de vos séries d'exercices, filtrable par sujet et par tags.
2. Ouvrez un exercice : répondez aux questions (réponse libre, QCM, texte à trous, phrase à remettre en ordre).
3. **Vérifier les résultats** : votre score s'affiche avec le détail par question (Correct/Incorrect + réponse attendue). L'historique de vos passages est conservé en bas de page.

### 4.2 Créer un exercice

Bouton **Nouvel exercice** : nom, sujet, puis ajoutez vos questions une à une en choisissant leur type. Pour un texte à trous, écrivez le texte avec `{{0}}`, `{{1}}`… aux emplacements des trous, puis renseignez les réponses attendues.

[CAPTURE ICI : création d'un exercice avec une question de chaque type]

---

## 5. S'organiser : calendrier, to-do, rappels

- **Calendrier** (`/calendar`) : vue année ou mois. Cliquez sur un jour pour **créer une séance de révision** (nom, date, heures, description). Les séances et les échéances de vos groupes s'affichent ; cliquez sur un événement pour son détail.
- **To-do** (`/todo`) : vos séances du jour, cochables au fil de la journée.
- **Rappels** : sur une séance ou une échéance, ajoutez un rappel (ex. « 1 h avant ») — vous recevrez un **email** à l'heure choisie. La cloche en haut de l'écran liste vos rappels à venir.
- **Sujets** (`/subjects`) : tous vos contenus (systèmes, cartes mentales, exercices) regroupés par sujet, avec recherche globale.

[CAPTURE ICI : calendrier en vue mois avec une séance et le widget de rappel]

---

## 6. Suivre sa progression (KPI)

Page **Ma progression** (`/kpi`) : indicateurs personnels — régularité des révisions, taux de réussite, volume de cartes revues, progression par sujet.

**Partage avec l'enseignant** : vos indicateurs ne sont visibles d'un enseignant que si vous donnez votre **consentement**, demandé explicitement dans l'application et révocable à tout moment (page Réglages).

---

## 7. Groupes classes (étudiants)

Page **Classroom** (`/classroom`) :

- Rejoignez un groupe via l'**invitation** reçue par email.
- Consultez les **sections** publiées par l'enseignant (cours, ressources à télécharger), les **échéances** (devoirs à rendre avec date limite) et déposez vos **rendus** (fichier).
- Accordez ou retirez le partage de vos KPI à un enseignant du groupe.

---

## 8. Enseignants

Sur `/classroom`, la vue enseignant permet de :

- **Créer des sections** (cours, chapitres) et y attacher des **ressources** (PDF, documents, images — dépôt par glisser-déposer).
- **Créer des échéances** rattachées à une séance précise du calendrier du groupe, avec date limite ; les étudiants les voient dans leur calendrier.
- **Assigner des exercices** au groupe et consulter les résultats.
- **Suivre la classe** : tableau d'analyse par étudiant (activité, réussite, alerte « à risque »), dans la limite du consentement de chaque étudiant.
- **Inviter des membres** par email et retirer un étudiant du groupe.

[CAPTURE ICI : vue enseignant avec l'analyse pédagogique dépliée sur un étudiant]

---

## 9. Gérants d'établissement et administrateurs

- **Gérant d'établissement** (vue dédiée sur `/classroom`) : création et gestion des **groupes classes** de son établissement, du **calendrier** des groupes (événements récurrents — un cours hebdomadaire sur un semestre se crée en une fois), invitations des enseignants et étudiants, consultation du **journal d'audit** des actions.
- **Administrateur plateforme** (`/admin` via la vue plateforme) : création des **établissements**, désignation de leur gérant, supervision globale et journal d'audit.

---

## 10. Compte et réglages

- **Profil** (`/profile`) : nom, email, photo.
- **Mon compte** (`/account`) : changement de mot de passe ; **suppression du compte** — action irréversible, confirmée en tapant `SUPPRIMER` dans le champ prévu.
- **Réglages** (`/settings`) : préférences de notification, seuils d'alerte de progression, consentements.

---

## 11. Questions fréquentes

| Problème | Solution |
|---|---|
| « Veuillez vérifier votre adresse email » à la connexion | Cliquez sur le lien reçu à l'inscription ; s'il a expiré (30 min), utilisez « Renvoyer l'email de vérification » |
| Je ne reçois pas l'email (vérification, rappel) | Vérifiez le dossier spam ; l'expéditeur est l'adresse notée dans l'email d'inscription |
| Aucune carte proposée en session | Aucune carte n'est **due** : la répétition espacée attend l'échéance de chaque boîte — revenez plus tard ou réduisez l'intervalle des boîtes |
| Trop de tentatives de connexion | Après 10 échecs, le compte est protégé 15 minutes — patientez puis réessayez |
| Mon enseignant ne voit pas ma progression | Le partage des KPI exige votre consentement explicite (page Classroom / Réglages) |
| L'envoi d'un fichier est refusé | Formats acceptés : images, PDF, Word, PowerPoint, Excel — 10 Mo maximum ; l'extension doit correspondre au contenu réel du fichier |
