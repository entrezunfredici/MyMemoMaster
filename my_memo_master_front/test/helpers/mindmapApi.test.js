import { describe, it, expect, vi, beforeEach } from 'vitest'

const { api } = vi.hoisted(() => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() } }))
vi.mock('@/helpers/api', () => ({ api }))

import { mindmapApi } from '@/helpers/mindmap/mindmapApi'

describe('mindmapApi — routes des cartes mentales', () => {
  beforeEach(() => vi.clearAllMocks())

  it('cartes : liste, création, mise à jour, suppression', () => {
    mindmapApi.listDiagrams()
    expect(api.get).toHaveBeenCalledWith('diagrammes')
    mindmapApi.createDiagram({ mmName: 'A' })
    expect(api.post).toHaveBeenCalledWith('diagrammes', { mmName: 'A' })
    mindmapApi.updateDiagram(4, { mmName: 'B' })
    expect(api.put).toHaveBeenCalledWith('/diagrammes/4', { mmName: 'B' })
    mindmapApi.deleteDiagram(4)
    expect(api.del).toHaveBeenCalledWith('diagrammes/4')
  })

  it('image : envoi multipart', () => {
    const form = new FormData()
    mindmapApi.uploadImage(form)
    expect(api.post).toHaveBeenCalledWith('diagrammes/upload-image', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  })

  it('flashcards : systèmes et cartes d’un système', () => {
    mindmapApi.listLeitnerSystems()
    expect(api.get).toHaveBeenCalledWith('leitnersystems/')
    mindmapApi.listSystemCards(3)
    expect(api.get).toHaveBeenCalledWith('leitnercards/system/3')
  })
})
