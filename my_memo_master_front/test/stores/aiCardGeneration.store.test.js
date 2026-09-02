import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAiCardGenerationStore } from '@/stores/aiCardGeneration'
import { normalizeFormulaSyntax } from '@/components/interpreter/interpreter.js'

const { mockGet, mockPost, mockPatch } = vi.hoisted(() => ({
  mockGet:   vi.fn(),
  mockPost:  vi.fn(),
  mockPatch: vi.fn(),
}))

vi.mock('@/helpers/api', () => ({ api: { get: mockGet, post: mockPost, patch: mockPatch } }))

describe('useAiCardGenerationStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // ── fetchQuota ────────────────────────────────────────────────────────────

  it('fetchQuota - succès - peuple quota et retourne true', async () => {
    const summary = {
      generationsToday: 2,
      maxGenerationsPerDay: 10,
      remainingGenerationsToday: 8,
      budgetSpentThisMonthUsd: 0.05,
      maxBudgetUsdPerMonth: 20,
    }
    mockGet.mockResolvedValueOnce({ status: 200, data: summary })

    const store = useAiCardGenerationStore()
    const result = await store.fetchQuota()

    expect(mockGet).toHaveBeenCalledWith('ai-generation-batches/quota')
    expect(store.quota).toEqual(summary)
    expect(result).toBe(true)
  })

  it('fetchQuota - réponse en erreur - quota reste null, retourne false (affichage masqué, best-effort)', async () => {
    mockGet.mockResolvedValueOnce({ status: 500, data: { message: 'Erreur serveur.' } })

    const store = useAiCardGenerationStore()
    const result = await store.fetchQuota()

    expect(store.quota).toBeNull()
    expect(result).toBe(false)
  })

  it('fetchQuota - erreur réseau (api.get renvoie undefined) - retourne false sans lever', async () => {
    mockGet.mockResolvedValueOnce(undefined)

    const store = useAiCardGenerationStore()
    const result = await store.fetchQuota()

    expect(result).toBe(false)
    expect(store.quota).toBeNull()
  })

  // ── generate ──────────────────────────────────────────────────────────────

  it('generate - cas nominal (texte) - status "done", lastBatch peuplé, retourne true', async () => {
    const batch = { id: 1, status: 'pending', cards: [{ id: 1, statement: 'Q1' }] }
    mockPost.mockResolvedValueOnce({ status: 201, data: batch })

    const store = useAiCardGenerationStore()
    const result = await store.generate({
      idSystem: 5,
      sourceText: 'Un texte source.',
      cardCount: 8,
      cardType: 'open',
    })

    expect(mockPost).toHaveBeenCalledWith('ai-generation-batches', expect.any(FormData), { timeout: 300000 })
    const formData = mockPost.mock.calls[0][1]
    expect(formData.get('idSystem')).toBe('5')
    expect(formData.get('sourceText')).toBe('Un texte source.')
    expect(formData.get('cardCount')).toBe('8')
    expect(formData.get('cardType')).toBe('open')
    expect(formData.has('pdf')).toBe(false)

    expect(store.status).toBe('done')
    expect(store.lastBatch).toEqual(batch)
    expect(result).toBe(true)
  })

  it('generate - cas nominal (PDF) - envoie le fichier, pas de sourceText', async () => {
    mockPost.mockResolvedValueOnce({ status: 201, data: { id: 2, cards: [] } })
    const pdfFile = new File(['%PDF-1.4'], 'cours.pdf', { type: 'application/pdf' })

    const store = useAiCardGenerationStore()
    await store.generate({ idSystem: 5, pdfFile, cardCount: 3, cardType: 'mcq' })

    const formData = mockPost.mock.calls[0][1]
    expect(formData.get('pdf')).toBe(pdfFile)
    expect(formData.has('sourceText')).toBe(false)
  })

  it('generate - matière fournie - subjectContext ajouté au FormData', async () => {
    mockPost.mockResolvedValueOnce({ status: 201, data: { id: 3, cards: [] } })

    const store = useAiCardGenerationStore()
    await store.generate({ idSystem: 5, sourceText: 'Texte.', subjectContext: 'SVT', cardCount: 5, cardType: 'open' })

    const formData = mockPost.mock.calls[0][1]
    expect(formData.get('subjectContext')).toBe('SVT')
  })

  it('generate - erreur connue (429 quota) - status "error", errorMessage du serveur, retourne false', async () => {
    mockPost.mockResolvedValueOnce({ status: 429, data: { message: 'Quota quotidien de générations par IA atteint.' } })

    const store = useAiCardGenerationStore()
    const result = await store.generate({ idSystem: 5, sourceText: 'Texte.', cardCount: 5, cardType: 'open' })

    expect(store.status).toBe('error')
    expect(store.errorMessage).toBe('Quota quotidien de générations par IA atteint.')
    expect(store.lastBatch).toBeNull()
    expect(result).toBe(false)
  })

  it('generate - envoie un timeout étendu (300000 ms), distinct du timeout global 10000 ms (bug C-01.11)', async () => {
    mockPost.mockResolvedValueOnce({ status: 201, data: { id: 5, cards: [] } })

    const store = useAiCardGenerationStore()
    await store.generate({ idSystem: 5, sourceText: 'Texte.', cardCount: 5, cardType: 'open' })

    const config = mockPost.mock.calls[0][2]
    expect(config.timeout).toBe(300000)
  })

  it('generate - erreur réseau (api.post renvoie undefined) - status "error", message générique', async () => {
    mockPost.mockResolvedValueOnce(undefined)

    const store = useAiCardGenerationStore()
    const result = await store.generate({ idSystem: 5, sourceText: 'Texte.', cardCount: 5, cardType: 'open' })

    expect(store.status).toBe('error')
    expect(store.errorMessage).toBe('La génération a échoué. Réessayez.')
    expect(result).toBe(false)
  })

  // ── reset ─────────────────────────────────────────────────────────────────

  it('reset - remet status/errorMessage/lastBatch à leur valeur initiale', async () => {
    mockPost.mockResolvedValueOnce({ status: 201, data: { id: 4, cards: [] } })
    const store = useAiCardGenerationStore()
    await store.generate({ idSystem: 5, sourceText: 'Texte.', cardCount: 5, cardType: 'open' })

    store.reset()

    expect(store.status).toBe('idle')
    expect(store.errorMessage).toBe('')
    expect(store.lastBatch).toBeNull()
  })

  // ── fetchPendingBatches (C-01.09) ────────────────────────────────────────────

  it('fetchPendingBatches - succès - peuple pendingBatches et retourne true', async () => {
    const batches = [{ id: 1, idSystem: 5, status: 'pending', cards: [] }]
    mockGet.mockResolvedValueOnce({ status: 200, data: batches })

    const store = useAiCardGenerationStore()
    const result = await store.fetchPendingBatches()

    expect(mockGet).toHaveBeenCalledWith('ai-generation-batches')
    expect(store.pendingBatches).toEqual(batches)
    expect(result).toBe(true)
  })

  it('fetchPendingBatches - échec - pendingBatches vidé, retourne false', async () => {
    const store = useAiCardGenerationStore()
    store.pendingBatches = [{ id: 1 }]
    mockGet.mockResolvedValueOnce({ status: 500, data: { message: 'Erreur.' } })

    const result = await store.fetchPendingBatches()

    expect(store.pendingBatches).toEqual([])
    expect(result).toBe(false)
  })

  // ── updateCard (C-01.09) ──────────────────────────────────────────────────────

  it('updateCard - succès - retourne la carte mise à jour', async () => {
    const updated = { id: 10, status: 'rejected' }
    mockPatch.mockResolvedValueOnce({ status: 200, data: updated })

    const store = useAiCardGenerationStore()
    const result = await store.updateCard(10, { status: 'rejected' })

    expect(mockPatch).toHaveBeenCalledWith('ai-generation-batches/cards/10', { status: 'rejected' })
    expect(result).toEqual(updated)
  })

  it('updateCard - échec (batch déjà validé, 404) - retourne null', async () => {
    mockPatch.mockResolvedValueOnce({ status: 404, data: { message: 'Carte introuvable ou non modifiable.' } })

    const store = useAiCardGenerationStore()
    const result = await store.updateCard(10, { status: 'accepted' })

    expect(result).toBeNull()
  })

  it('updateCard - erreur réseau - retourne null sans lever', async () => {
    mockPatch.mockResolvedValueOnce(undefined)

    const store = useAiCardGenerationStore()
    const result = await store.updateCard(10, { status: 'accepted' })

    expect(result).toBeNull()
  })

  // ── markBatchStatus (C-01.09) ─────────────────────────────────────────────────

  it('markBatchStatus - succès - retourne true', async () => {
    mockPatch.mockResolvedValueOnce({ status: 200, data: { id: 1, status: 'validated' } })

    const store = useAiCardGenerationStore()
    const result = await store.markBatchStatus(1, 'validated')

    expect(mockPatch).toHaveBeenCalledWith('ai-generation-batches/1/status', { status: 'validated' })
    expect(result).toBe(true)
  })

  it('markBatchStatus - échec - retourne false', async () => {
    mockPatch.mockResolvedValueOnce({ status: 404, data: { message: 'Génération introuvable.' } })

    const store = useAiCardGenerationStore()
    const result = await store.markBatchStatus(1, 'discarded')

    expect(result).toBe(false)
  })

  // ── promoteCard (C-01.09) ─────────────────────────────────────────────────────

  it('promoteCard - carte "open", cas nominal - crée question, réponses (answer + acceptedAnswers), carte', async () => {
    mockPost
      .mockResolvedValueOnce({ status: 201, data: { idQuestion: 42 } })     // POST /questions
      .mockResolvedValueOnce({ status: 201, data: { idResponse: 1 } })     // POST /responses (answer)
      .mockResolvedValueOnce({ status: 201, data: { idResponse: 2 } })     // POST /responses (variante)
      .mockResolvedValueOnce({ status: 201, data: { idCard: 100 } })       // POST /leitnercards

    const store = useAiCardGenerationStore()
    const result = await store.promoteCard({
      idSystem: 5,
      statement: 'Qu\'est-ce que la photosynthèse ?',
      type: 'open',
      answer: 'Un processus.',
      acceptedAnswers: ['Une conversion.'],
    })

    expect(result).toEqual({ success: true })
    expect(mockPost).toHaveBeenNthCalledWith(1, 'questions', {
      statement: normalizeFormulaSyntax('Qu\'est-ce que la photosynthèse ?'),
      questionPosition: 0,
      type: 'open',
      content: null,
    })
    expect(mockPost).toHaveBeenNthCalledWith(2, 'responses', {
      content: normalizeFormulaSyntax('Un processus.'),
      correction: true,
      idQuestion: 42,
    })
    expect(mockPost).toHaveBeenNthCalledWith(3, 'responses', {
      content: normalizeFormulaSyntax('Une conversion.'),
      correction: true,
      idQuestion: 42,
    })
    expect(mockPost).toHaveBeenNthCalledWith(4, 'leitnercards', { idQuestion: 42, idSystem: 5, mindMapNodeId: null })
  })

  it('promoteCard - carte "mcq", cas nominal - pas de POST /responses', async () => {
    mockPost
      .mockResolvedValueOnce({ status: 201, data: { idQuestion: 42 } })
      .mockResolvedValueOnce({ status: 201, data: { idCard: 100 } })

    const store = useAiCardGenerationStore()
    const options = [{ text: 'Paris', correct: true }, { text: 'Lyon', correct: false }]
    const result = await store.promoteCard({ idSystem: 5, statement: 'Capitale ?', type: 'mcq', options })

    expect(result).toEqual({ success: true })
    expect(mockPost).toHaveBeenCalledTimes(2) // questions puis leitnercards, aucune réponse
    expect(mockPost).toHaveBeenNthCalledWith(1, 'questions', expect.objectContaining({
      type: 'mcq',
      content: { options: options.map(o => ({ text: normalizeFormulaSyntax(o.text), correct: o.correct })) },
    }))
  })

  it('promoteCard - échec sur POST /questions - retourne success:false, aucun autre appel', async () => {
    mockPost.mockResolvedValueOnce({ status: 400, data: { message: 'Énoncé invalide.' } })

    const store = useAiCardGenerationStore()
    const result = await store.promoteCard({ idSystem: 5, statement: 'X', type: 'open', answer: 'Y' })

    expect(result).toEqual({ success: false, message: 'Énoncé invalide.' })
    expect(mockPost).toHaveBeenCalledTimes(1)
  })

  it('promoteCard - échec sur POST /responses - retourne success:false, /leitnercards jamais appelé', async () => {
    mockPost
      .mockResolvedValueOnce({ status: 201, data: { idQuestion: 42 } })
      .mockResolvedValueOnce({ status: 500, data: { message: 'Erreur serveur.' } })

    const store = useAiCardGenerationStore()
    const result = await store.promoteCard({ idSystem: 5, statement: 'X', type: 'open', answer: 'Y' })

    expect(result).toEqual({ success: false, message: 'Erreur serveur.' })
    expect(mockPost).toHaveBeenCalledTimes(2)
  })

  it('promoteCard - échec sur POST /leitnercards - retourne success:false', async () => {
    mockPost
      .mockResolvedValueOnce({ status: 201, data: { idQuestion: 42 } })
      .mockResolvedValueOnce({ status: 201, data: { idResponse: 1 } })
      .mockResolvedValueOnce({ status: 403, data: { message: 'Droits insuffisants.' } })

    const store = useAiCardGenerationStore()
    const result = await store.promoteCard({ idSystem: 5, statement: 'X', type: 'open', answer: 'Y' })

    expect(result).toEqual({ success: false, message: 'Droits insuffisants.' })
  })

  it('promoteCard - erreur réseau sur le tout premier appel - retourne un message générique', async () => {
    mockPost.mockResolvedValueOnce(undefined)

    const store = useAiCardGenerationStore()
    const result = await store.promoteCard({ idSystem: 5, statement: 'X', type: 'open', answer: 'Y' })

    expect(result).toEqual({ success: false, message: 'Erreur lors de la création de la question.' })
  })
})
