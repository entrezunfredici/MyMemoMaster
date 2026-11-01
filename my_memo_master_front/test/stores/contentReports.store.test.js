import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useContentReportStore } from '@/stores/contentReports'

const { mockPost, mockNotify } = vi.hoisted(() => ({ mockPost: vi.fn(), mockNotify: vi.fn() }))

vi.mock('@/helpers/api', () => ({ api: { post: mockPost } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: mockNotify } }))

const REPORT = { contentType: 'resource', contentId: 4, reason: 'spam', comment: '  Lien suspect  ' }

describe('useContentReportStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('submit', () => {
    it('submit - signalement accepté - poste sur content-reports, notifie et retourne true', async () => {
      mockPost.mockResolvedValueOnce({ status: 201, data: { data: { id: 1 } } })
      const store = useContentReportStore()

      const result = await store.submit(REPORT)

      expect(mockPost).toHaveBeenCalledWith('content-reports', {
        contentType: 'resource', contentId: 4, reason: 'spam', comment: 'Lien suspect',
      })
      expect(mockNotify).toHaveBeenCalledWith(expect.stringContaining('Signalement envoyé'), 'success')
      expect(result).toBe(true)
      expect(store.submitting).toBe(false)
    })

    it('submit - commentaire vide - n\'envoie pas le champ comment', async () => {
      mockPost.mockResolvedValueOnce({ status: 201, data: {} })
      const store = useContentReportStore()

      await store.submit({ ...REPORT, comment: '   ' })

      expect(mockPost.mock.calls[0][1]).not.toHaveProperty('comment')
    })

    it.each([
      [409, 'Vous avez déjà un signalement en cours sur ce contenu.', 'warning'],
      [429, 'Limite de signalements atteinte (10 par 24 h). Réessayez plus tard.', 'warning'],
      [403, "Vous ne pouvez pas signaler un contenu auquel vous n'avez pas accès.", 'error'],
      [400, 'Vous ne pouvez pas signaler votre propre contenu.', 'error'],
    ])('submit - réponse %i - affiche le message de l\'API et retourne false', async (status, message, level) => {
      mockPost.mockResolvedValueOnce({ status, data: { message } })
      const store = useContentReportStore()

      const result = await store.submit(REPORT)

      expect(mockNotify).toHaveBeenCalledWith(message, level)
      expect(result).toBe(false)
    })

    it('submit - serveur injoignable (réponse undefined) - message générique et retourne false', async () => {
      mockPost.mockResolvedValueOnce(undefined)
      const store = useContentReportStore()

      const result = await store.submit(REPORT)

      expect(mockNotify).toHaveBeenCalledWith("Erreur lors de l'envoi du signalement.", 'error')
      expect(result).toBe(false)
    })

    it('submit - pendant l\'envoi - submitting vaut true puis repasse à false', async () => {
      let resolve
      mockPost.mockReturnValueOnce(new Promise((r) => { resolve = r }))
      const store = useContentReportStore()

      const pending = store.submit(REPORT)
      expect(store.submitting).toBe(true)
      resolve({ status: 201, data: {} })
      await pending

      expect(store.submitting).toBe(false)
    })
  })
})
