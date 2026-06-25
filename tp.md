# Document d'Architecture — MyMemoMaster

## TP M2 Dev Cloud — Stratégie de déploiement

---

## 1. Analyse de la problématique


    LA plupart des etudiants ont des methodes de revision peu efficaces qui les mettent en difficultée. 83,6% ont des methodes de révisions passives, 27% préparent leurs examents au dernier moment, seulement 34% ont un calendrier de révcision utile et seulmement 1 étudiant sur 2 s’entraîne via des annales ou des exercices. Pour remedier a ces problème My Memo Master propose une plateforme de révision et de suivi étudiant tout en un à destination des étudiants principalement et des enseignants. Pour répondre aux besoin des étudiants la plateforme propose diverses fontionnalitées bésées sur des methodes pédagogiques efficaces pour les etudiants :

* Systèmes de leitner : système de questions-réponses qui se base sur le fonctionnement de la mémoire, l’idée est simple, l’algorythme vous posera des questions, vous répondez et derrière le système corriger. si vous échouez sur une question alors elle sera posée plus souvent afin que vous reteniez la réponse. Une fois que vous aurais rettenu la réponse et que donc votre réposne sera juste, le sytème la posera moins souvent (car c‘est moins nécéssaire) mais la posera de temps en temps pour que vous ne l’ouvbliez pas.
* Cartes mentales : schemat servant à itentifier les différentes notions (définitions, formules, grandeurs physiques ect..) et les liens entre elles.
* Séries d’exercices: séries d’exercices permettant de s’entrainer
* Calendier et todolist : outils d’organisation permettant de planifier les seances de révisions et visualiser les échéances (ds, exams ect...)
* Kpi personnels : Ensemble de données permettant de voir son niveaux, ces points forts et ces points faibles, l’apllication mesure les kpi suivants : score aux séries d’exercices, niveaux de maitrise des questions dans les systèmes de leitner, nombre questions répondues, régularitée, diversitée des sujets etudiés, discipline (rapport entre ce qui est prévu et ce qui est réellement fait)

La plateforme propose aussi des fonctionnalitées pour faciliter le suivi étudiant :

* Groupes classes permettant de faciliter le partage de ressources pedagogiques, et les echanges etudiants/enseigannts
* Kpi pedagogiques : scores obtennus aux tests créés par les enseignants
* Synchronisation des emplois du temps (entre les groupes classes (heures de cours et exams) et les emplois du temps de lerus membres (etudiants et enseignants)) afin de centraliser et faciliter l’organisation
* Interface gerant établissement : pour permettre au gérant/responsable de l’établissement de creer les groupes classes, les emplois du temps et d’y inviter les membres (enseignants et étudiants).

Il y a egalement des fonctionnalitées d’IA. Un système de correction via similaritée sémantqiue pour les exercices et les systèmes de leitner passant par un petit modèle d’IA locale (Xenova/all-mpnet-base-V2). Et un système de création de systèmes de leitner, de séries d’exercices et de carte mentale à partir du cours utilisant des outils IA externes api OCR + api LLM.

---

## 2. Identification des points critiques

### 2.1 Endpoints coûteux

#### `GET /api/v1/kpi/me` — Calcul KPI pédagogique

C'est le point chaud principal. À chaque appel, `KpiService.getMyKpis()`
déclenche **3 requêtes SQL parallèles** avec plusieurs JOINs :

```js
const [sessions, testResults, leitnerSystems] = await Promise.all([
  RevisionSession.findAll({ where: { userId }, order: [['date', 'DESC']] }),
  TestResult.findAll({
    where: { userId },
    include: [{ model: Test, include: [Subject] }]
  }),
  LeitnerSystem.findAll({
    where: { idUser: userId },
    include: [{ model: LeitnerBox, include: [LeitnerCard] }]
  })
])
```
