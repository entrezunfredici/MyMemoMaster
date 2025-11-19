# MyMemoMaster

## Partie 1: Présentation

MyMemoMaster est une plateforme qui a pour but d'aider les étudiants dans leur révisions. En centralisant diverses fonctionnalités visant à optimiser l’apprentissage. La ou MyMEmoMaster pourra se démarquer de ces concurrents c’est sur le fait de proposer un large éventail de fonctionnalités :

Les fonctionnalitées principales sont :
⇒ un éditeur de cartes mentales
⇒ un système de leitner
⇒ une fonctionnalitée exercices

L'applications disposera de fonctionnalitées interactives.

## Partie 2: À l'attention des collaborateurs

### Détails du projet

Arborescence du projet:

```txt
MyMemoMaster
│   README.md
|   .gitignore
|   ./my_memo_master_api
|       ./controllers //controlleurs de l'api
|       ./models //modèles de l'api
|       ./routes //routes de l'api
|       ./services //services de l'api
|       ./test //test unitaires de l'api
|       ./app.js //fichier principal de l'api
|       ./package.json //package de l'api
|   ./my_memo_master_front
```

### Bien commencer:

1. Logiciels nécéssaires:

- Postman ⇒ https://www.postman.com
- VS Code ⇒ https://code.visualstudio.com
- Git ⇒ https://git-scm.com
- Docker/Docker-compose ⇒ https://www.docker.com
- Un navigateur web

2. Récupération du projet:
   HTTP:

```sh
git clone https://github.com/entrezunfredici/MyMemoMaster.git
```

SSH:

```sh
git clone git@github.com:entrezunfredici/MyMemoMaster.git

```

3. Copiez `.env.example` en `.env` et remplissez les variables d'environnement.
4. Lancer votre environnement local:

Avec docker-compose:

```sh
cd MyMemoMaster
docker-compose down ; docker-compose up --build
```

A noter, le docker compose dispose d'un reverseproxy (traefik), lorsque vous demmarez le projet avec docker, le font est accéssible à l'adresse :
```
 http://localhost/
```
L'api a l'adresse :
```
  http://localhost/api
```

et le traefik a l'adresse:
```
 http://localhost:8080/dashboard/#/
```

A l'ancienne (comme la moutarde):

```sh
cd MyMemoMaster/my_memo_master_api
npm install
npm run start
```

```sh
cd MyMemoMaster/my_memo_master_front
npm install
npm run dev
```

5. Lancer le seed de la base de données:

```sh
cd MyMemoMaster/my_memo_master_api
npm run seed
```

6. Configurer PGAdmin:
   6.1. PgAdmin Docker:
   Ouvrez votre navigateur et allez à l'adresse suivante: http://localhost:5050
   entrer les identifiants définis dans le .env
   une fois connecté, faire un clic droit sur "Servers" passer sa souris sur "nouveau" puis cliquer sur "Server"
   remplir les champs comme suit:
   dans l'ongle général:

- Name: my memo master (ou le nom que vous voulez)
  dans l'oglet Connexion
- Nom d'hôte/Adresse: la valeur de PG_HOST dans le .env
- Port: la valeur de PG_PORT dans le .env
- identifiant de connexion: la valeur de PG_USER dans le .env
- Mot de passe: la valeur de PG_PASS dans le .env
  Pour finir cliquer sur "Enregistrer"
  6.2. PgAdmin local:
  Télerchargez Postgres SQL et PG admin sur votre machine
  Ouvrez PGAdmin et connectez vous avec les identifiants définis dans le .env
  creer la base de donnée "PG_DB"

### Methode de travail:

Etape 1, se caller sur la branche dev:

```sh
git checkout dev
git pull
```

Etape 2, créer une branche pour la feature que vous souhaitez ajouter:

```sh
git checkout -b dev_front/back_ma-feature
```

Etape 3, travailler sur votre feature:

1. tests unitaires
2. code
3. documentation swagger

Etape 4, pusher sur votre branche (chaques fin de séance et quand votre feature est finie):
quand votre branche n'est pas encore sur git

```sh
git add .
git commmit -m "`<message>`"
git push origin dev_front/back_ma-feature
```

quand votre branche est déja sur git

```sh
git add .
git commmit -m "`<message>`"
git push
```

Règles de nommage du commit:
un adjectif:

- [ADD] pour les ajouts de fonctionnalitées
- [IMP] pour les améliorations de fonctionnalitées
- [REF] pour les refactorisations
- [FIX] pour les corrections de bugs
  suivi d'une courte description de la fonctionnalitée ajoutée ou modifiée
