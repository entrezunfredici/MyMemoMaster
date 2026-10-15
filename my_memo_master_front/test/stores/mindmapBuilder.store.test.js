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

  it('updateNode mastery — la couleur secondaire reste neutre (elle vient de la boîte liée)', () => {
    const store = useMindMapBuilderStore()
    store.new('Sujet')
    const id = store.map.subjectNodeId
    store.updateNode(id, { mastery: 'high' })
    expect(store.map.nodes[id].style.secondaryColor).toBe('#C0C5D2')
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

  it('syncCardMasteries — nœud lié depuis la flashcard (mindMapNodeId) : prend la couleur de la boîte', async () => {
    const store = useMindMapBuilderStore()
    store.new('Sujet')
    store.idMindMap = 7
    const id = store.map.subjectNodeId
    mockGet.mockImplementation(async (url) => {
      if (url === 'leitnersystems/') return { data: [{ idSystem: 3, idMindMap: 7 }, { idSystem: 4, idMindMap: 8 }] }
      return { data: [{ idCard: 5, mindMapNodeId: id, leitnerBox: { level: 2, color: 255 } }] }
    })
    await store.syncCardMasteries()
    expect(mockGet).toHaveBeenCalledWith('leitnercards/system/3')
    expect(mockGet).not.toHaveBeenCalledWith('leitnercards/system/4')
    expect(store.map.nodes[id].mastery).toBe('medium')
    expect(store.map.nodes[id].style.secondaryColor).toBe('#0000ff')
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

describe('useMindMapBuilderStore — rôles des items', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockGet.mockResolvedValue({ data: [] })
  })

  it('addNode — une grandeur reçoit un objet quantity vide', () => {
    const store = useMindMapBuilderStore()
    store.new('Physique')
    const id = store.addNode({ type: 'quantity' })
    expect(store.map.nodes[id].quantity).toEqual({ symbol: '', value: null, unit: '' })
  })

  it('toggleNodeKind — une formule peut aussi être une grandeur', () => {
    const store = useMindMapBuilderStore()
    store.new('Physique')
    const id = store.addNode({ type: 'formula', content: 'E=mc^2' })
    store.toggleNodeKind(id, 'quantity')
    expect(store.map.nodes[id].type).toBe('formula')
    expect(store.map.nodes[id].kinds).toEqual(['quantity'])
    expect(store.map.nodes[id].quantity).toBeDefined()
    store.toggleNodeKind(id, 'quantity')
    expect(store.map.nodes[id].kinds).toEqual([])
  })

  it('toggleNodeKind — ignore le rôle principal et les rôles inconnus', () => {
    const store = useMindMapBuilderStore()
    store.new('Physique')
    const id = store.addNode({ type: 'formula' })
    store.toggleNodeKind(id, 'formula')
    store.toggleNodeKind(id, 'inconnu')
    expect(store.map.nodes[id].kinds).toEqual([])
  })

  it('updateNode — changer le rôle principal retire ce rôle des rôles supplémentaires', () => {
    const store = useMindMapBuilderStore()
    store.new('Physique')
    const id = store.addNode({ type: 'formula' })
    store.toggleNodeKind(id, 'quantity')
    store.updateNode(id, { type: 'quantity' })
    expect(store.map.nodes[id].type).toBe('quantity')
    expect(store.map.nodes[id].kinds).toEqual([])
  })

  it('updateNodeQuantity — convertit la valeur en nombre, null si invalide', () => {
    const store = useMindMapBuilderStore()
    store.new('Physique')
    const id = store.addNode({ type: 'quantity' })
    store.updateNodeQuantity(id, { symbol: 'v', value: '12.5', unit: 'm/s' })
    expect(store.map.nodes[id].quantity).toEqual({ symbol: 'v', value: 12.5, unit: 'm/s' })
    store.updateNodeQuantity(id, { value: 'abc' })
    expect(store.map.nodes[id].quantity.value).toBeNull()
  })

  it('load — un ancien item sans kinds est normalisé', () => {
    const store = useMindMapBuilderStore()
    store.new('Ancienne')
    const payload = store.exportPayload()
    const rootId = payload.subjectNodeId
    delete payload.nodes[rootId].kinds
    store.load(payload)
    expect(store.map.nodes[rootId].kinds).toEqual([])
  })
})

describe('useMindMapBuilderStore — branches', () => {
  const setup = () => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockGet.mockResolvedValue({ data: [] })
    const store = useMindMapBuilderStore()
    store.new('Carte')
    return store
  }

  it('addNode — les branches sortantes reçoivent un ordre de lecture croissant', () => {
    const store = setup()
    const root = store.map.subjectNodeId
    store.addNode({ parentId: root })
    store.addNode({ parentId: root })
    store.addNode({ parentId: root })
    expect(store.map.links.map((l) => l.order)).toEqual([0, 1, 2])
  })

  it('moveLink — échange l\'ordre de lecture et ignore les bornes', () => {
    const store = setup()
    const root = store.map.subjectNodeId
    store.addNode({ parentId: root })
    store.addNode({ parentId: root })
    const [first, second] = store.map.links
    store.moveLink(second.id, -1)
    expect(second.order).toBe(0)
    expect(first.order).toBe(1)
    store.moveLink(second.id, -1)
    expect(second.order).toBe(0)
  })

  it('addBranchType — crée un type personnalisé, refuse les doublons', () => {
    const store = setup()
    expect(store.addBranchType('Équivalence')).toBe('equivalence')
    expect(store.map.branchTypes.some((t) => t.id === 'equivalence')).toBe(true)
    expect(store.addBranchType('equivalence')).toBeNull()
    expect(store.addBranchType('')).toBeNull()
  })

  it('updateLink — fusionne le style et garde forme et sens cohérents', () => {
    const store = setup()
    store.addNode({})
    const link = store.map.links[0]
    store.updateLink(link.id, { direction: 'bidirectional', style: { shape: 'elbow', primaryColor: '#ff0000' } })
    expect(link.direction).toBe('bidirectional')
    expect(link.style).toMatchObject({ shape: 'elbow', primaryColor: '#ff0000', bezier: false })
    expect(link.style.secondaryColor).toBeTruthy()
  })

  it('finalizePendingLink — utilise le type de lien choisi', () => {
    const store = setup()
    const a = store.addNode({})
    const b = store.addNode({})
    store.setLinkType('causalite')
    store.setPendingLinkSource(a)
    store.finalizePendingLink(b)
    expect(store.map.links.find((l) => l.from === a && l.to === b).type).toBe('causalite')
  })

  it('selectedLink — renvoie la branche sélectionnée', () => {
    const store = setup()
    store.addNode({})
    store.selectLink(store.map.links[0].id)
    expect(store.selectedLink.id).toBe(store.map.links[0].id)
  })

  // ── Grandeurs générées depuis une formule ─────────────────────────────────

  describe('createQuantitiesForFormula', () => {
    const formulaStore = (content = 'E = 1/2 M V^2') => {
      const store = setup()
      const id = store.addNode({ label: 'Énergie', type: 'formula', content })
      return { store, id }
    }

    it('crée une grandeur par variable, reliée par une branche « Calcul », symbole prérempli', () => {
      const { store, id } = formulaStore()
      const created = store.createQuantitiesForFormula(id, ['M', 'V'])
      expect(created).toHaveLength(2)
      const symbols = created.map((nid) => store.map.nodes[nid].quantity.symbol)
      expect(symbols).toEqual(['M', 'V'])
      created.forEach((nid) => {
        expect(store.map.nodes[nid].type).toBe('quantity')
        const branch = store.map.links.find((l) => l.from === id && l.to === nid)
        expect(branch.type).toBe('calcul')
      })
    })

    it('ne recrée pas une variable déjà reliée et ignore les symboles inconnus de la formule', () => {
      const { store, id } = formulaStore()
      store.createQuantitiesForFormula(id, ['M'])
      const again = store.createQuantitiesForFormula(id, ['M', 'V', 'zzz'])
      expect(again).toHaveLength(1)
      expect(store.map.nodes[again[0]].quantity.symbol).toBe('V')
    })

    it('le résultat est ensuite calculable dès que les valeurs sont saisies', () => {
      const { store, id } = formulaStore()
      const [m, v] = store.createQuantitiesForFormula(id, ['M', 'V'])
      store.updateNodeQuantity(m, { value: 2, unit: 'kg' })
      store.updateNodeQuantity(v, { value: 5, unit: 'm/s' })
      expect(store.calculations[id]).toMatchObject({ ok: true, value: 25, unit: 'J' })
    })

    it('garde la formule sélectionnée et ne touche pas une formule inexistante', () => {
      const { store, id } = formulaStore()
      store.createQuantitiesForFormula(id, ['M'])
      expect(store.selectedNodeIds).toEqual([id])
      expect(store.createQuantitiesForFormula('absent', ['M'])).toEqual([])
    })
  })
})
