import { describe, it, expect } from 'vitest'
import { parseMindMapJson, readMindMapFile, MAX_IMPORT_BYTES } from '@/helpers/mindmap/mindmapJsonImport'
import { createBlankMindMap, serializeMindMap } from '@/helpers/mindmap/mindmap'

describe('parseMindMapJson', () => {
  it("relit une carte exportée par l'éditeur (aller-retour)", () => {
    const original = serializeMindMap(createBlankMindMap('Ma carte'))
    const { name, payload } = parseMindMapJson(JSON.stringify(original, null, 2))
    expect(name).toBe('Ma carte')
    expect(Object.keys(payload.nodes)).toEqual(Object.keys(original.nodes))
    expect(payload.subjectNodeId).toBe(original.subjectNodeId)
  })

  it('tronque le nom à 50 caractères (limite de la colonne)', () => {
    const map = serializeMindMap(createBlankMindMap('x'.repeat(80)))
    expect(parseMindMapJson(JSON.stringify(map)).name).toHaveLength(50)
  })

  it('donne un nom par défaut à une carte sans titre', () => {
    const map = serializeMindMap(createBlankMindMap('Titre'))
    map.title = '   '
    expect(parseMindMapJson(JSON.stringify(map)).name).toBe('Carte importée')
  })

  it("retire les liens vers les flashcards de l'auteur du fichier", () => {
    const map = serializeMindMap(createBlankMindMap('Cartes liées'))
    const id = Object.keys(map.nodes)[0]
    map.nodes[id].idCard = 12
    map.nodes[id].idSystem = 3
    const { payload } = parseMindMapJson(JSON.stringify(map))
    expect(payload.nodes[id].idCard).toBeUndefined()
    expect(payload.nodes[id].idSystem).toBeUndefined()
  })

  it.each([
    ['du texte', 'pas du json', "Ce fichier n'est pas un JSON valide."],
    ['un tableau', '[1,2]', "Ce fichier n'est pas une carte mentale MyMemoMaster."],
    ['un objet quelconque', '{"foo":1}', "Ce fichier n'est pas une carte mentale MyMemoMaster."],
    ['null', 'null', "Ce fichier n'est pas une carte mentale MyMemoMaster."],
    ['des nœuds mal typés', '{"nodes":[],"links":[]}', "Ce fichier n'est pas une carte mentale MyMemoMaster."],
    ['une carte vide', '{"nodes":{},"links":[]}', 'Cette carte mentale ne contient aucun élément.'],
  ])('refuse %s', (_label, text, message) => {
    expect(() => parseMindMapJson(text)).toThrow(message)
  })
})

describe('readMindMapFile', () => {
  it('lit un fichier JSON valide', async () => {
    const map = serializeMindMap(createBlankMindMap('Depuis un fichier'))
    const file = new File([JSON.stringify(map)], 'carte.json', { type: 'application/json' })
    expect((await readMindMapFile(file)).name).toBe('Depuis un fichier')
  })

  it('refuse un fichier trop volumineux sans le lire', async () => {
    const file = { size: MAX_IMPORT_BYTES + 1 }
    await expect(readMindMapFile(file)).rejects.toThrow('trop volumineux')
  })

  it("refuse l'absence de fichier", async () => {
    await expect(readMindMapFile(undefined)).rejects.toThrow('Aucun fichier')
  })
})
