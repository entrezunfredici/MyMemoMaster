const ImageCaptioningService = require('../../services/ImageCaptioning.service')

const VALID_PEDAGOGICAL = {
  isPedagogicalContent: true,
  caption: 'Schéma en coupe d\'une chloroplaste.',
  warning: null
}

const VALID_DECORATIVE = {
  isPedagogicalContent: false,
  caption: null,
  warning: null
}

const mockFetchResponse = (content, usage = { prompt_tokens: 200, completion_tokens: 60 }) => ({
  ok: true,
  status: 200,
  json: async () => ({ choices: [{ message: { content: JSON.stringify(content) } }], usage })
})

describe('ImageCaptioningService', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
    delete process.env.MISTRAL_API_KEY
  })

  describe('buildSystemPrompt', () => {
    it('buildSystemPrompt - langue demandée - inclut la langue et les règles clés', () => {
      const prompt = ImageCaptioningService.buildSystemPrompt('en')
      expect(prompt).toContain('en')
      expect(prompt).toContain('isPedagogicalContent')
      expect(prompt).toContain('JSON')
    })
  })

  describe('buildUserPrompt', () => {
    it('buildUserPrompt - contexte de page et matière fournis - inclut les deux blocs', () => {
      const prompt = ImageCaptioningService.buildUserPrompt({
        pageContext: 'Texte de la page.',
        subjectContext: 'SVT'
      })
      expect(prompt).toContain('matière : SVT')
      expect(prompt).toContain('Texte de la page.')
    })

    it('buildUserPrompt - contexte de page et matière absents - omet les deux blocs', () => {
      const prompt = ImageCaptioningService.buildUserPrompt({ pageContext: null, subjectContext: null })
      expect(prompt).not.toContain('matière :')
      expect(prompt).not.toContain('Texte de la page où apparaît')
    })
  })

  describe('validateInput', () => {
    it('validateInput - imageBase64 absente/vide - lève une erreur 400', () => {
      expect(() => ImageCaptioningService.validateInput({ imageBase64: null })).toThrow()
      expect(() => ImageCaptioningService.validateInput({ imageBase64: '   ' })).toThrow()
      try {
        ImageCaptioningService.validateInput({ imageBase64: undefined })
      } catch (error) {
        expect(error.statusCode).toBe(400)
      }
    })

    it('validateInput - imageBase64 fournie - ne lève rien', () => {
      expect(() => ImageCaptioningService.validateInput({ imageBase64: 'data:image/jpeg;base64,QUJD' })).not.toThrow()
    })
  })

  describe('validatePayload', () => {
    it('validatePayload - isPedagogicalContent absent/non booléen - erreur dédiée', () => {
      expect(ImageCaptioningService.validatePayload({})).toEqual(
        expect.arrayContaining([expect.stringContaining('isPedagogicalContent')])
      )
      expect(ImageCaptioningService.validatePayload({ isPedagogicalContent: 'oui' })).toEqual(
        expect.arrayContaining([expect.stringContaining('isPedagogicalContent')])
      )
    })

    it('validatePayload - isPedagogicalContent true sans caption exploitable - erreur dédiée', () => {
      expect(ImageCaptioningService.validatePayload({ isPedagogicalContent: true, caption: '' })).toEqual(
        expect.arrayContaining([expect.stringContaining('caption')])
      )
      expect(ImageCaptioningService.validatePayload({ isPedagogicalContent: true, caption: null })).toEqual(
        expect.arrayContaining([expect.stringContaining('caption')])
      )
    })

    it('validatePayload - isPedagogicalContent false avec une caption non nulle - erreur dédiée', () => {
      expect(
        ImageCaptioningService.validatePayload({ isPedagogicalContent: false, caption: 'texte' })
      ).toEqual(expect.arrayContaining([expect.stringContaining('caption')]))
    })

    it('validatePayload - warning ni chaîne ni null - erreur dédiée', () => {
      expect(
        ImageCaptioningService.validatePayload({ isPedagogicalContent: false, caption: null, warning: 42 })
      ).toEqual(expect.arrayContaining([expect.stringContaining('warning')]))
    })

    it('validatePayload - payload pédagogique valide - aucune erreur', () => {
      expect(ImageCaptioningService.validatePayload(VALID_PEDAGOGICAL)).toEqual([])
    })

    it('validatePayload - payload décoratif valide - aucune erreur', () => {
      expect(ImageCaptioningService.validatePayload(VALID_DECORATIVE)).toEqual([])
    })
  })

  describe('parseAndValidate', () => {
    it('parseAndValidate - JSON invalide - non valide', () => {
      expect(ImageCaptioningService.parseAndValidate('pas du json').valid).toBe(false)
    })

    it('parseAndValidate - payload valide - renvoie le payload normalisé', () => {
      const result = ImageCaptioningService.parseAndValidate(JSON.stringify(VALID_PEDAGOGICAL))
      expect(result).toEqual({ valid: true, payload: VALID_PEDAGOGICAL })
    })

    it('parseAndValidate - isPedagogicalContent false avec une caption superflue dans la sortie brute - forcée à null', () => {
      const result = ImageCaptioningService.parseAndValidate(
        JSON.stringify({ isPedagogicalContent: false, caption: null, warning: null })
      )
      expect(result.payload.caption).toBeNull()
    })
  })

  describe('callModel', () => {
    const messages = [{ role: 'user', content: [{ type: 'text', text: 'x' }] }]

    it('callModel - clé API absente - lève une erreur 500', async () => {
      await expect(ImageCaptioningService.callModel(messages)).rejects.toMatchObject({
        message: 'Service de captioning IA non configuré (clé API manquante).',
        statusCode: 500
      })
    })

    it('callModel - appel réussi - retourne le contenu et l\'usage', async () => {
      process.env.MISTRAL_API_KEY = 'test-key'
      const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(mockFetchResponse(VALID_PEDAGOGICAL))

      const result = await ImageCaptioningService.callModel(messages)

      expect(JSON.parse(result.content)).toEqual(VALID_PEDAGOGICAL)
      expect(result.usage).toEqual({ promptTokens: 200, completionTokens: 60 })
      const [url, options] = fetchMock.mock.calls[0]
      expect(url).toBe('https://api.mistral.ai/v1/chat/completions')
      const body = JSON.parse(options.body)
      expect(body.model).toBe('mistral-small-latest')
      expect(body.response_format).toEqual({ type: 'json_object' })
    })

    it('callModel - réponse HTTP en erreur - lève une erreur 502', async () => {
      process.env.MISTRAL_API_KEY = 'test-key'
      jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 500, text: async () => 'internal error' })

      await expect(ImageCaptioningService.callModel(messages)).rejects.toMatchObject({
        message: 'Le service de captioning IA est indisponible pour le moment.',
        statusCode: 502
      })
    })

    it('callModel - erreur réseau - lève une erreur 502', async () => {
      process.env.MISTRAL_API_KEY = 'test-key'
      jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'))

      await expect(ImageCaptioningService.callModel(messages)).rejects.toMatchObject({ statusCode: 502 })
    })

    it('callModel - 429 puis succès - réessaie après le backoff et retourne le contenu', async () => {
      process.env.MISTRAL_API_KEY = 'test-key'
      jest.spyOn(ImageCaptioningService, 'sleep').mockResolvedValue()
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce({ ok: false, status: 429, headers: { get: () => null }, text: async () => '' })
        .mockResolvedValueOnce(mockFetchResponse(VALID_PEDAGOGICAL))

      const result = await ImageCaptioningService.callModel(messages)
      expect(JSON.parse(result.content)).toEqual(VALID_PEDAGOGICAL)
      expect(ImageCaptioningService.sleep).toHaveBeenCalledTimes(1)
    })

    it('callModel - 429 persistant au-delà des tentatives - lève une erreur 502 avec rateLimited: true', async () => {
      process.env.MISTRAL_API_KEY = 'test-key'
      jest.spyOn(ImageCaptioningService, 'sleep').mockResolvedValue()
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValue({ ok: false, status: 429, headers: { get: () => null }, text: async () => '' })

      await expect(ImageCaptioningService.callModel(messages)).rejects.toMatchObject({
        statusCode: 502,
        rateLimited: true
      })
    })
  })

  describe('captionImage', () => {
    it('captionImage - imageBase64 absente - lève une erreur 400 avant tout appel réseau', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch')
      await expect(ImageCaptioningService.captionImage({ imageBase64: null })).rejects.toMatchObject({ statusCode: 400 })
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('captionImage - image pédagogique - retourne isPedagogicalContent/caption/usage', async () => {
      process.env.MISTRAL_API_KEY = 'test-key'
      jest.spyOn(global, 'fetch').mockResolvedValue(mockFetchResponse(VALID_PEDAGOGICAL))

      const result = await ImageCaptioningService.captionImage({ imageBase64: 'data:image/jpeg;base64,QUJD' })

      expect(result.isPedagogicalContent).toBe(true)
      expect(result.caption).toBe(VALID_PEDAGOGICAL.caption)
      expect(result.usage).toEqual({ model: 'mistral-small-latest', promptTokens: 200, completionTokens: 60 })
    })

    it('captionImage - image décorative - isPedagogicalContent false, caption null', async () => {
      process.env.MISTRAL_API_KEY = 'test-key'
      jest.spyOn(global, 'fetch').mockResolvedValue(mockFetchResponse(VALID_DECORATIVE))

      const result = await ImageCaptioningService.captionImage({ imageBase64: 'data:image/jpeg;base64,QUJD' })

      expect(result.isPedagogicalContent).toBe(false)
      expect(result.caption).toBeNull()
    })

    it('captionImage - image transmise en bloc image_url distinct du texte', async () => {
      process.env.MISTRAL_API_KEY = 'test-key'
      const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(mockFetchResponse(VALID_PEDAGOGICAL))

      await ImageCaptioningService.captionImage({ imageBase64: 'data:image/jpeg;base64,QUJD' })

      const [, options] = fetchMock.mock.calls[0]
      const body = JSON.parse(options.body)
      const userContent = body.messages[1].content
      expect(Array.isArray(userContent)).toBe(true)
      expect(userContent).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'text' }),
          { type: 'image_url', image_url: 'data:image/jpeg;base64,QUJD' }
        ])
      )
    })

    it('captionImage - 1er essai non conforme puis 2e essai valide - un seul retry, résultat exploité', async () => {
      process.env.MISTRAL_API_KEY = 'test-key'
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce(mockFetchResponse({ isPedagogicalContent: 'oui' }))
        .mockResolvedValueOnce(mockFetchResponse(VALID_PEDAGOGICAL))

      const result = await ImageCaptioningService.captionImage({ imageBase64: 'data:image/jpeg;base64,QUJD' })
      expect(result.isPedagogicalContent).toBe(true)
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    it('captionImage - non conforme après retry - lève une erreur 502 avec l\'usage cumulé attaché (C-01.06)', async () => {
      process.env.MISTRAL_API_KEY = 'test-key'
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce(mockFetchResponse({ isPedagogicalContent: 'oui' }))
        .mockResolvedValueOnce(mockFetchResponse({ isPedagogicalContent: 'non plus' }))

      const error = await ImageCaptioningService.captionImage({ imageBase64: 'data:image/jpeg;base64,QUJD' }).catch((e) => e)

      expect(error.statusCode).toBe(502)
      expect(error.usage).toEqual({ model: 'mistral-small-latest', promptTokens: 400, completionTokens: 120 })
    })
  })
})
