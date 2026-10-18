import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMindMapBuilderStore } from '@/stores/mindmapBuilder'
import { mindmapColors } from '@/helpers/themeColors'

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }))
vi.mock('@/helpers/api', () => ({ api: { get: mockGet, post: vi.fn() } }))

const freshStore = () => {
  setActivePinia(createPinia())
  const store = useMindMapBuilderStore()
  store.new('Carte')
  return store
}

describe('mindmapBuilder — zones', () => {
  let store
  beforeEach(() => { store = freshStore(); vi.clearAllMocks() })

  it('addZone — valeurs par défaut, id renvoyé, carte marquée modifiée', () => {
    store.markSaved()
    const id = store.addZone({})
    expect(store.map.zones).toEqual([
      { id, name: 'Zone', color: mindmapColors.zone, layout: { x: 200, y: 200, width: 360, height: 240 }, collapsed: false },
    ])
    expect(store.isDirty).toBe(true)
  })

  it('addZone — nom, couleur et géométrie fournis', () => {
    const id = store.addZone({ name: 'Cours', color: '#123456', x: 1, y: 2, width: 3, height: 4 })
    expect(store.map.zones.find((z) => z.id === id)).toMatchObject({ name: 'Cours', color: '#123456', layout: { x: 1, y: 2, width: 3, height: 4 } })
  })

  it('updateZone — ne change que les champs fournis et fusionne la géométrie', () => {
    const id = store.addZone({ name: 'A', color: '#111111' })
    store.updateZone(id, { name: 'B', collapsed: true, layout: { x: 9 } })
    expect(store.map.zones[0]).toMatchObject({ name: 'B', color: '#111111', collapsed: true, layout: { x: 9, y: 200, width: 360, height: 240 } })
  })

  it('updateZone — zone inconnue : aucun effet', () => {
    store.addZone({ name: 'A' })
    store.markSaved()
    store.updateZone('zz', { name: 'B' })
    expect(store.map.zones[0].name).toBe('A')
    expect(store.isDirty).toBe(false)
  })

  it('assignNodeToZone — affecte puis détache (null) un nœud, ignore un nœud inconnu', () => {
    const zoneId = store.addZone({})
    const nodeId = store.addNode({ label: 'N' })
    store.assignNodeToZone(nodeId, zoneId)
    expect(store.map.nodes[nodeId].zoneId).toBe(zoneId)
    store.assignNodeToZone(nodeId, null)
    expect(store.map.nodes[nodeId].zoneId).toBeNull()
    store.markSaved()
    store.assignNodeToZone('zz', zoneId)
    expect(store.isDirty).toBe(false)
  })

  it('removeZone — supprime la zone et libère ses nœuds sans toucher aux autres', () => {
    const z1 = store.addZone({ name: 'Z1' })
    const z2 = store.addZone({ name: 'Z2' })
    const a = store.addNode({ label: 'A' })
    const b = store.addNode({ label: 'B' })
    store.assignNodeToZone(a, z1)
    store.assignNodeToZone(b, z2)
    store.removeZone(z1)
    expect(store.map.zones.map((z) => z.id)).toEqual([z2])
    expect(store.map.nodes[a].zoneId).toBeNull()
    expect(store.map.nodes[b].zoneId).toBe(z2)
  })

  it('une carte sans liste de zones en reçoit une', () => {
    store.map.zones = undefined
    const id = store.addZone({})
    expect(store.map.zones.map((z) => z.id)).toEqual([id])
  })
})

