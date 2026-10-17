import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import TutorialsPage from '@/pages/TutorialsPage.vue'

const { mockPush, route } = vi.hoisted(() => ({ mockPush: vi.fn(), route: { path: '/tutorials', query: {} } }))
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal()),
  useRouter: () => ({ push: mockPush }),
  useRoute: () => route,
}))

const mountPage = () =>
  mount(TutorialsPage, {
    global: {
      stubs: {
        SubjectFilter: { template: '<div data-testid="subject-filter" />' },
        SubjectFilterComponent: { template: '<div data-testid="subject-filter" />' },
        Tutorial: { props: ['tutorial'], template: '<article data-testid="tutorial">{{ tutorial.title }}</article>' },
        TutorialItem: { props: ['tutorial'], template: '<article data-testid="tutorial">{{ tutorial.title }}</article>' },
      },
    },
  })

describe('TutorialsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    route.path = '/tutorials'
    route.query = {}
  })

  it('affiche le filtre par sujet et la liste des tutoriels', () => {
    const wrapper = mountPage()
    expect(wrapper.find('[data-testid="subject-filter"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="tutorial"]').length).toBeGreaterThan(0)
  })

  it('la case « Tips de révision » est reliée à son libellé (RGAA 11.1)', () => {
    const wrapper = mountPage()
    expect(wrapper.find('label[for="tips"]').text()).toBe('Tips de révision')
    expect(wrapper.find('input#tips').attributes('type')).toBe('checkbox')
  })

  it('cocher la case ajoute ?tips à l’URL en conservant les autres paramètres', async () => {
    route.query = { subject: '3' }
    const wrapper = mountPage()
    await wrapper.find('#tips').trigger('click')
    expect(mockPush).toHaveBeenCalledWith({ path: '/tutorials', query: { subject: '3', tips: true } })
  })

  it('décocher la case retire ?tips de l’URL en conservant les autres paramètres', async () => {
    route.query = { subject: '3', tips: 'true' }
    const wrapper = mountPage()
    const box = wrapper.find('#tips')
    box.element.checked = true
    await box.trigger('click')
    expect(mockPush).toHaveBeenCalledWith({ path: '/tutorials', query: { subject: '3' } })
  })

  it('ne modifie pas l’objet de requête de la route (copie défensive)', async () => {
    route.query = { tips: 'true' }
    const wrapper = mountPage()
    const box = wrapper.find('#tips')
    box.element.checked = true
    await box.trigger('click')
    expect(route.query).toEqual({ tips: 'true' })
  })
})
