import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import MindmapsListView from '@/components/mindmap/MindmapsListView.vue'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const { mockGet, mockPut, mockDel } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPut: vi.fn(),
  mockDel: vi.fn(),
}))

vi.mock('@/helpers/api', () => ({
  api: { get: mockGet, put: mockPut, del: mockDel },
}))

const mockToast = { success: vi.fn(), error: vi.fn(), warning: vi.fn() }
vi.mock('vue-toastification', () => ({ useToast: () => mockToast }))

// ── Données ───────────────────────────────────────────────────────────────────

const subjects = [
  { subjectId: 1, name: 'Mathématiques' },
  { subjectId: 2, name: 'Physique' },
]

const diagrams = [
  { idMindMap: 1, mmName: 'Carte Maths', subjectId: 1, mindMapJson: '{}' },
  { idMindMap: 2, mmName: 'Carte Physique', subjectId: 2, mindMapJson: '{}' },
]

// ── Stubs ─────────────────────────────────────────────────────────────────────

const ItemListLayoutStub = {
  template: `<div>
    <slot />
    <slot name="modals" />
    <button class="create-trigger" @click="$emit('create')">+ Nouvelle carte</button>
  </div>`,
  emits: ['create', 'update:search', 'update:selectedSubjectId'],
  props: ['subjects', 'loading', 'filteredCount', 'searchPlaceholder', 'createLabel', 'itemLabel', 'emptyMessage'],
}

const MenuItemStub = {
  template: `<div class="menu-item">
    <span class="item-title">{{ title }}</span>
    <slot name="stats" />
    <button class="action-btn" @click="onAction && onAction()">{{ actionLabel }}</button>
    <button class="edit-btn" @click="onEdit && onEdit()">Éditer</button>
    <button class="delete-btn" @click="onDelete && onDelete()">Supprimer</button>
  </div>`,
  props: ['title', 'description', 'actionLabel', 'onAction', 'onEdit', 'onDelete'],
}

// ── Helper ────────────────────────────────────────────────────────────────────

const mountListView = (props = {}) =>
  mount(MindmapsListView, {
    props: { subjects, ...props },
    attachTo: document.body,
    global: {
      stubs: {
        ItemListLayout: ItemListLayoutStub,
        MenuItem: MenuItemStub,
      },
    },
  })

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MindmapsListView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    mockGet.mockResolvedValue({ data: diagrams })
    mockPut.mockResolvedValue({ status: 200 })
    mockDel.mockResolvedValue({ status: 204 })
  })

  // ── Chargement ────────────────────────────────────────────────────────────────

  it('affiche les cartes après le fetch réussi', async () => {
    const wrapper = mountListView()
    await flushPromises()
    const items = wrapper.findAll('.item-title')
    expect(items).toHaveLength(2)
    expect(items[0].text()).toBe('Carte Maths')
    expect(items[1].text()).toBe('Carte Physique')
  })

  it('affiche le badge de la matière associée à chaque carte', async () => {
    const wrapper = mountListView()
    await flushPromises()
    expect(wrapper.text()).toContain('Mathématiques')
    expect(wrapper.text()).toContain('Physique')
  })

  it("affiche un toast d'erreur si le fetch échoue", async () => {
    mockGet.mockRejectedValue(new Error('Network error'))
    mountListView()
    await flushPromises()
    expect(mockToast.error).toHaveBeenCalledWith('Erreur lors du chargement des cartes mentales.')
  })

  // ── Navigation ────────────────────────────────────────────────────────────────

  it("émet @open avec le diagramme au clic 'Ouvrir l'éditeur'", async () => {
    const wrapper = mountListView()
    await flushPromises()
    await wrapper.findAll('.action-btn')[0].trigger('click')
    expect(wrapper.emitted('open')).toBeDefined()
    expect(wrapper.emitted('open')[0][0]).toMatchObject({ idMindMap: 1, mmName: 'Carte Maths' })
  })

  // ── Création ──────────────────────────────────────────────────────────────────

  it('ouvre la modale de création au clic "+ Nouvelle carte"', async () => {
    const wrapper = mountListView()
    await flushPromises()
    await wrapper.find('.create-trigger').trigger('click')
    expect(wrapper.find('.modal-title').text()).toBe('Nouvelle carte mentale')
  })

  it('la modale de création pré-remplit le nom par défaut', async () => {
    const wrapper = mountListView()
    await flushPromises()
    await wrapper.find('.create-trigger').trigger('click')
    expect(wrapper.find('input.form-input').element.value).toBe('Nouvelle carte mentale')
  })

  it('la modale de création liste les matières dans le select', async () => {
    const wrapper = mountListView()
    await flushPromises()
    await wrapper.find('.create-trigger').trigger('click')
    expect(wrapper.text()).toContain('Mathématiques')
    expect(wrapper.text()).toContain('Physique')
  })

  it('soumettre la modale de création émet @create et ferme la modale', async () => {
    const wrapper = mountListView()
    await flushPromises()
    await wrapper.find('.create-trigger').trigger('click')
    await wrapper.find('input.form-input').setValue('Ma nouvelle carte')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('create')).toBeDefined()
    expect(wrapper.emitted('create')[0][0]).toMatchObject({ name: 'Ma nouvelle carte' })
    expect(wrapper.find('.modal-title').exists()).toBe(false)
  })

  it('le bouton Annuler ferme la modale de création sans émettre', async () => {
    const wrapper = mountListView()
    await flushPromises()
    await wrapper.find('.create-trigger').trigger('click')
    await wrapper.find('.btn-modal-cancel').trigger('click')
    expect(wrapper.find('.modal-title').exists()).toBe(false)
    expect(wrapper.emitted('create')).toBeUndefined()
  })

  // ── Renommage ─────────────────────────────────────────────────────────────────

  it('ouvre la modale de renommage avec le nom existant pré-rempli', async () => {
    const wrapper = mountListView()
    await flushPromises()
    await wrapper.findAll('.edit-btn')[0].trigger('click')
    expect(wrapper.find('.modal-title').text()).toBe('Modifier la carte')
    expect(wrapper.find('input.form-input').element.value).toBe('Carte Maths')
  })

  it('confirmer le renommage appelle api.put et met à jour la liste localement', async () => {
    const wrapper = mountListView()
    await flushPromises()
    await wrapper.findAll('.edit-btn')[0].trigger('click')
    await wrapper.find('input.form-input').setValue('Carte Maths Renommée')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(mockPut).toHaveBeenCalledWith(
      '/diagrammes/1',
      expect.objectContaining({ mmName: 'Carte Maths Renommée' })
    )
    expect(wrapper.findAll('.item-title')[0].text()).toBe('Carte Maths Renommée')
    expect(wrapper.find('.modal-title').exists()).toBe(false)
  })

  // ── Suppression ───────────────────────────────────────────────────────────────

  it('supprimer après confirmation appelle api.del et retire la carte de la liste', async () => {
    const wrapper = mountListView()
    await flushPromises()
    await wrapper.findAll('.delete-btn')[0].trigger('click')
    await flushPromises()
    expect(mockDel).toHaveBeenCalledWith('diagrammes/1')
    expect(wrapper.findAll('.item-title')).toHaveLength(1)
    expect(wrapper.findAll('.item-title')[0].text()).toBe('Carte Physique')
  })

  it('ne supprime pas si window.confirm retourne false', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const wrapper = mountListView()
    await flushPromises()
    await wrapper.findAll('.delete-btn')[0].trigger('click')
    expect(mockDel).not.toHaveBeenCalled()
    expect(wrapper.findAll('.item-title')).toHaveLength(2)
  })
})
