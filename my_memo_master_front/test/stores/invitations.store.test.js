import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useInvitationStore } from '@/stores/invitations'

const { mockGet, mockPost, mockPut, mockNotify } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockNotify: vi.fn()
}))

vi.mock('@/helpers/api', () => ({ api: { get: mockGet, post: mockPost, put: mockPut } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: mockNotify } }))

const INV = {
  id: 1,
  classGroupId: 10,
  targetUserId: 5,
  invitedByUserId: 3,
  role: 'student',
  status: 'pending'
}

describe('useInvitationStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // ── fetchMine ──────────────────────────────────────────────────────────────

  it('fetchMine — 200 — peuple mine et retourne true', async () => {
    mockGet.mockResolvedValueOnce({ status: 200, data: { data: [INV] } })
    const store = useInvitationStore()
    const result = await store.fetchMine()
    expect(mockGet).toHaveBeenCalledWith('invitations/mine')
    expect(store.mine).toEqual([INV])
    expect(result).toBe(true)
  })

  it('fetchMine — non-200 — retourne false et notifie le message serveur', async () => {
    mockGet.mockResolvedValueOnce({ status: 401, data: { message: 'Non authentifié.' } })
    const store = useInvitationStore()
    const result = await store.fetchMine()
    expect(store.mine).toEqual([])
    expect(result).toBe(false)
    expect(mockNotify).toHaveBeenCalledWith('Non authentifié.', 'error')
  })

  it('fetchMine — erreur réseau — retourne false et notifie', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'))
    const store = useInvitationStore()
    const result = await store.fetchMine()
    expect(store.mine).toEqual([])
    expect(result).toBe(false)
    expect(mockNotify).toHaveBeenCalledWith('Erreur lors du chargement des invitations.', 'error')
  })

  // ── fetchByGroup ───────────────────────────────────────────────────────────

  it('fetchByGroup — 200 — peuple groupInvitations et retourne true', async () => {
    mockGet.mockResolvedValueOnce({ status: 200, data: { data: [INV] } })
    const store = useInvitationStore()
    const result = await store.fetchByGroup(10)
    expect(mockGet).toHaveBeenCalledWith('class-groups/10/invitations')
    expect(store.groupInvitations).toEqual([INV])
    expect(result).toBe(true)
  })

  it('fetchByGroup — non-200 — retourne false et notifie le message serveur', async () => {
    mockGet.mockResolvedValueOnce({ status: 404, data: { message: 'Groupe introuvable.' } })
    const store = useInvitationStore()
    const result = await store.fetchByGroup(99)
    expect(store.groupInvitations).toEqual([])
    expect(result).toBe(false)
    expect(mockNotify).toHaveBeenCalledWith('Groupe introuvable.', 'error')
  })

  it('fetchByGroup — erreur réseau — retourne false et notifie', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'))
    const store = useInvitationStore()
    const result = await store.fetchByGroup(10)
    expect(result).toBe(false)
    expect(mockNotify).toHaveBeenCalledWith('Erreur lors du chargement des invitations du groupe.', 'error')
  })

  // ── invite ─────────────────────────────────────────────────────────────────

  it('invite — 201 — ajoute à groupInvitations, notifie success, retourne true', async () => {
    mockPost.mockResolvedValueOnce({ status: 201, data: { data: INV, message: 'Invitation envoyée.' } })
    const store = useInvitationStore()
    const result = await store.invite(10, { targetEmail: 'test@test.com', role: 'student' })
    expect(mockPost).toHaveBeenCalledWith('class-groups/10/invitations', { targetEmail: 'test@test.com', role: 'student' })
    expect(store.groupInvitations).toHaveLength(1)
    expect(store.groupInvitations[0]).toEqual(INV)
    expect(result).toBe(true)
    expect(mockNotify).toHaveBeenCalledWith('Invitation envoyée.', 'success')
  })

  it('invite — 200 — ne modifie pas groupInvitations, notifie success, retourne true', async () => {
    mockPost.mockResolvedValueOnce({ status: 200, data: { message: 'Membre ajouté directement.' } })
    const store = useInvitationStore()
    const result = await store.invite(10, { targetEmail: 'test@test.com', role: 'student' })
    expect(store.groupInvitations).toHaveLength(0)
    expect(result).toBe(true)
    expect(mockNotify).toHaveBeenCalledWith('Membre ajouté directement.', 'success')
  })

  it('invite — non-2xx — retourne false et notifie', async () => {
    mockPost.mockResolvedValueOnce({ status: 403, data: { message: 'Accès refusé.' } })
    const store = useInvitationStore()
    const result = await store.invite(10, { targetEmail: 'x@x.com', role: 'student' })
    expect(result).toBe(false)
    expect(mockNotify).toHaveBeenCalledWith('Accès refusé.', 'error')
  })

  it('invite — erreur réseau — retourne false et notifie', async () => {
    mockPost.mockRejectedValueOnce(new Error('Network error'))
    const store = useInvitationStore()
    const result = await store.invite(10, { targetEmail: 'x@x.com', role: 'student' })
    expect(result).toBe(false)
    expect(mockNotify).toHaveBeenCalledWith("Erreur lors de l'envoi de l'invitation.", 'error')
  })

  // ── respond ────────────────────────────────────────────────────────────────

  it('respond — 200 + accepted — retire de mine, notifie "Invitation acceptée.", retourne true', async () => {
    mockPut.mockResolvedValueOnce({ status: 200, data: {} })
    const store = useInvitationStore()
    store.mine = [INV, { ...INV, id: 2 }]
    const result = await store.respond(1, 'accepted')
    expect(mockPut).toHaveBeenCalledWith('invitations/1', { status: 'accepted' })
    expect(store.mine).toHaveLength(1)
    expect(store.mine[0].id).toBe(2)
    expect(result).toBe(true)
    expect(mockNotify).toHaveBeenCalledWith('Invitation acceptée.', 'success')
  })

  it('respond — 200 + declined — retire de mine et notifie "Invitation déclinée."', async () => {
    mockPut.mockResolvedValueOnce({ status: 200, data: {} })
    const store = useInvitationStore()
    store.mine = [INV]
    await store.respond(1, 'declined')
    expect(store.mine).toHaveLength(0)
    expect(mockNotify).toHaveBeenCalledWith('Invitation déclinée.', 'success')
  })

  it('respond — non-200 — mine inchangé, retourne false et notifie', async () => {
    mockPut.mockResolvedValueOnce({ status: 404, data: { message: 'Invitation introuvable.' } })
    const store = useInvitationStore()
    store.mine = [INV]
    const result = await store.respond(1, 'accepted')
    expect(store.mine).toHaveLength(1)
    expect(result).toBe(false)
    expect(mockNotify).toHaveBeenCalledWith('Invitation introuvable.', 'error')
  })

  it('respond — erreur réseau — retourne false et notifie', async () => {
    mockPut.mockRejectedValueOnce(new Error('Network error'))
    const store = useInvitationStore()
    const result = await store.respond(1, 'accepted')
    expect(result).toBe(false)
    expect(mockNotify).toHaveBeenCalledWith("Erreur lors de la réponse à l'invitation.", 'error')
  })
})
