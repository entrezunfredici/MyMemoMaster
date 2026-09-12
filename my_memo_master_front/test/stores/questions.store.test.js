import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useQuestionStore } from '@/stores/questions'

// Ticket A (images sur les questions) : ne couvre que les actions ajoutées (uploadImage, removeImage) —
// pas de suite pré-existante pour ce store (fetch*/create/update/delete non testés avant ce ticket).

const { mockPost, mockDel, mockNotify } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockDel: vi.fn(),
  mockNotify: vi.fn()
}))

vi.mock('@/helpers/api', () => ({ api: { get: vi.fn(), post: mockPost, put: vi.fn(), del: mockDel } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: mockNotify } }))

const UPLOAD_RESP = { url: 'https://s3/uploads/1/img.png', key: 'uploads/1/img.png', mimetype: 'image/png', size: 2048 }

describe('useQuestionStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // ── uploadImage ───────────────────────────────────────────────────────────────

  describe('uploadImage', () => {
    it('succès — retourne les champs image sans muter this.question', async () => {
      mockPost.mockResolvedValueOnce({ status: 201, data: UPLOAD_RESP })

      const store = useQuestionStore()
      const file = new File(['content'], 'schema.png', { type: 'image/png' })
      const result = await store.uploadImage(file)

      expect(mockPost).toHaveBeenCalledWith('storage/upload', expect.any(FormData))
      expect(result).toEqual({
        imageUrl: UPLOAD_RESP.url,
        imageKey: UPLOAD_RESP.key,
        imageMimeType: UPLOAD_RESP.mimetype,
        imageOriginalName: 'schema.png',
        imageSize: UPLOAD_RESP.size
      })
      expect(store.question.imageUrl).toBeNull()
      expect(store.uploading).toBe(false)
    })

    it("upload échoue — retourne false et notifie", async () => {
      mockPost.mockResolvedValueOnce({ status: 500, data: { message: 'S3 error' } })

      const store = useQuestionStore()
      const file = new File(['content'], 'schema.png', { type: 'image/png' })
      const result = await store.uploadImage(file)

      expect(result).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('S3 error', 'error')
      expect(store.uploading).toBe(false)
    })

    it('erreur réseau — retourne false, uploading repassé à false', async () => {
      mockPost.mockRejectedValueOnce(new Error('Network'))

      const store = useQuestionStore()
      const file = new File(['content'], 'schema.png', { type: 'image/png' })
      const result = await store.uploadImage(file)

      expect(result).toBe(false)
      expect(store.uploading).toBe(false)
    })
  })

  // ── removeImage ───────────────────────────────────────────────────────────────

  describe('removeImage', () => {
    it('succès — retourne true et notifie', async () => {
      mockDel.mockResolvedValueOnce({ status: 200, data: {} })

      const store = useQuestionStore()
      const result = await store.removeImage(1)

      expect(mockDel).toHaveBeenCalledWith('questions/1/image')
      expect(result).toBe(true)
      expect(mockNotify).toHaveBeenCalledWith('Image supprimée', 'success')
    })

    it('404 — retourne false et notifie le message serveur', async () => {
      mockDel.mockResolvedValueOnce({ status: 404, data: { message: 'Question introuvable' } })

      const store = useQuestionStore()
      const result = await store.removeImage(99)

      expect(result).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Question introuvable', 'error')
    })

    it('erreur réseau — retourne false', async () => {
      mockDel.mockRejectedValueOnce(new Error('Network'))

      const store = useQuestionStore()
      const result = await store.removeImage(1)

      expect(result).toBe(false)
    })
  })
})
