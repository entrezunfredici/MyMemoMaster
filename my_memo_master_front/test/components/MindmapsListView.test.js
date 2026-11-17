import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import MindmapsListView from '@/components/mindmap/MindmapsListView.vue'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const { mockGet, mockPost, mockPut, mockDel, mockToast } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockDel: vi.fn(),
  mockToast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}))

vi.mock('@/helpers/api', () => ({
  api: { get: mockGet, post: mockPost, put: mockPut, del: mockDel },
}))

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
    <slot name="actions" />
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
    <slot name="actions" />
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
      plugins: [createTestingPinia({ createSpy: vi.fn, stubActions: true })],
      stubs: {
        ItemListLayout: ItemListLayoutStub,
        MenuItem: MenuItemStub,
        TagSelectorComponent: true,
      },
    },
  })

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MindmapsListView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'confirm')
    // copie : les tests de partage modifient les cartes (jeton), sans contaminer les suivants
    mockGet.mockResolvedValue({ data: structuredClone(diagrams) })
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

  it('la modale de création laisse le nom vide avec un placeholder (pas de valeur pré-remplie)', async () => {
    const wrapper = mountListView()
    await flushPromises()
    await wrapper.find('.create-trigger').trigger('click')
    const input = wrapper.find('input.form-input')
    expect(input.element.value).toBe('')
    expect(input.attributes('placeholder')).toBeTruthy()
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
    await wrapper.find('.btn-modal-danger').trigger('click')
    await flushPromises()
    expect(mockDel).toHaveBeenCalledWith('diagrammes/1')
    expect(wrapper.findAll('.item-title')).toHaveLength(1)
    expect(wrapper.findAll('.item-title')[0].text()).toBe('Carte Physique')
  })

  it('supprimer une carte quand api.del retourne undefined (204 réel) est traité comme un succès', async () => {
    // api.del retourne `undefined` sur une réponse 204 (voir helpers/api.js) — c'est le cas réel
    // renvoyé par Diagramme.controller.delete, contrairement au mock `{ status: 204 }` ci-dessus.
    mockDel.mockResolvedValue(undefined)
    const wrapper = mountListView()
    await flushPromises()
    await wrapper.findAll('.delete-btn')[0].trigger('click')
    await wrapper.find('.btn-modal-danger').trigger('click')
    await flushPromises()
    expect(mockToast.success).toHaveBeenCalledWith('Carte supprimée.')
    expect(mockToast.warning).not.toHaveBeenCalled()
    expect(wrapper.findAll('.item-title')).toHaveLength(1)
    expect(wrapper.findAll('.item-title')[0].text()).toBe('Carte Physique')
  })

  it('la confirmation est la modale commune, nominative (jamais window.confirm)', async () => {
    const nativeConfirm = vi.spyOn(window, 'confirm')
    const wrapper = mountListView()
    await flushPromises()
    await wrapper.findAll('.delete-btn')[0].trigger('click')
    expect(nativeConfirm).not.toHaveBeenCalled()
    const dialog = wrapper.find('[role="dialog"][aria-label="Supprimer la carte"]')
    expect(dialog.text()).toContain('Carte Maths')
    expect(mockDel).not.toHaveBeenCalled()
  })

  it('« Annuler » ne supprime rien', async () => {
    const wrapper = mountListView()
    await flushPromises()
    await wrapper.findAll('.delete-btn')[0].trigger('click')
    await wrapper.find('.btn-modal-cancel').trigger('click')
    expect(mockDel).not.toHaveBeenCalled()
    expect(wrapper.findAll('.item-title')).toHaveLength(2)
  })

  // ── Import JSON ───────────────────────────────────────────────────────────────

  const validMap = {
    title: 'Carte importée de test',
    subjectNodeId: 'n1',
    nodes: { n1: { id: 'n1', label: 'Sujet', type: 'text', content: '', idCard: 12, idSystem: 3, meta: { isSubject: true } } },
    links: [],
  }

  const pickFile = async (wrapper, content, name = 'carte.json') => {
    const input = wrapper.find('[data-testid="mindmap-import-input"]')
    const file = new File([content], name, { type: 'application/json' })
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
    await input.trigger('change')
    // la lecture du fichier (FileReader) est asynchrone : on attend la fin de l'import
    await vi.waitFor(() =>
      expect(wrapper.find('[data-testid="mindmap-import-button"]').text()).toBe('Importer un JSON')
    )
    await flushPromises()
  }

  it("« Importer un JSON » crée la carte via l'API et l'ajoute à la liste", async () => {
    mockPost.mockResolvedValue({ status: 201, data: { idMindMap: 9, mmName: 'Carte importée de test', subjectId: 1 } })
    const wrapper = mountListView()
    await flushPromises()

    await pickFile(wrapper, JSON.stringify(validMap))

    expect(mockPost).toHaveBeenCalledTimes(1)
    const [endpoint, body] = mockPost.mock.calls[0]
    expect(endpoint).toBe('diagrammes')
    expect(body.mmName).toBe('Carte importée de test')
    expect(body.subjectId).toBe(1)
    // les liens vers les flashcards de l'auteur ne sont pas conservés
    expect(body.mindMapJson.nodes.n1.idCard).toBeUndefined()
    expect(wrapper.findAll('.item-title')).toHaveLength(3)
    expect(mockToast.success).toHaveBeenCalled()
  })

  it("refuse un fichier qui n'est pas une carte, sans appeler l'API", async () => {
    const wrapper = mountListView()
    await flushPromises()

    await pickFile(wrapper, '{"foo": 1}')

    expect(mockPost).not.toHaveBeenCalled()
    expect(mockToast.error).toHaveBeenCalledWith("Ce fichier n'est pas une carte mentale MyMemoMaster.")
    expect(wrapper.findAll('.item-title')).toHaveLength(2)
  })

  it('signale une erreur si le serveur refuse la carte', async () => {
    mockPost.mockResolvedValue({ status: 400, data: { message: 'x' } })
    const wrapper = mountListView()
    await flushPromises()
    await pickFile(wrapper, JSON.stringify(validMap))
    expect(mockToast.error).toHaveBeenCalledWith("Erreur lors de l'import de la carte.")
    expect(wrapper.findAll('.item-title')).toHaveLength(2)
  })

  // ── Partage public ────────────────────────────────────────────────────────────

  it("« Partager » propose de créer le lien, puis l'affiche", async () => {
    mockPost.mockResolvedValue({ status: 200, data: { shareToken: 'jeton-0123456789abcdefghij' } })
    const wrapper = mountListView()
    await flushPromises()

    await wrapper.findAll('[data-testid="mindmap-share-button"]')[0].trigger('click')
    expect(wrapper.find('[data-testid="mindmap-share-url"]').exists()).toBe(false)

    await wrapper.find('[data-testid="mindmap-share-enable"]').trigger('click')
    await flushPromises()

    expect(mockPost).toHaveBeenCalledWith('diagrammes/1/partage')
    expect(wrapper.find('[data-testid="mindmap-share-url"]').element.value).toBe(
      `${window.location.origin}/partage/carte/jeton-0123456789abcdefghij`
    )
  })

  it('une carte déjà partagée affiche directement son lien', async () => {
    mockGet.mockResolvedValue({ data: [{ ...diagrams[0], shareToken: 'deja-actif-0123456789abc' }] })
    const wrapper = mountListView()
    await flushPromises()
    await wrapper.find('[data-testid="mindmap-share-button"]').trigger('click')
    expect(wrapper.find('[data-testid="mindmap-share-url"]').element.value).toContain('/partage/carte/deja-actif-0123456789abc')
  })

  it('« Désactiver le lien » révoque le partage', async () => {
    mockGet.mockResolvedValue({ data: [{ ...diagrams[0], shareToken: 'deja-actif-0123456789abc' }] })
    mockDel.mockResolvedValue(undefined) // 204
    const wrapper = mountListView()
    await flushPromises()
    await wrapper.find('[data-testid="mindmap-share-button"]').trigger('click')

    await wrapper.find('[data-testid="mindmap-share-disable"]').trigger('click')
    await flushPromises()

    expect(mockDel).toHaveBeenCalledWith('diagrammes/1/partage')
    expect(wrapper.find('[data-testid="mindmap-share-url"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="mindmap-share-enable"]').exists()).toBe(true)
  })

  it("signale l'échec de création du lien", async () => {
    mockPost.mockResolvedValue({ status: 403, data: {} })
    const wrapper = mountListView()
    await flushPromises()
    await wrapper.findAll('[data-testid="mindmap-share-button"]')[0].trigger('click')
    await wrapper.find('[data-testid="mindmap-share-enable"]').trigger('click')
    await flushPromises()
    expect(mockToast.error).toHaveBeenCalledWith('Impossible de créer le lien de partage.')
    expect(wrapper.find('[data-testid="mindmap-share-url"]').exists()).toBe(false)
  })
})
