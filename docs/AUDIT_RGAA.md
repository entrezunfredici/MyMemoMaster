# Audit d'accessibilité RGAA — MyMemoMaster (front)

**Date** : 2026-07-06, complété le 2026-08-29
**Référentiel** : RGAA 4 (fondé sur WCAG 2.1) — choix justifié dans le dossier B2, section 5.3 : standard officiel français, public cible incluant des établissements scolaires potentiellement soumis à obligation légale.
**Périmètre** : l'intégralité du code front (`my_memo_master_front/src/`, 79 fichiers `.vue` au 2026-08-29) + `index.html`.

---

## 1. Méthode : quatre niveaux d'outillage

| Niveau | Outil | Ce qu'il vérifie | Quand il tourne |
|---|---|---|---|
| Statique | [`scripts/audit-a11y.mjs`](../my_memo_master_front/scripts/audit-a11y.mjs) (développé pour le projet) | Noms accessibles des champs (11.1), `alt` des images (1.1), équivalents clavier des éléments cliquables (7.1), noms des boutons symboles (11.9), langue de la page (8.3), zones `aria-live` (13.x) | À la demande : `node scripts/audit-a11y.mjs` (option `--json` pour la CI) |
| Runtime (jsdom) | axe-core via Vitest ([`test/a11y/axe.test.js`](../my_memo_master_front/test/a11y/axe.test.js)) | Le DOM réellement rendu de 8 composants montés isolément : rôles ARIA, noms accessibles calculés, structure — ce que l'analyse statique ne voit pas. La règle `color-contrast` y est désactivée : jsdom ne calcule pas les styles | **À chaque push** (suite Vitest en CI) — l'accessibilité est non régressive |
| Navigateur (Chromium) | axe-core via Playwright ([`e2e-a11y/contrast.spec.js`](../my_memo_master_front/e2e-a11y/contrast.spec.js), `npm run test:a11y:contrast`) | **Contraste RGAA 3.2** sur les pages publiques réellement rendues (`vite build` + `vite preview`) — le seul niveau qui calcule vraiment les styles | **À chaque push** (CI, après le build front) |
| Manuel | Revue de code + navigation clavier | Motifs justifiés (overlays), cohérence des libellés, parcours réels | Lors de l'audit |

Reproduire l'audit :

