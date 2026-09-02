const AiCardGenerationService = require('../../services/AiCardGeneration.service')

const VALID_OPEN_CARD = {
  statement: 'Qu\'est-ce que la photosynthèse ?',
  type: 'open',
  answer: 'Un processus de conversion de lumière en énergie chimique.',
  acceptedAnswers: [],
  options: null,
  sourceExcerpt: 'La photosynthèse est...'
}

const VALID_MCQ_CARD = {
  statement: 'Quelle est la capitale de la France ?',
  type: 'mcq',
  answer: null,
  acceptedAnswers: null,
  options: [
    { text: 'Paris', correct: true },
    { text: 'Madrid', correct: false },
    { text: 'Berlin', correct: false }
  ],
  sourceExcerpt: '...'
}

const mockFetchResponse = (content) => ({
  ok: true,
  status: 200,
  json: async () => ({ choices: [{ message: { content: JSON.stringify(content) } }] })
})

describe('AiCardGenerationService', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
    delete process.env.MISTRAL_API_KEY
  })

  describe('buildSystemPrompt', () => {
    it('buildSystemPrompt - langue demandée - inclut la langue et les règles clés', () => {
      const prompt = AiCardGenerationService.buildSystemPrompt('en')
      expect(prompt).toContain('en')
      expect(prompt).toContain('sourceExcerpt')
      expect(prompt).toContain('JSON')
    })
  })

  describe('buildUserPrompt', () => {
    it('buildUserPrompt - matière fournie - inclut la ligne matière', () => {
      const prompt = AiCardGenerationService.buildUserPrompt({
        sourceText: 'Un texte source.',
        subjectContext: 'SVT',
        cardCount: 3,
        cardType: 'open'
      })
      expect(prompt).toContain('matière : SVT')
      expect(prompt).toContain('Un texte source.')
      expect(prompt).toContain('3 carte(s)')
      expect(prompt).toContain('"open"')
    })

    it('buildUserPrompt - matière absente - omet la ligne matière', () => {
      const prompt = AiCardGenerationService.buildUserPrompt({
        sourceText: 'Un texte source.',
        subjectContext: null,
        cardCount: 2,
        cardType: 'mcq'
      })
      expect(prompt).not.toContain('matière :')
    })
  })

  describe('validateInput', () => {
    const base = { sourceText: 'Un texte.', cardCount: 5, cardType: 'open' }

    it('validateInput - paramètres valides - ne lève pas', () => {
      expect(() => AiCardGenerationService.validateInput(base)).not.toThrow()
    })

    it.each(['open', 'mcq', 'mixed'])('validateInput - cardType %s - ne lève pas', (cardType) => {
      expect(() => AiCardGenerationService.validateInput({ ...base, cardType })).not.toThrow()
    })

    it('validateInput - sourceText vide - lève une erreur 400', () => {
      expect(() => AiCardGenerationService.validateInput({ ...base, sourceText: '   ' })).toThrow(
        'Le contenu source est requis.'
      )
      try {
        AiCardGenerationService.validateInput({ ...base, sourceText: '' })
      } catch (err) {
        expect(err.statusCode).toBe(400)
      }
    })

    it('validateInput - sourceText non string - lève une erreur 400', () => {
      expect(() => AiCardGenerationService.validateInput({ ...base, sourceText: null })).toThrow(
        'Le contenu source est requis.'
      )
    })

    it('validateInput - cardCount non entier - lève une erreur 400', () => {
      expect(() => AiCardGenerationService.validateInput({ ...base, cardCount: 2.5 })).toThrow(
        'entier positif'
      )
    })

    it('validateInput - cardCount nul ou négatif - lève une erreur 400', () => {
      expect(() => AiCardGenerationService.validateInput({ ...base, cardCount: 0 })).toThrow('entier positif')
      expect(() => AiCardGenerationService.validateInput({ ...base, cardCount: -3 })).toThrow('entier positif')
    })

    it('validateInput - cardCount au-delà du plafond technique - lève une erreur 400', () => {
      expect(() => AiCardGenerationService.validateInput({ ...base, cardCount: 31 })).toThrow(
        'ne peut pas dépasser'
      )
    })

    it('validateInput - cardType invalide - lève une erreur 400', () => {
      expect(() => AiCardGenerationService.validateInput({ ...base, cardType: 'true_false' })).toThrow(
        'open, mcq, mixed'
      )
    })
  })

  describe('validateCard', () => {
    it('validateCard - carte open valide - aucune erreur', () => {
      expect(AiCardGenerationService.validateCard(VALID_OPEN_CARD, 0)).toEqual([])
    })

    it('validateCard - carte mcq valide - aucune erreur', () => {
      expect(AiCardGenerationService.validateCard(VALID_MCQ_CARD, 0)).toEqual([])
    })

    it('validateCard - statement manquant - erreur dédiée', () => {
      const errors = AiCardGenerationService.validateCard({ ...VALID_OPEN_CARD, statement: '' }, 0)
      expect(errors.some((e) => e.includes('statement'))).toBe(true)
    })

    it('validateCard - sourceExcerpt manquant - erreur dédiée', () => {
      const errors = AiCardGenerationService.validateCard({ ...VALID_OPEN_CARD, sourceExcerpt: '' }, 0)
      expect(errors.some((e) => e.includes('sourceExcerpt'))).toBe(true)
    })

    it('validateCard - carte open sans answer - erreur dédiée', () => {
      const errors = AiCardGenerationService.validateCard({ ...VALID_OPEN_CARD, answer: '' }, 0)
      expect(errors.some((e) => e.includes('answer'))).toBe(true)
    })

    it('validateCard - carte mcq avec 2 réponses correctes - erreur dédiée', () => {
      const card = {
        ...VALID_MCQ_CARD,
        options: [
          { text: 'Paris', correct: true },
          { text: 'Madrid', correct: true },
          { text: 'Berlin', correct: false }
        ]
      }
      const errors = AiCardGenerationService.validateCard(card, 0)
      expect(errors.some((e) => e.includes('exactement une'))).toBe(true)
    })

    it('validateCard - carte mcq sans réponse correcte - erreur dédiée', () => {
      const card = {
        ...VALID_MCQ_CARD,
        options: [
          { text: 'Paris', correct: false },
          { text: 'Madrid', correct: false },
          { text: 'Berlin', correct: false }
        ]
      }
      const errors = AiCardGenerationService.validateCard(card, 0)
      expect(errors.some((e) => e.includes('exactement une'))).toBe(true)
    })

    it('validateCard - carte mcq avec moins de 3 options - erreur dédiée', () => {
      const card = { ...VALID_MCQ_CARD, options: [{ text: 'Paris', correct: true }] }
      const errors = AiCardGenerationService.validateCard(card, 0)
      expect(errors.some((e) => e.includes('3 à 4 entrées'))).toBe(true)
    })

    it('validateCard - type invalide - erreur dédiée', () => {
      const errors = AiCardGenerationService.validateCard({ ...VALID_OPEN_CARD, type: 'true_false' }, 0)
      expect(errors.some((e) => e.includes('"type"'))).toBe(true)
    })

    it('validateCard - carte non objet - une seule erreur', () => {
      expect(AiCardGenerationService.validateCard(null, 0)).toEqual(['Carte #1 : doit être un objet.'])
    })
  })

  describe('validatePayload', () => {
    it('validatePayload - payload valide (open + mcq) - aucune erreur', () => {
      const payload = { cards: [VALID_OPEN_CARD, VALID_MCQ_CARD], warning: null }
      expect(AiCardGenerationService.validatePayload(payload, 5)).toEqual([])
    })

    it('validatePayload - cards absent ou non tableau - erreur dédiée', () => {
      expect(AiCardGenerationService.validatePayload({ cards: 'x' }, 5)).toEqual([
        'Le champ "cards" doit être un tableau.'
      ])
    })

    it('validatePayload - plus de cartes que demandé - erreur dédiée', () => {
      const payload = { cards: [VALID_OPEN_CARD, VALID_MCQ_CARD], warning: null }
      const errors = AiCardGenerationService.validatePayload(payload, 1)
      expect(errors.some((e) => e.includes('dépasse le nombre demandé'))).toBe(true)
    })

    it('validatePayload - warning non conforme - erreur dédiée', () => {
      const payload = { cards: [], warning: 42 }
      expect(AiCardGenerationService.validatePayload(payload, 5)).toEqual([
        'Le champ "warning" doit être une chaîne ou null.'
      ])
    })

    it('validatePayload - cards vide avec warning explicite - valide', () => {
      const payload = { cards: [], warning: 'Contenu source insuffisant.' }
      expect(AiCardGenerationService.validatePayload(payload, 5)).toEqual([])
    })

    // Constaté lors d'un appel réel (C-01.04, vérification post-livraison) : avec cardType "mcq",
    // le modèle a renvoyé un mélange de cartes "open" et "mcq" — non détecté par la validation
    // initiale (qui ne vérifiait que la cohérence interne de chaque carte, pas le type demandé).
    it('validatePayload - cardType "mcq" mais une carte "open" - erreur dédiée', () => {
      const payload = { cards: [VALID_OPEN_CARD, VALID_MCQ_CARD], warning: null }
      const errors = AiCardGenerationService.validatePayload(payload, 5, 'mcq')
      expect(errors.some((e) => e.includes('ne correspond pas au type demandé "mcq"'))).toBe(true)
    })

    it('validatePayload - cardType "open" mais une carte "mcq" - erreur dédiée', () => {
      const payload = { cards: [VALID_OPEN_CARD, VALID_MCQ_CARD], warning: null }
      const errors = AiCardGenerationService.validatePayload(payload, 5, 'open')
      expect(errors.some((e) => e.includes('ne correspond pas au type demandé "open"'))).toBe(true)
    })

    it('validatePayload - cardType "mixed" - accepte un mélange open/mcq', () => {
      const payload = { cards: [VALID_OPEN_CARD, VALID_MCQ_CARD], warning: null }
      expect(AiCardGenerationService.validatePayload(payload, 5, 'mixed')).toEqual([])
    })

    it('validatePayload - cardType non précisé - défaut "mixed", accepte un mélange', () => {
      const payload = { cards: [VALID_OPEN_CARD, VALID_MCQ_CARD], warning: null }
      expect(AiCardGenerationService.validatePayload(payload, 5)).toEqual([])
    })
  })

  describe('parseAndValidate', () => {
    it('parseAndValidate - JSON valide et conforme - valid true avec le payload', () => {
      const raw = JSON.stringify({ cards: [VALID_OPEN_CARD], warning: null })
      const result = AiCardGenerationService.parseAndValidate(raw, 5)
      expect(result.valid).toBe(true)
      expect(result.payload.cards).toHaveLength(1)
      expect(result.payload.warning).toBeNull()
    })

    it('parseAndValidate - warning absent du JSON - normalisé à null', () => {
      const raw = JSON.stringify({ cards: [VALID_OPEN_CARD] })
      const result = AiCardGenerationService.parseAndValidate(raw, 5)
      expect(result.valid).toBe(true)
      expect(result.payload.warning).toBeNull()
    })

    it('parseAndValidate - texte non-JSON - valid false avec message dédié', () => {
      const result = AiCardGenerationService.parseAndValidate('ceci n\'est pas du JSON', 5)
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('JSON valide')
    })

    it('parseAndValidate - JSON valide mais non conforme au schéma - valid false', () => {
      const raw = JSON.stringify({ cards: [{ statement: '' }] })
      const result = AiCardGenerationService.parseAndValidate(raw, 5)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('callModel', () => {
    const messages = [{ role: 'user', content: 'x' }]

    it('callModel - clé API absente - lève une erreur 500', async () => {
      await expect(AiCardGenerationService.callModel(messages)).rejects.toMatchObject({
        message: 'Service de génération IA non configuré (clé API manquante).',
        statusCode: 500
      })
    })

    it('callModel - appel réussi - retourne le contenu et appelle le bon endpoint/modèle', async () => {
      process.env.MISTRAL_API_KEY = 'test-key'
      process.env.MISTRAL_MODEL = 'mistral-small-latest'
      const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(mockFetchResponse({ cards: [], warning: null }))

      const content = await AiCardGenerationService.callModel(messages)

      expect(JSON.parse(content)).toEqual({ cards: [], warning: null })
      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [url, options] = fetchMock.mock.calls[0]
      expect(url).toBe('https://api.mistral.ai/v1/chat/completions')
      expect(options.headers.Authorization).toBe('Bearer test-key')
      const body = JSON.parse(options.body)
      expect(body.model).toBe('mistral-small-latest')
      expect(body.response_format).toEqual({ type: 'json_object' })
      expect(body.messages).toEqual(messages)
    })

    it('callModel - réponse HTTP en erreur - lève une erreur 502', async () => {
      process.env.MISTRAL_API_KEY = 'test-key'
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'internal error'
      })

      await expect(AiCardGenerationService.callModel(messages)).rejects.toMatchObject({
        message: 'Le service de génération IA est indisponible pour le moment.',
        statusCode: 502
      })
    })

    it('callModel - erreur réseau - lève une erreur 502', async () => {
      process.env.MISTRAL_API_KEY = 'test-key'
      jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'))

      await expect(AiCardGenerationService.callModel(messages)).rejects.toMatchObject({
        message: 'Le service de génération IA est indisponible pour le moment.',
        statusCode: 502
      })
    })

    it('callModel - contenu vide dans la réponse - lève une erreur 502', async () => {
      process.env.MISTRAL_API_KEY = 'test-key'
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: '' } }] })
      })

      await expect(AiCardGenerationService.callModel(messages)).rejects.toMatchObject({
        message: "Le service de génération IA n'a renvoyé aucun contenu.",
        statusCode: 502
      })
    })
  })

  describe('generateCards', () => {
    const validParams = { sourceText: 'Un texte source.', cardCount: 2, cardType: 'open' }

    beforeEach(() => {
      process.env.MISTRAL_API_KEY = 'test-key'
    })

    it('generateCards - entrée invalide - lève avant tout appel réseau', async () => {
      const fetchMock = jest.spyOn(global, 'fetch')
      await expect(AiCardGenerationService.generateCards({ ...validParams, cardCount: 0 })).rejects.toMatchObject({
        statusCode: 400
      })
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('generateCards - 1er essai conforme - retourne le brouillon, un seul appel modèle', async () => {
      const fetchMock = jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(mockFetchResponse({ cards: [VALID_OPEN_CARD], warning: null }))

      const result = await AiCardGenerationService.generateCards(validParams)

      expect(result.cards).toHaveLength(1)
      expect(result.warning).toBeNull()
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('generateCards - 1er essai non conforme puis 2e conforme - retry avec correction, retourne le résultat du 2e essai', async () => {
      const fetchMock = jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce(mockFetchResponse({ cards: 'pas un tableau' }))
        .mockResolvedValueOnce(mockFetchResponse({ cards: [VALID_OPEN_CARD], warning: null }))

      const result = await AiCardGenerationService.generateCards(validParams)

      expect(result.cards).toHaveLength(1)
      expect(fetchMock).toHaveBeenCalledTimes(2)
      const secondCallBody = JSON.parse(fetchMock.mock.calls[1][1].body)
      // Le 2e appel porte l'historique complet : system + user + assistant (invalide) + correction
      expect(secondCallBody.messages).toHaveLength(4)
      expect(secondCallBody.messages[2].role).toBe('assistant')
      expect(secondCallBody.messages[3].role).toBe('user')
      expect(secondCallBody.messages[3].content).toContain("n'est pas conforme")
    })

    it('generateCards - 1er et 2e essai non conformes - lève une erreur 502 après 2 appels', async () => {
      const fetchMock = jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(mockFetchResponse({ cards: 'pas un tableau' }))

      await expect(AiCardGenerationService.generateCards(validParams)).rejects.toMatchObject({
        message: "La génération n'a pas produit un résultat exploitable. Réessayez.",
        statusCode: 502
      })
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('generateCards - erreur réseau au 1er appel - propage sans tenter de 2e appel', async () => {
      const fetchMock = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'))

      await expect(AiCardGenerationService.generateCards(validParams)).rejects.toMatchObject({
        statusCode: 502
      })
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    // Constaté lors d'un appel réel (C-01.04, vérification post-livraison) : avec cardType "mcq",
    // le modèle a renvoyé une carte "open" au 1er essai — doit déclencher le retry comme toute
    // autre sortie non conforme, pas être accepté silencieusement.
    it('generateCards - cardType "mcq" mais 1re carte "open" - déclenche le retry, accepte le 2e essai conforme', async () => {
      const fetchMock = jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce(mockFetchResponse({ cards: [VALID_OPEN_CARD], warning: null }))
        .mockResolvedValueOnce(mockFetchResponse({ cards: [VALID_MCQ_CARD], warning: null }))

      const result = await AiCardGenerationService.generateCards({ ...validParams, cardType: 'mcq' })

      expect(result.cards).toEqual([VALID_MCQ_CARD])
      expect(fetchMock).toHaveBeenCalledTimes(2)
      const secondCallBody = JSON.parse(fetchMock.mock.calls[1][1].body)
      expect(secondCallBody.messages[3].content).toContain('type demandé "mcq"')
    })
  })
})
