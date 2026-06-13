import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import NotificationBellComponent from '@/components/NotificationBellComponent.vue'

// ── Mocks globaux ────────────────────────────────────────────────────────────

// vi.hoisted : la variable doit être déclarée AVANT le vi.mock (qui est hoisted)
const clickOutsideStub = vi.hoisted(() => ({ beforeMount() {}, unmounted() {} }))

vi.mock('@/directives/clickOutside.js', () => ({
  default: clickOutsideStub
}))

// ── Données de test ──────────────────────────────────────────────────────────

// Date de référence figée pour les tests de formatage
const FROZEN_NOW = new Date('2026-06-13T12:00:00.000Z')

const makePendingReminder = (overrides = {}) => ({
  id: 1,
  entityType: 'deadline',
  entityId: 10,
  status: 'pending',
  message: 'Rappel DM Maths',
  reminderAt: new Date(FROZEN_NOW.getTime() + 60 * 60 * 1000).toISOString(),
  delayMinutes: 60,
  ...overrides
})

const makeSentReminder = (overrides = {}) => ({
  id: 2,
  entityType: 'revision_session',
  entityId: 5,
  status: 'sent',
  message: 'Rappel séance',
  reminderAt: new Date(Date.now() - 60 * 1000).toISOString(),
  ...overrides
})

// ── Helper de montage ────────────────────────────────────────────────────────

