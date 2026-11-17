import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useBadgesStore } from '@/stores/badges'
import { useAuthStore } from '@/stores/auth'

const api = vi.hoisted(() => ({
  list: vi.fn(),
  summary: vi.fn(),
  markSeen: vi.fn(),
  profile: vi.fn(),
  saveProfile: vi.fn(),
  activity: vi.fn(),
  settings: vi.fn(),
  updateSettings: vi.fn(),
  post: vi.fn(),
  notify: vi.fn(),
}))

vi.mock('@/helpers/badgesApi', () => ({ badgesApi: api }))
vi.mock('@/helpers/api', () => ({ api: { get: vi.fn(), post: api.post } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: api.notify } }))
vi.mock('@/helpers/notif.js', () => ({ notif: { notify: api.notify, clear: vi.fn() } }))
vi.mock('@/router', () => ({ default: { push: vi.fn() } }))

const ok = (data) => ({ status: 200, data })
const BADGES_A = [{ code: 'streak7', earned: true, seenAt: null }]
const SUMMARY_A = { level: { name: 'Confirmé', next: null }, earnedCount: 1, totalCount: 14, streakCurrent: 5, streakBest: 9 }
const ZEN_A = { zenMode: true, animationsEnabled: true }

// Promesse résolue à la demande : simule une réponse qui arrive après un changement de compte
const deferred = () => {
  let resolve
  const promise = new Promise((r) => (resolve = r))
  return { promise, resolve }
}

describe('store badges — changement de compte', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    api.post.mockResolvedValue({ status: 200 })
  })

  it('reset - vide badges, résumé, profil, réglages et mode zen', async () => {
    api.list.mockResolvedValue(ok(BADGES_A))
    api.summary.mockResolvedValue(ok(SUMMARY_A))
    api.settings.mockResolvedValue(ok(ZEN_A))
    api.profile.mockResolvedValue(ok({ titleCode: 'streak7', showcaseCodes: ['streak7'] }))
    const store = useBadgesStore()
    await Promise.all([store.fetchAll(), store.fetchSettings(), store.fetchProfile()])
    expect(store.zen).toBe(true)

    store.reset()

    expect(store.badges).toEqual([])
    expect(store.summary).toBeNull()
    expect(store.settings).toBeNull()
    expect(store.zen).toBe(false)
    expect(store.profile).toEqual({ titleCode: null, showcaseCodes: [] })
    expect(store.profileLoaded).toBe(false)
  })

  it('reset - le cache de 60 s est oublié : le compte suivant relit l\'API', async () => {
    api.list.mockResolvedValue(ok(BADGES_A))
    api.summary.mockResolvedValue(ok(SUMMARY_A))
    const store = useBadgesStore()
    await store.fetchAll()
    store.reset()

    await store.fetchAll()

    expect(api.list).toHaveBeenCalledTimes(2)
  })

  it('réponse arrivée après un reset - ignorée (ne remplit pas le store du compte suivant)', async () => {
    const slowList = deferred()
    api.list.mockReturnValueOnce(slowList.promise)
    api.summary.mockResolvedValueOnce(ok(SUMMARY_A))
    const store = useBadgesStore()

    const pending = store.fetchAll()
    store.reset()
    slowList.resolve(ok(BADGES_A))

    expect(await pending).toBe(false)
    expect(store.badges).toEqual([])
    expect(store.summary).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('réglages reçus après un reset - ignorés (le mode zen de l\'ancien compte ne fuit pas)', async () => {
    const slowSettings = deferred()
    api.settings.mockReturnValueOnce(slowSettings.promise)
    const store = useBadgesStore()

    const pending = store.fetchSettings()
    store.reset()
    slowSettings.resolve(ok(ZEN_A))
    await pending

    expect(store.settings).toBeNull()
    expect(store.zen).toBe(false)
  })

  it('enregistrement terminé après un reset - ne modifie pas le nouvel état', async () => {
    const slowSave = deferred()
    api.saveProfile.mockReturnValueOnce(slowSave.promise)
    const store = useBadgesStore()

    const pending = store.saveProfile({ titleCode: 'streak7' })
    store.reset()
    slowSave.resolve(ok({ titleCode: 'streak7', showcaseCodes: [] }))

    expect(await pending).toBe(false)
    expect(store.profile.titleCode).toBeNull()
    expect(api.notify).not.toHaveBeenCalled()
  })

  it('requêtes lancées après le reset - fonctionnent normalement', async () => {
    api.settings.mockResolvedValue(ok({ zenMode: false }))
    const store = useBadgesStore()
    store.reset()

    expect(await store.fetchSettings()).toBe(true)
    expect(store.settings).toEqual({ zenMode: false })
  })

  it('déconnexion - vide le store des badges (le compte suivant ne voit pas les données du précédent)', async () => {
    api.list.mockResolvedValue(ok(BADGES_A))
    api.summary.mockResolvedValue(ok(SUMMARY_A))
    api.settings.mockResolvedValue(ok(ZEN_A))
    const badges = useBadgesStore()
    await Promise.all([badges.fetchAll(), badges.fetchSettings()])
    const auth = useAuthStore()
    auth.authenticated = true
    auth.token = 'a'
    auth.user = { userId: 1 }

    auth.logout(false, null)

    expect(badges.badges).toEqual([])
    expect(badges.summary).toBeNull()
    expect(badges.zen).toBe(false)
  })
})
