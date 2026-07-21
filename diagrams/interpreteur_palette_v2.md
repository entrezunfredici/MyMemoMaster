# Interpréteur de formules V2 — Éditeur WYSIWYG, palette à sections, stockage

> **Statut** : implémenté (Lots 0-5 livrés le 2026-07-19 — voir DECISIONS.md même date et CHANGELOG_AGENT).
> Écarts vs conception : migration de données abandonnée au profit de la normalisation des deux côtés
> à la comparaison (décision Lots 4-5) ; équivalences algébriques (commutativité, a/b ≡ a·b⁻¹, termes
> semblables) ajoutées à la correction `exact` (voir DECISIONS 2026-07-19 « équivalences algébriques »).
> Commandes de matrice +C/+L réécrites en manipulation de chaîne LaTeX déterministe — l'API de
> commande MathLive s'est révélée peu fiable et pouvait corrompre le champ hors du cas « matrice
> fraîchement insérée » (voir DECISIONS 2026-07-19 « commandes de matrice »). Glyphes de la planche
> formules résolus (2026-07-19) : les deux boutons « T » et la flèche blanche étaient des erreurs de
> planche, retirés ; le glyphe « 𝔻 » devient une section « Lettres fraktur » complète (`\mathfrak{}`).
> **Source** : maquettes de palette fournies par l'utilisateur le 2026-07-19 (8 planches de boutons, listes non exhaustives) + échanges de conception.
> **Prérequis de lecture** : décisions DECISIONS.md du 2026-07-19 (KaTeX seul en rendu), 2026-07-14 (convention `$…$`, syntaxe canonique unique), 2026-07-18 (correction sémantique : stratégie `exact` sur formules).

---

## 1. Vision et périmètre

Objectif : un système de formules « aussi complet que Word, mais simple à utiliser ».

Le modèle d'édition retenu (choix utilisateur, 2026-07-19) :

