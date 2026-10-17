import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useStoredFile } from '@/composables/useStoredFile'

const { mockGet, mockNotify } = vi.hoisted(() => ({ mockGet: vi.fn(), mockNotify: vi.fn() }))
vi.mock('@/helpers/api', () => ({ api: { get: mockGet } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: mockNotify } }))

const URL_OK = 'https://stockage.exemple/obj?sig=abc'

describe('useStoredFile', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.restoreAllMocks())

  describe('openFile', () => {
    it('sans clé - notifie, n’ouvre aucune fenêtre ni ne contacte l’API', async () => {
      const open = vi.spyOn(window, 'open')
      await useStoredFile().openFile(null)
      expect(mockNotify).toHaveBeenCalledWith('Aucun fichier associé.', 'error')
      expect(open).not.toHaveBeenCalled()
      expect(mockGet).not.toHaveBeenCalled()
    })

    it('popup bloquée - notifie et ne demande pas d’URL', async () => {
      vi.spyOn(window, 'open').mockReturnValue(null)
      await useStoredFile().openFile('k1')
      expect(mockNotify).toHaveBeenCalledWith('Popup bloqué — autorisez les popups pour ce site.', 'error')
      expect(mockGet).not.toHaveBeenCalled()
    })

    it('succès - ouvre la fenêtre AVANT la requête (geste utilisateur) puis y charge l’URL', async () => {
      const win = { location: { href: '' }, close: vi.fn() }
      const open = vi.spyOn(window, 'open').mockReturnValue(win)
      mockGet.mockImplementation(async () => {
        expect(open).toHaveBeenCalledWith('', '_blank')
        return { status: 200, data: { url: URL_OK } }
      })
      await useStoredFile().openFile('dossier/rendu.pdf')
      expect(mockGet).toHaveBeenCalledWith('storage/presign', { key: 'dossier/rendu.pdf' })
      expect(win.location.href).toBe(URL_OK)
      expect(win.close).not.toHaveBeenCalled()
    })

    it('URL non délivrée - referme la fenêtre vide et notifie', async () => {
      const win = { location: { href: '' }, close: vi.fn() }
      vi.spyOn(window, 'open').mockReturnValue(win)
      mockGet.mockResolvedValueOnce({ status: 404, data: {} })
      await useStoredFile().openFile('k')
      expect(win.close).toHaveBeenCalled()
      expect(mockNotify).toHaveBeenCalledWith("Impossible d'ouvrir le fichier.", 'error')
    })

    it('statut 200 sans URL - traité comme un échec', async () => {
      const win = { location: { href: '' }, close: vi.fn() }
      vi.spyOn(window, 'open').mockReturnValue(win)
      mockGet.mockResolvedValueOnce({ status: 200, data: {} })
      await useStoredFile().openFile('k')
      expect(win.close).toHaveBeenCalled()
    })

    it('exception réseau - referme la fenêtre et notifie', async () => {
      const win = { location: { href: '' }, close: vi.fn() }
      vi.spyOn(window, 'open').mockReturnValue(win)
      mockGet.mockRejectedValueOnce(new Error('KO'))
      await useStoredFile().openFile('k')
      expect(win.close).toHaveBeenCalled()
      expect(mockNotify).toHaveBeenCalledWith("Impossible d'ouvrir le fichier.", 'error')
    })
  })

  describe('downloadFile', () => {
    it('sans clé - notifie, aucun appel', async () => {
      await useStoredFile().downloadFile('')
      expect(mockNotify).toHaveBeenCalledWith('Aucun fichier associé.', 'error')
      expect(mockGet).not.toHaveBeenCalled()
    })

    it('demande une URL de téléchargement (disposition: attachment)', async () => {
      mockGet.mockResolvedValueOnce({ status: 404, data: {} })
      await useStoredFile().downloadFile('k')
      expect(mockGet).toHaveBeenCalledWith('storage/presign', { key: 'k', disposition: 'attachment' })
    })

    it('newTab - clique un lien target=_blank rel=noopener et ne quitte pas la page', async () => {
      mockGet.mockResolvedValueOnce({ status: 200, data: { url: URL_OK } })
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
        click.lastAnchor = this
      })
      await useStoredFile().downloadFile('k', { newTab: true })
      expect(click).toHaveBeenCalledTimes(1)
      expect(click.lastAnchor.href).toBe(URL_OK)
      expect(click.lastAnchor.target).toBe('_blank')
      expect(click.lastAnchor.rel).toBe('noopener')
    })

    it('par défaut - remplace la page courante par l’URL', async () => {
      mockGet.mockResolvedValueOnce({ status: 200, data: { url: URL_OK } })
      const original = window.location
      const fake = { href: '' }
      Object.defineProperty(window, 'location', { configurable: true, value: fake })
      try {
        await useStoredFile().downloadFile('k')
        expect(fake.href).toBe(URL_OK)
      } finally {
        Object.defineProperty(window, 'location', { configurable: true, value: original })
      }
    })

    it('un second argument null ou une chaîne (ancien appel) est ignoré sans erreur', async () => {
      mockGet.mockResolvedValue({ status: 404, data: {} })
      await expect(useStoredFile().downloadFile('k', null)).resolves.toBeUndefined()
      await expect(useStoredFile().downloadFile('k', 'rendu.pdf')).resolves.toBeUndefined()
      expect(mockGet).toHaveBeenCalledTimes(2)
    })

    it('échec ou exception - notifie', async () => {
      mockGet.mockResolvedValueOnce({ status: 500, data: {} })
      await useStoredFile().downloadFile('k')
      expect(mockNotify).toHaveBeenCalledWith('Impossible de télécharger le fichier.', 'error')
      mockGet.mockRejectedValueOnce(new Error('KO'))
      await useStoredFile().downloadFile('k')
      expect(mockNotify).toHaveBeenCalledTimes(2)
    })
  })
})
