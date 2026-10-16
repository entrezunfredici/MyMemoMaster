import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { useMindMapBuilderStore } from '@/stores/mindmapBuilder'
import PaletteImageField from '@/components/mindmap/palette/PaletteImageField.vue'
import PaletteCardLink from '@/components/mindmap/palette/PaletteCardLink.vue'
import { ImageUploadError } from '@/helpers/mindmap/mindmapImage'

const { mockGet, mockUpload } = vi.hoisted(() => ({ mockGet: vi.fn(), mockUpload: vi.fn() }))
vi.mock('@/helpers/api', () => ({ api: { get: mockGet, post: vi.fn() } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: vi.fn() } }))
vi.mock('@/helpers/mindmap/mindmapImage', async (importOriginal) => ({
  ...(await importOriginal()),
  uploadMindmapImage: mockUpload,
}))

const mountWith = (component, node) =>
  mount(component, {
    props: { node },
    global: { plugins: [createTestingPinia({ createSpy: vi.fn, stubActions: true })] },
  })

describe('PaletteImageField', () => {
  const node = (extra = {}) => ({ id: 'n1', label: 'Schéma', type: 'image', content: '', ...extra })
  const pickFile = async (wrapper, size = 10) => {
    const input = wrapper.find('input[type="file"]')
    const file = new File([new Uint8Array(size)], 'a.png', { type: 'image/png' })
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
    await input.trigger('change')
    await flushPromises()
  }

  beforeEach(() => vi.clearAllMocks())

  it('sans image : bouton de choix seul, pas d’aperçu', () => {
    const wrapper = mountWith(PaletteImageField, node())
    expect(wrapper.text()).toContain('Choisir une image')
    expect(wrapper.text()).not.toContain('Retirer')
    expect(wrapper.find('img').exists()).toBe(false)
  })

  it('avec image : aperçu et bouton Retirer qui vide le contenu', async () => {
    const wrapper = mountWith(PaletteImageField, node({ content: 'http://x/a.png' }))
    expect(wrapper.find('img').attributes('src')).toBe('http://x/a.png')
    await wrapper.findAll('button').find((b) => b.text() === 'Retirer').trigger('click')
    expect(useMindMapBuilderStore().updateNode).toHaveBeenCalledWith('n1', { content: '' })
  })

  it('envoi réussi : l’URL est enregistrée dans l’item', async () => {
    mockUpload.mockResolvedValue('http://x/new.png')
    const wrapper = mountWith(PaletteImageField, node())
    await pickFile(wrapper)
    expect(useMindMapBuilderStore().updateNode).toHaveBeenCalledWith('n1', { content: 'http://x/new.png' })
    expect(wrapper.find('.palette__error').exists()).toBe(false)
  })

  it('image trop lourde ou échec d’envoi : message d’erreur adapté, item inchangé', async () => {
    const wrapper = mountWith(PaletteImageField, node())
    mockUpload.mockRejectedValueOnce(new ImageUploadError('IMAGE_TOO_LARGE'))
    await pickFile(wrapper)
    expect(wrapper.find('.palette__error').text()).toBe("L'image dépasse 5 Mo.")
    mockUpload.mockRejectedValueOnce(new ImageUploadError('UPLOAD_FAILED'))
    await pickFile(wrapper)
    expect(wrapper.find('.palette__error').text()).toBe("L'image n'a pas pu être téléchargée.")
    expect(useMindMapBuilderStore().updateNode).not.toHaveBeenCalled()
  })

  it('changer d’item efface le message d’erreur', async () => {
    const wrapper = mountWith(PaletteImageField, node())
    mockUpload.mockRejectedValueOnce(new ImageUploadError('UPLOAD_FAILED'))
    await pickFile(wrapper)
    expect(wrapper.find('.palette__error').exists()).toBe(true)
    await wrapper.setProps({ node: node({ id: 'n2' }) })
    expect(wrapper.find('.palette__error').exists()).toBe(false)
  })
})

