# Politique de confidentialité — MyMemoMaster (BROUILLON)

> **Brouillon technique à relire et valider par la personne responsable du traitement (voire un juriste) avant publication.**
> Il décrit ce qui ressort du code de l'application et de l'API. Les passages entre `[crochets]` sont des informations que le
> code ne permet pas de connaître. Google Play exige une version publiée à une URL publique.

Dernière mise à jour : `[date]`

## 1. Qui est responsable de vos données ?

`[Nom / structure responsable du traitement]`, `[adresse]`.
Contact pour toute question relative à vos données : `[adresse e-mail de contact, ex. support@my-memo-master.com]`.

## 2. Quelles données sont collectées ?

| Catégorie | Détail | Finalité |
|-----------|--------|----------|
| Compte | nom, adresse e-mail, mot de passe (stocké **haché**, jamais en clair), rôle (étudiant, enseignant, administrateur) | créer et sécuriser votre compte, vous identifier |
| Contenus que vous créez | cartes mentales, flashcards, exercices, réponses, images importées | fournir le service de révision |
| Activité d'apprentissage | séances de révision, scores, progression, séries de jours, temps de consultation d'une carte mentale | calculer votre progression et planifier les révisions |
| Planning | événements de calendrier, rappels, tâches | vous rappeler vos révisions |
| Classe | appartenance à un groupe, invitations, ressources, rendus et échéances partagés | fonctions de groupe classe |
| Données techniques | adresse IP et journaux techniques de l'API `[durée de conservation]` | sécurité, détection d'abus, diagnostic |

L'application ne demande **aucune autorisation** de l'appareil au-delà de l'accès à Internet : pas de localisation, de contacts,
de photos de l'appareil ni de micro. Elle n'utilise pas d'identifiant publicitaire et ne contient pas de publicité.
`[Confirmer : aucun outil de mesure d'audience ou de suivi tiers.]`

## 3. Avec qui sont-elles partagées ?

- **Mistral AI** (fonctions d'intelligence artificielle) : le texte nécessaire à la génération de cartes ou d'exercices et à la
  correction de vos réponses ouvertes lui est transmis. `[Préciser les conditions : localisation du traitement, non-utilisation
  pour l'entraînement des modèles, selon le contrat.]`
- **Prestataire d'envoi d'e-mails** (`[nom]`) : e-mails de vérification d'adresse et de réinitialisation de mot de passe.
- **Hébergeur** (`[nom, pays]`) et **stockage de fichiers compatible S3** (`[nom, pays]`) : hébergement de l'API, de la base de
  données et des images importées.
- Les autres membres de vos **groupes classe** voient les contenus que vous y partagez.

Vos données ne sont pas vendues.

## 4. Combien de temps ?

Vos données sont conservées tant que votre compte existe. `[Préciser les durées après suppression, sauvegardes comprises.]`

## 5. Vos droits

Vous pouvez accéder à vos données, les rectifier, les supprimer, vous opposer à leur traitement, demander la limitation ou la
portabilité, et introduire une réclamation auprès de la CNIL (RGPD).

- **Supprimer votre compte** : dans l'application, *Profil → Supprimer mon compte*.
- **Hors de l'application** : `[adresse web ou e-mail de demande de suppression — à fournir aussi à Google Play]`.
- Autres demandes : `[adresse e-mail de contact]`.

## 6. Sécurité

Les échanges avec l'API sont chiffrés (HTTPS). Les mots de passe sont stockés sous forme hachée. Le jeton de connexion est
conservé sur l'appareil, dans l'espace de stockage de l'application, qui n'est pas inclus dans les sauvegardes Android.

## 7. Mineurs

`[À décider : public visé et âge minimum. Pour un compte d'un mineur de moins de 15 ans en France, l'accord d'un parent est requis.]`

## 8. Modifications

Toute modification importante de cette politique sera signalée dans l'application ou par e-mail.
