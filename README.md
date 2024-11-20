# MyMemoMaster

Présentation:
MyMemoMaster est une plateforme qui a pour but d'aider les étudiants dans leur révisions. En centralisant diverses fonctionnalités visant à optimiser l’apprentissage. La ou MyMEmoMaster pourra se démarquer de ces concurrents c’est sur le fait de proposer un large éventail de fonctionnalités :

Les fonctionnalitées principales sont :
⇒ un éditeur de cartes mentales
⇒ un système de leitner
⇒ une fonctionnalitée exercices

L'applications disposera de fonctionnalitées interactives.

arborescence du projet:

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


## Partie 2: À l'attention des collaborateurs
###bien commencer:
Logiciels nécéssaires:
- Postman ⇒ https://www.postman.com 
- Visual Studio Code ⇒ https://code.visualstudio.com 
- Git ⇒ https://git-scm.com
- Docker/Docker-compose ⇒ https://www.docker.com
- un navigateur web 

récupération du projet:
http:
```
git clone https://github.com/entrezunfredici/MyMemoMaster.git
```
SSH:
```
git clone git@github.com:entrezunfredici/MyMemoMaster.git

```

lancer votre environnement local:
```
cd MyMemoMaster
docker-compose up
```

###Methode de travail:
Etape 1, se caller sur la branche dev:
```
git checkout dev
git pull
```
Etape 2, créer une branche pour la feature que vous souhaitez ajouter:
```
git checkout -b dev_front/back_ma-feature
```
Etape 3, travailler sur votre feature:
1. tests unitaires
2. code
3. documentation swagger

Etape 4, pusher sur votre branche (chaques fin de séance et quand votre feature est finie):
quand votre branche n'est pas encore sur git
```
git add .
git commmit -m "`<message>`"
git push origin dev_front/back_ma-feature
```
quand votre bra&nche est déja sur git
```
git add .
git commmit -m "`<message>`"
git push
```
Règles de nommage du commit:
un adgjectif:
- [ADD] pour les ajouts de fonctionnalitées
- [IMP] pour les améliorations de fonctionnalitées
- [REF] pour les refactorisations
- [FIX] pour les corrections de bugs
suivi d'une courte description de la fonctionnalitée ajoutée ou modifiée

## Organisation du travail
<table>
  <thead>
    <tr>
      <th>Étapes</th>
      <th colspan="5">Tâches de dev</th>
      <th>Tâches de design</th>
    </tr>
    <tr>
      <th></th>
      <th>Utilisateurs</th>
      <th>Cartes mentales</th>
      <th>Système de Leitner</th>
      <th>Exercices</th>
      <th>Navigation</th>
      <th></th>
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
    </tr>
    <tr>
      <td>Étape 2</td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
    </tr>
  </tbody>
</table>
