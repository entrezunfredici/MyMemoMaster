import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import App from '@/App.vue'

// ── Mocks ─────────────────────────────────────────────────────────────────────
// route.name = 'home' : ni le layout "auth" (login/register/...) ni mobile
// (isMobile() lit navigator.userAgent, absent en jsdom → false) — la navigation
// desktop (aside > nav) est donc celle rendue par ce montage.
vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useRoute: () => ({ name: 'home', meta: { title: 'Accueil' } }),
  }
})

const RouterLinkStub = { template: '<a><slot /></a>' }

const mountApp = () =>
  mount(App, {
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn, stubActions: true })],
      stubs: {
        RouterLink: RouterLinkStub,
        RouterView: true,
        NotificationBell: true,
        GuidedTourBanner: true,
        OnboardingTour: true,
      },
    },
  })

// ── Tests ─────────────────────────────────────────────────────────────────────
// Régression RGAA 6.2 (2026-08-31) : la navigation principale ne contenait
// qu'une icône par lien, sans nom accessible — un lecteur d'écran ne pouvait
// identifier aucun des liens du menu.

describe('App — navigation principale (RGAA 6.2)', () => {
  it('chaque lien de la nav desktop a un nom accessible (aria-label ou texte)', () => {
    const wrapper = mountApp()
    const navLinks = wrapper.find('aside nav').findAll('a')
    expect(navLinks.length).toBeGreaterThan(0)
    for (const link of navLinks) {
      const accessibleName = link.attributes('aria-label') || link.text().trim()
      expect(accessibleName, `lien sans nom accessible : ${link.html()}`).toBeTruthy()
    }
  })

  it('le lien "Classe" de la nav desktop porte bien aria-label="Classe"', () => {
    const wrapper = mountApp()
    const navLinks = wrapper.find('aside nav').findAll('a')
    const classroomLink = navLinks.find((l) => l.attributes('aria-label') === 'Classe')
    expect(classroomLink).toBeTruthy()
  })
})
