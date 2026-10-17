import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import SettingsPage from '@/pages/SettingsPage.vue'
import { useKpiAlertSettingsStore } from '@/stores/kpiAlertSettings'

const KEY = 'mmm_dark_mode'

const SETTINGS = {
  enabled: true,
  inAppEnabled: true,
  emailEnabled: false,
  streakAlertEnabled: true,
  disciplineAlertEnabled: true,
  thresholdDiscipline: 40,
  scoreDropAlertEnabled: false,
}

function mountPage({ settings = null, loading = false } = {}) {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: true,
    initialState: { kpiAlertSettings: { settings, loading } },
  })
  const store = useKpiAlertSettingsStore(pinia)
  const wrapper = mount(SettingsPage, {
    global: { plugins: [pinia], stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
  })
  return { wrapper, store }
}

const sidebarButton = (wrapper, label) => wrapper.findAll('aside button').find((b) => b.text() === label)
const toggle = (wrapper, label) => wrapper.find(`input[type="checkbox"][aria-label="${label}"]`)
const goToNotifications = async (wrapper) => {
  await sidebarButton(wrapper, 'Notifications').trigger('click')
  await flushPromises()
}

describe('SettingsPage', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark-mode')
  })
  afterEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark-mode')
  })

  describe('navigation', () => {
    it('affiche « Apparence » par défaut', () => {
      const { wrapper } = mountPage()
      expect(wrapper.find('.settings__title').text()).toBe('Apparence')
    })

    it('le lien « Profil & sécurité » mène à /profile', () => {
      const { wrapper } = mountPage()
      const link = wrapper.find('aside a')
      expect(link.text()).toBe('Profil & sécurité')
      expect(link.attributes('href')).toBe('/profile')
    })

    it('la section active est signalée visuellement dans le menu', async () => {
      const { wrapper } = mountPage()
      expect(sidebarButton(wrapper, 'Apparence').classes()).toContain('settings__sidebar-link--active')
      await sidebarButton(wrapper, 'Accessibilité').trigger('click')
      expect(sidebarButton(wrapper, 'Apparence').classes()).not.toContain('settings__sidebar-link--active')
      expect(sidebarButton(wrapper, 'Accessibilité').classes()).toContain('settings__sidebar-link--active')
    })

    it('« Accessibilité » annonce que les options arrivent dans une prochaine version', async () => {
      const { wrapper } = mountPage()
      await sidebarButton(wrapper, 'Accessibilité').trigger('click')
      expect(wrapper.find('.settings__title').text()).toBe('Accessibilité')
      expect(wrapper.text()).toContain('prochaine version')
    })

    it('un seul titre de section à la fois', async () => {
      const { wrapper } = mountPage()
      await sidebarButton(wrapper, 'Notifications').trigger('click')
      expect(wrapper.findAll('.settings__title')).toHaveLength(1)
    })
  })

  describe('mode sombre', () => {
    it('par défaut : désactivé, pas de classe sur <html>', () => {
      const { wrapper } = mountPage()
      expect(toggle(wrapper, 'Mode sombre').element.checked).toBe(false)
      expect(document.documentElement.classList.contains('dark-mode')).toBe(false)
    })

    it('restaure la préférence enregistrée au chargement', async () => {
      localStorage.setItem(KEY, 'true')
      const { wrapper } = mountPage()
      await flushPromises()
      expect(toggle(wrapper, 'Mode sombre').element.checked).toBe(true)
      expect(document.documentElement.classList.contains('dark-mode')).toBe(true)
    })

    it('une valeur de stockage autre que « true » vaut désactivé', async () => {
      localStorage.setItem(KEY, 'oui')
      const { wrapper } = mountPage()
      await flushPromises()
      expect(toggle(wrapper, 'Mode sombre').element.checked).toBe(false)
    })

    it('activer applique la classe et mémorise le choix', async () => {
      const { wrapper } = mountPage()
      await toggle(wrapper, 'Mode sombre').setValue(true)
      await flushPromises()
      expect(document.documentElement.classList.contains('dark-mode')).toBe(true)
      expect(localStorage.getItem(KEY)).toBe('true')
    })

    it('désactiver retire la classe et mémorise le choix', async () => {
      localStorage.setItem(KEY, 'true')
      const { wrapper } = mountPage()
      await flushPromises()
      await toggle(wrapper, 'Mode sombre').setValue(false)
      await flushPromises()
      expect(document.documentElement.classList.contains('dark-mode')).toBe(false)
      expect(localStorage.getItem(KEY)).toBe('false')
    })
  })

  describe('notifications', () => {
    it('charge les préférences au premier affichage de la section', async () => {
      const { wrapper, store } = mountPage()
      expect(store.fetchSettings).not.toHaveBeenCalled()
      await goToNotifications(wrapper)
      expect(store.fetchSettings).toHaveBeenCalledTimes(1)
    })

    it('ne recharge pas si les préférences sont déjà connues', async () => {
      const { wrapper, store } = mountPage({ settings: SETTINGS })
      await goToNotifications(wrapper)
      expect(store.fetchSettings).not.toHaveBeenCalled()
    })

    it('indique où régler les rappels de calendrier', async () => {
      const { wrapper } = mountPage()
      await goToNotifications(wrapper)
      expect(wrapper.find('.settings__info-box a').attributes('href')).toBe('/calendar')
    })

    it('message pendant le chargement', async () => {
      const { wrapper } = mountPage({ loading: true })
      await goToNotifications(wrapper)
      expect(wrapper.text()).toContain('Chargement des préférences')
    })

    it('rien n’est affiché tant que les préférences ne sont pas chargées', async () => {
      const { wrapper } = mountPage()
      await goToNotifications(wrapper)
      expect(wrapper.find('input[type="checkbox"]').exists()).toBe(false)
    })

    it('reflète l’état enregistré de chaque option', async () => {
      const { wrapper } = mountPage({ settings: SETTINGS })
      await goToNotifications(wrapper)
      expect(toggle(wrapper, 'Activer les alertes de progression').element.checked).toBe(true)
      expect(toggle(wrapper, "Notification dans l'application").element.checked).toBe(true)
      expect(toggle(wrapper, 'Notification par e-mail').element.checked).toBe(false)
      expect(toggle(wrapper, 'Alerte streak en danger').element.checked).toBe(true)
      expect(toggle(wrapper, 'Alerte discipline basse').element.checked).toBe(true)
      expect(toggle(wrapper, 'Alerte baisse des scores').element.checked).toBe(false)
    })

    it('chaque interrupteur envoie la modification correspondante', async () => {
      const { wrapper, store } = mountPage({ settings: SETTINGS })
      await goToNotifications(wrapper)
      await toggle(wrapper, 'Notification par e-mail').setValue(true)
      await toggle(wrapper, "Notification dans l'application").setValue(false)
      await toggle(wrapper, 'Alerte streak en danger').setValue(false)
      await toggle(wrapper, 'Alerte discipline basse').setValue(false)
      await toggle(wrapper, 'Alerte baisse des scores').setValue(true)
      await toggle(wrapper, 'Activer les alertes de progression').setValue(false)
      expect(store.updateSettings.mock.calls.map((c) => c[0])).toEqual([
        { emailEnabled: true },
        { inAppEnabled: false },
        { streakAlertEnabled: false },
        { disciplineAlertEnabled: false },
        { scoreDropAlertEnabled: true },
        { enabled: false },
      ])
    })

    it('alertes désactivées - les canaux et types sont masqués', async () => {
      const { wrapper } = mountPage({ settings: { ...SETTINGS, enabled: false } })
      await goToNotifications(wrapper)
      expect(toggle(wrapper, 'Activer les alertes de progression').exists()).toBe(true)
      expect(toggle(wrapper, 'Notification par e-mail').exists()).toBe(false)
      expect(wrapper.text()).not.toContain('Types d\'alertes')
    })

    it('la notification mobile est affichée désactivée et non modifiable', async () => {
      const { wrapper, store } = mountPage({ settings: SETTINGS })
      await goToNotifications(wrapper)
      const push = toggle(wrapper, 'Notification mobile (push) — indisponible')
      expect(push.exists()).toBe(true)
      expect(push.element.checked).toBe(false)
      expect(store.updateSettings).not.toHaveBeenCalled()
    })

    describe('seuil de discipline', () => {
      it('visible seulement si l’alerte discipline est active', async () => {
        const on = mountPage({ settings: SETTINGS })
        await goToNotifications(on.wrapper)
        expect(on.wrapper.find('input[aria-label="Seuil d\'alerte discipline"]').exists()).toBe(true)

        const off = mountPage({ settings: { ...SETTINGS, disciplineAlertEnabled: false } })
        await goToNotifications(off.wrapper)
        expect(off.wrapper.find('input[aria-label="Seuil d\'alerte discipline"]').exists()).toBe(false)
      })

      it('affiche le seuil courant et l’enregistre sous forme de nombre', async () => {
        const { wrapper, store } = mountPage({ settings: SETTINGS })
        await goToNotifications(wrapper)
        const slider = wrapper.find('input[type="range"]')
        expect(slider.element.value).toBe('40')
        expect(wrapper.text()).toContain('40 %')
        slider.element.value = '65'
        await slider.trigger('change')
        expect(store.updateSettings).toHaveBeenCalledWith({ thresholdDiscipline: 65 })
      })

      it('bornes du curseur : 10 à 80 par pas de 5', async () => {
        const { wrapper } = mountPage({ settings: SETTINGS })
        await goToNotifications(wrapper)
        const slider = wrapper.find('input[type="range"]')
        expect([slider.attributes('min'), slider.attributes('max'), slider.attributes('step')]).toEqual(['10', '80', '5'])
      })
    })

    it('RGAA 11.1 : tous les interrupteurs ont un nom accessible', async () => {
      const { wrapper } = mountPage({ settings: SETTINGS })
      await goToNotifications(wrapper)
      const inputs = wrapper.findAll('input')
      expect(inputs.length).toBeGreaterThan(5)
      inputs.forEach((input) => expect(input.attributes('aria-label')).toBeTruthy())
    })
  })
})
