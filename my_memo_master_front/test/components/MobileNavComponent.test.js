import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import MobileNav from '@/components/MobileNavComponent.vue'

const routeState = ref({ name: 'home', fullPath: '/' })
const isAdmin = ref(false)

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useRoute: () => routeState.value }
})
vi.mock('@/composables/useRole', () => ({ useRole: () => ({ isAdminPlateforme: isAdmin }) }))

const RouterLinkStub = { props: ['to'], template: '<a :href="to"><slot /></a>' }

const mountNav = () =>
  mount(MobileNav, {
    attachTo: document.body,
    global: { stubs: { RouterLink: RouterLinkStub } },
  })

const sheet = () => document.body.querySelector('[data-testid="mobile-nav-sheet"]')

describe('MobileNav — barre du bas', () => {
  beforeEach(() => {
    routeState.value = { name: 'home', fullPath: '/' }
    isAdmin.value = false
    document.body.innerHTML = ''
  })

  it('affiche 4 onglets + le bouton Plus, tous avec un nom accessible', () => {
    const wrapper = mountNav()
    const controls = wrapper.find('nav').findAll('a, button')
    expect(controls).toHaveLength(5)
    for (const c of controls) expect(c.attributes('aria-label')).toBeTruthy()
    wrapper.unmount()
  })

  it('le menu Plus est fermé par défaut puis s\'ouvre au clic (aria-expanded)', async () => {
    const wrapper = mountNav()
    const more = wrapper.find('[data-testid="mobile-nav-more"]')
    expect(more.attributes('aria-expanded')).toBe('false')
    expect(sheet()).toBeNull()
    await more.trigger('click')
    expect(more.attributes('aria-expanded')).toBe('true')
    expect(sheet()).not.toBeNull()
    wrapper.unmount()
  })

  it('la feuille liste les autres écrans, sans Administration pour un non-admin', async () => {
    const wrapper = mountNav()
    await wrapper.find('[data-testid="mobile-nav-more"]').trigger('click')
    const labels = [...sheet().querySelectorAll('a')].map((a) => a.getAttribute('aria-label'))
    expect(labels).toEqual(['Classe', 'Calendrier & rappels', 'To-do', 'Ma Progression', 'Profil', 'Réglages'])
    wrapper.unmount()
  })

  it('un admin plateforme voit aussi l\'entrée Administration', async () => {
    isAdmin.value = true
    const wrapper = mountNav()
    await wrapper.find('[data-testid="mobile-nav-more"]').trigger('click')
    const labels = [...sheet().querySelectorAll('a')].map((a) => a.getAttribute('aria-label'))
    expect(labels).toContain('Administration')
    const admin = [...sheet().querySelectorAll('a')].find((a) => a.getAttribute('aria-label') === 'Administration')
    expect(admin.getAttribute('href')).toBe('/admin')
    wrapper.unmount()
  })

  it('l’entrée Administration n’est active que sur la page /admin (pas sur la page Classe)', async () => {
    isAdmin.value = true
    routeState.value = { name: 'classroom', fullPath: '/classroom' }
    const wrapper = mountNav()
    await wrapper.find('[data-testid="mobile-nav-more"]').trigger('click')
    const active = () => [...sheet().querySelectorAll('.mobile-sheet__item--active')].map((a) => a.getAttribute('aria-label'))
    expect(active()).toEqual(['Classe'])
    wrapper.unmount()
    routeState.value = { name: 'admin', fullPath: '/admin' }
    const onAdmin = mountNav()
    await onAdmin.find('[data-testid="mobile-nav-more"]').trigger('click')
    expect(active()).toEqual(['Administration'])
    onAdmin.unmount()
  })

  it('Échap ferme la feuille', async () => {
    const wrapper = mountNav()
    await wrapper.find('[data-testid="mobile-nav-more"]').trigger('click')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()
    expect(sheet()).toBeNull()
    wrapper.unmount()
  })

  it('un clic sur le fond ferme la feuille', async () => {
    const wrapper = mountNav()
    await wrapper.find('[data-testid="mobile-nav-more"]').trigger('click')
    document.body.querySelector('[data-testid="mobile-nav-backdrop"]').click()
    await wrapper.vm.$nextTick()
    expect(sheet()).toBeNull()
    wrapper.unmount()
  })

  it('« Plus » est actif quand la route courante est une entrée de la feuille', async () => {
    const wrapper = mountNav()
    await wrapper.find('[data-testid="mobile-nav-more"]').trigger('click')
    routeState.value = { name: 'kpi', fullPath: '/kpi' }
    await wrapper.vm.$nextTick()
    // TODO: la fermeture sur changement de route (watch fullPath) n'est pas couverte — useRoute() est mocké sans réactivité
    expect(wrapper.find('[data-testid="mobile-nav-more"]').classes()).toContain('mobile-nav__tab--active')
    wrapper.unmount()
  })

  it('l\'onglet de la route courante est actif', () => {
    routeState.value = { name: 'mindmaps', fullPath: '/mindmaps' }
    const wrapper = mountNav()
    const active = wrapper.findAll('a.mobile-nav__tab--active')
    expect(active).toHaveLength(1)
    expect(active[0].attributes('aria-label')).toBe('Cartes mentales')
    wrapper.unmount()
  })
})
