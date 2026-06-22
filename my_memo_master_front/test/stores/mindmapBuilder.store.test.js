import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMindMapBuilderStore } from '@/stores/mindmapBuilder'

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }))

vi.mock('@/helpers/api', () => ({ api: { get: mockGet, post: vi.fn() } }))

describe('useMindMapBuilderStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockGet.mockResolvedValue({ data: [] })
  })

  // ── new ───────────────────────────────────────────────────────────────────

  it('new(title) — crée un nœud sujet portant le titre', () => {
    const store = useMindMapBuilderStore()
    store.new('Ma carte')
    const subject = store.map.nodes[store.map.subjectNodeId]
    expect(subject.label).toBe('Ma carte')
    expect(subject.meta.isSubject).toBe(true)
    expect(store.isDirty).toBe(false)
  })

  it('new() — réinitialise la sélection', () => {
    const store = useMindMapBuilderStore()
    store.new('Carte A')
    store.selectNode(store.map.subjectNodeId)
    store.new('Carte B')
    expect(store.selectedNodeIds).toHaveLength(0)
  })

  // ── addNode ───────────────────────────────────────────────────────────────

  it('addNode — ajoute un nœud et crée le lien parent → enfant', () => {
    const store = useMindMapBuilderStore()
    store.new('Sujet')
    const parentId = store.map.subjectNodeId
    const childId = store.addNode({ label: 'Enfant', type: 'text', parentId })
    expect(store.map.nodes[childId]).toBeDefined()
    expect(store.map.nodes[childId].label).toBe('Enfant')
    expect(store.map.links.some(l => l.from === parentId && l.to === childId)).toBe(true)
    expect(store.isDirty).toBe(true)
  })

  it('addNode — initialise idCard et idSystem à null', () => {
    const store = useMindMapBuilderStore()
    store.new('Sujet')
    const id = store.addNode({ label: 'A', type: 'text', parentId: store.map.subjectNodeId })
    expect(store.map.nodes[id].idCard).toBeNull()
    expect(store.map.nodes[id].idSystem).toBeNull()
  })

  it('addNode — sélectionne automatiquement le nouveau nœud', () => {
    const store = useMindMapBuilderStore()
    store.new('Sujet')
    const id = store.addNode({ label: 'Enfant', type: 'text', parentId: store.map.subjectNodeId })
    expect(store.selectedNodeIds).toContain(id)
  })

  // ── updateNode ────────────────────────────────────────────────────────────

  it('updateNode — met à jour le label', () => {
    const store = useMindMapBuilderStore()
    store.new('Sujet')
    const id = store.map.subjectNodeId
    store.updateNode(id, { label: 'Nouveau titre' })
    expect(store.map.nodes[id].label).toBe('Nouveau titre')
  })

  it('updateNode mastery "high" — secondaryColor passe à #27AE60', () => {
    const store = useMindMapBuilderStore()
    store.new('Sujet')
    const id = store.map.subjectNodeId
    store.updateNode(id, { mastery: 'high' })
    expect(store.map.nodes[id].style.secondaryColor).toBe('#27AE60')
  })

  it('updateNode mastery "low" — secondaryColor passe à #E74C3C', () => {
    const store = useMindMapBuilderStore()
    store.new('Sujet')
    const id = store.map.subjectNodeId
    store.updateNode(id, { mastery: 'low' })
    expect(store.map.nodes[id].style.secondaryColor).toBe('#E74C3C')
  })

  it('updateNode mastery "medium" — secondaryColor passe à #F39C12', () => {
    const store = useMindMapBuilderStore()
    store.new('Sujet')
    const id = store.map.subjectNodeId
    store.updateNode(id, { mastery: 'medium' })
    expect(store.map.nodes[id].style.secondaryColor).toBe('#F39C12')
  })

  // ── updateNodeStyle ───────────────────────────────────────────────────────

  it('updateNodeStyle — fusionne le style sans écraser les autres propriétés', () => {
    const store = useMindMapBuilderStore()
    store.new('Sujet')
    const id = store.map.subjectNodeId
    const prevSecondary = store.map.nodes[id].style.secondaryColor
    store.updateNodeStyle(id, { primaryColor: '#FF0000' })
    expect(store.map.nodes[id].style.primaryColor).toBe('#FF0000')
    expect(store.map.nodes[id].style.secondaryColor).toBe(prevSecondary)
  })

  // ── selectNode ────────────────────────────────────────────────────────────

  it('selectNode — sélectionne un seul nœud', () => {
    const store = useMindMapBuilderStore()
    store.new('Sujet')
    const id = store.map.subjectNodeId
    store.selectNode(id)
    expect(store.selectedNodeIds).toEqual([id])
  })

  it('selectNode additive — ajoute le nœud à la sélection', () => {
    const store = useMindMapBuilderStore()
    store.new('Sujet')
    const id1 = store.map.subjectNodeId
    const id2 = store.addNode({ label: 'B', type: 'text', parentId: id1 })
    store.selectNode(id1)
    store.selectNode(id2, true)
    expect(store.selectedNodeIds).toContain(id1)
    expect(store.selectedNodeIds).toContain(id2)
  })

  it('selectNode additive — désélectionne si déjà sélectionné', () => {
    const store = useMindMapBuilderStore()
    store.new('Sujet')
    const id = store.map.subjectNodeId
    store.selectNode(id)
    store.selectNode(id, true)
    expect(store.selectedNodeIds).not.toContain(id)
  })

  it('resetSelection — vide selectedNodeIds et selectedLinkId', () => {
    const store = useMindMapBuilderStore()
    store.new('Sujet')
    store.selectNode(store.map.subjectNodeId)
    store.resetSelection()
    expect(store.selectedNodeIds).toHaveLength(0)
    expect(store.selectedLinkId).toBeNull()
  })

  // ── removeNode ────────────────────────────────────────────────────────────

  it('removeNode — supprime le nœud et ses liens', () => {
    const store = useMindMapBuilderStore()
    store.new('Sujet')
    const parentId = store.map.subjectNodeId
    const childId = store.addNode({ label: 'Enfant', type: 'text', parentId })
    store.removeNode(childId)
    expect(store.map.nodes[childId]).toBeUndefined()
    expect(store.map.links.some(l => l.to === childId || l.from === childId)).toBe(false)
  })

  it('removeNode — retire le nœud de la sélection', () => {
    const store = useMindMapBuilderStore()
    store.new('Sujet')
    const parentId = store.map.subjectNodeId
    const childId = store.addNode({ label: 'B', type: 'text', parentId })
    store.selectNode(childId)
    store.removeNode(childId)
    expect(store.selectedNodeIds).not.toContain(childId)
  })

  // ── moveNode ──────────────────────────────────────────────────────────────

  it('moveNode — met à jour x et y dans le layout', () => {
    const store = useMindMapBuilderStore()
    store.new('Sujet')
    const id = store.map.subjectNodeId
    store.moveNode(id, 300, 450)
    expect(store.map.nodes[id].layout.x).toBe(300)
    expect(store.map.nodes[id].layout.y).toBe(450)
    expect(store.isDirty).toBe(true)
  })

  // ── toggleCollapse ────────────────────────────────────────────────────────

  it("toggleCollapse — bascule l'état collapsed", () => {
    const store = useMindMapBuilderStore()
    store.new('Sujet')
    const id = store.map.subjectNodeId
    expect(store.map.nodes[id].collapsed).toBe(false)
    store.toggleCollapse(id)
    expect(store.map.nodes[id].collapsed).toBe(true)
    store.toggleCollapse(id)
    expect(store.map.nodes[id].collapsed).toBe(false)
  })

  // ── linkCard / unlinkCard ─────────────────────────────────────────────────

  it('linkCard — associe idCard et idSystem au nœud', () => {
    const store = useMindMapBuilderStore()
    store.new('Sujet')
    const id = store.map.subjectNodeId
    store.linkCard(id, 42, 7)
    expect(store.map.nodes[id].idCard).toBe(42)
    expect(store.map.nodes[id].idSystem).toBe(7)
    expect(store.isDirty).toBe(true)
  })

  it('unlinkCard — réinitialise idCard, idSystem et la couleur de maîtrise', () => {
    const store = useMindMapBuilderStore()
    store.new('Sujet')
    const id = store.map.subjectNodeId
    store.linkCard(id, 42, 7)
    store.updateNode(id, { mastery: 'high' })
    store.unlinkCard(id)
    expect(store.map.nodes[id].idCard).toBeNull()
    expect(store.map.nodes[id].idSystem).toBeNull()
    expect(store.map.nodes[id].mastery).toBe('undefined')
    expect(store.map.nodes[id].style.secondaryColor).toBe('#C0C5D2')
  })

  // ── interpreterOpen ───────────────────────────────────────────────────────

  it('openInterpreter / closeInterpreter — bascule interpreterOpen', () => {
    const store = useMindMapBuilderStore()
    store.new('Sujet')
    expect(store.interpreterOpen).toBe(false)
    store.openInterpreter()
    expect(store.interpreterOpen).toBe(true)
    store.closeInterpreter()
    expect(store.interpreterOpen).toBe(false)
  })

  // ── syncCardMasteries ─────────────────────────────────────────────────────

  it("syncCardMasteries — met à jour mastery et secondaryColor via l'API", async () => {
    mockGet.mockResolvedValueOnce({
      data: [{ idCard: 5, leitnerBox: { level: 4, color: 16711680 } }], // 0xFF0000
    })
    const store = useMindMapBuilderStore()
    store.new('Sujet')
    const id = store.map.subjectNodeId
    store.map.nodes[id].idCard = 5
    store.map.nodes[id].idSystem = 3
    await store.syncCardMasteries()
    expect(mockGet).toHaveBeenCalledWith('leitnercards/system/3')
    expect(store.map.nodes[id].mastery).toBe('high')
    expect(store.map.nodes[id].style.secondaryColor).toBe('#ff0000')
  })

  it("syncCardMasteries — n'appelle pas l'API si aucun nœud n'est lié", async () => {
    const store = useMindMapBuilderStore()
    store.new('Sujet')
    await store.syncCardMasteries()
    expect(mockGet).not.toHaveBeenCalled()
  })

  // ── exportPayload ─────────────────────────────────────────────────────────

  it('exportPayload — retourne title, nodes et links sérialisables', () => {
    const store = useMindMapBuilderStore()
    store.new('Export test')
    const payload = store.exportPayload()
    expect(payload.title).toBe('Export test')
    expect(typeof payload.nodes).toBe('object')
    expect(Array.isArray(payload.links)).toBe(true)
  })

  // ── selectedNode getter ───────────────────────────────────────────────────

  it('selectedNode — retourne le nœud quand un seul est sélectionné', () => {
    const store = useMindMapBuilderStore()
    store.new('Sujet')
    const id = store.map.subjectNodeId
    store.selectNode(id)
    expect(store.selectedNode?.id).toBe(id)
  })

  it('selectedNode — retourne null quand plusieurs nœuds sont sélectionnés', () => {
    const store = useMindMapBuilderStore()
    store.new('Sujet')
    const id1 = store.map.subjectNodeId
    const id2 = store.addNode({ label: 'B', type: 'text', parentId: id1 })
    store.selectNode(id1)
    store.selectNode(id2, true)
    expect(store.selectedNode).toBeNull()
  })

  it("selectedNode — retourne null quand aucun nœud n'est sélectionné", () => {
    const store = useMindMapBuilderStore()
    store.new('Sujet')
    expect(store.selectedNode).toBeNull()
  })
})
