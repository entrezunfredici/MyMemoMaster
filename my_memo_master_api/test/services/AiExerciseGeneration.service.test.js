const AiExerciseGenerationService = require('../../services/AiExerciseGeneration.service')

const VALID_OPEN_QUESTION = {
  statement: 'Qu\'est-ce que la photosynthèse ?',
  type: 'open',
  content: {
    correct_answer: 'Un processus de conversion de lumière en énergie chimique.',
    accepted_answers: []
  },
  sourceExcerpt: 'La photosynthèse est...'
}

const VALID_MCQ_QUESTION = {
  statement: 'Quelle est la capitale de la France ?',
  type: 'mcq',
  content: {
    options: [
      { text: 'Paris', correct: true },
      { text: 'Madrid', correct: false },
      { text: 'Berlin', correct: false }
    ]
  },
  sourceExcerpt: '...'
}

const VALID_FILL_BLANK_QUESTION = {
  statement: 'Complétez la phrase.',
  type: 'fill_blank',
  content: {
    template: 'La capitale de la France est {{0}} et celle d\'Allemagne est {{1}}.',
    blanks: ['Paris', 'Berlin']
  },
  sourceExcerpt: 'La capitale de la France est Paris et celle d\'Allemagne est Berlin.'
}

const VALID_REORDER_QUESTION = {
  statement: 'Remettez dans l\'ordre.',
  type: 'reorder',
  content: {
    fragments: ['le', 'chat', 'dort', 'tranquillement']
  },
  sourceExcerpt: 'le chat dort tranquillement'
}

const mockFetchResponse = (content, usage = { prompt_tokens: 100, completion_tokens: 50 }) => ({
  ok: true,
  status: 200,
  json: async () => ({ choices: [{ message: { content: JSON.stringify(content) } }], usage })
})

