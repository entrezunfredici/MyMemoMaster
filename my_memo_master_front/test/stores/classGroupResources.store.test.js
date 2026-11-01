import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useClassGroupResourceStore } from '@/stores/classGroupResources'

const { mockGet, mockPost, mockDel, mockNotify } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockDel: vi.fn(),
  mockNotify: vi.fn()
}))

vi.mock('@/helpers/api', () => ({ api: { get: mockGet, post: mockPost, del: mockDel } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: mockNotify } }))

const RESOURCE = { id: 1, title: 'Cours Analyse', type: 'cours', fileKey: 'k1', mimeType: 'application/pdf', fileSize: 204800 }

const UPLOAD_RESP = { url: 'https://s3/file.pdf', key: 'uploads/file.pdf', mimetype: 'application/pdf', size: 204800 }

describe('useClassGroupResourceStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // ── fetchByGroup ──────────────────────────────────────────────────────────────

  describe('fetchByGroup', () => {
    it('succès — peuple resources et retourne true', async () => {
      mockGet.mockResolvedValueOnce({ status: 200, data: { data: [RESOURCE] } })

      const store = useClassGroupResourceStore()
      const result = await store.fetchByGroup(1)

      expect(mockGet).toHaveBeenCalledWith('class-groups/1/resources')
      expect(store.resources).toEqual([RESOURCE])
      expect(store.currentGroupId).toBe(1)
      expect(result).toBe(true)
    })

    it('utilise le cache TTL si même groupe et données fraîches', async () => {
      mockGet.mockResolvedValueOnce({ status: 200, data: { data: [RESOURCE] } })

      const store = useClassGroupResourceStore()
      await store.fetchByGroup(1)
      mockGet.mockClear()

      await store.fetchByGroup(1)

      expect(mockGet).not.toHaveBeenCalled()
    })

    it('force=true — refetch même si cache valide', async () => {
      mockGet.mockResolvedValue({ status: 200, data: { data: [] } })

      const store = useClassGroupResourceStore()
      await store.fetchByGroup(1)
      mockGet.mockClear()

      await store.fetchByGroup(1, true)

      expect(mockGet).toHaveBeenCalledTimes(1)
    })

    it('réponse non-200 — retourne false et notifie', async () => {
      mockGet.mockResolvedValueOnce({ status: 403, data: { message: 'Accès refusé.' } })

      const store = useClassGroupResourceStore()
      const result = await store.fetchByGroup(1)

      expect(result).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Accès refusé.', 'error')
    })

    it('erreur réseau — retourne false et notifie', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network'))

      const store = useClassGroupResourceStore()
      const result = await store.fetchByGroup(1)

      expect(result).toBe(false)
      expect(mockNotify).toHaveBeenCalled()
    })
  })

  // ── uploadAndCreate ───────────────────────────────────────────────────────────

  describe('uploadAndCreate', () => {
    it('succès — upload puis création, ressource ajoutée en tête', async () => {
      mockPost
        .mockResolvedValueOnce({ status: 201, data: UPLOAD_RESP })              // storage/upload
        .mockResolvedValueOnce({ status: 201, data: { data: RESOURCE } })        // class-groups/.../resources

      const store = useClassGroupResourceStore()
      const file = new File(['content'], 'cours.pdf', { type: 'application/pdf' })
      const result = await store.uploadAndCreate(1, file, { title: 'Cours Analyse', type: 'cours' })

      expect(result).toEqual(RESOURCE)
      expect(store.resources[0]).toEqual(RESOURCE)
      expect(store.uploading).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Ressource ajoutée.', 'success')
    })

    it('upload échoue — retourne false, aucune ressource créée', async () => {
      mockPost.mockResolvedValueOnce({ status: 500, data: { message: 'S3 error' } })

      const store = useClassGroupResourceStore()
      const file = new File(['content'], 'cours.pdf', { type: 'application/pdf' })
      const result = await store.uploadAndCreate(1, file, { title: 'X', type: 'cours' })

      expect(result).toBe(false)
      expect(store.resources).toEqual([])
      expect(store.uploading).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith(expect.any(String), 'error')
    })

    it('création échoue après upload réussi — retourne false', async () => {
      mockPost
        .mockResolvedValueOnce({ status: 201, data: UPLOAD_RESP })
        .mockResolvedValueOnce({ status: 400, data: { message: 'Titre requis.' } })

      const store = useClassGroupResourceStore()
      const file = new File(['content'], 'cours.pdf', { type: 'application/pdf' })
      const result = await store.uploadAndCreate(1, file, { title: '', type: 'cours' })

      expect(result).toBe(false)
      expect(store.resources).toEqual([])
      expect(mockNotify).toHaveBeenCalledWith('Titre requis.', 'error')
    })

    it('refus après upload — le fichier téléversé est supprimé du stockage (pas d’orphelin)', async () => {
      mockPost
        .mockResolvedValueOnce({ status: 201, data: UPLOAD_RESP })
        .mockResolvedValueOnce({ status: 400, data: { message: 'Refusé.' } })
      mockDel.mockResolvedValueOnce({ status: 200, data: {} })

      const store = useClassGroupResourceStore()
      const file = new File(['content'], 'f.pdf', { type: 'application/pdf' })
      const result = await store.uploadAndCreate(1, file, { title: 'X', type: 'cours' })

      expect(result).toBe(false)
      expect(mockDel).toHaveBeenCalledTimes(1)
      expect(mockDel).toHaveBeenCalledWith('storage/file?key=' + encodeURIComponent(UPLOAD_RESP.key))
    })

    it('exception après upload — le fichier téléversé est aussi supprimé', async () => {
      mockPost
        .mockResolvedValueOnce({ status: 201, data: UPLOAD_RESP })
        .mockRejectedValueOnce(new Error('Network'))
      mockDel.mockResolvedValueOnce({ status: 200, data: {} })

      const store = useClassGroupResourceStore()
      const file = new File(['content'], 'f.pdf', { type: 'application/pdf' })
      expect(await store.uploadAndCreate(1, file, { title: 'X', type: 'cours' })).toBe(false)
      expect(mockDel).toHaveBeenCalledWith('storage/file?key=' + encodeURIComponent(UPLOAD_RESP.key))
    })

    it('échec du nettoyage — silencieux, le résultat reste false', async () => {
      mockPost
        .mockResolvedValueOnce({ status: 201, data: UPLOAD_RESP })
        .mockResolvedValueOnce({ status: 400, data: { message: 'Refusé.' } })
      mockDel.mockRejectedValueOnce(new Error('S3 down'))

      const store = useClassGroupResourceStore()
      const file = new File(['content'], 'f.pdf', { type: 'application/pdf' })
      expect(await store.uploadAndCreate(1, file, { title: 'X', type: 'cours' })).toBe(false)
    })

    it('plusieurs groupes — un seul upload, une ressource par groupe sur la même clé', async () => {
      mockPost
        .mockResolvedValueOnce({ status: 201, data: UPLOAD_RESP })
        .mockResolvedValueOnce({ status: 201, data: { data: RESOURCE } })
        .mockResolvedValueOnce({ status: 201, data: { data: { ...RESOURCE, id: 2, classGroupId: 8 } } })

      const store = useClassGroupResourceStore()
      const file = new File(['content'], 'cours.pdf', { type: 'application/pdf' })
      const result = await store.uploadAndCreate(1, file, { title: 'Cours', type: 'cours' }, [8, 1])

      expect(result).toEqual(RESOURCE)
      expect(mockPost).toHaveBeenCalledTimes(3)
      expect(mockPost.mock.calls[1][0]).toBe('class-groups/1/resources')
      expect(mockPost.mock.calls[2][0]).toBe('class-groups/8/resources')
      expect(mockPost.mock.calls[2][1].fileKey).toBe(UPLOAD_RESP.key)
      expect(store.resources).toEqual([RESOURCE]) // seule la ressource du groupe courant est listée
      expect(mockNotify).toHaveBeenCalledWith('Ressource partagée dans 2 groupes.', 'success')
      expect(mockDel).not.toHaveBeenCalled()
    })

    it('échec dans un groupe sur deux — avertissement, fichier conservé', async () => {
      mockPost
        .mockResolvedValueOnce({ status: 201, data: UPLOAD_RESP })
        .mockResolvedValueOnce({ status: 201, data: { data: RESOURCE } })
        .mockResolvedValueOnce({ status: 403, data: { message: 'Accès refusé.' } })

      const store = useClassGroupResourceStore()
      const file = new File(['content'], 'cours.pdf', { type: 'application/pdf' })
      expect(await store.uploadAndCreate(1, file, { title: 'Cours', type: 'cours' }, [8])).toEqual(RESOURCE)
      expect(mockNotify).toHaveBeenCalledWith('Ressource partagée dans 1 groupe(s) sur 2 : Accès refusé.', 'warning')
      expect(mockDel).not.toHaveBeenCalled()
    })

    it('groupe courant refusé mais autre groupe accepté — non listé, fichier conservé', async () => {
      mockPost
        .mockResolvedValueOnce({ status: 201, data: UPLOAD_RESP })
        .mockResolvedValueOnce({ status: 403, data: { message: 'Accès refusé.' } })
        .mockResolvedValueOnce({ status: 201, data: { data: { ...RESOURCE, id: 2, classGroupId: 8 } } })

      const store = useClassGroupResourceStore()
      const file = new File(['content'], 'cours.pdf', { type: 'application/pdf' })
      const result = await store.uploadAndCreate(1, file, { title: 'Cours', type: 'cours' }, [8])
      expect(result.id).toBe(2)
      expect(store.resources).toEqual([])
      expect(mockDel).not.toHaveBeenCalled()
    })

    it('échec dans tous les groupes — fichier supprimé', async () => {
      mockPost
        .mockResolvedValueOnce({ status: 201, data: UPLOAD_RESP })
        .mockResolvedValueOnce({ status: 403, data: { message: 'Accès refusé.' } })
        .mockResolvedValueOnce({ status: 403, data: { message: 'Autre.' } })
      mockDel.mockResolvedValueOnce({ status: 200, data: {} })

      const store = useClassGroupResourceStore()
      const file = new File(['content'], 'cours.pdf', { type: 'application/pdf' })
      expect(await store.uploadAndCreate(1, file, { title: 'Cours', type: 'cours' }, [8])).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Accès refusé.', 'error')
      expect(mockDel).toHaveBeenCalledTimes(1)
    })

    it('upload refusé — rien à nettoyer', async () => {
      mockPost.mockResolvedValueOnce({ status: 500, data: { message: 'S3 error' } })
      const store = useClassGroupResourceStore()
      const file = new File(['content'], 'f.pdf', { type: 'application/pdf' })
      await store.uploadAndCreate(1, file, { title: 'X', type: 'cours' })
      expect(mockDel).not.toHaveBeenCalled()
    })

    it('succès — aucune suppression', async () => {
      mockPost
        .mockResolvedValueOnce({ status: 201, data: UPLOAD_RESP })
        .mockResolvedValueOnce({ status: 201, data: { data: {} } })
      const store = useClassGroupResourceStore()
      const file = new File(['content'], 'f.pdf', { type: 'application/pdf' })
      await store.uploadAndCreate(1, file, { title: 'X', type: 'cours' })
      expect(mockDel).not.toHaveBeenCalled()
    })

    it('erreur réseau — retourne false, uploading repassé à false', async () => {
      mockPost.mockRejectedValueOnce(new Error('Network'))

      const store = useClassGroupResourceStore()
      const file = new File(['content'], 'cours.pdf', { type: 'application/pdf' })
      const result = await store.uploadAndCreate(1, file, { title: 'X', type: 'cours' })

      expect(result).toBe(false)
      expect(store.uploading).toBe(false)
    })
  })

  // ── delete ────────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('succès — retire la ressource du state', async () => {
      mockDel.mockResolvedValueOnce({ status: 200, data: {} })

      const store = useClassGroupResourceStore()
      store.resources = [RESOURCE, { id: 2, title: 'TD', type: 'sujet' }]
      const result = await store.delete(1, RESOURCE.id)

      expect(result).toBe(true)
      expect(store.resources).not.toContainEqual(RESOURCE)
      expect(store.resources).toHaveLength(1)
      expect(mockNotify).toHaveBeenCalledWith('Ressource supprimée.', 'success')
    })

    it('réponse non-200 — retourne false, state inchangé', async () => {
      mockDel.mockResolvedValueOnce({ status: 403, data: {} })

      const store = useClassGroupResourceStore()
      store.resources = [RESOURCE]
      const result = await store.delete(1, RESOURCE.id)

      expect(result).toBe(false)
      expect(store.resources).toContainEqual(RESOURCE)
    })

    it('erreur réseau — retourne false', async () => {
      mockDel.mockRejectedValueOnce(new Error('Network'))

      const store = useClassGroupResourceStore()
      const result = await store.delete(1, 1)

      expect(result).toBe(false)
    })
  })
})
