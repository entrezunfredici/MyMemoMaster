# Audit d'accessibilité RGAA — MyMemoMaster (front)

**Date** : 2026-07-06
**Référentiel** : RGAA 4 (fondé sur WCAG 2.1) — choix justifié dans le dossier B2, section 5.3 : standard officiel français, public cible incluant des établissements scolaires potentiellement soumis à obligation légale.
**Périmètre** : l'intégralité du code front (`my_memo_master_front/src/`, 73 fichiers `.vue`) + `index.html`.

---

## 1. Méthode : trois niveaux d'outillage

| Niveau | Outil | Ce qu'il vérifie | Quand il tourne |
|---|---|---|---|
| Statique | [`scripts/audit-a11y.mjs`](../my_memo_master_front/scripts/audit-a11y.mjs) (développé pour le projet) | Noms accessibles des champs (11.1), `alt` des images (1.1), équivalents clavier des éléments cliquables (7.1), noms des boutons symboles (11.9), langue de la page (8.3), zones `aria-live` (13.x) | À la demande : `node scripts/audit-a11y.mjs` (option `--json` pour la CI) |
| Runtime | axe-core via Vitest ([`test/a11y/axe.test.js`](../my_memo_master_front/test/a11y/axe.test.js)) | Le DOM réellement rendu des composants montés : rôles ARIA, noms accessibles calculés, structure — ce que l'analyse statique ne voit pas | **À chaque push** (suite Vitest en CI) — l'accessibilité est non régressive |
| Manuel | Revue de code + navigation clavier | Motifs justifiés (overlays), cohérence des libellés, parcours réels | Lors de l'audit |

Reproduire l'audit :

```bash
cd my_memo_master_front
node scripts/audit-a11y.mjs        # audit statique
npx vitest run test/a11y/          # audit runtime axe-core
```

## 2. Résultats mesurés — avant / après la campagne du 2026-07-06

Sortie réelle de `scripts/audit-a11y.mjs` sur les 73 fichiers `.vue` :

| Critère RGAA | Avant | Après | Correction appliquée |
|---|---|---|---|
| 11.1 — Champ de formulaire sans nom accessible | **111** | **0** | `aria-label` en français sur chaque `input`/`select`/`textarea` non associé à un `label` (libellé aligné sur le label visible ou le placeholder) ; libellés dynamiques (`:aria-label`) pour les champs générés en boucle (options de QCM, trous de texte) |
| 7.1 — Élément cliquable sans équivalent clavier | **21** → 10 après triage | **0** | 2 conversions sémantiques (lien `<a>` pour TutorialItem, pattern ARIA pour les mois du calendrier) + 10 sites outillés `role="button"`/`tabindex="0"`/`@keydown.enter/.space` (cartes de groupe, accordéons, cellules de calendrier, dropzone) ; 9 sites qualifiés **motifs justifiés** (voir §3) |
| 11.9 — Bouton symbole (×, ✕…) sans nom accessible | **14** | **0** | `aria-label` contextuel (« Fermer », « Supprimer la ressource », « Retirer le membre », « Effacer la recherche »…) |
| 1.1 — Image sans `alt` | 0 | 0 | déjà conforme (audit B2 §5.3) |
| 8.3 — Langue de la page | `fr` | `fr` | corrigé lors de la rédaction du dossier B2 |
| 13.x — Zones `aria-live` | 1 fichier | **2 fichiers** | ajout d'une zone `aria-live="polite"` toujours montée autour du score d'exercice (`ExerciseDetailPage`), en plus du feedback de session de révision (`FlashcardsSessionPage`) ; les toasts `vue-toastification` portent nativement `role="alert"` |

**Total : 135 non-conformités détectées → 0** (audit statique re-exécuté après corrections).

Audit runtime : **4 tests axe-core verts** (ModalComponent ouvert, ButtonComponent, TutorialItem, PasswordStrengthComponent) — exécutés à chaque push par la CI, un ajout de composant non conforme dans ces périmètres casse le build.

## 3. Motifs justifiés (non-conformités apparentes, conformes après analyse)

- **Overlays de modale** (`@click`/`@click.self` sur le fond pour fermer) : la fermeture au clic hors panneau est une redondance de confort ; l'action de fermeture reste accessible au clavier via le bouton « Fermer » (désormais nommé) présent dans chaque panneau. Rendre l'overlay focusable ajouterait une étape de tabulation parasite.
- **`@click.stop` sur les panneaux** : non-action (empêche la propagation), aucun équivalent clavier requis.
- **Wrapper `cursor-text`** (TagSelectorComponent) : le clic délègue le focus à l'input interne, lui-même focusable au clavier.

Ces motifs sont encodés comme exceptions **documentées** dans `scripts/audit-a11y.mjs` — l'outil les re-vérifie à chaque exécution.

## 4. Points conformes confirmés (audit B2, section 5.3)

208 `<button>` natifs, hiérarchie de titres (9 h1 / 51 h2 / 27 h3), modale générique avec `role="dialog"`, `aria-modal`, piège de focus Tab/Shift+Tab et restitution du focus (10 tests dédiés), navigation clavier complète du sélecteur de tags (flèches, Entrée, Échap), `document.title` par page, feedback bonne/mauvaise réponse doublé d'un texte (« Correct »/« Incorrect » + score) et non porté par la seule couleur.

## 5. Limites et travaux restants

| Limite | Raison | Plan |
|---|---|---|
| Contrastes non mesurés | jsdom (environnement de test) ne calcule pas les styles ; la règle `color-contrast` d'axe est désactivée dans les tests | Audit navigateur (Lighthouse ou axe DevTools) sur les pages déployées — à faire sur l'environnement de test |
| Pas de test lecteur d'écran réel | Nécessite NVDA/VoiceOver et un protocole manuel | Session de test manuelle NVDA sur les 3 parcours critiques (inscription, session de révision, création d'exercice) |
| Périmètre axe-core partiel | 4 composants montés isolément ; les pages complètes exigent des mocks lourds | Étendre progressivement (une page par itération), en commençant par les pages de formulaire |
| Focus non piégé dans les modales « artisanales » | Plusieurs pages utilisent un overlay maison au lieu de `ModalComponent` (qui a le focus trap) | Migration progressive vers `ModalComponent` |
