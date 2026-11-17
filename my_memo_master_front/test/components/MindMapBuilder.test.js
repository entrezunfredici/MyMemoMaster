import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import MindMapBuilder from '@/components/mindmap/MindMapBuilder.vue'

const mountBuilder = () =>
  mount(MindMapBuilder, {
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn, stubActions: true })],
      stubs: { MindMapBoard: true, MindMapPalette: true },
    },
  })

describe('MindMapBuilder — menus mobiles', () => {
  it('le menu des actions est fermé par défaut et se bascule via le burger', async () => {
    const wrapper = mountBuilder()
    const toggle = wrapper.find('[data-testid="builder-actions-toggle"]')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('.mindmap-builder__actions').classes()).not.toContain('is-open')
    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('.mindmap-builder__actions').classes()).toContain('is-open')
  })

  it('choisir une action émet l\'événement et referme le menu', async () => {
    const wrapper = mountBuilder()
    await wrapper.find('[data-testid="builder-actions-toggle"]').trigger('click')
    await wrapper.find('.mindmap-builder__actions .primary').trigger('click')
    expect(wrapper.emitted('save')).toHaveLength(1)
    expect(wrapper.find('.mindmap-builder__actions').classes()).not.toContain('is-open')
  })

  it('« Exporter en JSON » télécharge un fichier sans émettre d\'événement', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:test')
    URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const wrapper = mountBuilder()
    const store = (await import('@/stores/mindmapBuilder')).useMindMapBuilderStore()
    store.exportPayload.mockReturnValue({ title: 'Test', nodes: [] })
    await wrapper.find('[data-testid="builder-export-json"]').trigger('click')
    expect(click).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('export')).toBeUndefined()
    click.mockRestore()
  })

  it('le panneau d\'outils s\'ouvre et se ferme avec le bouton Outils', async () => {
    const wrapper = mountBuilder()
    const toggle = wrapper.find('[data-testid="builder-tools-toggle"]')
    expect(toggle.text()).toBe('Outils')
    expect(wrapper.find('[data-testid="builder-tools"]').classes()).not.toContain('is-open')
    await toggle.trigger('click')
    expect(toggle.text()).toBe('Fermer')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('[data-testid="builder-tools"]').classes()).toContain('is-open')
  })

  it('les boutons désactivés pendant le chargement n\'émettent rien', async () => {
    const wrapper = mount(MindMapBuilder, {
      props: { loading: true },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn, stubActions: true })],
        stubs: { MindMapBoard: true, MindMapPalette: true },
      },
    })
    await wrapper.find('.mindmap-builder__actions .primary').trigger('click')
    expect(wrapper.emitted('save')).toBeUndefined()
  })
})
