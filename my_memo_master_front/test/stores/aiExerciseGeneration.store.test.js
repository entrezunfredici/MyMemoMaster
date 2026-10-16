import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAiExerciseGenerationStore } from '@/stores/aiExerciseGeneration'

const { mockPost } = vi.hoisted(() => ({ mockPost: vi.fn() }))

vi.mock('@/helpers/api', () => ({ api: { post: mockPost } }))

describe('useAiExerciseGenerationStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // ── generate ──────────────────────────────────────────────────────────────

  it('generate - cas nominal (texte) - status "done", questions/warnings peuplés, retourne true', async () => {
    const payload = {
      success: true,
      questions: [{ statement: 'Q1', type: 'open', content: { correct_answer: 'A1' }, sourceExcerpt: 'E1' }],
      warnings: [],
      usage: { model: 'mistral-small-latest', promptTokens: 10, completionTokens: 5 }
    }
    mockPost.mockResolvedValueOnce({ status: 200, data: payload })

    const store = useAiExerciseGenerationStore()
    const result = await store.generate({ sourceText: 'Un texte source.', questionCount: 3, questionType: 'mixed' })

    expect(mockPost).toHaveBeenCalledWith('ai-exercise-generations', expect.any(FormData), { timeout: 300000 })
    const formData = mockPost.mock.calls[0][1]
    expect(formData.get('sourceText')).toBe('Un texte source.')
    expect(formData.get('questionCount')).toBe('3')
    expect(formData.get('questionType')).toBe('mixed')
    expect(formData.has('pdf')).toBe(false)

    expect(result).toBe(true)
    expect(store.status).toBe('done')
    expect(store.questions).toEqual(payload.questions)
    expect(store.warnings).toEqual([])
    expect(store.suggestManualCreation).toBe(false)
  })

  it('generate - cas nominal (PDF) - envoie le fichier, pas de sourceText', async () => {
    mockPost.mockResolvedValueOnce({ status: 200, data: { success: true, questions: [], warnings: [] } })
    const pdfFile = new File(['%PDF-1.4'], 'cours.pdf', { type: 'application/pdf' })

    const store = useAiExerciseGenerationStore()
    await store.generate({ pdfFile, questionCount: 3, questionType: 'mixed' })

    const formData = mockPost.mock.calls[0][1]
    expect(formData.get('pdf')).toBe(pdfFile)
    expect(formData.has('sourceText')).toBe(false)
  })

  it('generate - transmet subjectContext quand fourni', async () => {
    mockPost.mockResolvedValueOnce({ status: 200, data: { success: true, questions: [], warnings: [] } })

    const store = useAiExerciseGenerationStore()
    await store.generate({ sourceText: 'x', subjectContext: 'SVT', questionCount: 1, questionType: 'open' })

    const formData = mockPost.mock.calls[0][1]
    expect(formData.get('subjectContext')).toBe('SVT')
    expect(formData.get('questionType')).toBe('open')
  })

  it('generate - envoie un timeout étendu (300000 ms), même valeur que la feature voisine C-01', async () => {
    mockPost.mockResolvedValueOnce({ status: 200, data: { success: true, questions: [], warnings: [] } })

    const store = useAiExerciseGenerationStore()
    await store.generate({ sourceText: 'x', questionCount: 1 })

    const config = mockPost.mock.calls[0][2]
    expect(config.timeout).toBe(300000)
  })

  it('generate - échec dégradé (success:false, 200) - status "error", errorMessage et suggestManualCreation peuplés', async () => {
    mockPost.mockResolvedValueOnce({
      status: 200,
      data: { success: false, degraded: true, code: 'service_unavailable', message: 'Indisponible. Créez manuellement.', suggestManualCreation: true }
    })

    const store = useAiExerciseGenerationStore()
    const result = await store.generate({ sourceText: 'x', questionCount: 1 })

    expect(result).toBe(false)
    expect(store.status).toBe('error')
    expect(store.errorMessage).toBe('Indisponible. Créez manuellement.')
    expect(store.suggestManualCreation).toBe(true)
  })

  it('generate - échec 400 (validation) - status "error", suggestManualCreation reste false', async () => {
    mockPost.mockResolvedValueOnce({ status: 400, data: { message: 'sourceText est requis.' } })

    const store = useAiExerciseGenerationStore()
    const result = await store.generate({ sourceText: '', questionCount: 1 })

    expect(result).toBe(false)
    expect(store.status).toBe('error')
    expect(store.errorMessage).toBe('sourceText est requis.')
    expect(store.suggestManualCreation).toBe(false)
  })

  it('generate - erreur réseau (api.post renvoie undefined) - status "error", message générique', async () => {
    mockPost.mockResolvedValueOnce(undefined)

    const store = useAiExerciseGenerationStore()
    const result = await store.generate({ sourceText: 'x', questionCount: 1 })

    expect(result).toBe(false)
    expect(store.status).toBe('error')
    expect(store.errorMessage).toBe('La génération a échoué. Réessayez.')
  })

  it('generate - réponse 200 mais success absent/false sans message - message générique', async () => {
    mockPost.mockResolvedValueOnce({ status: 200, data: {} })

    const store = useAiExerciseGenerationStore()
    const result = await store.generate({ sourceText: 'x', questionCount: 1 })

    expect(result).toBe(false)
    expect(store.errorMessage).toBe('La génération a échoué. Réessayez.')
  })

  it('generate - warnings absent dans la réponse - retombe sur un tableau vide', async () => {
    mockPost.mockResolvedValueOnce({ status: 200, data: { success: true, questions: [{ statement: 'Q' }] } })

    const store = useAiExerciseGenerationStore()
    await store.generate({ sourceText: 'x', questionCount: 1 })

    expect(store.warnings).toEqual([])
  })

  // ── reset ─────────────────────────────────────────────────────────────────

  it('reset - remet le store à l\'état initial', async () => {
    mockPost.mockResolvedValueOnce({ status: 200, data: { success: true, questions: [{ statement: 'Q' }], warnings: ['w'] } })
    const store = useAiExerciseGenerationStore()
    await store.generate({ sourceText: 'x', questionCount: 1 })
    expect(store.status).toBe('done')

    store.reset()

    expect(store.status).toBe('idle')
    expect(store.questions).toEqual([])
    expect(store.warnings).toEqual([])
    expect(store.errorMessage).toBe('')
    expect(store.suggestManualCreation).toBe(false)
  })
})
