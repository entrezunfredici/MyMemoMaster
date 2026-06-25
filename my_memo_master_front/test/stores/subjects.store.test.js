import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSubjectStore } from '@/stores/subjects'

const { mockGet, mockPost, mockPut, mockDel, mockNotify } = vi.hoisted(() => ({
  mockGet:    vi.fn(),
  mockPost:   vi.fn(),
  mockPut:    vi.fn(),
  mockDel:    vi.fn(),
  mockNotify: vi.fn()
}))

vi.mock('@/helpers/api',  () => ({ api: { get: mockGet, post: mockPost, put: mockPut, del: mockDel } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: mockNotify } }))

const SUBJECTS = [{ subjectId: 1, name: 'Maths' }, { subjectId: 2, name: 'Physique' }]

describe('useSubjectStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // ── fetchSubjects ──────────────────────────────────────────────────────────

  it('fetchSubjects - succès - peuple subjects et retourne true', async () => {
    mockGet.mockResolvedValueOnce({ status: 200, data: SUBJECTS })

    const store = useSubjectStore()
    const result = await store.fetchSubjects()

    expect(mockGet).toHaveBeenCalledWith('subjects')
    expect(store.subjects).toEqual(SUBJECTS)
    expect(result).toBe(true)
  })

  it('fetchSubjects - réponse non-200 - notifie avec le message et retourne false', async () => {
    mockGet.mockResolvedValueOnce({ status: 500, data: { message: 'Erreur serveur' } })

    const store = useSubjectStore()
    const result = await store.fetchSubjects()

    expect(store.subjects).toEqual([])
    expect(result).toBe(false)
    expect(mockNotify).toHaveBeenCalledWith('Erreur serveur', 'error')
  })

  it('fetchSubjects - erreur réseau - retourne false et notifie', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'))

    const store = useSubjectStore()
    const result = await store.fetchSubjects()

    expect(result).toBe(false)
    expect(mockNotify).toHaveBeenCalledWith(expect.stringContaining('sujets'), 'error')
  })

  // ── fetchSubjectById ───────────────────────────────────────────────────────

  it('fetchSubjectById - succès - peuple subject et retourne true', async () => {
    const subject = { subjectId: 1, name: 'Maths' }
    mockGet.mockResolvedValueOnce({ status: 200, data: subject })

    const store = useSubjectStore()
    const result = await store.fetchSubjectById(1)

    expect(mockGet).toHaveBeenCalledWith('subjects/1')
    expect(store.subject).toEqual(subject)
    expect(result).toBe(true)
  })

  it('fetchSubjectById - réponse non-200 - notifie et retourne false', async () => {
    mockGet.mockResolvedValueOnce({ status: 404, data: { message: 'Sujet introuvable.' } })

    const store = useSubjectStore()
    const result = await store.fetchSubjectById(99)

    expect(result).toBe(false)
    expect(mockNotify).toHaveBeenCalledWith('Sujet introuvable.', 'error')
  })

  it('fetchSubjectById - erreur réseau - retourne false et notifie', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'))

    const store = useSubjectStore()
    const result = await store.fetchSubjectById(1)

    expect(result).toBe(false)
    expect(mockNotify).toHaveBeenCalled()
  })

  // ── addSubject ─────────────────────────────────────────────────────────────

  it('addSubject - succès - notifie succès et retourne true', async () => {
    mockPost.mockResolvedValueOnce({ status: 201, data: { subjectId: 3, name: 'Chimie' } })

    const store = useSubjectStore()
    store.subject = { name: 'Chimie' }
    const result = await store.addSubject()

    expect(mockPost).toHaveBeenCalledWith('subjects', { name: 'Chimie' })
    expect(result).toBe(true)
    expect(mockNotify).toHaveBeenCalledWith('Sujet créé avec succès', 'success')
  })

  it('addSubject - réponse non-201 - notifie avec le message et retourne false', async () => {
    mockPost.mockResolvedValueOnce({ status: 400, data: { message: 'Nom invalide.' } })

    const store = useSubjectStore()
    store.subject = { name: 'X' }
    const result = await store.addSubject()

    expect(result).toBe(false)
    expect(mockNotify).toHaveBeenCalledWith('Nom invalide.', 'error')
  })

  it('addSubject - erreur réseau - retourne false et notifie', async () => {
    mockPost.mockRejectedValueOnce(new Error('Network error'))

    const store = useSubjectStore()
    store.subject = { name: 'Chimie' }
    const result = await store.addSubject()

    expect(result).toBe(false)
    expect(mockNotify).toHaveBeenCalled()
  })

  // ── updateSubject ──────────────────────────────────────────────────────────

  it('updateSubject - succès - notifie succès et retourne true', async () => {
    mockPut.mockResolvedValueOnce({ status: 200, data: { subjectId: 1, name: 'Maths avancées' } })

    const store = useSubjectStore()
    store.subject = { name: 'Maths avancées' }
    const result = await store.updateSubject(1)

    expect(mockPut).toHaveBeenCalledWith('subjects/1', { name: 'Maths avancées' })
    expect(result).toBe(true)
    expect(mockNotify).toHaveBeenCalledWith('Sujet mis à jour avec succès', 'success')
  })

  it('updateSubject - réponse non-200 - notifie et retourne false', async () => {
    mockPut.mockResolvedValueOnce({ status: 404, data: { message: 'Sujet introuvable.' } })

    const store = useSubjectStore()
    store.subject = { name: 'Maths avancées' }
    const result = await store.updateSubject(99)

    expect(result).toBe(false)
    expect(mockNotify).toHaveBeenCalledWith('Sujet introuvable.', 'error')
  })

  it('updateSubject - erreur réseau - retourne false et notifie', async () => {
    mockPut.mockRejectedValueOnce(new Error('Network error'))

    const store = useSubjectStore()
    store.subject = { name: 'Maths' }
    const result = await store.updateSubject(1)

    expect(result).toBe(false)
    expect(mockNotify).toHaveBeenCalled()
  })

  // ── deleteSubject ──────────────────────────────────────────────────────────

  it('deleteSubject - succès - notifie succès et retourne true', async () => {
    mockDel.mockResolvedValueOnce({ status: 200, data: {} })

    const store = useSubjectStore()
    const result = await store.deleteSubject(1)

    expect(mockDel).toHaveBeenCalledWith('subjects/1')
    expect(result).toBe(true)
    expect(mockNotify).toHaveBeenCalledWith('Sujet supprimé avec succès', 'success')
  })

  it('deleteSubject - réponse non-200 - notifie avec le message et retourne false', async () => {
    mockDel.mockResolvedValueOnce({ status: 404, data: { message: 'Sujet introuvable.' } })

    const store = useSubjectStore()
    const result = await store.deleteSubject(99)

    expect(result).toBe(false)
    expect(mockNotify).toHaveBeenCalledWith('Sujet introuvable.', 'error')
  })

  it('deleteSubject - erreur réseau - retourne false et notifie', async () => {
    mockDel.mockRejectedValueOnce(new Error('Network error'))

    const store = useSubjectStore()
    const result = await store.deleteSubject(1)

    expect(result).toBe(false)
    expect(mockNotify).toHaveBeenCalled()
  })
})
