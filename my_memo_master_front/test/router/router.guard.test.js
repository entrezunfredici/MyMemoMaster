import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'

// ── Mocks globaux ─────────────────────────────────────────────────────────────
// api et notif sont importés par auth.js (logout) — on les neutralise
vi.mock('@/helpers/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() },
}))
vi.mock('@/helpers/notif', () => ({
  notif: { notify: vi.fn(), clear: vi.fn() },
}))
vi.mock('@/config', () => ({ VITE_APP_NAME: 'Test' }))

// ── Helpers ───────────────────────────────────────────────────────────────────

function loginAs({ roleId = 2 } = {}) {
  const authStore = useAuthStore()
  authStore.authenticated = true
  authStore.token = 'valid-jwt'
  authStore.user = { userId: 1, roleId }
  return authStore
}

function logout() {
  const authStore = useAuthStore()
  authStore.authenticated = false
  authStore.token = null
  authStore.user = {}
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Router guard — beforeEach', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    // Partir d'une route publique neutre en mode déconnecté
    logout()
    await router.push('/')
  })

  // ── Routes privées — non authentifié ──────────────────────────────────────

  it('route privée + non authentifié → redirige vers /auth', async () => {
    logout()
    await router.push('/profile')
    expect(router.currentRoute.value.path).toBe('/auth')
  })

  it('route privée + non authentifié → appelle authStore.logout(false, null)', async () => {
    logout()
    const authStore = useAuthStore()
    const logoutSpy = vi.spyOn(authStore, 'logout')

    await router.push('/flashcards')

    expect(logoutSpy).toHaveBeenCalledWith(false, null)
  })

  it('/calendar (privé depuis le fix) + non authentifié → redirige vers /auth', async () => {
    logout()
    await router.push('/calendar')
    expect(router.currentRoute.value.path).toBe('/auth')
  })

  // ── Routes privées — authentifié ──────────────────────────────────────────

  it('route privée + authentifié → navigation acceptée', async () => {
    loginAs()
    await router.push('/profile')
    expect(router.currentRoute.value.path).toBe('/profile')
  })

  it('route privée + authentifié → navigation flashcards acceptée', async () => {
    loginAs()
    await router.push('/flashcards')
    expect(router.currentRoute.value.path).toBe('/flashcards')
  })

  // ── Routes publiques ───────────────────────────────────────────────────────

  it('route publique + non authentifié → navigation acceptée', async () => {
    logout()
    await router.push('/forgot-password')
    expect(router.currentRoute.value.path).toBe('/forgot-password')
  })

  it('route publique + authentifié → navigation acceptée (pas de redirect)', async () => {
    loginAs()
    await router.push('/forgot-password')
    expect(router.currentRoute.value.path).toBe('/forgot-password')
  })

  // ── Redirection des utilisateurs déjà connectés ───────────────────────────

  it('/auth + authentifié → redirige vers /profile', async () => {
    loginAs()
    await router.push('/auth')
    expect(router.currentRoute.value.path).toBe('/profile')
  })

  it('/register + authentifié → redirige vers /profile', async () => {
    loginAs()
    await router.push('/register')
    expect(router.currentRoute.value.path).toBe('/profile')
  })

  // ── Guard meta.roles ──────────────────────────────────────────────────────

  it('meta.roles: [1] + roleId=2 (Étudiant) → redirige vers /', async () => {
    loginAs({ roleId: 2 })
    router.addRoute({
      path: '/admin-only',
      name: 'test-admin-only',
      component: { template: '<div/>' },
      meta: { private: true, roles: [1] },
    })

    await router.push('/admin-only')
    expect(router.currentRoute.value.path).toBe('/')

    router.removeRoute('test-admin-only')
  })

  it('meta.roles: [1] + roleId=1 (Admin plateforme) → navigation acceptée', async () => {
    loginAs({ roleId: 1 })
    router.addRoute({
      path: '/admin-panel',
      name: 'test-admin-panel',
      component: { template: '<div/>' },
      meta: { private: true, roles: [1] },
    })

    await router.push('/admin-panel')
    expect(router.currentRoute.value.path).toBe('/admin-panel')

    router.removeRoute('test-admin-panel')
  })

  it('meta.roles: [1, 4] + roleId=4 (Admin établissement) → navigation acceptée', async () => {
    loginAs({ roleId: 4 })
    router.addRoute({
      path: '/admin-shared',
      name: 'test-admin-shared',
      component: { template: '<div/>' },
      meta: { private: true, roles: [1, 4] },
    })

    await router.push('/admin-shared')
    expect(router.currentRoute.value.path).toBe('/admin-shared')

    router.removeRoute('test-admin-shared')
  })
})