describe('mindmapBuilder — branches (actions)', () => {
  let store
  beforeEach(() => { store = freshStore(); vi.clearAllMocks() })

  it('addLink — refuse les branches incomplètes ou vers soi-même, renvoie l’existante en doublon', () => {
    const a = store.addNode({ label: 'A' })
    const b = store.addNode({ label: 'B' })
    expect(store.addLink({ from: a })).toBeNull()
    expect(store.addLink({ from: a, to: a })).toBeNull()
    const id = store.addLink({ from: a, to: b, type: 'calcul' })
    expect(store.addLink({ from: a, to: b })).toBe(id)
    expect(store.map.links.filter((l) => l.from === a && l.to === b)).toHaveLength(1)
  })

  it('removeLink — retire la branche et la désélectionne', () => {
    const a = store.addNode({ label: 'A' })
    const b = store.addNode({ label: 'B' })
    const id = store.addLink({ from: a, to: b })
    store.selectLink(id)
    store.removeLink(id)
    expect(store.map.links.find((l) => l.id === id)).toBeUndefined()
    expect(store.selectedLinkId).toBeNull()
  })

  it('removeLink — une autre branche sélectionnée reste sélectionnée', () => {
    const a = store.addNode({ label: 'A' })
    const b = store.addNode({ label: 'B' })
    const c = store.addNode({ label: 'C' })
    const l1 = store.addLink({ from: a, to: b })
    const l2 = store.addLink({ from: a, to: c })
    store.selectLink(l2)
    store.removeLink(l1)
    expect(store.selectedLinkId).toBe(l2)
  })

  it('finalizePendingLink — sans source, sans cible ou vers soi-même : aucune branche', () => {
    const a = store.addNode({ label: 'A' })
    const before = store.map.links.length
    store.finalizePendingLink(a)
    store.setPendingLinkSource(a)
    store.finalizePendingLink(null)
    store.finalizePendingLink(a)
    expect(store.map.links).toHaveLength(before)
  })

  it('setLinkType — mémorise le type des futures branches', () => {
    store.setLinkType('calcul')
    expect(store.linkType).toBe('calcul')
  })
})

describe('mindmapBuilder — flashcards liées (actions)', () => {
  let store
  beforeEach(() => { store = freshStore(); vi.clearAllMocks(); mockGet.mockResolvedValue({ data: [] }) })

  it('linkCard / unlinkCard — nœud inconnu : aucun effet', () => {
    store.markSaved()
    store.linkCard('zz', 1, 2)
    store.unlinkCard('zz')
    expect(store.isDirty).toBe(false)
  })

  it('syncCardMasteries — la carte rattachée au nœud ne remplace pas celle d’un nœud déjà lié', async () => {
    const id = store.addNode({ label: 'N' })
    store.linkCard(id, 11, 22)
    store.idMindMap = 7
    mockGet.mockImplementation(async (url) => (url === 'leitnersystems/'
      ? { data: [{ idSystem: 22, idMindMap: 7 }] }
      : { data: [
        { idCard: 11, leitnerBox: { level: 2, color: '#112233' } },
        { idCard: 98, leitnerBox: { level: 5, color: '#bb0000' }, mindMapNodeId: id },
      ] }))
    await store.syncCardMasteries()
    expect(store.map.nodes[id].style.secondaryColor).not.toBe('#bb0000')
  })

  it('syncCardMasteries — liste des systèmes en échec : l’éditeur reste utilisable', async () => {
    store.idMindMap = 7
    mockGet.mockRejectedValue(new Error('réseau'))
    await expect(store.syncCardMasteries()).resolves.toBeUndefined()
  })
})

describe('mindmapBuilder — modification d’item (actions)', () => {
  let store
  beforeEach(() => { store = freshStore(); vi.clearAllMocks() })

  it('toggleNodeKind — rajouter la grandeur conserve les valeurs saisies', () => {
    const id = store.addNode({ label: 'A' })
    store.toggleNodeKind(id, 'quantity')
    store.updateNodeQuantity(id, { symbol: 'v', value: 3, unit: 'm/s' })
    store.toggleNodeKind(id, 'quantity')
    store.toggleNodeKind(id, 'quantity')
    expect(store.map.nodes[id].quantity).toMatchObject({ symbol: 'v', value: 3, unit: 'm/s' })
  })

  it('updateNode / updateNodeStyle / updateNodeQuantity — nœud inconnu : aucun effet', () => {
    store.markSaved()
    store.updateNode('zz', { label: 'x' })
    store.updateNodeStyle('zz', { shape: 'rect' })
    store.updateNodeQuantity('zz', { symbol: 'x' })
    expect(store.isDirty).toBe(false)
  })
})
