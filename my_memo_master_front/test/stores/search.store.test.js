import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSearchStore } from '@/stores/search'

const { mockGet, mockNotify } = vi.hoisted(() => ({
  mockGet:    vi.fn(),
  mockNotify: vi.fn()
}))

vi.mock('@/helpers/api',  () => ({ api: { get: mockGet } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: mockNotify } }))

const FULL_RESULT = {
  mindMaps:      [{ idMindMap: 1, mmName: 'Algèbre' }],
  leitnerSystems:[{ idSystem: 2,  name: 'Leitner Maths' }],
  tests:         [{ testId: 3,    name: 'Test Maths' }]
}
const EMPTY_RESULT = { mindMaps: [], leitnerSystems: [], tests: [] }

describe('useSearchStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // ── searchAll — sans filtre ────────────────────────────────────────────────

  it('searchAll sans filtre - appelle GET search sans params', async () => {
    mockGet.mockResolvedValueOnce({ status: 200, data: FULL_RESULT })

    const store = useSearchStore()
    const result = await store.searchAll()

    expect(mockGet).toHaveBeenCalledWith('search', {})
    expect(store.results).toEqual(FULL_RESULT)
    expect(result).toBe(true)
    expect(store.loading).toBe(false)
  })

  it('searchAll - retourne liste vide si aucun résultat', async () => {
    mockGet.mockResolvedValueOnce({ status: 200, data: EMPTY_RESULT })

    const store = useSearchStore()
    const result = await store.searchAll()

    expect(store.results.mindMaps).toHaveLength(0)
    expect(store.results.leitnerSystems).toHaveLength(0)
    expect(store.results.tests).toHaveLength(0)
    expect(result).toBe(true)
  })

  // ── searchAll — filtres ────────────────────────────────────────────────────

  it('searchAll avec subjectId - passe subjectId à l\'API', async () => {
    mockGet.mockResolvedValueOnce({ status: 200, data: FULL_RESULT })

    const store = useSearchStore()
    await store.searchAll({ subjectId: 2 })

    expect(mockGet).toHaveBeenCalledWith('search', { subjectId: 2 })
  })

  it('searchAll avec q - passe q à l\'API', async () => {
    mockGet.mockResolvedValueOnce({ status: 200, data: FULL_RESULT })

    const store = useSearchStore()
    await store.searchAll({ q: 'maths' })

    expect(mockGet).toHaveBeenCalledWith('search', { q: 'maths' })
  })

  it('searchAll avec subjectId et q - passe les deux paramètres', async () => {
    mockGet.mockResolvedValueOnce({ status: 200, data: FULL_RESULT })

    const store = useSearchStore()
    await store.searchAll({ subjectId: 1, q: 'révision' })

    expect(mockGet).toHaveBeenCalledWith('search', { subjectId: 1, q: 'révision' })
  })

  it('searchAll - paramètres null/falsy omis de la requête', async () => {
    mockGet.mockResolvedValueOnce({ status: 200, data: EMPTY_RESULT })

    const store = useSearchStore()
    await store.searchAll({ subjectId: null, q: '' })

    expect(mockGet).toHaveBeenCalledWith('search', {})
  })

  // ── searchAll — gestion d'erreurs ─────────────────────────────────────────

  it('searchAll - réponse non-200 - retourne false sans peupler results', async () => {
    mockGet.mockResolvedValueOnce({ status: 500 })

    const store = useSearchStore()
    const result = await store.searchAll()

    expect(result).toBe(false)
    expect(store.results).toEqual(EMPTY_RESULT)
    expect(store.loading).toBe(false)
  })

  it('searchAll - erreur réseau - retourne false et notifie', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'))

    const store = useSearchStore()
    const result = await store.searchAll()

    expect(result).toBe(false)
    expect(mockNotify).toHaveBeenCalledWith(expect.stringContaining('recherche'), 'error')
    expect(store.loading).toBe(false)
  })

  // ── loading ────────────────────────────────────────────────────────────────

  it('searchAll - loading est true pendant la requête, false après', async () => {
    let resolveFn
    mockGet.mockReturnValueOnce(new Promise((resolve) => { resolveFn = resolve }))

    const store = useSearchStore()
    const prom = store.searchAll()

    expect(store.loading).toBe(true)

    resolveFn({ status: 200, data: EMPTY_RESULT })
    await prom

    expect(store.loading).toBe(false)
  })

  it('searchAll - loading repasse à false même en cas d\'erreur', async () => {
    mockGet.mockRejectedValueOnce(new Error('fail'))

    const store = useSearchStore()
    await store.searchAll()

    expect(store.loading).toBe(false)
  })
})
