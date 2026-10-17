import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useResponseStore } from '@/stores/responses'

const { mockGet, mockPost, mockPut, mockDel, mockNotify } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockDel: vi.fn(),
  mockNotify: vi.fn(),
}))

vi.mock('@/helpers/api', () => ({ api: { get: mockGet, post: mockPost, put: mockPut, del: mockDel } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: mockNotify } }))

describe('useResponseStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('état initial', () => {
    const store = useResponseStore()
    expect(store.responses).toEqual([])
    expect(store.correction).toBeNull()
    expect(store.response).toEqual({ content: '', correction: false, questionId: null })
  })

  describe('fetchAllResponsesByQuestion', () => {
    it('200 - peuple les réponses', async () => {
      mockGet.mockResolvedValueOnce({ status: 200, data: [{ id: 1 }] })
      const store = useResponseStore()
      expect(await store.fetchAllResponsesByQuestion(12)).toBe(true)
      expect(mockGet).toHaveBeenCalledWith('responses/question/12')
      expect(store.responses).toEqual([{ id: 1 }])
    })

    it('non-200 - notifie le message et retourne false', async () => {
      mockGet.mockResolvedValueOnce({ status: 404, data: { message: 'Question inconnue' } })
      expect(await useResponseStore().fetchAllResponsesByQuestion(12)).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Question inconnue', 'error')
    })

    it('erreur réseau - false et notification', async () => {
      mockGet.mockRejectedValueOnce(new Error('KO'))
      expect(await useResponseStore().fetchAllResponsesByQuestion(12)).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith(expect.stringContaining('Erreur récupération réponses'), 'error')
    })
  })

  describe('fetchCorrectionByQuestion', () => {
    it('200 - mémorise la correction', async () => {
      mockGet.mockResolvedValueOnce({ status: 200, data: { content: 'Newton' } })
      const store = useResponseStore()
      expect(await store.fetchCorrectionByQuestion(3)).toBe(true)
      expect(mockGet).toHaveBeenCalledWith('responses/correction/3')
      expect(store.correction).toEqual({ content: 'Newton' })
    })

    it('non-200 - false', async () => {
      mockGet.mockResolvedValueOnce({ status: 404, data: { message: 'Aucune correction' } })
      const store = useResponseStore()
      expect(await store.fetchCorrectionByQuestion(3)).toBe(false)
      expect(store.correction).toBeNull()
    })

    it('erreur réseau - false', async () => {
      mockGet.mockRejectedValueOnce(new Error('KO'))
      expect(await useResponseStore().fetchCorrectionByQuestion(3)).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith(expect.stringContaining('Erreur récupération correction'), 'error')
    })
  })

  describe('fetchResponse', () => {
    it('200 - remplit la réponse courante', async () => {
      mockGet.mockResolvedValueOnce({ status: 200, data: { id: 5, content: 'abc' } })
      const store = useResponseStore()
      expect(await store.fetchResponse(5)).toBe(true)
      expect(mockGet).toHaveBeenCalledWith('responses/5')
      expect(store.response).toEqual({ id: 5, content: 'abc' })
    })

    it('non-200 - false', async () => {
      mockGet.mockResolvedValueOnce({ status: 404, data: { message: 'Introuvable' } })
      expect(await useResponseStore().fetchResponse(5)).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Introuvable', 'error')
    })

    it('erreur réseau - false', async () => {
      mockGet.mockRejectedValueOnce(new Error('KO'))
      expect(await useResponseStore().fetchResponse(5)).toBe(false)
    })
  })

  describe('createResponse', () => {
    it('201 - envoie la réponse courante', async () => {
      mockPost.mockResolvedValueOnce({ status: 201, data: {} })
      const store = useResponseStore()
      store.response = { content: 'oui', correction: true, questionId: 2 }
      expect(await store.createResponse()).toBe(true)
      expect(mockPost).toHaveBeenCalledWith('responses', { content: 'oui', correction: true, questionId: 2 })
      expect(mockNotify).toHaveBeenCalledWith('Réponse créée avec succès', 'success')
    })

    it('non-201 - false', async () => {
      mockPost.mockResolvedValueOnce({ status: 400, data: { message: 'Contenu vide' } })
      expect(await useResponseStore().createResponse()).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Contenu vide', 'error')
    })

    it('erreur réseau - false', async () => {
      mockPost.mockRejectedValueOnce(new Error('KO'))
      expect(await useResponseStore().createResponse()).toBe(false)
    })
  })

  describe('updateResponse', () => {
    it('200 - PUT sur la route d’édition', async () => {
      mockPut.mockResolvedValueOnce({ status: 200, data: {} })
      const store = useResponseStore()
      expect(await store.updateResponse(8)).toBe(true)
      expect(mockPut).toHaveBeenCalledWith('responses/edit/8', store.response)
      expect(mockNotify).toHaveBeenCalledWith('Réponse mise à jour', 'success')
    })

    it('non-200 - false', async () => {
      mockPut.mockResolvedValueOnce({ status: 403, data: { message: 'Interdit' } })
      expect(await useResponseStore().updateResponse(8)).toBe(false)
    })

    it('erreur réseau - false', async () => {
      mockPut.mockRejectedValueOnce(new Error('KO'))
      expect(await useResponseStore().updateResponse(8)).toBe(false)
    })
  })

  describe('deleteResponse', () => {
    it('204 - succès', async () => {
      mockDel.mockResolvedValueOnce({ status: 204 })
      expect(await useResponseStore().deleteResponse(8)).toBe(true)
      expect(mockDel).toHaveBeenCalledWith('responses/8')
      expect(mockNotify).toHaveBeenCalledWith('Réponse supprimée', 'success')
    })

    it('autre statut - false', async () => {
      mockDel.mockResolvedValueOnce({ status: 404, data: { message: 'Introuvable' } })
      expect(await useResponseStore().deleteResponse(8)).toBe(false)
    })

    it('réponse sans corps sur erreur - capté par le catch (pas d’exception)', async () => {
      mockDel.mockResolvedValueOnce({ status: 500 })
      expect(await useResponseStore().deleteResponse(8)).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith(expect.stringContaining('Erreur suppression réponse'), 'error')
    })

    it('erreur réseau - false', async () => {
      mockDel.mockRejectedValueOnce(new Error('KO'))
      expect(await useResponseStore().deleteResponse(8)).toBe(false)
    })
  })
})
