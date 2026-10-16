import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useClassGroupSectionStore } from '@/stores/classGroupSections'

const { mockGet, mockPost, mockPut, mockDel, mockNotify } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockDel: vi.fn(),
  mockNotify: vi.fn()
}))

vi.mock('@/helpers/api', () => ({ api: { get: mockGet, post: mockPost, put: mockPut, del: mockDel } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: mockNotify } }))

const SECTION = { id: 1, title: 'Cours 1', type: 'section', description: 'Intro', dueDate: null }
const RENDU   = { id: 2, title: 'Rendu TD', type: 'rendu', description: '', dueDate: '2026-07-10' }

describe('useClassGroupSectionStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // ── fetchByGroup ──────────────────────────────────────────────────────────────

  describe('fetchByGroup', () => {
    it('succès — peuple sections et retourne true', async () => {
      mockGet.mockResolvedValueOnce({ status: 200, data: { data: [SECTION, RENDU] } })

      const store = useClassGroupSectionStore()
      const result = await store.fetchByGroup(1)

      expect(mockGet).toHaveBeenCalledWith('class-groups/1/sections')
      expect(store.sections).toEqual([SECTION, RENDU])
      expect(store.currentGroupId).toBe(1)
      expect(result).toBe(true)
    })

    it('utilise le cache TTL si même groupe et données fraîches', async () => {
      mockGet.mockResolvedValueOnce({ status: 200, data: { data: [SECTION] } })

      const store = useClassGroupSectionStore()
      await store.fetchByGroup(1)
      mockGet.mockClear()

      const result = await store.fetchByGroup(1) // doit utiliser le cache

      expect(mockGet).not.toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('force=true — refetch même si cache valide', async () => {
      mockGet.mockResolvedValue({ status: 200, data: { data: [SECTION] } })

      const store = useClassGroupSectionStore()
      await store.fetchByGroup(1)
      mockGet.mockClear()

      await store.fetchByGroup(1, true)

      expect(mockGet).toHaveBeenCalledTimes(1)
    })

    it('réponse non-200 — retourne false et notifie', async () => {
      mockGet.mockResolvedValueOnce({ status: 403, data: { message: 'Accès refusé.' } })

      const store = useClassGroupSectionStore()
      const result = await store.fetchByGroup(1)

      expect(result).toBe(false)
      expect(store.sections).toEqual([])
      expect(mockNotify).toHaveBeenCalledWith('Accès refusé.', 'error')
    })

    it('erreur réseau — retourne false et notifie', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network error'))

      const store = useClassGroupSectionStore()
      const result = await store.fetchByGroup(1)

      expect(result).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith(expect.stringContaining('sections'), 'error')
    })
  })

  // ── create ────────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('succès — ajoute la section et retourne la donnée créée', async () => {
      mockPost.mockResolvedValueOnce({ status: 201, data: { data: SECTION } })

      const store = useClassGroupSectionStore()
      const result = await store.create(1, { title: 'Cours 1', type: 'section' })

      expect(mockPost).toHaveBeenCalledWith('class-groups/1/sections', { title: 'Cours 1', type: 'section' })
      expect(store.sections).toContainEqual(SECTION)
      expect(result).toEqual(SECTION)
      expect(mockNotify).toHaveBeenCalledWith('Section créée.', 'success')
    })

    it('réponse non-201 — retourne false et notifie', async () => {
      mockPost.mockResolvedValueOnce({ status: 400, data: { message: 'Titre requis.' } })

      const store = useClassGroupSectionStore()
      const result = await store.create(1, { title: '' })

      expect(result).toBe(false)
      expect(store.sections).toEqual([])
      expect(mockNotify).toHaveBeenCalledWith('Titre requis.', 'error')
    })

    it('erreur réseau — retourne false', async () => {
      mockPost.mockRejectedValueOnce(new Error('Network'))

      const store = useClassGroupSectionStore()
      const result = await store.create(1, { title: 'Test' })

      expect(result).toBe(false)
    })
  })

  // ── update ────────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('succès — met à jour la section dans le state', async () => {
      const updated = { ...SECTION, title: 'Cours 1 modifié' }
      mockPut.mockResolvedValueOnce({ status: 200, data: { data: updated } })

      const store = useClassGroupSectionStore()
      store.sections = [SECTION]
      const result = await store.update(1, SECTION.id, { title: 'Cours 1 modifié' })

      expect(result).toBe(true)
      expect(store.sections[0].title).toBe('Cours 1 modifié')
      expect(mockNotify).toHaveBeenCalledWith('Section mise à jour.', 'success')
    })

    it('réponse non-200 — retourne false', async () => {
      mockPut.mockResolvedValueOnce({ status: 404, data: {} })

      const store = useClassGroupSectionStore()
      const result = await store.update(1, 99, { title: 'x' })

      expect(result).toBe(false)
    })
  })

  // ── delete ────────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('succès — retire la section du state', async () => {
      mockDel.mockResolvedValueOnce({ status: 200, data: {} })

      const store = useClassGroupSectionStore()
      store.sections = [SECTION, RENDU]
      const result = await store.delete(1, SECTION.id)

      expect(result).toBe(true)
      expect(store.sections).not.toContainEqual(SECTION)
      expect(store.sections).toContainEqual(RENDU)
      expect(mockNotify).toHaveBeenCalledWith('Section supprimée.', 'success')
    })

    it('réponse non-200 — retourne false, state inchangé', async () => {
      mockDel.mockResolvedValueOnce({ status: 403, data: {} })

      const store = useClassGroupSectionStore()
      store.sections = [SECTION]
      const result = await store.delete(1, SECTION.id)

      expect(result).toBe(false)
      expect(store.sections).toContainEqual(SECTION)
    })

    it('erreur réseau — retourne false', async () => {
      mockDel.mockRejectedValueOnce(new Error('Network'))

      const store = useClassGroupSectionStore()
      const result = await store.delete(1, 1)

      expect(result).toBe(false)
    })
  })
})
