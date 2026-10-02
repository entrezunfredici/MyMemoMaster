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
})
