import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useClassGroupSubmissionStore } from '@/stores/classGroupSubmissions'

const { mockGet, mockPost, mockDel, mockNotify } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockDel: vi.fn(),
  mockNotify: vi.fn()
}))

vi.mock('@/helpers/api', () => ({ api: { get: mockGet, post: mockPost, del: mockDel } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: mockNotify } }))

const SUBMISSION = { submissionId: 1, sectionId: 10, userId: 5, fileKey: 'uploads/file.pdf', originalName: 'rendu.pdf', fileSize: 10240, submittedAt: '2026-07-01' }

const STATUS = {
  submitted: [{ submissionId: 1, name: 'Alice', fileKey: 'uploads/file.pdf', originalName: 'rendu.pdf', fileSize: 10240, submittedAt: '2026-07-01' }],
  notSubmitted: [{ studentId: 2, name: 'Bob', email: 'bob@test.com' }]
}

const UPLOAD_RESP = { url: 'https://s3/rendu.pdf', key: 'uploads/rendu.pdf', mimetype: 'application/pdf', size: 10240 }

describe('useClassGroupSubmissionStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // ── fetchStatus ───────────────────────────────────────────────────────────────

  describe('fetchStatus', () => {
    it('succès — peuple submissionStatus[sectionId]', async () => {
      mockGet.mockResolvedValueOnce({ status: 200, data: { data: STATUS } })

      const store = useClassGroupSubmissionStore()
      const result = await store.fetchStatus(1, 10)

      expect(mockGet).toHaveBeenCalledWith('class-groups/1/sections/10/submissions/status')
      expect(store.submissionStatus[10]).toEqual(STATUS)
      expect(result).toBe(true)
    })

    it('réponse non-200 — retourne false, pas de mise à jour', async () => {
      mockGet.mockResolvedValueOnce({ status: 404, data: {} })

      const store = useClassGroupSubmissionStore()
      const result = await store.fetchStatus(1, 10)

      expect(result).toBe(false)
      expect(store.submissionStatus[10]).toBeUndefined()
    })

    it('erreur réseau — retourne false', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network'))

      const store = useClassGroupSubmissionStore()
      const result = await store.fetchStatus(1, 10)

      expect(result).toBe(false)
    })
  })

  // ── clearSubmissionStatus ─────────────────────────────────────────────────────

  it('clearSubmissionStatus — vide le map submissionStatus', async () => {
    mockGet.mockResolvedValueOnce({ status: 200, data: { data: STATUS } })

    const store = useClassGroupSubmissionStore()
    await store.fetchStatus(1, 10)
    expect(store.submissionStatus[10]).toBeDefined()

    store.clearSubmissionStatus()
    expect(store.submissionStatus).toEqual({})
  })

  // ── fetchMine ─────────────────────────────────────────────────────────────────

  describe('fetchMine', () => {
    it('succès — stocke le premier rendu de l\'étudiant', async () => {
      mockGet.mockResolvedValueOnce({ status: 200, data: { data: [SUBMISSION] } })

      const store = useClassGroupSubmissionStore()
      const result = await store.fetchMine(1, 10)

      expect(store.mySubmissions[10]).toEqual(SUBMISSION)
      expect(result).toBe(true)
    })

    it('aucun rendu — stocke null', async () => {
      mockGet.mockResolvedValueOnce({ status: 200, data: { data: [] } })

      const store = useClassGroupSubmissionStore()
      await store.fetchMine(1, 10)

      expect(store.mySubmissions[10]).toBeNull()
    })

    it('réponse non-200 — retourne false', async () => {
      mockGet.mockResolvedValueOnce({ status: 403, data: {} })

      const store = useClassGroupSubmissionStore()
      const result = await store.fetchMine(1, 10)

      expect(result).toBe(false)
    })
  })

  // ── fetchBySection ────────────────────────────────────────────────────────────

  describe('fetchBySection', () => {
    it('succès — peuple sectionSubmissions[sectionId]', async () => {
      mockGet.mockResolvedValueOnce({ status: 200, data: { data: [SUBMISSION] } })

      const store = useClassGroupSubmissionStore()
      const result = await store.fetchBySection(1, 10)

      expect(store.sectionSubmissions[10]).toEqual([SUBMISSION])
      expect(result).toBe(true)
      expect(store.loadingSection[10]).toBeUndefined() // nettoyé en finally
    })

    it('réponse non-200 — stocke tableau vide, retourne false', async () => {
      mockGet.mockResolvedValueOnce({ status: 403, data: {} })

      const store = useClassGroupSubmissionStore()
      const result = await store.fetchBySection(1, 10)

      expect(result).toBe(false)
      expect(store.sectionSubmissions[10]).toEqual([])
    })
  })

  // ── clearSectionSubmissions ───────────────────────────────────────────────────

  it('clearSectionSubmissions — vide sectionSubmissions et loadingSection', async () => {
    mockGet.mockResolvedValueOnce({ status: 200, data: { data: [SUBMISSION] } })

    const store = useClassGroupSubmissionStore()
    await store.fetchBySection(1, 10)
    expect(store.sectionSubmissions[10]).toBeDefined()

    store.clearSectionSubmissions()
    expect(store.sectionSubmissions).toEqual({})
    expect(store.loadingSection).toEqual({})
  })

  // ── uploadAndSubmit ───────────────────────────────────────────────────────────

  describe('uploadAndSubmit', () => {
    it('succès — upload puis soumission, mySubmissions mis à jour', async () => {
      mockPost
        .mockResolvedValueOnce({ status: 201, data: UPLOAD_RESP })
        .mockResolvedValueOnce({ status: 200, data: { data: SUBMISSION } })

      const store = useClassGroupSubmissionStore()
      const file = new File(['content'], 'rendu.pdf', { type: 'application/pdf' })
      const result = await store.uploadAndSubmit(1, 10, file)

      expect(result).toBe(true)
      expect(store.mySubmissions[10]).toEqual(SUBMISSION)
      expect(store.uploading).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Rendu soumis avec succès.', 'success')
    })

    it('upload échoue — retourne false', async () => {
      mockPost.mockResolvedValueOnce({ status: 500, data: { message: 'S3 error' } })

      const store = useClassGroupSubmissionStore()
      const file = new File(['content'], 'rendu.pdf', { type: 'application/pdf' })
      const result = await store.uploadAndSubmit(1, 10, file)

      expect(result).toBe(false)
      expect(store.uploading).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith(expect.any(String), 'error')
    })

    it('soumission échoue après upload — retourne false', async () => {
      mockPost
        .mockResolvedValueOnce({ status: 201, data: UPLOAD_RESP })
        .mockResolvedValueOnce({ status: 400, data: { message: 'Déjà soumis.' } })

      const store = useClassGroupSubmissionStore()
      const file = new File(['content'], 'rendu.pdf', { type: 'application/pdf' })
      const result = await store.uploadAndSubmit(1, 10, file)

      expect(result).toBe(false)
      expect(store.mySubmissions[10]).toBeUndefined()
    })

    it('erreur réseau — retourne false, uploading repassé à false', async () => {
      mockPost.mockRejectedValueOnce(new Error('Network'))

      const store = useClassGroupSubmissionStore()
      const file = new File(['content'], 'rendu.pdf', { type: 'application/pdf' })
      const result = await store.uploadAndSubmit(1, 10, file)

      expect(result).toBe(false)
      expect(store.uploading).toBe(false)
    })
  })

  // ── deleteSubmission ──────────────────────────────────────────────────────────

  describe('deleteSubmission', () => {
    it('succès — mySubmissions[sectionId] passe à null', async () => {
      mockDel.mockResolvedValueOnce({ status: 200, data: {} })

      const store = useClassGroupSubmissionStore()
      store.mySubmissions[10] = SUBMISSION
      const result = await store.deleteSubmission(1, 10, SUBMISSION.submissionId)

      expect(result).toBe(true)
      expect(store.mySubmissions[10]).toBeNull()
      expect(mockNotify).toHaveBeenCalledWith('Soumission retirée.', 'success')
    })

    it('réponse non-200 — retourne false', async () => {
      mockDel.mockResolvedValueOnce({ status: 403, data: {} })

      const store = useClassGroupSubmissionStore()
      const result = await store.deleteSubmission(1, 10, 1)

      expect(result).toBe(false)
    })

    it('erreur réseau — retourne false', async () => {
      mockDel.mockRejectedValueOnce(new Error('Network'))

      const store = useClassGroupSubmissionStore()
      const result = await store.deleteSubmission(1, 10, 1)

      expect(result).toBe(false)
    })
  })
})
