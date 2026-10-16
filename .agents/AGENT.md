# AGENT.md — Directives pour agents IA

> Fichier universel pour le projet MyMemoMaster.  
> Complété par `CONVENTIONS.md` (stack et règles) et `DECISIONS.md` (décisions techniques).

---

## 1. En début de session

Avant toute chose, lis dans cet ordre :
1. `AGENT.md` — ce fichier
2. `CONVENTIONS.md` — stack, structure, nommage, patterns de code
3. `CHANGELOG_AGENT.md` — état actuel du code, ce qui a déjà été fait
4. `DECISIONS.md` — pourquoi le code est comme il est
5. Le ticket ou la demande courante

`CHANGELOG_AGENT.md` est ta mémoire de session — il te dit où en est le projet sans que tu aies à inférer depuis le code.

---

## 2. Comportement général

### Avant de coder

- Lis `CONVENTIONS.md` avant toute implémentation.
- Si une information manque pour réaliser la tâche, **pose une question avant de coder** — ne fais pas d'hypothèse silencieuse.
- Si la tâche implique de modifier une interface publique (fonction exportée, endpoint, schéma de modèle), **signale-le explicitement** et attends validation avant de continuer.

### Tickets en séquence — audit obligatoire avant implémentation

Les tickets sont livrés dans un ordre qui respecte les dépendances. Avant de coder, systématiquement :

**1. Identifier les fichiers concernés**  
Liste les fichiers existants directement liés au ticket (models, services, controllers, routes, stores, composants...).

**2. Auditer l'état réel du code**  
Pour chaque dépendance listée dans le ticket, vérifie ce qui est déjà implémenté :
- Ce qui existe et que tu dois utiliser tel quel
- Ce qui existe mais doit être étendu
- Ce qui n'existe pas encore et est dans ton périmètre

**3. Signaler les écarts**  
Si l'état du code ne correspond pas à ce que le ticket suppose, **signale-le avant de coder** — ne comble pas silencieusement.

**4. Attends validation si un écart bloque**  
Si une dépendance supposée présente est absente, pose la question.

> Résumé : **lis le code existant avant d'écrire une ligne, adapte-toi à ce qui est là.**

### Pendant le codage

- Travaille **un module à la fois**, dans les contraintes d'architecture définies.
- Ne refactore pas du code hors du périmètre du ticket en cours.
- N'ajoute pas de dépendance externe sans la signaler et justifier le choix (voir liste dans `CONVENTIONS.md`).
- Si tu détectes un problème dans un module adjacent, **signale-le dans un commentaire `TODO:`** plutôt que de le corriger silencieusement.

### En cas d'ambiguïté

- Priorité : respecter l'architecture définie > conventions > performance > concision.
- Si deux approches sont valides, choisis la plus simple et documente le choix dans `DECISIONS.md`.

---

## 3. Standards de code

### Documentation obligatoire

Toute fonction publique (exportée ou accessible depuis un autre module) doit avoir un JSDoc :

```javascript
/**
 * [Description en une phrase]
 *
 * @param {Type} nom - Description
 * @returns {Type} Description
 * @throws {Error} Quand / pourquoi
 */
```

### Commentaires de décision

Pour tout choix non-trivial :

```javascript
// CHOIX: [approche retenue] plutôt que [alternative écartée]
// RAISON: [justification courte]
```

### Gestion d'erreurs

- Ne catch pas silencieusement (`catch(e) {}`).
- Toute erreur doit être soit propagée, soit loguée via `logger` (Winston) avec contexte.
- Les erreurs attendues (validation, not found) sont distinguées des erreurs système dans les réponses HTTP.
- Messages d'erreur en français (voir codes HTTP dans `CONVENTIONS.md`).

### Nommage

Suit les conventions définies dans `CONVENTIONS.md` — nommage descriptif > nommage court en cas de doute.

---

## 4. Tests

- Chaque module livré doit inclure ses tests unitaires dans `my_memo_master_api/test/`.
- Les tests couvrent : le cas nominal, les cas limites, les erreurs attendues.
- Format des noms de test : `[fonction] - [contexte] - [résultat attendu]`

```
✓ createUser - données valides - retourne l'utilisateur créé
✓ createUser - email déjà utilisé - lève une erreur 400
✓ createUser - champ manquant - retourne une erreur de validation
```

---

## 5. Ce que l'agent NE doit PAS faire

| Interdit | Raison |
|----------|--------|
| Modifier les interfaces publiques (endpoints, signatures de service) sans validation | Casse les modules dépendants |
| Refactorer hors du périmètre du ticket | Introduit du risque non planifié |
| Ajouter une dépendance externe sans signalement | Vérifier d'abord les dépendances approuvées dans `CONVENTIONS.md` |
| Supprimer des tests existants | Même s'ils échouent — les signaler à la place |
| Changer la structure de dossiers | Sauf si c'est explicitement dans le ticket |
| Laisser du code commenté | Utiliser `TODO:` avec contexte ou supprimer |
| Écrire des messages d'erreur en anglais | Les messages sont en français |

---

## 6. Livraison d'un ticket

Checklist avant de considérer un ticket terminé :

- [ ] Code dans les contraintes d'architecture (controller → service → model)
- [ ] JSDoc sur les fonctions publiques
- [ ] Commentaires de décision sur les choix non-triviaux
- [ ] Tests unitaires (nominal + limites + erreurs)
- [ ] Linter passe sans erreur (`npm run lint`)
- [ ] `DECISIONS.md` mis à jour si un choix structurant a été fait
- [ ] `CHANGELOG_AGENT.md` mis à jour — fichiers créés/modifiés, ce qui est utilisable, hypothèses posées, dette éventuelle

---

## 7. Format de rapport de fin de ticket

```
## Ticket [ID] — [Titre]

**Ce qui a été fait** : ...
**Choix techniques** : ...
**Ce qui n'est PAS couvert** : ...
**Points d'attention** : ... (dette, risques, dépendances fragiles)
```

---

## 8. Conventions Git

- Branches : `dev_front/feature-name` ou `dev_back/feature-name`
- Commits : `[ADD]` (nouveau), `[IMP]` (amélioration), `[REF]` (refacto), `[FIX]` (bug)
- Les branches partent de `dev`, pas de `main`
