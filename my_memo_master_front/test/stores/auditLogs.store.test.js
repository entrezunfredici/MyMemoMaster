import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuditLogStore } from '@/stores/auditLogs'

const { mockGet, mockNotify } = vi.hoisted(() => ({ mockGet: vi.fn(), mockNotify: vi.fn() }))

vi.mock('@/helpers/api', () => ({ api: { get: mockGet } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: mockNotify } }))

const LOGS = [{ id: 1, action: 'USER_ROLE_CHANGED', entityType: 'User', entityId: 2, actor: { name: 'Admin' } }]

describe('useAuditLogStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('état initial', () => {
    expect(useAuditLogStore()).toMatchObject({ logs: [], loading: false })
  })

  it('200 — peuple le journal puis retombe à loading=false', async () => {
    mockGet.mockResolvedValueOnce({ status: 200, data: { data: LOGS } })
    const store = useAuditLogStore()
    const promise = store.fetchLogs()
    expect(store.loading).toBe(true)
    expect(await promise).toBe(true)
    expect(store.loading).toBe(false)
    expect(store.logs).toEqual(LOGS)
    expect(mockGet).toHaveBeenCalledWith('audit-logs', {})
  })

  it('transmet les filtres renseignés (le 0 compte) et ignore les vides', async () => {
    mockGet.mockResolvedValue({ status: 200, data: { data: [] } })
    const store = useAuditLogStore()
    await store.fetchLogs({ entityType: 'User', entityId: '12', actorId: 0 })
    expect(mockGet).toHaveBeenLastCalledWith('audit-logs', { entityType: 'User', entityId: '12', actorId: 0 })
    await store.fetchLogs({ entityType: '', entityId: '', actorId: null, action: '', limit: '' })
    expect(mockGet).toHaveBeenLastCalledWith('audit-logs', {})
  })

  it('transmet le texte d’action (sans espaces) et la limite ; une action blanche est ignorée', async () => {
    mockGet.mockResolvedValue({ status: 200, data: { data: [] } })
    const store = useAuditLogStore()
    await store.fetchLogs({ action: '  ROLE ', limit: 250 })
    expect(mockGet).toHaveBeenLastCalledWith('audit-logs', { action: 'ROLE', limit: 250 })
    await store.fetchLogs({ action: '   ', limit: undefined })
    expect(mockGet).toHaveBeenLastCalledWith('audit-logs', {})
  })

  it('non-200 — notifie le message de l’API et garde le journal précédent', async () => {
    const store = useAuditLogStore()
    store.logs = LOGS
    mockGet.mockResolvedValueOnce({ status: 403, data: { message: 'Accès refusé.' } })
    expect(await store.fetchLogs()).toBe(false)
    expect(mockNotify).toHaveBeenCalledWith('Accès refusé.', 'error')
    expect(store.logs).toEqual(LOGS)
    expect(store.loading).toBe(false)
  })

  it('réponse absente — message par défaut', async () => {
    mockGet.mockResolvedValueOnce(undefined)
    expect(await useAuditLogStore().fetchLogs()).toBe(false)
    expect(mockNotify).toHaveBeenCalledWith('Erreur lors du chargement du journal.', 'error')
  })

  it('exception — notifiée, loading libéré', async () => {
    mockGet.mockRejectedValueOnce(new Error('boom'))
    const store = useAuditLogStore()
    expect(await store.fetchLogs()).toBe(false)
    expect(mockNotify).toHaveBeenCalledWith('Une erreur est survenue : Error: boom', 'error')
    expect(store.loading).toBe(false)
  })
})
