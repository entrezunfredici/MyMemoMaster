import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAiCardGenerationStore } from '@/stores/aiCardGeneration'

const { mockGet, mockPost } = vi.hoisted(() => ({
  mockGet:  vi.fn(),
  mockPost: vi.fn(),
}))

vi.mock('@/helpers/api', () => ({ api: { get: mockGet, post: mockPost } }))

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

    expect(mockPost).toHaveBeenCalledWith('ai-generation-batches', expect.any(FormData))
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
})
