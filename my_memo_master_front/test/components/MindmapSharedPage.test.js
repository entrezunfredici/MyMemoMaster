import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import MindmapSharedPage from '@/pages/MindmapSharedPage.vue'
import routes from '@/router/routes'

const { mockGetShared } = vi.hoisted(() => ({ mockGetShared: vi.fn() }))

vi.mock('@/helpers/mindmap/mindmapApi', () => ({ mindmapApi: { getShared: mockGetShared } }))
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal()),
  useRoute: () => ({ params: { token: 'tokentokentokentokentoken' } }),
}))

const mountPage = () => {
  const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true })
  const wrapper = mount(MindmapSharedPage, {
    global: { plugins: [pinia], stubs: { MindMapBoard: { name: 'MindMapBoard', template: '<div class="board-stub" />', props: { readonly: Boolean } } } },
  })
  return wrapper
}

describe('MindmapSharedPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('la route est publique (pas de meta.private)', () => {
    const route = routes.find((r) => r.name === 'mindmap-shared')
    expect(route.path).toBe('/partage/carte/:token')
    expect(route.meta.private).not.toBe(true)
  })

  it('affiche la carte partagée en lecture seule', async () => {
    mockGetShared.mockResolvedValue({ status: 200, data: { mmName: 'Maths', mindMapJson: '{"nodes":{},"links":[]}' } })
    const wrapper = mountPage()
    await flushPromises()

    expect(mockGetShared).toHaveBeenCalledWith('tokentokentokentokentoken')
    expect(wrapper.find('[data-testid="shared-mindmap-title"]').text()).toBe('Maths')
    expect(wrapper.text()).toContain('lecture seule')
    expect(wrapper.findComponent({ name: 'MindMapBoard' }).props('readonly')).toBe(true)
  })

  it('charge la carte sans appels API authentifiés (syncCards: false)', async () => {
    mockGetShared.mockResolvedValue({ status: 200, data: { mmName: 'Maths', mindMapJson: { nodes: {}, links: [] } } })
    const wrapper = mountPage()
    await flushPromises()
    const { useMindMapBuilderStore } = await import('@/stores/mindmapBuilder')
    const store = useMindMapBuilderStore()
    expect(store.load).toHaveBeenCalledWith({ nodes: {}, links: [] }, null, { syncCards: false })
    wrapper.unmount()
  })

  it('un lien invalide ou désactivé affiche « Carte introuvable »', async () => {
    mockGetShared.mockResolvedValue({ status: 404, data: { message: 'x' } })
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('Carte introuvable')
    expect(wrapper.find('.board-stub').exists()).toBe(false)
  })

  it('une erreur réseau affiche aussi « Carte introuvable »', async () => {
    mockGetShared.mockResolvedValue(undefined)
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('Carte introuvable')
  })
})