- **La zone rendue devient l'éditeur principal** (WYSIWYG) : l'utilisateur écrit *dans* la formule rendue, se déplace aux **flèches du clavier** entre les éléments (entrer/sortir d'une fraction, d'un exposant, d'une racine) et **dans les cellules des matrices**.
- **La zone brute devient le mode expert** : on peut y taper la formule textuellement (LaTeX ou raccourcis historiques `over`/`sqrt`), elle alimente l'éditeur rendu.
- **La palette passe en sections à onglets** (caractères, formules, opérateurs, matrices…) au lieu de la liste plate actuelle.

**IN (V2)** : éditeur WYSIWYG, palette à sections (inventaire §4), placeholders `□` navigables, matrices éditables (+ligne/+colonne), stockage canonique (§5), adaptation de la correction (§6), accessibilité (§8).
**OUT (inchangé)** : CAS symbolique (résolution/simplification), reconnaissance manuscrite.

---

## 2. Modèle d'édition — maquette

```
┌──────────────────────────────────────────────────────────────┐
│  ZONE RENDUE (éditeur principal — WYSIWYG)                   │
│                                                              │
│                    1                                         │
│           E   =   ───   m  v▌²                               │
│                    2                                         │
│                                                              │
│   ▌ = curseur logique. ←/→ : élément précédent/suivant       │
│   ↑/↓ : numérateur↔dénominateur, exposant↔base,              │
│         ligne de matrice précédente/suivante                 │
│   Tab : placeholder □ suivant                                │
├──────────────────────────────────────────────────────────────┤
│  ZONE BRUTE (mode expert — texte)                            │
│  E = \frac{1}{2} m v^2                                       │
│  (accepte aussi les raccourcis V1 : over(1,2), sqrt(x), ^)   │
├──────────────────────────────────────────────────────────────┤
│  [ carac ] [ form ] [ opérateurs ] [ mat ] [ … ]   ← onglets │
│  ┌────┬────┬────┬────┬────┬────┬────┬────┐                   │
│  │ α  │ β  │ γ  │ δ  │ ε  │ ζ  │ η  │ θ  │  grille de la     │
│  ├────┼────┼────┼────┼────┼────┼────┼────┤  section active   │
│  │ ι  │ κ  │ λ  │ μ  │ ν  │ ξ  │ ο  │ π  │  (3 rangées × 8)  │
│  └────┴────┴────┴────┴────┴────┴────┴────┘                   │
└──────────────────────────────────────────────────────────────┘
```

Principe des **placeholders** (repris des maquettes : `ln(□)`, `(□)`, `√□`) : un bouton insère un
gabarit avec des trous ; le curseur saute dans le premier trou, Tab passe au suivant. C'est ce
mécanisme (et non le nombre de boutons) qui rend l'éditeur « simple comme Word ».

---

## 3. Choix de librairie d'édition

Un rendu KaTeX est du HTML figé : l'édition dans le rendu exige un modèle structurel de la
formule (arbre + curseur logique + re-rendu à chaque frappe). Trois options :

| Critère | **MathLive** (recommandé) | MathQuill | From scratch sur KaTeX |
|---|---|---|---|
| Édition dans le rendu, flèches | ✅ natif (`<math-field>`) | ✅ natif | ❌ des mois de dev |
| Matrices (navigation cellules, +ligne/+col) | ✅ natif (API addRow/addColumn) | ⚠️ forks communautaires | ❌ |
| Placeholders navigables | ✅ (`\placeholder{}`) | ⚠️ partiel | ❌ |
| Clavier virtuel personnalisable en sections | ✅ natif (layers JSON) — correspond exactement aux maquettes | ❌ à construire | ❌ à construire |
| Entrée/sortie **LaTeX** | ✅ bidirectionnel | ✅ (sous-ensemble plus étroit) | — |
| Accessibilité (ARIA, lecture vocale des formules) | ✅ sérieuse (speakable math) | ⚠️ minimale | ❌ à construire |
| Licence | MIT | MPL-2.0 | — |
| Maintenance | Active | Faible | — |
| Web component framework-agnostic | ✅ (s'intègre à Vue 3) | jQuery historique | — |

**Recommandation : MathLive.** Il couvre trait pour trait le modèle cible (zone rendue éditable,
flèches, matrices, palette en sections, placeholders) et apporte la lecture vocale des formules
(au-delà du MathML statique déjà émis par KaTeX). À valider au moment de l'implémentation :
poids réel du bundle et des fontes (chargement **lazy, uniquement à l'ouverture de l'éditeur**),
comportement mobile.

**KaTeX reste le moteur d'affichage** en lecture seule (FormulaText, listes de cartes, sessions,
mindmaps) : léger, synchrone, déjà en place. MathLive n'est chargé que dans l'éditeur.
⚠️ Nouvelle dépendance : à faire approuver et ajouter à `CONVENTIONS.md` avant implémentation.

---

## 4. Palette — inventaire des sections et boutons

Inventaire issu des 8 planches (listes **non exhaustives** — les grilles gardent des emplacements
libres pour extensions). Chaque bouton insère le LaTeX indiqué ; `□` = `\placeholder{}`.
Chaque bouton porte un `aria-label` français (colonne « Libellé a11y », obligatoire : un lecteur
d'écran ne peut rien annoncer de « ∯ »).

### Onglet 1 — `carac` (caractères)

**Bloc grec minuscules** (planche 2) : α β γ δ ε ζ η θ ι κ λ μ ν ξ ο π ρ σ τ υ φ χ ψ ω
→ `\alpha` … `\omega`. Libellés a11y : « alpha », « bêta », …

**Bloc grec majuscules** (planche 3) : Α Β Γ Δ Ε Ζ Η Θ Ι Κ Λ Μ Ν Ξ Ο Π Ρ Σ Τ Υ Φ Χ Ψ Ω
→ lettres latines pour les formes identiques (A, B, E…), `\Gamma \Delta \Theta \Lambda \Xi \Pi \Sigma \Upsilon \Phi \Psi \Omega` pour les formes propres.

**Bloc chiffres & ensembles** (planche 4) :

| Bouton | LaTeX | Libellé a11y |
|---|---|---|
| 0 … 9 | `0`…`9` | « zéro » … « neuf » |
| ∂ | `\partial` | « d rond (dérivée partielle) » |
| , | `,` | « virgule » |
| ∅ | `\varnothing` | « ensemble vide » |
| ℕ ℤ ℚ ℝ ℂ 𝕂 | `\mathbb{N}` `\mathbb{Z}` `\mathbb{Q}` `\mathbb{R}` `\mathbb{C}` `\mathbb{K}` | « ensemble des entiers naturels », … , « corps K » |
| ∞ | `\infty` | « infini » |

### Onglet 2 — `form` (formules / structures)

Planche 5 :

| Bouton | LaTeX | Libellé a11y |
|---|---|---|
| ẋ | `\dot{□}` | « dérivée temporelle (point) » |
| ẍ | `\ddot{□}` | « dérivée seconde (deux points) » |
| x̄ | `\overline{□}` | « barre (moyenne, conjugué) » |
| x⃗ | `\vec{□}` (ou `\overrightarrow{□}` si plusieurs lettres) | « vecteur » |
| x̃ | `\tilde{□}` | « tilde » |
| xʸ | `□^{□}` | « exposant » |
| x_y | `□_{□}` | « indice » |
| xʸ_z | `□_{□}^{□}` | « indice et exposant » |
| fraction | `\frac{□}{□}` | « fraction » |
| √ | `\sqrt{□}` | « racine carrée » |
| ⌊□⌋ | `\lfloor □ \rfloor` | « partie entière » |
| ln(□) | `\ln(□)` | « logarithme népérien » |
| cos(□) / sin(□) / tan(□) | `\cos(□)` `\sin(□)` `\tan(□)` | « cosinus » / « sinus » / « tangente » |
| T (texte) | `\text{□}` | « texte droit dans la formule » |
| (□) | `\left( □ \right)` | « parenthèses ajustables » |
| [□] | `\left[ □ \right]` | « crochets » |
| \|□\| | `\left\| □ \right\|` | « valeur absolue » |
| ‖X‖ | `\left\lVert □ \right\rVert` | « norme » |
| {□} | `\left\{ □ \right\}` | « accolades » |

À confirmer (glyphes ambigus sur la planche) : le 2ᵉ bouton « T » (variante `\mathrm` ? taille ?),
le « 𝔻 » stylisé (opérateur différentiel `\mathrm{d}` ? ensemble `\mathbb{D}` ?), la flèche
blanche « → » (symbole `\to` ? ou bouton d'action « insérer » ?).

### Onglet 3 — `opérateurs`

> Caractères confirmés par l'utilisateur dans `operateurs.md` (racine du dépôt, 2026-07-19) —
> liste de référence : `= ≠ ≃ ≈ ≤ ≥ ⟺ ⇒ ⨁ ⊛ + - ± / * ∘ ∀ ∃ ∄ ∋ ∈ ∉ ∧ ⋀ ∪ ∩ ⊂ ⊃ ∝ ⋌ ∠ ∡ ⊥ ∫ ∮ ∯ ← → ⟼ ↑ ↔ ↗ ↖ ∅ ℕ ℤ ℚ ℝ ℂ ∞`
> (les ensembles ∅ℕℤℚℝℂ∞ sont déjà couverts par l'onglet `carac`, §4.1).
> Miroirs ajoutés pour la symétrie (validé 2026-07-19) : `∨ ⋁ ↓ ↘ ↙`.

| Bloc | Boutons → LaTeX |
|---|---|
| Relations | `=` · ≠ `\neq` · ≃ `\simeq` · ≈ `\approx` · ≤ `\leq` · ≥ `\geq` · ⟺ `\iff` · ⇒ `\implies` |
| Opérations | ⨁ `\oplus` (forme n-aire `\bigoplus` en variante) · ⊛ `\circledast` · `+` · `-` · ± `\pm` · `/` · `*` `\cdot` · ∘ `\circ` |
| Logique | ∀ `\forall` · ∃ `\exists` · ∄ `\nexists` · ∋ `\ni` · ∈ `\in` · ∉ `\notin` · ∧ `\land` · ⋀ `\bigwedge` · ∨ `\lor` · ⋁ `\bigvee` |
| Ensembles | ∪ `\cup` · ∩ `\cap` · ⊂ `\subset` · ⊃ `\supset` · ∝ `\propto` · ⋋ `\leftthreetimes` · ⋌ `\rightthreetimes` |
| Géométrie | ∠ `\angle` · ∡ `\measuredangle` · ⊥ `\perp` |
| Flèches | ← `\leftarrow` · → `\rightarrow` · ⟼ `\longmapsto` (variante courte `\mapsto`) · ↑ `\uparrow` · ↓ `\downarrow` · ↔ `\leftrightarrow` · ↗ `\nearrow` · ↖ `\nwarrow` · ↘ `\searrow` · ↙ `\swarrow` |

Répartition planches 6+7 sur un seul onglet, ou « ensembles & flèches » en 5ᵉ onglet si trop
dense — à trancher à l'implémentation (question §11.2).

### Intégrales — gabarits à placeholders

Les intégrales ne sont **pas de simples symboles** : le bouton insère un gabarit complet
(bornes, intégrande, différentielle) dont les trous se parcourent au Tab — c'est le « dispositif
intégrales » demandé.

| Bouton | Gabarit LaTeX inséré | Parcours Tab | Libellé a11y |
|---|---|---|---|
| ∫ | `\int □ \, \mathrm{d}□` | intégrande → variable | « intégrale indéfinie » |
| ∫ᵃᵇ | `\int_{□}^{□} □ \, \mathrm{d}□` | borne inf → borne sup → intégrande → variable | « intégrale définie (bornes) » |
| ∬ | `\iint_{□} □ \, \mathrm{d}□` | domaine → intégrande → variable | « intégrale double » |
| ∭ | `\iiint_{□} □ \, \mathrm{d}□` | domaine → intégrande → variable | « intégrale triple » |
| ∮ | `\oint_{□} □ \, \mathrm{d}□` | contour → intégrande → variable | « intégrale curviligne (contour fermé) » |
| ∯ | `\oiint_{□} □ \, \mathrm{d}□` | surface → intégrande → variable | « intégrale de surface fermée » |

Notes : la différentielle est en `\mathrm{d}` (d droit, convention physique) ; les symboles nus
`\int`/`\oint`/`\oiint` restent accessibles en tapant le LaTeX en zone brute pour les usages
libres. `\oiint` requiert le support étendu du moteur (OK KaTeX ; à vérifier dans MathLive au
Lot 0, sinon fallback `\unicode{x222F}`).

### Onglet 4 — `mat` (matrices)

Planche 8 :

| Bouton | Effet | LaTeX |
|---|---|---|
| (□) | matrice 1×1 parenthésée (départ) | `\begin{pmatrix} □ \end{pmatrix}` |
| (▦ | matrice parenthésée pré-remplie (ex. 3×3) | `pmatrix` 3×3 de `□` |
| \|□\| / \|▦ | déterminant | `\begin{vmatrix} … \end{vmatrix}` |
| [□] / [▦ | matrice crochets | `\begin{bmatrix} … \end{bmatrix}` |
| {□} / {▦ | système / disjonction de cas | `\begin{cases} … \end{cases}` |
| ▦ (nu) | tableau sans délimiteur | `\begin{matrix} … \end{matrix}` |
| +1C / +2C / +3C | ajoute 1/2/3 **colonnes** à la matrice sous le curseur | API MathLive `addColumnAfter` (×n) |
| +1L / +2L / +3L | ajoute 1/2/3 **lignes** | API MathLive `addRowAfter` (×n) |

Comportement : les boutons +C/+L ne sont **actifs que si le curseur est dans une matrice**
(sinon désactivés + `aria-disabled`). ↑/↓/←/→ naviguent de cellule en cellule ; Tab passe à la
cellule suivante (comportement natif MathLive).

---

## 5. Stockage — décision recommandée

**Le LaTeX devient la représentation canonique des formules, stockée en texte dans les
délimiteurs `$…$` existants. Pas de passage au JSON.**

Justification :

1. **MathLive parle LaTeX nativement** (entrée et sortie). Le round-trip éditeur↔stockage est
   exact, sans conversion intermédiaire.
2. **La syntaxe raccourcie V1 ne passe pas à l'échelle** de la palette : chaque nouveau symbole
   (∮, ℝ, ẋ, matrices…) exigerait d'inventer un raccourci + sa conversion aller (`toLatex`) +
   sa conversion **retour** (inexistante aujourd'hui). En LaTeX canonique, le retour est gratuit.
3. **Le conteneur texte reste inchangé** : les champs question/réponse restent du texte mixte
   `prose + $formule$` — aucun changement de schéma BDD, de validators ni d'API ;
   `FormulaText`/`renderInlineMath` continuent de découper sur `$…$`. Le JSON n'apporterait
   rien : MathLive restitue la structure depuis le LaTeX seul (le JSON deviendrait un format
   propriétaire de plus à maintenir et à migrer).
4. **Rétrocompatibilité** : `toLatex()` (front, JS pur) convertit déjà raccourcis → LaTeX,
   et a été rendu idempotent sur du LaTeX (tests `toLatex(latex) === latex`).
   > **Mise à jour [2026-07-19]** : la migration one-shot initialement envisagée ici est
   > **abandonnée** — la correction normalise désormais les **deux côtés** vers une forme
   > canonique commune à la comparaison (`normalizeSymbolic` étendu, voir DECISIONS
   > « Lots 4-5 »), ce qui rend le corpus mixte inoffensif sans réécriture destructive des
   > données. À réévaluer seulement si un autre consommateur exige un corpus uniforme.
5. **La zone brute (mode expert) affiche et accepte le LaTeX** ; elle accepte aussi les
   raccourcis V1 en saisie (convertis à la volée) — la connaissance existante des utilisateurs
   n'est pas perdue. Synchronisation : brute → rendue à la validation/blur ; rendue → brute en
   continu (sortie LaTeX de MathLive).

---

## 6. Adaptation de la correction (proximité sémantique)

État actuel (décisions 2026-07-18) : les réponses-formules passent par la stratégie `exact` —
`normalizeSymbolic` (casse, espaces, `$…$`, `\cdot`/`×`/`⋅`/`·` → `*`, `÷` → `/`) puis égalité
stricte, score 1. La prose passe par les embeddings (inchangé ici).

Deux LaTeX différents peuvent noter la même formule : l'étape `exact` doit donc normaliser le
LaTeX avant comparaison. Extension de `normalizeSymbolic` (ordre d'application) :

1. Retrait des éléments purement présentationnels : `\left`/`\right`, `\,` `\;` `\!` (espaces),
   `\displaystyle`, accolades redondantes (`x^{2}` ≡ `x^2` → forme accolée systématique).
2. Aliases vers une forme unique : `\frac`/`\tfrac`/`\dfrac` → `\frac` ; `\cdot`/`\times` → `*` ;
   `\leq`/`\le` → `\leq` (idem `\geq`, `\neq`) ; `\lVert…\rVert`/`\|…\|` → forme unique ;
   `pmatrix`/`bmatrix`… conservés distincts (des délimiteurs différents sont sémantiquement
   différents pour un déterminant vs une matrice).
3. Réutilisation des règles V1 existantes (elles s'appliquent au LaTeX tel quel).
4. Le **court-circuit symbolique** (détection qu'une réponse est une formule) reconnaît en plus
   les marqueurs LaTeX (`\`, `^{`, `_{`, environnements) — aujourd'hui il se déclenche sur
   `$…$` et les opérateurs.

> **Mise à jour [2026-07-19]** : la limite ci-dessous est **partiellement comblée**. Un second
> mécanisme, `algebraicallyEqual` (`helpers/algebraicEquivalence.js`), complète `normalizeSymbolic`
> dans le court-circuit `exact` : il parse chaque côté en arbre (AST), le canonicalise (fractions
> ramenées à une puissance inverse, commutativité de `+`/`*`, combinaison de termes/facteurs
> semblables, racines en exposant, équations aux côtés symétriques) et compare les deux arbres.
> Reconnaît désormais `a/b` ≡ `a·b⁻¹`, `a+b` ≡ `b+a`, `x+x` ≡ `2x`, `sqrt(x)` ≡ `x^(1/2)`,
> `U=RI` ≡ `RI=U`. **Reste hors périmètre** (assumé, ce n'est pas un CAS — pas de résolution ni de
> simplification) : la distributivité/expansion (`2*(a+b)` ≠ `2a+2b`) et les inéquations. Voir
> DECISIONS.md 2026-07-19 « équivalences algébriques » et `helpers/algebraicEquivalence.js` (tests :
> `test/helpers/algebraicEquivalence.test.js`).

**Limite assumée (dette résiduelle)** : la comparaison par forme canonique ne fait pas de
distributivité/expansion de produits — une équivalence qui nécessiterait de développer
`2*(a+b)` en `2a+2b` n'est pas reconnue. Si ce besoin apparaît en usage réel, c'est un chantier
séparé (expansion contrôlée dans `canon`), à ne pas confondre avec un solveur/CAS complet
(explicitement hors périmètre du projet). En attendant, la parade existante reste valable :
l'auteur fournit plusieurs formulations acceptées (`accepted_answers` / multi-Response,
décision 2026-07-18).

---

## 7. Points d'intégration front

| Contexte actuel | Devenir |
|---|---|
| `Interpreter.vue` (palette plate + champ + aperçu) | Devient l'éditeur V2 : `<math-field>` (zone rendue) + zone brute repliable + palette à onglets |
| `FormulaHelperComponent` (bouton ƒ + modale) | Inchangé dans son rôle ; la modale héberge l'éditeur V2 ; l'insertion produit `$latex$` |
| `FormulaText` / `renderInlineMath` (affichage) | Inchangés — KaTeX en lecture seule (léger, synchrone, MathML déjà émis) |
| Nœuds formule mindmap | Stockent du LaTeX après migration ; rendu KaTeX inchangé |
| `interpreter.js` `toLatex` | Conservé : conversion des raccourcis V1 en saisie + moteur de la migration ; ne grossit plus avec la palette |
| Vérificateur d'homogénéité (`units.js`) | À brancher sur le LaTeX (annotations `Var[unité]` à conserver — syntaxe d'annotation compatible zone brute ; représentation côté WYSIWYG à concevoir au lot correspondant) |

---

## 8. Accessibilité (RGAA)

- Chaque bouton de palette : `aria-label` français (colonnes ci-dessus), focus visible, navigation
  clavier complète (onglets = pattern `tablist`/`tab`/`tabpanel`, flèches entre boutons d'une grille).
- Boutons contextuels (+1C/+1L) désactivés hors matrice : `aria-disabled` + raison au survol/focus.
- MathLive : activer la lecture vocale des formules (annonce de la structure pendant la navigation)
  — c'est un gain net par rapport au MathML statique, qui reste servi par KaTeX sur tous les
  affichages en lecture seule (acquis du 2026-07-19).
- Thème sombre des maquettes : vérifier les contrastes (symboles bleus sur noir des planches 5-8
  ≈ #2563EB sur #0a0a0a — à mesurer, viser ≥ 4.5:1).

---

## 9. Cas limites et risques

- **Poids MathLive** : chargé uniquement à l'ouverture de l'éditeur (import dynamique), jamais
  sur les pages d'affichage. Mesurer l'impact réel au benchmark d'implémentation.
- **Mobile** : MathLive gère le tactile, mais la palette 8 colonnes des maquettes devra passer
  en grille adaptative (les écrans du prototype sont déjà responsive < 900 px).
- **Copier-coller** : coller du LaTeX brut dans la zone rendue doit fonctionner (MathLive le
  gère) ; coller une formule V1 (`over(1,2)`) dans la zone brute doit être converti.
- **Contenu historique non migré** : tant que la migration n'a pas tourné, `toLatex` reste dans
  la chaîne de rendu — tests d'idempotence obligatoires pour qu'il ne corrompe pas du LaTeX.
- **Correction** : pendant la transition, une réponse attendue stockée en V1 et une réponse
  étudiante saisie en LaTeX doivent matcher → normaliser **les deux côtés** vers LaTeX dans
  `normalizeSymbolic` (appliquer `toLatex` côté serveur ou pré-normaliser à la migration).

---

## 10. Plan de mise en œuvre proposé (lots)

1. **Lot 0 — Benchmark d'entrée** : POC MathLive dans une branche (édition, flèches, matrice,
   clavier custom 1 section, poids mesuré, mobile). Décision formelle → DECISIONS.md +
   CONVENTIONS.md (dépendance).
2. **Lot 1 — Éditeur** : `<math-field>` dans `Interpreter.vue`, zone brute synchronisée,
   palette onglets `carac` + `opérateurs` (symboles simples, sans placeholder).
3. **Lot 2 — Structures** : onglet `form` complet (placeholders, Tab), délimiteurs ajustables.
4. **Lot 3 — Matrices** : onglet `mat`, boutons contextuels +C/+L, navigation cellules.
5. **Lot 4 — Stockage & correction** : bascule LaTeX canonique, script de migration,
   extension `normalizeSymbolic` + tests de calibration en réel (comme le 2026-07-18).
6. **Lot 5 — Transverse** : homogénéité des unités côté V2, a11y complète (tablist, lecture
   vocale), mise à jour du prototype et des captures.

Chaque lot se termine par : tests (front et/ou API), entrée CHANGELOG_AGENT, décisions actées
dans DECISIONS.md.

---

## 11. Questions ouvertes

1. ~~Glyphes à confirmer (planche 5) : 2ᵉ bouton « T », « 𝔻 » stylisé, flèche blanche « → ».~~
   **Résolu 2026-07-19** : les deux boutons « T » (`\text{}`) et la flèche blanche étaient des
   erreurs de planche sans signification — retirés de `palette.js`. Le glyphe « 𝔻 » devient une
   section complète « Lettres fraktur » (`\mathfrak{A}`…`\mathfrak{Z}`, `\mathfrak{a}`…`\mathfrak{z}`,
   labels en lettres latines simples comme pour `GREEK_UPPER`) ajoutée à l'onglet `carac`, « au cas
   où » (idéaux, algèbres de Lie…) — pas de cas d'usage identifié dans le projet à ce jour.
2. L'onglet `opérateurs` regroupe-t-il les planches 6 **et** 7, ou « ensembles & flèches »
   devient-il un 5ᵉ onglet ? (Les onglets vides des maquettes suggèrent de la place.)
3. La zone brute est-elle visible par défaut ou repliée (mode expert à déplier) ?
4. Faut-il un mode « historique » affichant les raccourcis V1 dans la zone brute (conversion
   retour LaTeX → raccourcis, coûteuse) ? Recommandation : non — LaTeX seul en sortie.
5. ~~Prévoir ∨/⋁ et ↘/↙ en miroir ?~~ **Résolu 2026-07-19** : validé, intégrés aux blocs
   Logique et Flèches (§4.3).
6. ~~Doublon ℝ vs 𝕂 dans `operateurs.md` ?~~ **Résolu 2026-07-19** : doublon corrigé par
   l'utilisateur ; 𝕂 (`\mathbb{K}`) maintenu conformément à la planche 4.
