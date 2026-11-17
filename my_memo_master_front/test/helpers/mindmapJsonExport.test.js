import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { buildJsonFileName, downloadMindMapJson } from '@/helpers/mindmap/mindmapJsonExport'

describe('buildJsonFileName', () => {
  it('retire accents et caractères spéciaux', () => {
    expect(buildJsonFileName('Révolution française : 1789 !')).toBe('Revolution-francaise-1789.json')
  })

  it('retombe sur un nom par défaut si le titre est vide ou illisible', () => {
    expect(buildJsonFileName('')).toBe('carte-mentale.json')
    expect(buildJsonFileName(undefined)).toBe('carte-mentale.json')
    expect(buildJsonFileName('???')).toBe('carte-mentale.json')
  })

  it('tronque les titres très longs', () => {
    expect(buildJsonFileName('a'.repeat(300)).length).toBe(85)
  })
})

describe('downloadMindMapJson', () => {
  let clicked
  beforeEach(() => {
    clicked = null
    URL.createObjectURL = vi.fn(() => 'blob:test')
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      clicked = { href: this.href, download: this.download }
    })
  })
  afterEach(() => vi.restoreAllMocks())

  it('télécharge la carte en JSON indenté, nommée d\'après son titre', async () => {
    const payload = { title: 'Ma carte', nodes: [{ id: 1 }] }
    expect(downloadMindMapJson(payload)).toBe(true)
    const blob = URL.createObjectURL.mock.calls[0][0]
    expect(blob.type).toBe('application/json')
    const text = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.readAsText(blob)
    })
    expect(JSON.parse(text)).toEqual(payload)
    expect(clicked.download).toBe('Ma-carte.json')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test')
  })

  it('accepte une carte déjà sérialisée en chaîne', () => {
    expect(downloadMindMapJson('{"title":"Chaîne"}')).toBe(true)
    expect(clicked.download).toBe('Chaine.json')
  })

  it('ne télécharge rien si la carte est vide', () => {
    expect(downloadMindMapJson(null)).toBe(false)
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })
})
