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

3. Lancer votre environnement local:

Avec docker-compose:
```sh
cd MyMemoMaster
docker-compose up
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

4. Lancer le seed de la base de données:

```sh
cd MyMemoMaster/my_memo_master_api
npm run seed
```

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

quand votre bra&nche est déja sur git

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

<!-- ## Organisation du travail -->

<!-- <table>
  <thead>
    <tr>
      <th>Étapes</th>
      <th colspan="8">Tâches de dev</th>
      <th>Tâches de design</th>
    </tr>
    <tr>
      <th>Étapes</th>
      <th>Dev 1</th>
      <th>Dev 2</th>
      <th>Dev 3</th>
      <th>Dev 4</th>
      <th>Dev 5</th>
      <th>Dev 6</th>
      <th>Dev 7</th>
      <th>Dev 8</th>
      <th>Crea 1</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Étape 1</td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
    </tr>
    <tr>
      <td>Étape 2</td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
    </tr>
    <tr>
      <td>Étape 3</td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
    </tr>
    <tr>
      <td>Étape 4</td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
    </tr>
    <tr>
      <td>Étape 5</td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
    </tr>
    <tr>
      <td>Étape 6</td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
    </tr>
    <tr>
      <td>Étape 7</td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
    </tr>
    <tr>
      <td>Étape 8</td>
     <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
    </tr>
    <tr>
      <td>Étape 9</td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
    </tr>
    <tr>
      <td>Étape 10</td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
    </tr>
  </tbody>
</table> -->
