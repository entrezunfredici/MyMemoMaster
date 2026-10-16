// Jeu de cas du banc de correction (scripts/quality-check-grading.js). Questions et références
// inspirées des cours d'exemple (cours_exemples/ : Thermodynamique, statique des fluides). Chaque
// réponse d'étudiant est volontairement plus ou moins précise ; `min`/`max` encadrent la note
// attendue sur la grille (0, 0.2 … 1). Correct = note >= 0.8.
//   OK      : min 0.8   (bonne réponse, y compris synonyme, sous-ensemble suffisant, forme différente)
//   PARTIEL : min 0.2, max 0.6
//   FAUX    : max 0.2
const OK = { min: 0.8, max: 1 }
const PARTIEL = { min: 0.2, max: 0.6 }
const FAUX = { min: 0, max: 0.2 }

module.exports = [
  {
    question: "Quelles sont les principales causes d'irréversibilité d'une transformation ?",
    refs: [
      "Les inhomogénéités (température, concentration) et les frottements sont des causes d'irréversibilité.",
      "Les principales causes d'irréversibilité sont les inhomogénéités dans le système (concentration, température) et les frottements.",
      "L'irréversibilité est due à des inhomogénéités ou à des frottements dans le système."
    ],
    answers: [
      { text: 'les frottements mécaniques, les transferts thermiques, les transferts de matière, les réactions chimiques', ...OK, note: 'cas réel : transferts = inhomogénéités' },
      { text: 'les frottements et les inhomogénéités de température ou de concentration', ...OK },
      { text: 'frotements et inhomogénitées', ...OK, note: 'orthographe' },
      { text: 'les frottements', min: 0.6, max: 1, note: 'la 3e référence est un « ou », les deux autres un « et » : 0.6 à 1 toléré' },
      { text: 'les gradients de température et de concentration', ...OK, note: 'gradient = inhomogénéité' },
      { text: "les échanges de chaleur entre deux corps à des températures différentes", ...PARTIEL, note: "exemple d'inhomogénéité, sans nommer la cause générale" },
      { text: "l'entropie", ...FAUX, note: 'notion voisine, pas une cause' },
      { text: 'la conservation de la masse', ...FAUX }
    ]
  },
  {
    question: 'Quelle est la relation de Mayer pour un gaz parfait ?',
    refs: [
      "La relation de Mayer pour un gaz parfait s'écrit Cp = Cv + R, où Cp est la capacité thermique à pression constante, Cv la capacité thermique à volume constant et R la constante des gaz parfaits.",
      'La relation de Mayer stipule que Cp - Cv = R pour un gaz parfait.'
    ],
    answers: [
      { text: 'Cp - Cv = R', ...OK },
      { text: 'Cp = Cv + R', ...OK },
      { text: 'La différence entre la capacité thermique à pression constante et celle à volume constant vaut R', ...OK },
      { text: 'Cp - Cv = nR', ...OK, note: 'forme extensive, équivalente' },
      { text: 'Cv - Cv = nR', ...FAUX, note: 'cas réel : le P manque, la formule est absurde' },
      { text: 'Cv = Cp + R', ...FAUX, note: 'inversion' },
      { text: 'Cp / Cv = R', ...FAUX },
      { text: 'Cp et Cv sont liées par R', ...PARTIEL, note: 'relation évoquée, sans la forme' }
    ]
  },
  {
    question: 'Quelles sont les deux courbes délimitant le domaine diphasique liquide-vapeur sur le diagramme pression-volume (P-V) ?',
    refs: [
      "Les deux courbes délimitant le domaine diphasique liquide-vapeur sont la courbe de rosée (droite) et la courbe d'ébullition (gauche).",
      "La frontière entre liquide et vapeur est formée par la courbe d'ébullition (gauche) et la courbe de rosée (droite)."
    ],
    answers: [
      { text: "la courbe d'ébullition et la courbe de rosée", ...OK },
      { text: 'rosée et ébullition', ...OK },
      { text: "courbe de rosée à droite, courbe d'ébullition à gauche", ...OK },
      { text: "la courbe d'ébullition", ...PARTIEL, note: 'une seule des deux' },
      { text: 'diagramme de clapeyron', min: 0, max: 0.4, note: 'cas réel : bon diagramme mais ne répond pas ; le motif ne doit pas dire « hors sujet »' },
      { text: 'la courbe de saturation', ...PARTIEL, note: 'terme englobant, sans distinguer les deux' },
      { text: "la courbe d'isotherme et la courbe d'adiabatique", ...FAUX },
      { text: 'la courbe de fusion et la courbe de sublimation', ...FAUX, note: 'autre équilibre' }
    ]
  },
  {
    question: 'Énoncez le premier principe de la thermodynamique pour un système fermé.',
    refs: [
      "La variation d'énergie interne d'un système fermé est égale à la somme du travail et de la chaleur échangés avec l'extérieur : ΔU = W + Q.",
      'ΔU = W + Q'
    ],
    answers: [
      { text: 'ΔU = W + Q', ...OK },
      { text: 'ΔU = Q + W', ...OK },
      { text: "la variation d'énergie interne vaut le travail plus la chaleur reçus", ...OK },
      { text: "l'énergie interne varie quand le système échange de la chaleur et du travail", ...OK, note: 'pas de formule mais le sens complet' },
      { text: "l'énergie se conserve", ...PARTIEL, note: 'idée vague juste' },
      { text: 'ΔU = W - Q', ...FAUX, note: 'signe de Q faux' },
      { text: "l'entropie ne peut qu'augmenter", ...FAUX, note: 'second principe' }
    ]
  },
  {
    question: "Que dit le théorème d'Archimède ?",
    refs: [
      'Tout corps plongé dans un fluide au repos subit une poussée verticale, dirigée vers le haut, égale au poids du volume de fluide déplacé.',
      "La poussée d'Archimède est égale au poids du fluide déplacé par le corps."
    ],
    answers: [
      { text: 'un corps plongé dans un fluide reçoit une poussée vers le haut égale au poids du fluide déplacé', ...OK },
      { text: 'la poussée est égale au poids du volume de fluide déplacé', ...OK },
      { text: 'poussée = rho * V * g', ...OK, note: 'formule équivalente' },
      { text: "une force vers le haut s'exerce sur le corps immergé", ...PARTIEL, note: 'sens juste, sans la valeur' },
      { text: 'la poussée est égale au poids du corps', ...FAUX, note: 'confond avec la condition de flottaison' },
      { text: 'la pression augmente avec la profondeur', ...FAUX, note: "autre résultat (loi de l'hydrostatique)" }
    ]
  },
  {
    question: "Quelle est la loi fondamentale de l'hydrostatique ?",
    refs: [
      "La différence de pression entre deux points d'un fluide incompressible au repos vaut ΔP = ρ g Δz.",
      'P(B) - P(A) = ρ g (zA - zB) : la pression augmente avec la profondeur.'
    ],
    answers: [
      { text: 'la pression augmente linéairement avec la profondeur : P = P0 + rho g h', ...OK },
      { text: 'ΔP = ρ g Δz', ...OK },
      { text: 'la pression dépend de la profondeur, de la masse volumique et de g', min: 0.6, max: 1, note: 'sens de variation non précisé : 0.6 à 1 toléré' },
      { text: 'la pression augmente avec la profondeur', ...OK, note: 'sens essentiel, formule absente' },
      { text: 'la pression est la même en tout point du fluide', ...FAUX, note: 'faux sauf à altitude constante' },
      { text: 'la pression diminue quand on descend', ...FAUX, note: 'inversion' }
    ]
  },
  {
    question: "Quelle est l'équation d'état d'un gaz parfait ?",
    refs: ['PV = nRT', "L'équation d'état d'un gaz parfait est PV = nRT."],
    answers: [
      { text: 'PV = nRT', ...OK },
      { text: 'P*V = n*R*T', ...OK },
      { text: 'la pression fois le volume est égale à n R T', ...OK },
      { text: 'P = nRT/V', ...OK, note: 'réarrangement' },
      { text: 'PV = RT', ...OK, note: 'forme molaire, équivalente par mole' },
      { text: 'PV = nR/T', ...FAUX, note: 'T au dénominateur' },
      { text: 'P/V = nRT', ...FAUX }
    ]
  },
  {
    question: 'Que dit le second principe de la thermodynamique ?',
    refs: [
      "L'entropie d'un système isolé ne peut qu'augmenter ou rester constante au cours d'une transformation.",
      "Pour un système isolé, ΔS ≥ 0 : l'entropie ne diminue jamais."
    ],
    answers: [
      { text: "l'entropie d'un système isolé augmente ou reste constante", ...OK },
      { text: 'ΔS >= 0 pour un système isolé', ...OK },
      { text: 'le désordre ne diminue jamais dans un système isolé', ...OK, note: 'vulgarisation acceptable' },
      { text: "l'entropie augmente", min: 0.6, max: 1, note: 'condition « isolé » omise : 0.6 à 1 toléré' },
      { text: 'la chaleur passe spontanément du chaud vers le froid', min: 0, max: 0.6, note: 'énoncé de Clausius : juste mais autre formulation' },
      { text: "l'énergie ne peut être ni créée ni détruite", ...FAUX, note: 'premier principe' },
      { text: "l'entropie diminue toujours", ...FAUX }
    ]
  }
]
