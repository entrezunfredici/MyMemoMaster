import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useClassGroupStore } from '@/stores/classGroups'

const { mockGet, mockPost, mockPut, mockDel, mockNotify } = vi.hoisted(() => ({
  mockGet:    vi.fn(),
  mockPost:   vi.fn(),
  mockPut:    vi.fn(),
  mockDel:    vi.fn(),
  mockNotify: vi.fn()
}))

vi.mock('@/helpers/api', () => ({ api: { get: mockGet, post: mockPost, put: mockPut, del: mockDel } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: mockNotify } }))

const GROUP_FIXTURE = { id: 1, name: 'Terminale S1', description: 'Groupe test', members: [] }
const GROUP_2 = { id: 2, name: 'Licence Info L2', description: '', members: [] }

describe('useClassGroupStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // ── fetchGroups ────────────────────────────────────────────────────────────────

  it('fetchGroups — succès — peuple groups et retourne true', async () => {
    mockGet.mockResolvedValueOnce({ status: 200, data: { data: [GROUP_FIXTURE] } })

    const store = useClassGroupStore()
    const result = await store.fetchGroups()

    expect(mockGet).toHaveBeenCalledWith('class-groups')
    expect(store.groups).toEqual([GROUP_FIXTURE])
    expect(result).toBe(true)
  })

  it('fetchGroups — non-200 — retourne false et notifie', async () => {
    mockGet.mockResolvedValueOnce({ status: 401, data: { message: 'Non authentifié.' } })

    const store = useClassGroupStore()
    const result = await store.fetchGroups()

    expect(store.groups).toEqual([])
    expect(result).toBe(false)
    expect(mockNotify).toHaveBeenCalledWith('Non authentifié.', 'error')
  })

  it('fetchGroups — erreur réseau — retourne false', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'))

    const store = useClassGroupStore()
    const result = await store.fetchGroups()

    expect(store.groups).toEqual([])
    expect(result).toBe(false)
  })

  // ── fetchGroupById ─────────────────────────────────────────────────────────────

  it('fetchGroupById — succès — peuple group et retourne true', async () => {
    mockGet.mockResolvedValueOnce({ status: 200, data: { data: GROUP_FIXTURE } })

    const store = useClassGroupStore()
    const result = await store.fetchGroupById(1)

    expect(mockGet).toHaveBeenCalledWith('class-groups/1')
    expect(store.group).toEqual(GROUP_FIXTURE)
    expect(result).toBe(true)
  })

  it('fetchGroupById — 404 — retourne false', async () => {
    mockGet.mockResolvedValueOnce({ status: 404, data: { message: 'Groupe introuvable.' } })

    const store = useClassGroupStore()
    const result = await store.fetchGroupById(99)

    expect(store.group).toBeNull()
    expect(result).toBe(false)
  })

  // ── createGroup ────────────────────────────────────────────────────────────────

  it('createGroup — succès — ajoute au store et notifie', async () => {
    mockPost.mockResolvedValueOnce({ status: 201, data: { data: GROUP_FIXTURE } })

    const store = useClassGroupStore()
    const result = await store.createGroup({ name: 'Terminale S1' })

    expect(mockPost).toHaveBeenCalledWith('class-groups', { name: 'Terminale S1' })
    expect(store.groups).toHaveLength(1)
    expect(store.groups[0]).toEqual(GROUP_FIXTURE)
    expect(result).toBe(true)
    expect(mockNotify).toHaveBeenCalledWith('Groupe créé.', 'success')
  })

  it('createGroup — 403 — retourne false et notifie', async () => {
    mockPost.mockResolvedValueOnce({ status: 403, data: { message: 'Accès refusé.' } })

    const store = useClassGroupStore()
    const result = await store.createGroup({ name: 'X' })

    expect(store.groups).toHaveLength(0)
    expect(result).toBe(false)
    expect(mockNotify).toHaveBeenCalledWith('Accès refusé.', 'error')
  })

  // ── updateGroup ────────────────────────────────────────────────────────────────

  it('updateGroup — succès — met à jour le store et notifie', async () => {
    const updated = { ...GROUP_FIXTURE, name: 'Terminale S2' }
    mockPut.mockResolvedValueOnce({ status: 200, data: { data: updated } })

    const store = useClassGroupStore()
    store.groups = [GROUP_FIXTURE]
    const result = await store.updateGroup(1, { name: 'Terminale S2' })

    expect(store.groups[0].name).toBe('Terminale S2')
    expect(result).toBe(true)
    expect(mockNotify).toHaveBeenCalledWith('Groupe mis à jour.', 'success')
  })

  // ── deleteGroup ────────────────────────────────────────────────────────────────

  it('deleteGroup — succès — retire du store et notifie', async () => {
    mockDel.mockResolvedValueOnce({ status: 200, data: {} })

    const store = useClassGroupStore()
    store.groups = [GROUP_FIXTURE, GROUP_2]
    const result = await store.deleteGroup(1)

    expect(store.groups).toHaveLength(1)
    expect(store.groups[0].id).toBe(2)
    expect(result).toBe(true)
    expect(mockNotify).toHaveBeenCalledWith('Groupe supprimé.', 'success')
  })

  it('deleteGroup — erreur réseau — retourne false', async () => {
    mockDel.mockRejectedValueOnce(new Error('Network error'))

    const store = useClassGroupStore()
    store.groups = [GROUP_FIXTURE]
    const result = await store.deleteGroup(1)

    expect(store.groups).toHaveLength(1)
    expect(result).toBe(false)
  })

  // ── addMember ──────────────────────────────────────────────────────────────────

  it('addMember — succès — rafraîchit le groupe et notifie', async () => {
    mockPost.mockResolvedValueOnce({ status: 201, data: {} })
    mockGet.mockResolvedValueOnce({ status: 200, data: { data: { ...GROUP_FIXTURE, members: [{ userId: 2, role: 'student' }] } } })

    const store = useClassGroupStore()
    store.groups = [GROUP_FIXTURE]
    const result = await store.addMember(1, 2)

    expect(mockPost).toHaveBeenCalledWith('class-groups/1/members', { userId: 2 })
    expect(result).toBe(true)
    expect(mockNotify).toHaveBeenCalledWith('Membre ajouté.', 'success')
  })

  it('addMember — non-200 — retourne false', async () => {
    mockPost.mockResolvedValueOnce({ status: 403, data: { message: 'Accès refusé.' } })

    const store = useClassGroupStore()
    const result = await store.addMember(1, 2)

    expect(result).toBe(false)
    expect(mockNotify).toHaveBeenCalledWith('Accès refusé.', 'error')
  })

  // ── removeMember ───────────────────────────────────────────────────────────────

  it('removeMember — succès — rafraîchit le groupe et notifie', async () => {
    mockDel.mockResolvedValueOnce({ status: 200, data: {} })
    mockGet.mockResolvedValueOnce({ status: 200, data: { data: GROUP_FIXTURE } })

    const store = useClassGroupStore()
    store.groups = [GROUP_FIXTURE]
    const result = await store.removeMember(1, 2)

    expect(mockDel).toHaveBeenCalledWith('class-groups/1/members/2')
    expect(result).toBe(true)
    expect(mockNotify).toHaveBeenCalledWith('Membre retiré.', 'success')
  })

  it('removeMember — erreur réseau — retourne false', async () => {
    mockDel.mockRejectedValueOnce(new Error('Network error'))

    const store = useClassGroupStore()
    const result = await store.removeMember(1, 2)

    expect(result).toBe(false)
  })
})