```bash
cd my_memo_master_front
node scripts/audit-a11y.mjs           # audit statique
npx vitest run test/a11y/             # audit runtime axe-core (jsdom)
npm run build && npm run test:a11y:contrast   # audit de contraste (Chromium)
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

## 2 bis. Campagne du 2026-08-29 — contraste navigateur et extension axe-core

Suite au constat du compte rendu de pilotage (`docs/COMPTE_RENDU_METRIQUES.md` §7.2) : le « 0 non-conformité » ne portait que sur 5 critères outillés, avec trois angles morts explicitement documentés. Deux ont été traités.

**Contraste (RGAA 3.2) — nouvel outillage `e2e-a11y/contrast.spec.js`.** Premier passage sur les 8 pages publiques sans appel API au montage : **1 non-conformité réelle trouvée** — `/forgot-password`.

- **Cause** : `text-white` ne génère aucune classe CSS dans ce build. `tailwind.config.js` définit `theme.colors` (et non `theme.extend.colors`) : la palette Tailwind par défaut (`white`, `black`, `gray-*`…) est entièrement remplacée par la palette du projet, qui ne contient pas ces noms. Les pages `login`/`register` contournaient déjà le problème via une classe CSS brute `.valider { color: white }` (`assets/auth-form.css`) — absente sur `/forgot-password` et `/reset-password`, qui utilisent le même bouton bleu (`#1E3BA1`) sans elle. Résultat : texte noir sur fond bleu, ratio 2,2:1 au lieu des 4,5:1 requis.
- **Correctif** : classe `valider` ajoutée aux deux boutons concernés (`ForgotPasswordPage.vue`, `ResetPasswordPage.vue`) — réutilise le contournement existant plutôt que de toucher `tailwind.config.js` (changement à fort rayon d'impact, hors périmètre de cette campagne — voir dette ci-dessous).
- **Vérifié** : `npm run build && npm run test:a11y:contrast` → 8/8 verts.

**Couverture axe-core (jsdom) — 4 composants ajoutés** à `test/a11y/axe.test.js` (DropdownComponent, ToggleButton, PillComponent, TagSelectorComponent), portant le total à 8. **2 non-conformités réelles trouvées** :

- `ToggleButton.vue` — le `<label>` n'entoure que le curseur visuel (`span.slider`), sans texte : l'input `checkbox` n'avait aucun nom accessible (RGAA 11.1). Corrigé par une prop `ariaLabel` (désormais requise) ; les 8 usages dans `SettingsPage.vue` passent un libellé contextuel en français.
- `TagSelectorComponent.vue` — le bouton flèche d'ouverture/fermeture du dropdown (icône SVG seule, `tabindex="-1"`) n'avait aucun nom accessible (RGAA 11.9). Corrigé par un `aria-label` dynamique (« Ouvrir »/« Fermer la liste des tags »).

Ces deux non-conformités existaient **avant** cette campagne mais n'étaient couvertes par aucun des 3 niveaux d'outillage existants (l'audit statique ne détecte pas un `<label>` sans texte, ni un bouton sans `aria-label` dont l'icône est un SVG inline) — elles ont été révélées par l'extension de la couverture axe-core, pas par une régression.

**Vérifié** : `npx vitest run` → 689/689 tests front verts (aucune régression), `npm run lint` → 0 erreur.

**Angle mort non traité** : le test lecteur d'écran réel (NVDA/VoiceOver) reste manuel — aucun outil de ce projet ne peut s'y substituer.

---

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
| Contrastes — **outillé depuis le 2026-08-29**, mais limité aux 8 pages publiques sans appel API au montage | `e2e-a11y/contrast.spec.js` a besoin d'un serveur de preview statique, sans API derrière — les pages privées (nécessitent une session) et `/register`/`/verify-email` (appel API au montage/`beforeEnter`) restent hors périmètre | Étendre avec un mock d'API (ou un compte de test seedé) pour couvrir les pages privées et les 2 pages exclues |
| Pas de test lecteur d'écran réel | Nécessite NVDA/VoiceOver et un protocole manuel — aucun outil du projet ne s'y substitue | Session de test manuelle NVDA sur les 3 parcours critiques (inscription, session de révision, création d'exercice) |
| Périmètre axe-core (jsdom) partiel | 8 composants montés isolément (4 en 2026-07-06 + 4 en 2026-08-29) sur un total de ~40 ; les pages complètes exigent des mocks lourds | Étendre progressivement (une page/un composant par itération), en priorité les champs de formulaire et boutons icône-seule |
| Focus non piégé dans les modales « artisanales » | Plusieurs pages utilisent un overlay maison au lieu de `ModalComponent` (qui a le focus trap) — candidats repérés : `AdminPage.vue`, `CalendarPage.vue`, `ClassroomPlateformeView.vue` | Migration progressive vers `ModalComponent` |
| **Dette découverte le 2026-08-29** : `tailwind.config.js` définit `theme.colors` (remplace toute la palette par défaut) plutôt que `theme.extend.colors` — `white`/`black`/`gray-*`/etc. ne génèrent aucune classe utilitaire ; un seul cas (`safelist: ['text-white']`) est contourné, et ce contournement lui-même ne fonctionnait pas dans le build vérifié | Changement structurant, à fort rayon d'impact (peut modifier le rendu de nombreuses pages qui utilisent ces classes sans le savoir) — volontairement hors périmètre de cette campagne, corrigée au cas par cas (`/forgot-password`, `/reset-password`) | Auditer l'usage des couleurs par défaut Tailwind dans tout `src/`, puis basculer `theme.colors` → `theme.extend.colors` en un lot dédié, avec revue visuelle complète |