describe('AiExerciseGenerationService', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
    delete process.env.MISTRAL_API_KEY
  })

  describe('buildSystemPrompt', () => {
    it('buildSystemPrompt - langue demandée - inclut la langue et les règles clés', () => {
      const prompt = AiExerciseGenerationService.buildSystemPrompt('en')
      expect(prompt).toContain('en')
      expect(prompt).toContain('sourceExcerpt')
      expect(prompt).toContain('JSON')
      expect(prompt).toContain('fill_blank')
      expect(prompt).toContain('reorder')
    })
  })

  describe('buildUserPrompt', () => {
    it('buildUserPrompt - matière fournie - inclut la ligne matière', () => {
      const prompt = AiExerciseGenerationService.buildUserPrompt({
        sourceText: 'Un texte source.',
        subjectContext: 'SVT',
        questionCount: 3,
        questionType: 'mixed'
      })
      expect(prompt).toContain('matière : SVT')
      expect(prompt).toContain('Un texte source.')
      expect(prompt).toContain('3 question(s)')
      expect(prompt).toContain('"mixed"')
    })

    it('buildUserPrompt - matière absente - omet la ligne matière', () => {
      const prompt = AiExerciseGenerationService.buildUserPrompt({
        sourceText: 'Un texte source.',
        subjectContext: null,
        questionCount: 2,
        questionType: 'mcq'
      })
      expect(prompt).not.toContain('matière :')
    })
  })

  describe('validateInput', () => {
    const base = { sourceText: 'Un texte.', questionCount: 5, questionType: 'mixed' }

    it('validateInput - paramètres valides - ne lève pas', () => {
      expect(() => AiExerciseGenerationService.validateInput(base)).not.toThrow()
    })

    it.each(['open', 'mcq', 'fill_blank', 'reorder', 'mixed'])(
      'validateInput - questionType %s - ne lève pas',
      (questionType) => {
        expect(() => AiExerciseGenerationService.validateInput({ ...base, questionType })).not.toThrow()
      }
    )

    it('validateInput - sourceText vide - lève une erreur 400', () => {
      expect(() => AiExerciseGenerationService.validateInput({ ...base, sourceText: '   ' })).toThrow(
        'Le contenu source est requis.'
      )
      try {
        AiExerciseGenerationService.validateInput({ ...base, sourceText: '' })
      } catch (err) {
        expect(err.statusCode).toBe(400)
      }
    })

    it('validateInput - sourceText non string - lève une erreur 400', () => {
      expect(() => AiExerciseGenerationService.validateInput({ ...base, sourceText: null })).toThrow(
        'Le contenu source est requis.'
      )
    })

    it('validateInput - questionCount non entier - lève une erreur 400', () => {
      expect(() => AiExerciseGenerationService.validateInput({ ...base, questionCount: 2.5 })).toThrow(
        'entier positif'
      )
    })

    it('validateInput - questionCount nul ou négatif - lève une erreur 400', () => {
      expect(() => AiExerciseGenerationService.validateInput({ ...base, questionCount: 0 })).toThrow('entier positif')
      expect(() => AiExerciseGenerationService.validateInput({ ...base, questionCount: -3 })).toThrow('entier positif')
    })

    it('validateInput - questionCount au-delà du plafond technique - lève une erreur 400', () => {
      expect(() => AiExerciseGenerationService.validateInput({ ...base, questionCount: 31 })).toThrow(
        'ne peut pas dépasser'
      )
    })

    it('validateInput - questionType invalide - lève une erreur 400', () => {
      expect(() => AiExerciseGenerationService.validateInput({ ...base, questionType: 'true_false' })).toThrow(
        'open, mcq, fill_blank, reorder'
      )
    })
  })

  describe('validateQuestion', () => {
    it.each([
      ['open', VALID_OPEN_QUESTION],
      ['mcq', VALID_MCQ_QUESTION],
      ['fill_blank', VALID_FILL_BLANK_QUESTION],
      ['reorder', VALID_REORDER_QUESTION]
    ])('validateQuestion - question %s valide - aucune erreur', (_type, question) => {
      expect(AiExerciseGenerationService.validateQuestion(question, 0)).toEqual([])
    })

    it('validateQuestion - statement manquant - erreur dédiée', () => {
      const errors = AiExerciseGenerationService.validateQuestion({ ...VALID_OPEN_QUESTION, statement: '' }, 0)
      expect(errors.some((e) => e.includes('statement'))).toBe(true)
    })

    it('validateQuestion - sourceExcerpt manquant - erreur dédiée', () => {
      const errors = AiExerciseGenerationService.validateQuestion({ ...VALID_OPEN_QUESTION, sourceExcerpt: '' }, 0)
      expect(errors.some((e) => e.includes('sourceExcerpt'))).toBe(true)
    })

    it('validateQuestion - type invalide - erreur dédiée', () => {
      const errors = AiExerciseGenerationService.validateQuestion({ ...VALID_OPEN_QUESTION, type: 'true_false' }, 0)
      expect(errors.some((e) => e.includes('"type"'))).toBe(true)
    })

    it('validateQuestion - question non objet - une seule erreur', () => {
      expect(AiExerciseGenerationService.validateQuestion(null, 0)).toEqual(['Question #1 : doit être un objet.'])
    })

    describe('type "open"', () => {
      it('validateQuestion - correct_answer manquant - erreur dédiée', () => {
        const question = { ...VALID_OPEN_QUESTION, content: { correct_answer: '' } }
        const errors = AiExerciseGenerationService.validateQuestion(question, 0)
        expect(errors.some((e) => e.includes('content.correct_answer'))).toBe(true)
      })

      it('validateQuestion - accepted_answers non tableau - erreur dédiée', () => {
        const question = { ...VALID_OPEN_QUESTION, content: { correct_answer: 'Paris', accepted_answers: 'x' } }
        const errors = AiExerciseGenerationService.validateQuestion(question, 0)
        expect(errors.some((e) => e.includes('content.accepted_answers'))).toBe(true)
      })

      it('validateQuestion - accepted_answers absent - valide (optionnel)', () => {
        const question = { ...VALID_OPEN_QUESTION, content: { correct_answer: 'Paris' } }
        expect(AiExerciseGenerationService.validateQuestion(question, 0)).toEqual([])
      })
    })

    describe('type "mcq"', () => {
      it('validateQuestion - 2 réponses correctes - erreur dédiée', () => {
        const question = {
          ...VALID_MCQ_QUESTION,
          content: {
            options: [
              { text: 'Paris', correct: true },
              { text: 'Madrid', correct: true },
              { text: 'Berlin', correct: false }
            ]
          }
        }
        const errors = AiExerciseGenerationService.validateQuestion(question, 0)
        expect(errors.some((e) => e.includes('exactement une'))).toBe(true)
      })

      it('validateQuestion - aucune réponse correcte - erreur dédiée', () => {
        const question = {
          ...VALID_MCQ_QUESTION,
          content: { options: [{ text: 'Paris', correct: false }, { text: 'Madrid', correct: false }, { text: 'Berlin', correct: false }] }
        }
        const errors = AiExerciseGenerationService.validateQuestion(question, 0)
        expect(errors.some((e) => e.includes('exactement une'))).toBe(true)
      })

      it('validateQuestion - moins de 3 options - erreur dédiée', () => {
        const question = { ...VALID_MCQ_QUESTION, content: { options: [{ text: 'Paris', correct: true }] } }
        const errors = AiExerciseGenerationService.validateQuestion(question, 0)
        expect(errors.some((e) => e.includes('3 à 4 entrées'))).toBe(true)
      })

      it('validateQuestion - option sans text - erreur dédiée', () => {
        const question = {
          ...VALID_MCQ_QUESTION,
          content: { options: [{ text: 'Paris', correct: true }, { text: '', correct: false }, { text: 'Berlin', correct: false }] }
        }
        const errors = AiExerciseGenerationService.validateQuestion(question, 0)
        expect(errors.some((e) => e.includes('text'))).toBe(true)
      })
    })

    describe('type "fill_blank"', () => {
      it('validateQuestion - template manquant - erreur dédiée', () => {
        const question = { ...VALID_FILL_BLANK_QUESTION, content: { blanks: ['Paris'] } }
        const errors = AiExerciseGenerationService.validateQuestion(question, 0)
        expect(errors.some((e) => e.includes('content.template'))).toBe(true)
      })

      it('validateQuestion - blanks vide - erreur dédiée', () => {
        const question = { ...VALID_FILL_BLANK_QUESTION, content: { template: 'Un {{0}} texte.', blanks: [] } }
        const errors = AiExerciseGenerationService.validateQuestion(question, 0)
        expect(errors.some((e) => e.includes('content.blanks'))).toBe(true)
      })

      it('validateQuestion - marqueurs en trop par rapport à blanks - erreur dédiée', () => {
        const question = {
          ...VALID_FILL_BLANK_QUESTION,
          content: { template: '{{0}} et {{1}} et {{2}}.', blanks: ['a', 'b'] }
        }
        const errors = AiExerciseGenerationService.validateQuestion(question, 0)
        expect(errors.some((e) => e.includes('content.template'))).toBe(true)
      })

      it('validateQuestion - marqueur manquant par rapport à blanks - erreur dédiée', () => {
        const question = {
          ...VALID_FILL_BLANK_QUESTION,
          content: { template: '{{0}} seulement.', blanks: ['a', 'b'] }
        }
        const errors = AiExerciseGenerationService.validateQuestion(question, 0)
        expect(errors.some((e) => e.includes('content.template'))).toBe(true)
      })

      it('validateQuestion - marqueur non séquentiel (commence à 1) - erreur dédiée', () => {
        const question = {
          ...VALID_FILL_BLANK_QUESTION,
          content: { template: '{{1}} et {{2}}.', blanks: ['a', 'b'] }
        }
        const errors = AiExerciseGenerationService.validateQuestion(question, 0)
        expect(errors.some((e) => e.includes('content.template'))).toBe(true)
      })
    })

    describe('type "reorder"', () => {
      it('validateQuestion - un seul fragment - erreur dédiée', () => {
        const question = { ...VALID_REORDER_QUESTION, content: { fragments: ['seul'] } }
        const errors = AiExerciseGenerationService.validateQuestion(question, 0)
        expect(errors.some((e) => e.includes('au moins 2 fragments'))).toBe(true)
      })

      it('validateQuestion - fragments strictement identiques - erreur dédiée', () => {
        const question = { ...VALID_REORDER_QUESTION, content: { fragments: ['a', 'a', 'a'] } }
        const errors = AiExerciseGenerationService.validateQuestion(question, 0)
        expect(errors.some((e) => e.includes('strictement identiques'))).toBe(true)
      })

      it('validateQuestion - fragment vide - erreur dédiée', () => {
        const question = { ...VALID_REORDER_QUESTION, content: { fragments: ['a', ''] } }
        const errors = AiExerciseGenerationService.validateQuestion(question, 0)
        expect(errors.some((e) => e.includes('chaîne non vide'))).toBe(true)
      })
    })
  })

  describe('validatePayload', () => {
    it('validatePayload - payload valide (4 types) - aucune erreur', () => {
      const payload = {
        questions: [VALID_OPEN_QUESTION, VALID_MCQ_QUESTION, VALID_FILL_BLANK_QUESTION, VALID_REORDER_QUESTION],
        warning: null
      }
      expect(AiExerciseGenerationService.validatePayload(payload, 5)).toEqual([])
    })

    it('validatePayload - questions absent ou non tableau - erreur dédiée', () => {
      expect(AiExerciseGenerationService.validatePayload({ questions: 'x' }, 5)).toEqual([
        'Le champ "questions" doit être un tableau.'
      ])
    })

    it('validatePayload - plus de questions que demandé - erreur dédiée', () => {
      const payload = { questions: [VALID_OPEN_QUESTION, VALID_MCQ_QUESTION], warning: null }
      const errors = AiExerciseGenerationService.validatePayload(payload, 1)
      expect(errors.some((e) => e.includes('dépasse le nombre demandé'))).toBe(true)
    })

    it('validatePayload - warning non conforme - erreur dédiée', () => {
      const payload = { questions: [], warning: 42 }
      expect(AiExerciseGenerationService.validatePayload(payload, 5)).toEqual([
        'Le champ "warning" doit être une chaîne ou null.'
      ])
    })

    it('validatePayload - questions vide avec warning explicite - valide', () => {
      const payload = { questions: [], warning: 'Contenu source insuffisant.' }
      expect(AiExerciseGenerationService.validatePayload(payload, 5)).toEqual([])
    })

    it('validatePayload - questionType "mcq" mais une question "open" - erreur dédiée', () => {
      const payload = { questions: [VALID_OPEN_QUESTION, VALID_MCQ_QUESTION], warning: null }
      const errors = AiExerciseGenerationService.validatePayload(payload, 5, 'mcq')
      expect(errors.some((e) => e.includes('ne correspond pas au type demandé "mcq"'))).toBe(true)
    })

    it('validatePayload - questionType "mixed" - accepte un mélange des 4 types', () => {
      const payload = {
        questions: [VALID_OPEN_QUESTION, VALID_MCQ_QUESTION, VALID_FILL_BLANK_QUESTION, VALID_REORDER_QUESTION],
        warning: null
      }
      expect(AiExerciseGenerationService.validatePayload(payload, 5, 'mixed')).toEqual([])
    })

    it('validatePayload - questionType non précisé - défaut "mixed", accepte un mélange', () => {
      const payload = { questions: [VALID_OPEN_QUESTION, VALID_MCQ_QUESTION], warning: null }
      expect(AiExerciseGenerationService.validatePayload(payload, 5)).toEqual([])
    })
  })

  describe('parseAndValidate', () => {
    it('parseAndValidate - JSON valide et conforme - valid true avec le payload', () => {
      const raw = JSON.stringify({ questions: [VALID_OPEN_QUESTION], warning: null })
      const result = AiExerciseGenerationService.parseAndValidate(raw, 5)
      expect(result.valid).toBe(true)
      expect(result.payload.questions).toHaveLength(1)
      expect(result.payload.warning).toBeNull()
    })

    it('parseAndValidate - warning absent du JSON - normalisé à null', () => {
      const raw = JSON.stringify({ questions: [VALID_OPEN_QUESTION] })
      const result = AiExerciseGenerationService.parseAndValidate(raw, 5)
      expect(result.valid).toBe(true)
      expect(result.payload.warning).toBeNull()
    })

    it('parseAndValidate - texte non-JSON - valid false avec message dédié', () => {
      const result = AiExerciseGenerationService.parseAndValidate('ceci n\'est pas du JSON', 5)
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('JSON valide')
    })

    it('parseAndValidate - JSON valide mais non conforme au schéma - valid false', () => {
      const raw = JSON.stringify({ questions: [{ statement: '' }] })
      const result = AiExerciseGenerationService.parseAndValidate(raw, 5)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('callModel', () => {
    const messages = [{ role: 'user', content: 'x' }]

    it('callModel - clé API absente - lève une erreur 500', async () => {
      await expect(AiExerciseGenerationService.callModel(messages)).rejects.toMatchObject({
        message: 'Service de génération IA non configuré (clé API manquante).',
        statusCode: 500
      })
    })

    it('callModel - appel réussi - retourne le contenu et appelle le bon endpoint/modèle', async () => {
      process.env.MISTRAL_API_KEY = 'test-key'
      process.env.MISTRAL_MODEL = 'mistral-small-latest'
      const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(mockFetchResponse({ questions: [], warning: null }))

      const result = await AiExerciseGenerationService.callModel(messages)

      expect(JSON.parse(result.content)).toEqual({ questions: [], warning: null })
      expect(result.usage).toEqual({ promptTokens: 100, completionTokens: 50 })
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

      await expect(AiExerciseGenerationService.callModel(messages)).rejects.toMatchObject({
        message: 'Le service de génération IA est indisponible pour le moment.',
        statusCode: 502
      })
    })

    it('callModel - erreur réseau - lève une erreur 502', async () => {
      process.env.MISTRAL_API_KEY = 'test-key'
      jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'))

      await expect(AiExerciseGenerationService.callModel(messages)).rejects.toMatchObject({
        message: 'Le service de génération IA est indisponible pour le moment.',
        statusCode: 502
      })
    })

    it('callModel - contenu vide dans la réponse - lève une erreur 502 en attachant l\'usage réel', async () => {
      process.env.MISTRAL_API_KEY = 'test-key'
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: '' } }], usage: { prompt_tokens: 30, completion_tokens: 0 } })
      })

      await expect(AiExerciseGenerationService.callModel(messages)).rejects.toMatchObject({
        message: "Le service de génération IA n'a renvoyé aucun contenu.",
        statusCode: 502,
        usage: { promptTokens: 30, completionTokens: 0 }
      })
    })

    describe('429 (rate limit Mistral)', () => {
      const rateLimitedResponse = (retryAfter = null) => ({
        ok: false,
        status: 429,
        headers: { get: (name) => (name === 'retry-after' ? retryAfter : null) },
        text: async () => '{"message":"Rate limit exceeded"}'
      })

      it('429 puis succès — réessaie après le backoff et retourne le contenu', async () => {
        process.env.MISTRAL_API_KEY = 'test-key'
        jest.spyOn(AiExerciseGenerationService, 'sleep').mockResolvedValue()
        const fetchMock = jest.spyOn(global, 'fetch')
          .mockResolvedValueOnce(rateLimitedResponse())
          .mockResolvedValueOnce(mockFetchResponse({ questions: [], warning: null }))

        const result = await AiExerciseGenerationService.callModel(messages)

        expect(JSON.parse(result.content)).toEqual({ questions: [], warning: null })
        expect(fetchMock).toHaveBeenCalledTimes(2)
        expect(AiExerciseGenerationService.sleep).toHaveBeenCalledTimes(1)
      })

      it('429 - respecte l\'en-tête Retry-After quand Mistral le fournit', async () => {
        process.env.MISTRAL_API_KEY = 'test-key'
        jest.spyOn(AiExerciseGenerationService, 'sleep').mockResolvedValue()
        jest.spyOn(global, 'fetch')
          .mockResolvedValueOnce(rateLimitedResponse('2'))
          .mockResolvedValueOnce(mockFetchResponse({ questions: [], warning: null }))

        await AiExerciseGenerationService.callModel(messages)

        expect(AiExerciseGenerationService.sleep).toHaveBeenCalledWith(2000)
      })

      it('429 persistant au-delà de RATE_LIMIT_MAX_RETRIES - lève une erreur 502', async () => {
        process.env.MISTRAL_API_KEY = 'test-key'
        jest.spyOn(AiExerciseGenerationService, 'sleep').mockResolvedValue()
        const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(rateLimitedResponse())

        await expect(AiExerciseGenerationService.callModel(messages)).rejects.toMatchObject({
          message: 'Le service de génération IA est indisponible pour le moment.',
          statusCode: 502
        })
        expect(fetchMock).toHaveBeenCalledTimes(4)
      })
    })
  })

  describe('generateExercises', () => {
    const validParams = { sourceText: 'Un texte source.', questionCount: 2, questionType: 'mixed' }

    beforeEach(() => {
      process.env.MISTRAL_API_KEY = 'test-key'
    })

    it('generateExercises - entrée invalide - lève avant tout appel réseau', async () => {
      const fetchMock = jest.spyOn(global, 'fetch')
      await expect(AiExerciseGenerationService.generateExercises({ ...validParams, questionCount: 0 })).rejects.toMatchObject({
        statusCode: 400
      })
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('generateExercises - 1er essai conforme - retourne le brouillon, un seul appel modèle', async () => {
      const fetchMock = jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(mockFetchResponse({ questions: [VALID_OPEN_QUESTION], warning: null }))

      const result = await AiExerciseGenerationService.generateExercises(validParams)

      expect(result.questions).toHaveLength(1)
      expect(result.warning).toBeNull()
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(result.usage).toEqual({ model: 'mistral-small-latest', promptTokens: 100, completionTokens: 50 })
    })

    it('generateExercises - sortie conforme mais avec des questions en doublon - filtre les doublons et complète le warning', async () => {
      const duplicateQuestion = { ...VALID_OPEN_QUESTION, sourceExcerpt: 'La photosynthèse est un processus.' }
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(mockFetchResponse({ questions: [VALID_OPEN_QUESTION, duplicateQuestion], warning: null }))

      const result = await AiExerciseGenerationService.generateExercises({ ...validParams, questionCount: 2 })

      expect(result.questions).toEqual([VALID_OPEN_QUESTION])
      expect(result.warning).toBe('1 question(s) supprimée(s) automatiquement car redondante(s) avec une autre question du même lot.')
    })

    it('generateExercises - 1er essai non conforme puis 2e conforme - retry avec correction, retourne le résultat du 2e essai', async () => {
      const fetchMock = jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce(mockFetchResponse({ questions: 'pas un tableau' }))
        .mockResolvedValueOnce(mockFetchResponse({ questions: [VALID_OPEN_QUESTION], warning: null }))

      const result = await AiExerciseGenerationService.generateExercises(validParams)

      expect(result.questions).toHaveLength(1)
      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(result.usage).toEqual({ model: 'mistral-small-latest', promptTokens: 200, completionTokens: 100 })
      const secondCallBody = JSON.parse(fetchMock.mock.calls[1][1].body)
      expect(secondCallBody.messages).toHaveLength(4)
      expect(secondCallBody.messages[2].role).toBe('assistant')
      expect(secondCallBody.messages[3].role).toBe('user')
      expect(secondCallBody.messages[3].content).toContain("n'est pas conforme")
    })

    it('generateExercises - 1er et 2e essai non conformes - lève une erreur 502 après 2 appels, avec l\'usage réel cumulé attaché', async () => {
      const fetchMock = jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(mockFetchResponse({ questions: 'pas un tableau' }))

      await expect(AiExerciseGenerationService.generateExercises(validParams)).rejects.toMatchObject({
        message: "La génération n'a pas produit un résultat exploitable. Réessayez.",
        statusCode: 502,
        usage: { model: 'mistral-small-latest', promptTokens: 200, completionTokens: 100 }
      })
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('generateExercises - erreur réseau au 1er appel - propage sans tenter de 2e appel, sans usage attaché', async () => {
      const fetchMock = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'))

      const error = await AiExerciseGenerationService.generateExercises(validParams).catch((e) => e)
      expect(error.statusCode).toBe(502)
      expect(error.usage).toBeUndefined()
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('generateExercises - questionType "fill_blank" avec incohérence template/blanks au 1er essai - déclenche le retry', async () => {
      const invalidFillBlank = {
        ...VALID_FILL_BLANK_QUESTION,
        content: { template: '{{0}} et {{1}} et {{2}}.', blanks: ['a', 'b'] }
      }
      const fetchMock = jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce(mockFetchResponse({ questions: [invalidFillBlank], warning: null }))
        .mockResolvedValueOnce(mockFetchResponse({ questions: [VALID_FILL_BLANK_QUESTION], warning: null }))

      const result = await AiExerciseGenerationService.generateExercises({ ...validParams, questionType: 'fill_blank' })

      expect(result.questions).toEqual([VALID_FILL_BLANK_QUESTION])
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('generateExercises - questionType "reorder" avec fragments identiques au 1er essai - déclenche le retry', async () => {
      const invalidReorder = { ...VALID_REORDER_QUESTION, content: { fragments: ['a', 'a'] } }
      const fetchMock = jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce(mockFetchResponse({ questions: [invalidReorder], warning: null }))
        .mockResolvedValueOnce(mockFetchResponse({ questions: [VALID_REORDER_QUESTION], warning: null }))

      const result = await AiExerciseGenerationService.generateExercises({ ...validParams, questionType: 'reorder' })

      expect(result.questions).toEqual([VALID_REORDER_QUESTION])
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('generateExercises - questionType "mcq" mais 1re question "open" - déclenche le retry, accepte le 2e essai conforme', async () => {
      const fetchMock = jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce(mockFetchResponse({ questions: [VALID_OPEN_QUESTION], warning: null }))
        .mockResolvedValueOnce(mockFetchResponse({ questions: [VALID_MCQ_QUESTION], warning: null }))

      const result = await AiExerciseGenerationService.generateExercises({ ...validParams, questionType: 'mcq' })

      expect(result.questions).toEqual([VALID_MCQ_QUESTION])
      expect(fetchMock).toHaveBeenCalledTimes(2)
      const secondCallBody = JSON.parse(fetchMock.mock.calls[1][1].body)
      expect(secondCallBody.messages[3].content).toContain('type demandé "mcq"')
    })
  })
})
