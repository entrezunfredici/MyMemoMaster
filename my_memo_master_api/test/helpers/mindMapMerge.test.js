const {
  normalizeText,
  isIdenticalMindMap,
  isSameMindMapLineage,
  mergeMindMapJson
} = require('../../helpers/mindMapMerge')

const baseMap = () => ({
  id: 'map-1',
  subjectNodeId: 'r',
  zones: [{ id: 'z1', name: 'Zone' }],
  nodes: { r: { id: 'r', label: 'Racine', zoneId: 'z1' }, a: { id: 'a', label: 'A' } },
  links: [{ id: 'l1', from: 'r', to: 'a' }],
  updatedAt: '2026-01-01T00:00:00.000Z',
  history: { stack: [1], index: 0 }
})

describe('mindMapMerge', () => {
  describe('normalizeText', () => {
    it('normalizeText - casse et espaces variables - retourne le même texte', () => {
      expect(normalizeText('  Capitale   DE la France ')).toBe('capitale de la france')
    })

    it('normalizeText - valeur absente - retourne une chaîne vide', () => {
      expect(normalizeText(null)).toBe('')
    })
  })

  describe('isIdenticalMindMap', () => {
    it('isIdenticalMindMap - seules la date et l’historique diffèrent - retourne true', () => {
      const other = { ...baseMap(), updatedAt: '2027-01-01', history: { stack: [], index: -1 } }
      expect(isIdenticalMindMap(baseMap(), other)).toBe(true)
    })

    it('isIdenticalMindMap - ordre des clés différent - retourne true', () => {
      const other = baseMap()
      other.nodes = { a: other.nodes.a, r: other.nodes.r }
      expect(isIdenticalMindMap(baseMap(), other)).toBe(true)
    })

    it('isIdenticalMindMap - un libellé change - retourne false', () => {
      const other = baseMap()
      other.nodes.a.label = 'Autre'
      expect(isIdenticalMindMap(baseMap(), other)).toBe(false)
    })
  })

  describe('isSameMindMapLineage', () => {
    it('isSameMindMapLineage - même identifiant de carte - retourne true', () => {
      expect(isSameMindMapLineage({ id: 'x' }, { id: 'x', subjectNodeId: 'q' })).toBe(true)
    })

    it('isSameMindMapLineage - même nœud racine - retourne true', () => {
      expect(isSameMindMapLineage({ id: 'x', subjectNodeId: 'r' }, { id: 'y', subjectNodeId: 'r' })).toBe(true)
    })

    it('isSameMindMapLineage - aucune origine commune - retourne false', () => {
      expect(isSameMindMapLineage({ id: 'x', subjectNodeId: 'r' }, { id: 'y', subjectNodeId: 's' })).toBe(false)
    })

    it('isSameMindMapLineage - cartes sans identifiant - retourne false', () => {
      expect(isSameMindMapLineage({}, {})).toBe(false)
    })
  })

  describe('mergeMindMapJson', () => {
    it('mergeMindMapJson - carte importée identique - ne change rien', () => {
      const result = mergeMindMapJson(baseMap(), baseMap())
      expect(result.changed).toBe(false)
      expect(result.added).toEqual({ nodes: 0, links: 0, zones: 0 })
      expect(result.json.updatedAt).toBe('2026-01-01T00:00:00.000Z')
    })

    it('mergeMindMapJson - éléments en plus - les ajoute et met à jour la date', () => {
      const incoming = baseMap()
      incoming.zones.push({ id: 'z2', name: 'Nouvelle' })
      incoming.nodes.b = { id: 'b', label: 'B', zoneId: 'z2' }
      incoming.links.push({ id: 'l2', from: 'r', to: 'b' })

      const result = mergeMindMapJson(baseMap(), incoming)

      expect(result.added).toEqual({ nodes: 1, links: 1, zones: 1 })
      expect(Object.keys(result.json.nodes)).toEqual(['r', 'a', 'b'])
      expect(result.json.updatedAt).not.toBe('2026-01-01T00:00:00.000Z')
    })

    it('mergeMindMapJson - élément existant modifié - garde la version d’origine', () => {
      const incoming = baseMap()
      incoming.nodes.a.label = 'MODIFIÉ'
      expect(mergeMindMapJson(baseMap(), incoming).json.nodes.a.label).toBe('A')
    })

    it('mergeMindMapJson - branche vers un nœud inconnu - l’ignore', () => {
      const incoming = baseMap()
      incoming.links.push({ id: 'l9', from: 'r', to: 'absent' })
      const result = mergeMindMapJson(baseMap(), incoming)
      expect(result.added.links).toBe(0)
      expect(result.json.links).toHaveLength(1)
    })

    it('mergeMindMapJson - branche déjà présente sous un autre identifiant - ne la duplique pas', () => {
      const incoming = baseMap()
      incoming.links = [{ id: 'autre', from: 'r', to: 'a' }]
      expect(mergeMindMapJson(baseMap(), incoming).added.links).toBe(0)
    })

    it('mergeMindMapJson - nœud rattaché à une zone absente - détache le nœud', () => {
      const incoming = baseMap()
      incoming.nodes.b = { id: 'b', label: 'B', zoneId: 'zone-inconnue' }
      expect(mergeMindMapJson(baseMap(), incoming).json.nodes.b.zoneId).toBeNull()
    })

    it('mergeMindMapJson - carte de base - n’est pas modifiée', () => {
      const base = baseMap()
      const incoming = baseMap()
      incoming.nodes.b = { id: 'b', label: 'B' }
      mergeMindMapJson(base, incoming)
      expect(base.nodes.b).toBeUndefined()
    })
  })
})
