import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

const { mockPost, mockGetBlob, mockNotify } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockGetBlob: vi.fn(),
  mockNotify: vi.fn(),
}))

vi.mock('@/helpers/api', () => ({ api: { post: mockPost, getBlob: mockGetBlob, get: vi.fn(), put: vi.fn(), del: vi.fn() } }))
vi.mock('@/helpers/notif.js', () => ({ notif: { notify: mockNotify, clear: vi.fn() } }))
vi.mock('@/router', () => ({ default: { push: vi.fn() } }))

const makeFile = (content) => ({ text: () => Promise.resolve(content) })

describe('useAuthStore — export / import des données', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    URL.createObjectURL = vi.fn(() => 'blob:fake')
    URL.revokeObjectURL = vi.fn()
  })

  describe('exportMyData', () => {
    it('200 - déclenche le téléchargement et notifie', async () => {
      mockGetBlob.mockResolvedValueOnce({ status: 200, data: new Blob(['{}']) })
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

      expect(await useAuthStore().exportMyData()).toBe(true)

      expect(mockGetBlob).toHaveBeenCalledWith('users/me/export')
      expect(click).toHaveBeenCalled()
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake')
      expect(mockNotify).toHaveBeenCalledWith('Export téléchargé.', 'success')
      click.mockRestore()
    })

    it('échec API - retourne false et notifie l\'erreur', async () => {
      mockGetBlob.mockResolvedValueOnce(undefined)

      expect(await useAuthStore().exportMyData()).toBe(false)

      expect(URL.createObjectURL).not.toHaveBeenCalled()
      expect(mockNotify).toHaveBeenCalledWith("Erreur lors de l'export des données.", 'error')
    })
  })

  describe('importMyData', () => {
    it('201 - envoie le contenu du fichier et retourne le bilan', async () => {
      const summary = {
        created: { systems: 1, mindMaps: 0 },
        merged: { systems: 0, mindMaps: 0 },
        unchanged: { systems: 0, mindMaps: 0 },
        added: { cards: 2, responses: 0, tags: 0, nodes: 0, links: 0, zones: 0 },
        skipped: [],
      }
      mockPost.mockResolvedValueOnce({ status: 201, data: { message: 'Import terminé avec succès.', data: summary } })

      const result = await useAuthStore().importMyData(makeFile('{"format":"mymemomaster-export","version":1}'))

      expect(result).toEqual(summary)
      expect(mockPost).toHaveBeenCalledWith('users/me/import', { format: 'mymemomaster-export', version: 1 })
      expect(mockNotify).toHaveBeenCalledWith('Import terminé avec succès.', 'success')
    })

    it('fichier non JSON - retourne false sans appeler l\'API', async () => {
      expect(await useAuthStore().importMyData(makeFile('pas du json'))).toBe(false)

      expect(mockPost).not.toHaveBeenCalled()
      expect(mockNotify).toHaveBeenCalledWith("Ce fichier n'est pas un JSON valide.", 'error')
    })

    it('400 - affiche le message du serveur', async () => {
      mockPost.mockResolvedValueOnce({ status: 400, data: { message: 'Type de question invalide' } })

      expect(await useAuthStore().importMyData(makeFile('{}'))).toBe(false)

      expect(mockNotify).toHaveBeenCalledWith('Type de question invalide', 'error')
    })
  })
})
