const AnswerQualityService = require('../../services/AnswerQuality.service')

describe('AnswerQualityService', () => {
  describe('assess - cas réel Q4 (énergie interne, preprod 2026-09-12)', () => {
    const statement = "Qu'est-ce que l'énergie interne U d'un système ?"

    it('signale la réponse défectueuse réellement enregistrée (ne mentionne pas "énergie")', () => {
      const warnings = AnswerQualityService.assess(statement, [
        'Une fonction d\'état extensive associée au système.'
      ])
      expect(warnings.some((w) => w.includes("aucun mot-clé distinctif"))).toBe(true)
    })

    it('ne signale plus rien après correction du prompt (réponse autonome + reformulations)', () => {
      const warnings = AnswerQualityService.assess(statement, [
        "L'énergie interne U est une fonction d'état extensive associée à un système.",
        "U est une fonction d'état extensive associée à un système.",
        "Une grandeur extensive et fonction d'état notée U, appelée énergie interne."
      ])
      expect(warnings).toEqual([])
    })
  })

  describe('assess - autonomie (règle 9)', () => {
    it('ne signale rien si "système" est le seul mot partagé (filtré comme mot générique)', () => {
      // Répliqué du cas réel : "système" apparaît des deux côtés mais n'identifie rien de précis —
      // sans le filtre GENERIC_FILLER_KEYWORDS, ce cas remonterait à tort comme "autonome".
      const warnings = AnswerQualityService.assess(
        "Qu'est-ce que l'entropie S d'un système ?",
        ['Une fonction d\'état extensive associée au système.']
      )
      expect(warnings.some((w) => w.includes('mot-clé distinctif'))).toBe(true)
    })

    it('ne signale rien si la réponse ou l\'énoncé ne produit aucun mot-clé distinctif (pas de faux positif)', () => {
      const warnings = AnswerQualityService.assess('?', ['42'])
      expect(warnings.some((w) => w.includes('mot-clé distinctif'))).toBe(false)
    })

    it('assess - formule isolée balisée sans mot commun avec l\'énoncé - aucun avertissement de mot-clé', () => {
      const warnings = AnswerQualityService.assess(
        'Quel est le bilan d\'entropie du second principe ?',
        ['$\\Delta S = S_{ech} + S_{cr}$']
      )
      expect(warnings.some((w) => w.includes('mot-clé distinctif'))).toBe(false)
    })

    it('assess - formule isolée en texte brut - signale la formule non balisée mais pas l\'absence de mot-clé', () => {
      const warnings = AnswerQualityService.assess(
        'Quel est le bilan d\'entropie du second principe ?',
        ['ΔS = Sech + Scréée']
      )
      expect(warnings.some((w) => w.includes('mot-clé distinctif'))).toBe(false)
      expect(warnings.some((w) => w.includes('formule non balisée'))).toBe(true)
    })
  })

  describe('assess - réponse « terme » (unité, nom, lieu…)', () => {
    it.each([
      ['Unité SI de la force ?', ['Newton']],
      ['Unité SI de la force ?', ['le newton']],
      ["Qui a formulé la loi de la gravitation universelle ?", ['Isaac Newton']],
      ["Quelle mer borde l'Égypte à l'est ?", ['Mer Rouge']],
      ["Quel est le nom de la force qui s'oppose au mouvement ?", ['Frottement']],
    ])('« %s » → « %s » : aucun avertissement', (statement, answers) => {
      const warnings = AnswerQualityService.assess(statement, answers)
      expect(warnings).toEqual([])
      expect(AnswerQualityService.levelFromWarnings(warnings)).toBe('high')
    })

    it('« oui » / « non » / « vrai » / « faux » restent signalés (ne se comprennent qu’avec la question)', () => {
      for (const answer of ['Oui', 'non', 'Vrai', 'faux']) {
        const warnings = AnswerQualityService.assess('Le son se propage-t-il dans le vide ?', [answer])
        expect([answer, warnings.length > 0]).toEqual([answer, true])
      }
    })

    it('une valeur avec chiffres ou ponctuation n’est pas un « terme » : toujours signalée si trop courte', () => {
      const warnings = AnswerQualityService.assess("Quelle est la vitesse du son dans l'air ?", ['340 environ.'])
      expect(warnings.some((w) => w.includes('très courte'))).toBe(true)
    })

    it('trois mots ou plus : le contrôle d’autonomie s’applique (réponse elliptique)', () => {
      const warnings = AnswerQualityService.assess("Qu'est-ce que l'énergie interne ?", ['Une fonction extensive'])
      expect(warnings.some((w) => w.includes('mot-clé distinctif'))).toBe(true)
    })

    it('isBareTerm — 1 à 2 mots de lettres', () => {
      expect(AnswerQualityService.isBareTerm('Newton')).toBe(true)
      expect(AnswerQualityService.isBareTerm("l'ohm")).toBe(true)
      expect(AnswerQualityService.isBareTerm('Isaac Newton')).toBe(true)
      expect(AnswerQualityService.isBareTerm('Une fonction extensive')).toBe(false)
      expect(AnswerQualityService.isBareTerm('1789')).toBe(false)
      expect(AnswerQualityService.isBareTerm('Oui')).toBe(false)
      expect(AnswerQualityService.isBareTerm('')).toBe(false)
    })
  })

  describe('assess - réponse courte (hors formule)', () => {
    it('signale une réponse-phrase très courte', () => {
      const warnings = AnswerQualityService.assess('Quelle est la vitesse du son dans l\'air ?', ['340 environ.'])
      expect(warnings.some((w) => w.includes('très courte'))).toBe(true)
    })

    it('ne signale pas une formule courte comme "trop courte"', () => {
      const warnings = AnswerQualityService.assess('Quelle est la définition de l\'enthalpie H ?', ['$H = U + PV$'])
      expect(warnings.some((w) => w.includes('très courte'))).toBe(false)
    })
  })

  describe('assess - formule non balisée (règle 8)', () => {
    it('signale une formule en Unicode brut, hors segment $...$', () => {
      const warnings = AnswerQualityService.assess(
        "Quelle est l'expression du premier principe ?",
        ["La variation d'énergie interne s'exprime par ∆U + ∆Ec = Wtot + Q pour un système fermé."]
      )
      expect(warnings.some((w) => w.includes('non balisée'))).toBe(true)
    })

    it('ne signale rien quand la formule est déjà en $...$', () => {
      const warnings = AnswerQualityService.assess(
        "Quelle est l'expression du premier principe ?",
        [
          "La variation d'énergie interne d'un système fermé s'exprime par $\\Delta U + \\Delta E_c = W_{tot} + Q$.",
          'On a $\\Delta U + \\Delta E_c = W_{tot} + Q$ pour un système fermé.'
        ]
      )
      expect(warnings.some((w) => w.includes('non balisée'))).toBe(false)
    })
  })

  describe('assess - richesse des reformulations (règle 10)', () => {
    const statement = "Qu'est-ce que la photosynthèse ?"
    const primary = 'La photosynthèse est le processus de conversion de la lumière en énergie chimique par les plantes.'

    it('signale l\'absence de toute reformulation pour une réponse-phrase', () => {
      const warnings = AnswerQualityService.assess(statement, [primary])
      expect(warnings.some((w) => w.includes('Aucune reformulation'))).toBe(true)
    })

    it('signale des reformulations quasi-identiques à la réponse principale', () => {
      const warnings = AnswerQualityService.assess(statement, [
        primary,
        'La photosynthèse est le processus de conversion de la lumière en énergie chimique par les plantes'
      ])
      expect(warnings.some((w) => w.includes('presque identiques'))).toBe(true)
    })

    it('ne signale rien avec 2 reformulations réellement distinctes', () => {
      const warnings = AnswerQualityService.assess(statement, [
        primary,
        'Un processus qui convertit la lumière en énergie chimique grâce aux plantes.',
        'Les plantes transforment la lumière solaire en énergie chimique utilisable.'
      ])
      expect(warnings.some((w) => w.includes('Aucune reformulation') || w.includes('presque identiques'))).toBe(false)
    })

    it('ne demande pas de reformulation pour une réponse strictement factuelle (formule/valeur)', () => {
      const warnings = AnswerQualityService.assess('Quelle est la capitale de la France ?', ['Paris.'])
      expect(warnings.some((w) => w.includes('reformulation'))).toBe(false)
    })
  })

  describe('assess - garde-fous', () => {
    it('retourne un tableau vide si aucune réponse fournie', () => {
      expect(AnswerQualityService.assess('Une question ?', [])).toEqual([])
      expect(AnswerQualityService.assess('Une question ?', [''])).toEqual([])
    })

    it('retourne un tableau vide si l\'énoncé est vide', () => {
      expect(AnswerQualityService.assess('', ['Une réponse.'])).toEqual([])
    })

    it('accepte une chaîne unique en plus d\'un tableau', () => {
      const warnings = AnswerQualityService.assess("Qu'est-ce que l'énergie interne U d'un système ?", 'Une fonction d\'état extensive associée au système.')
      expect(warnings.length).toBeGreaterThan(0)
    })
  })

  describe('levelFromWarnings', () => {
    it('"high" pour 0 avertissement', () => {
      expect(AnswerQualityService.levelFromWarnings([])).toBe('high')
    })

    it('"medium" pour 1 avertissement', () => {
      expect(AnswerQualityService.levelFromWarnings(['un point à vérifier'])).toBe('medium')
    })

    it('"low" pour 2 avertissements ou plus', () => {
      expect(AnswerQualityService.levelFromWarnings(['a', 'b'])).toBe('low')
      expect(AnswerQualityService.levelFromWarnings(['a', 'b', 'c'])).toBe('low')
    })

    it('"high" si l\'argument est absent/null (garde-fou)', () => {
      expect(AnswerQualityService.levelFromWarnings(undefined)).toBe('high')
      expect(AnswerQualityService.levelFromWarnings(null)).toBe('high')
    })
  })

  describe('assess - énoncé dépendant de la source et formules LaTeX', () => {
    it('signale un énoncé « selon le texte »', () => {
      const w = AnswerQualityService.assess('Que vaut le déterminant selon le texte ?', ['Le déterminant vaut zéro quand la matrice est singulière.'])
      expect(w.some((m) => m.includes('texte source'))).toBe(true)
    })

    it('ne signale pas un énoncé autonome', () => {
      const w = AnswerQualityService.assess('Quand une matrice est-elle inversible ?', ['Une matrice est inversible quand son déterminant est non nul.'])
      expect(w.some((m) => m.includes('texte source'))).toBe(false)
    })

    it('pas de fausse alerte « mot-clé distinctif » sur une réponse formule LaTeX', () => {
      const w = AnswerQualityService.assess(String.raw`Quelle est la formule du déterminant de $A = \begin{pmatrix}a&b\\c&d\end{pmatrix}$ ?`,['$ad - bc$'])
      expect(w.some((m) => m.includes('mot-clé distinctif'))).toBe(false)
    })
  })
})
