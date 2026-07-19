# Prototype interactif — MyMemoMaster

**Fichier** : `MyMemoMaster - Standalone.html` — prototype navigable autonome (HTML/CSS/JS inline, aucune dépendance réseau).
**Origine** : maquettage réalisé avec l'outil de design de Claude (Anthropic), puis exporté en HTML et versionné ici. Le prototype précède l'implémentation Vue : il fixe l'identité visuelle (bleu `#1E3BA1`, sidebar d'icônes, cartes), la navigation et les parcours des fonctionnalités principales.

## Ouvrir le prototype

Le bundle se dépaquette en JavaScript et se relit lui-même par `fetch` — bloqué par les navigateurs en `file://`. **Le servir en HTTP local** :

```bash
cd docs/prototype
npx http-server -p 8123
# puis ouvrir http://127.0.0.1:8123/MyMemoMaster%20-%20Standalone.html
```

Connexion : n'importe quel email/mot de passe non vides (validation simulée).

## Écrans couverts (15)

Connexion · Inscription · Accueil (alertes & suggestions) · Tutoriels · Mindmaps · Flashcards (systèmes de Leitner) · Gestion des cartes/boîtes · Session de révision (répartition par boîte) · Exercices · Détail d'exercice (question ouverte + QCM) · Interpréteur de formules (éditeur + palette à onglets Caractères/Formules/Opérateurs/Matrices + aperçu du rendu + vérification d'homogénéité) · Classe · Calendrier · To-do · Ma Progression (KPI) · Profil · Réglages.

## Captures (`captures/`)

Les PNG de `captures/` sont générés automatiquement depuis le prototype par script d'automatisation navigateur (Chromium headless via CDP, 1440×900) — elles sont donc reproductibles et fidèles au fichier versionné. Elles servent de preuves dans le dossier Bloc 2 (section 3.1).