function mountBell({ reminders = [], authenticated = true } = {}) {
  return mount(NotificationBellComponent, {
    global: {
      directives: { clickOutside: clickOutsideStub },
      plugins: [
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: true,
          initialState: {
            reminders: { reminders, reminder: null },
            auth: { authenticated, user: authenticated ? { id: 1 } : null }
          }
        })
      ]
    }
  })
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('NotificationBellComponent', () => {
  beforeEach(() => vi.clearAllMocks())

  afterEach(() => {
    vi.useRealTimers()
  })

  // ── Rendu initial ──────────────────────────────────────────────────────────

  it('affiche le bouton cloche avec title="Rappels"', () => {
    const wrapper = mountBell()
    expect(wrapper.find('button[title="Rappels"]').exists()).toBe(true)
  })

  it("n'affiche pas le panneau au départ (fermé)", () => {
    const wrapper = mountBell()
    expect(wrapper.find('.max-h-80').exists()).toBe(false)
  })

  // ── Badge compteur ─────────────────────────────────────────────────────────

  it("n'affiche pas de badge si aucun rappel en attente", () => {
    const wrapper = mountBell({ reminders: [] })
    expect(wrapper.find('.bg-red-500').exists()).toBe(false)
  })

  it('affiche un badge rouge avec le nombre de rappels pending', () => {
    const wrapper = mountBell({
      reminders: [makePendingReminder(), makePendingReminder({ id: 2 })]
    })

    const badge = wrapper.find('.bg-red-500')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('2')
  })

  it("affiche '9+' quand il y a plus de 9 rappels pending", () => {
    const reminders = Array.from({ length: 10 }, (_, i) => makePendingReminder({ id: i + 1 }))
    const wrapper = mountBell({ reminders })

    expect(wrapper.find('.bg-red-500').text()).toBe('9+')
  })

  // ── Ouverture / fermeture du panneau ──────────────────────────────────────

  it('ouvre le panneau au clic sur le bouton', async () => {
    const wrapper = mountBell({ reminders: [makePendingReminder()] })
    await wrapper.find('button').trigger('click')

    expect(wrapper.find('.max-h-80').exists()).toBe(true)
  })

  it('referme le panneau au deuxième clic', async () => {
    const wrapper = mountBell({ reminders: [makePendingReminder()] })
    const btn = wrapper.find('button')

    await btn.trigger('click')
    expect(wrapper.find('.max-h-80').exists()).toBe(true)

    await btn.trigger('click')
    expect(wrapper.find('.max-h-80').exists()).toBe(false)
  })

  // ── Contenu du panneau ─────────────────────────────────────────────────────

  it('affiche les rappels pending dans la liste', async () => {
    const wrapper = mountBell({ reminders: [makePendingReminder()] })
    await wrapper.find('button').trigger('click')

    expect(wrapper.text()).toContain('Rappel DM Maths')
  })

  it("n'affiche pas les rappels 'sent' dans la liste", async () => {
    const wrapper = mountBell({
      reminders: [makePendingReminder(), makeSentReminder()]
    })
    await wrapper.find('button').trigger('click')

    // La liste principale ne montre que les pending
    const items = wrapper.findAll('li')
    expect(items.length).toBe(1)
    expect(wrapper.find('li').text()).toContain('Rappel DM Maths')
  })

  it("affiche 'Aucun rappel en attente' quand pending est vide", async () => {
    const wrapper = mountBell({ reminders: [] })
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Aucun rappel en attente')
  })

  it("affiche le compteur de rappels envoyés dans le pied de panneau", async () => {
    const wrapper = mountBell({
      reminders: [makePendingReminder(), makeSentReminder()]
    })
    await wrapper.find('button').trigger('click')

    expect(wrapper.text()).toContain('1 rappel déjà envoyé')
  })

  // ── Badge type ─────────────────────────────────────────────────────────────

  it("affiche le badge 'Échéance' pour entityType = deadline", async () => {
    const wrapper = mountBell({ reminders: [makePendingReminder({ entityType: 'deadline' })] })
    await wrapper.find('button').trigger('click')

    expect(wrapper.text()).toContain('Échéance')
  })

  it("affiche le badge 'Révision' pour entityType = revision_session", async () => {
    const wrapper = mountBell({
      reminders: [makePendingReminder({ entityType: 'revision_session' })]
    })
    await wrapper.find('button').trigger('click')

    expect(wrapper.text()).toContain('Révision')
  })

  // ── Formatage de la date ───────────────────────────────────────────────────

  it('formate la date en "Dans 1h" pour un rappel dans 1 heure (temps figé)', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(FROZEN_NOW)

    const wrapper = mountBell({ reminders: [makePendingReminder()] })
    await wrapper.find('button').trigger('click')

    expect(wrapper.text()).toContain('Dans 1h')

    vi.useRealTimers()
  })

  it('affiche "Imminent" pour un rappel passé', async () => {
    const pastReminder = makePendingReminder({
      reminderAt: new Date(Date.now() - 10 * 60 * 1000).toISOString()
    })
    const wrapper = mountBell({ reminders: [pastReminder] })
    await wrapper.find('button').trigger('click')

    expect(wrapper.text()).toContain('Imminent')
  })

  // ── Suppression d'un rappel ───────────────────────────────────────────────

  it('cliquer "supprimer" appelle store.deleteReminder(id)', async () => {
    const wrapper = mountBell({ reminders: [makePendingReminder({ id: 42 })] })
    await wrapper.find('button').trigger('click')
    await flushPromises()

    const { useReminderStore } = await import('@/stores/reminders')
    const store = useReminderStore()

    const deleteBtn = wrapper.find('li button')
    await deleteBtn.trigger('click')

    expect(store.deleteReminder).toHaveBeenCalledWith(42)
  })

  // ── Polling au montage ────────────────────────────────────────────────────

  it('appelle fetchReminders au montage si authentifié', async () => {
    const { useReminderStore } = await import('@/stores/reminders')

    mountBell({ authenticated: true })
    await flushPromises()

    const store = useReminderStore()
    expect(store.fetchReminders).toHaveBeenCalledTimes(1)
  })

  it("n'appelle pas fetchReminders au montage si non authentifié", async () => {
    const { useReminderStore } = await import('@/stores/reminders')

    mountBell({ authenticated: false })
    await flushPromises()

    const store = useReminderStore()
    expect(store.fetchReminders).not.toHaveBeenCalled()
  })

  it('appelle fetchReminders toutes les 5 minutes (polling)', async () => {
    vi.useFakeTimers()
    const { useReminderStore } = await import('@/stores/reminders')

    mountBell({ authenticated: true })
    await flushPromises()

    const store = useReminderStore()
    expect(store.fetchReminders).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(5 * 60 * 1000)
    expect(store.fetchReminders).toHaveBeenCalledTimes(2)

    vi.advanceTimersByTime(5 * 60 * 1000)
    expect(store.fetchReminders).toHaveBeenCalledTimes(3)
  })

  it('nettoie le polling au démontage (clearInterval)', async () => {
    vi.useFakeTimers()
    const clearSpy = vi.spyOn(globalThis, 'clearInterval')

    const wrapper = mountBell({ authenticated: true })
    await flushPromises()

    wrapper.unmount()

    expect(clearSpy).toHaveBeenCalled()
  })
})
