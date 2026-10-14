# Fiche Google Play — MyMemoMaster

> Préparée pour être copiée dans la Play Console. Les textes décrivent uniquement des fonctions présentes dans l'application ;
> à relire et ajuster avant publication. Ce qui reste à faire côté Play Console figure en bas de page.

## Informations générales

| Champ | Valeur |
|-------|--------|
| Nom de l'application (30 car. max) | `MyMemoMaster` |
| Identifiant | `com.mymemomaster.app` |
| Catégorie | Éducation |
| Langue par défaut | Français (France) |
| Adresse e-mail de contact | `support@my-memo-master.com` (adresse d'expédition actuelle de l'API — à confirmer) |
| Site web | `https://app.my-memo-master.com` |
| Application payante / publicités | Gratuite, sans publicité (à confirmer) |

## Description courte (80 caractères max)

```
Cartes mentales, flashcards et exercices pour réviser efficacement.
```

## Description complète (4 000 caractères max)

```
MyMemoMaster est l'outil de révision pensé pour les étudiants : construisez vos cartes mentales, mémorisez avec des flashcards espacées dans le temps, entraînez-vous avec des exercices corrigés et suivez votre progression, au même endroit.

CARTES MENTALES
• Créez des cartes mentales avec des nœuds de texte, de formule ou d'image, reliez-les et regroupez-les par zones.
• Associez un niveau de maîtrise à chaque nœud et liez-le à une flashcard.
• Saisissez des formules mathématiques grâce à l'éditeur de formules intégré.

FLASHCARDS (SYSTÈME DE LEITNER)
• Organisez vos cartes en boîtes : celles que vous maîtrisez reviennent moins souvent, les autres plus souvent.
• Lancez une session de révision, répondez, et obtenez une correction avec un score et la réponse attendue.
• Génération de cartes assistée par intelligence artificielle, à valider avant ajout.

EXERCICES
• Entraînez-vous avec des questions à choix multiples et des questions ouvertes (formules acceptées).
• Retrouvez vos exercices classés par matière.

PLANIFIEZ ET SUIVEZ
• Calendrier de révisions avec rappels, liste de tâches « à faire / aujourd'hui / à venir ».
• Tableau de progression : séances planifiées, régularité, séries de jours consécutifs, badges.

EN CLASSE
• Groupes classe pour les enseignants et les étudiants : séances, ressources partagées, rendus et échéances.

Un compte MyMemoMaster est nécessaire. L'application nécessite une connexion Internet.
```

## Mots-clés / thématiques à privilégier

révision, flashcards, carte mentale, mind map, Leitner, mémorisation, étudiant, exercices, cours, planning de révision.

## Visuels

| Élément | Fichier | Statut |
|---------|---------|--------|
| Icône 512 × 512 | `docs/mobile/store/icone-play-512.png` | prêt |
| Graphique de présentation 1024 × 500 | `docs/mobile/store/graphique-fonctionnalite-1024x500.png` | prêt |
| Captures téléphone (2 à 8, 1080 × 1920) | `docs/mobile/store/captures/` | voir `captures/LISEZMOI.md` |

Les captures sont au format 9:16 : Google refuse un rapport supérieur à 2:1, ce que fait l'écran 1080 × 2400 (2,22:1) de l'émulateur par défaut.

## Réponses probables au formulaire « Sécurité des données »

À valider par vous : ce sont des suggestions déduites du code.

| Donnée | Collectée | Partagée | Remarque |
|--------|-----------|----------|----------|
| Nom, adresse e-mail | Oui | Non | création de compte ; e-mails de vérification / réinitialisation envoyés par le fournisseur SMTP (prestataire technique) |
| Identifiants (mot de passe) | Oui | Non | stocké haché (bcrypt), jamais en clair |
| Contenu créé par l'utilisateur (cartes, exercices, cartes mentales, images) | Oui | Oui (traitement) | textes envoyés à **Mistral AI** pour la génération et la correction assistées |
| Activité dans l'app (séances, progression, temps de consultation) | Oui | Non | statistiques de progression |
| Rappels / événements de calendrier | Oui | Non | |
| Localisation, contacts, photos de l'appareil, identifiants publicitaires | Non | — | l'app ne demande que la permission `INTERNET` |

- Chiffrement en transit : oui (HTTPS).
- Suppression : l'app propose « Supprimer mon compte » (Profil). Google demande aussi une **adresse web** permettant de
  demander la suppression hors de l'app (champ « URL de suppression de compte »).

## Reste à faire côté Play Console (par vous)

1. Créer le compte développeur et l'application (`com.mymemomaster.app`), activer **Play App Signing**.
2. Politique de confidentialité : publier un texte à une URL publique (brouillon : `docs/mobile/POLITIQUE_CONFIDENTIALITE_BROUILLON.md`).
3. Remplir : Sécurité des données, classification du contenu (questionnaire), public cible, application non destinée aux enfants (à décider), déclaration d'accès à l'application si un compte est requis (fournir un compte de test aux relecteurs).
4. Envoyer l'`.aab` signé en **test interne**, valider sur de vrais appareils, puis promouvoir en production.
5. Déployer en prod la configuration CORS (`https://localhost`) avant tout test réel — voir `docs/MOBILE_ANDROID.md`.