describe('PaletteCardLink', () => {
  const node = (extra = {}) => ({ id: 'n1', label: 'v', idCard: null, idSystem: null, ...extra })
  const cards = [
    { idCard: 7, question: { statement: 'Énergie cinétique ?' }, leitnerBox: { level: 3, color: 0x2ecc71 } },
    { idCard: 8, question: { statement: 'Vitesse ?' }, leitnerBox: { level: 1, color: 0xe74c3c } },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockImplementation((route) =>
      Promise.resolve({ data: route.startsWith('leitnersystems') ? [{ idSystem: 3, name: 'Physique' }] : cards })
    )
  })

  it('item non lié : propose « Lier une flashcard », rien n’est chargé', () => {
    const wrapper = mountWith(PaletteCardLink, node())
    expect(wrapper.text()).toContain('Lier une flashcard')
    expect(wrapper.find('.palette__card-linked').exists()).toBe(false)
    expect(mockGet).not.toHaveBeenCalled()
  })

  it('item déjà lié : charge les cartes du système et affiche l’énoncé et « Changer »', async () => {
    const wrapper = mountWith(PaletteCardLink, node({ idCard: 7, idSystem: 3 }))
    await flushPromises()
    expect(mockGet).toHaveBeenCalledWith('leitnercards/system/3')
    expect(wrapper.find('.palette__card-statement').text()).toBe('Énergie cinétique ?')
    expect(wrapper.text()).toContain('Changer')
  })

  it('lien : systèmes → cartes → « Lier » enregistre le lien, la maîtrise et la couleur de la boîte', async () => {
    const wrapper = mountWith(PaletteCardLink, node())
    await wrapper.find('button.palette__btn--sm').trigger('click')
    await flushPromises()
    expect(mockGet).toHaveBeenCalledWith('leitnersystems/')
    await wrapper.find('select[aria-label="Système de Leitner source"]').setValue('3')
    await flushPromises()
    expect(mockGet).toHaveBeenCalledWith('leitnercards/system/3')
    await wrapper.find('select[aria-label="Carte à lier"]').setValue(7)
    await wrapper.findAll('button').find((b) => b.text() === 'Lier').trigger('click')
    const store = useMindMapBuilderStore()
    expect(store.linkCard).toHaveBeenCalledWith('n1', 7, 3)
    expect(store.updateNode).toHaveBeenCalledWith('n1', { mastery: expect.any(String) })
    expect(store.updateNodeStyle).toHaveBeenCalledWith('n1', { secondaryColor: expect.stringMatching(/^#/) })
    expect(wrapper.find('.palette__card-picker').exists()).toBe(false)
  })

  it('« Lier » reste désactivé tant qu’aucune carte n’est choisie ; « Annuler » ferme le sélecteur', async () => {
    const wrapper = mountWith(PaletteCardLink, node())
    await wrapper.find('button.palette__btn--sm').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('button').find((b) => b.text() === 'Lier').attributes('disabled')).toBeDefined()
    await wrapper.findAll('button').find((b) => b.text() === 'Annuler').trigger('click')
    expect(wrapper.find('.palette__card-picker').exists()).toBe(false)
  })

  it('« ✕ » délie la carte', async () => {
    const wrapper = mountWith(PaletteCardLink, node({ idCard: 7, idSystem: 3 }))
    await flushPromises()
    await wrapper.find('.palette__card-unlink').trigger('click')
    expect(useMindMapBuilderStore().unlinkCard).toHaveBeenCalledWith('n1')
  })

  it('échec du chargement des systèmes : le sélecteur se referme', async () => {
    mockGet.mockRejectedValueOnce(new Error('réseau'))
    const wrapper = mountWith(PaletteCardLink, node())
    await wrapper.find('button.palette__btn--sm').trigger('click')
    await flushPromises()
    expect(wrapper.find('.palette__card-picker').exists()).toBe(false)
  })
})
