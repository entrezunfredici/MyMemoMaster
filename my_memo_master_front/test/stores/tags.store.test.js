import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTagStore } from '@/stores/tags'

const { mockGet, mockPost, mockPut, mockDel, mockNotify } = vi.hoisted(() => ({
  mockGet:    vi.fn(),
  mockPost:   vi.fn(),
  mockPut:    vi.fn(),
  mockDel:    vi.fn(),
  mockNotify: vi.fn()
}))

vi.mock('@/helpers/api',  () => ({ api: { get: mockGet, post: mockPost, put: mockPut, del: mockDel } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: mockNotify } }))

const TAG_1 = { tagId: 1, name: 'maths',    color: '#EF4444' }
const TAG_2 = { tagId: 2, name: 'révision', color: '#6366F1' }

describe('useTagStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // ── fetchTags ──────────────────────────────────────────────────────────────

  it('fetchTags - succès - peuple tags et retourne true', async () => {
    mockGet.mockResolvedValueOnce({ status: 200, data: [TAG_1, TAG_2] })

    const store = useTagStore()
    const result = await store.fetchTags()

    expect(mockGet).toHaveBeenCalledWith('tags')
    expect(store.tags).toEqual([TAG_1, TAG_2])
    expect(result).toBe(true)
  })

  it('fetchTags - réponse non-200 - retourne false sans peupler', async () => {
    mockGet.mockResolvedValueOnce({ status: 500 })

    const store = useTagStore()
    const result = await store.fetchTags()

    expect(store.tags).toEqual([])
    expect(result).toBe(false)
  })

  it('fetchTags - erreur réseau - retourne false et notifie', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'))

    const store = useTagStore()
    const result = await store.fetchTags()

    expect(result).toBe(false)
    expect(mockNotify).toHaveBeenCalledWith(expect.stringContaining('tags'), 'error')
  })

  // ── createTag ──────────────────────────────────────────────────────────────

  it('createTag - succès - ajoute le tag et trie par nom', async () => {
    const newTag = { tagId: 3, name: 'biologie', color: '#6366F1' }
    mockPost.mockResolvedValueOnce({ status: 201, data: { data: newTag } })

    const store = useTagStore()
    store.tags = [TAG_2]
    const result = await store.createTag('biologie')

    expect(mockPost).toHaveBeenCalledWith('tags', { name: 'biologie', color: '#6366F1' })
    expect(store.tags).toHaveLength(2)
    expect(store.tags[0].name).toBe('biologie')
    expect(result).toEqual(newTag)
  })

  it('createTag - utilise la couleur par défaut #6366F1', async () => {
    const newTag = { tagId: 3, name: 'chimie', color: '#6366F1' }
    mockPost.mockResolvedValueOnce({ status: 201, data: { data: newTag } })

    const store = useTagStore()
    await store.createTag('chimie')

    expect(mockPost).toHaveBeenCalledWith('tags', { name: 'chimie', color: '#6366F1' })
  })

  it('createTag - couleur personnalisée transmise à l\'API', async () => {
    const newTag = { tagId: 3, name: 'chimie', color: '#EF4444' }
    mockPost.mockResolvedValueOnce({ status: 201, data: { data: newTag } })

    const store = useTagStore()
    await store.createTag('chimie', '#EF4444')

    expect(mockPost).toHaveBeenCalledWith('tags', { name: 'chimie', color: '#EF4444' })
  })

  it('createTag - réponse non-201 - retourne null et notifie avec le message', async () => {
    mockPost.mockResolvedValueOnce({ status: 400, data: { message: 'Nom trop court.' } })

    const store = useTagStore()
    const result = await store.createTag('x')

    expect(result).toBeNull()
    expect(mockNotify).toHaveBeenCalledWith('Nom trop court.', 'error')
  })

  it('createTag - erreur réseau - retourne null et notifie', async () => {
    mockPost.mockRejectedValueOnce(new Error('Network error'))

    const store = useTagStore()
    const result = await store.createTag('maths')

    expect(result).toBeNull()
    expect(mockNotify).toHaveBeenCalled()
  })

  // ── updateTagColor ─────────────────────────────────────────────────────────

  it('updateTagColor - succès - met à jour la couleur dans le store', async () => {
    mockPut.mockResolvedValueOnce({ status: 200 })

    const store = useTagStore()
    store.tags = [{ ...TAG_1 }]
    const result = await store.updateTagColor(1, '#3B82F6')

    expect(mockPut).toHaveBeenCalledWith('tags/1', { color: '#3B82F6' })
    expect(store.tags[0].color).toBe('#3B82F6')
    expect(result).toBe(true)
  })

  it('updateTagColor - tag absent du store - pas d\'erreur, retourne true', async () => {
    mockPut.mockResolvedValueOnce({ status: 200 })

    const store = useTagStore()
    const result = await store.updateTagColor(99, '#3B82F6')

    expect(result).toBe(true)
  })

  it('updateTagColor - réponse non-200 - retourne false et notifie', async () => {
    mockPut.mockResolvedValueOnce({ status: 404, data: { message: 'Tag introuvable.' } })

    const store = useTagStore()
    const result = await store.updateTagColor(99, '#3B82F6')

    expect(result).toBe(false)
    expect(mockNotify).toHaveBeenCalled()
  })

  // ── deleteTag ──────────────────────────────────────────────────────────────

  it('deleteTag - succès - retire le tag du store et retourne true', async () => {
    mockDel.mockResolvedValueOnce({ status: 200 })

    const store = useTagStore()
    store.tags = [TAG_1, TAG_2]
    const result = await store.deleteTag(1)

    expect(mockDel).toHaveBeenCalledWith('tags/1')
    expect(store.tags).toHaveLength(1)
    expect(store.tags[0].tagId).toBe(2)
    expect(result).toBe(true)
  })

  it('deleteTag - réponse non-200 - retourne false et notifie', async () => {
    mockDel.mockResolvedValueOnce({ status: 404, data: { message: 'Tag introuvable.' } })

    const store = useTagStore()
    const result = await store.deleteTag(99)

    expect(result).toBe(false)
    expect(mockNotify).toHaveBeenCalled()
  })

  it('deleteTag - erreur réseau - retourne false et notifie', async () => {
    mockDel.mockRejectedValueOnce(new Error('Network error'))

    const store = useTagStore()
    const result = await store.deleteTag(1)

    expect(result).toBe(false)
    expect(mockNotify).toHaveBeenCalled()
  })

  // ── setEntityTags ──────────────────────────────────────────────────────────

  it('setEntityTags mindmap - appelle le bon endpoint et retourne true', async () => {
    mockPut.mockResolvedValueOnce({ status: 200 })

    const store = useTagStore()
    const result = await store.setEntityTags('mindmap', 5, [1, 2])

    expect(mockPut).toHaveBeenCalledWith('tags/diagrammes/5', { tagIds: [1, 2] })
    expect(result).toBe(true)
  })

  it('setEntityTags leitnersystem - appelle le bon endpoint', async () => {
    mockPut.mockResolvedValueOnce({ status: 200 })

    const store = useTagStore()
    const result = await store.setEntityTags('leitnersystem', 3, [1])

    expect(mockPut).toHaveBeenCalledWith('tags/leitnersystems/3', { tagIds: [1] })
    expect(result).toBe(true)
  })

  it('setEntityTags test - appelle le bon endpoint', async () => {
    mockPut.mockResolvedValueOnce({ status: 200 })

    const store = useTagStore()
    const result = await store.setEntityTags('test', 7, [])

    expect(mockPut).toHaveBeenCalledWith('tags/tests/7', { tagIds: [] })
    expect(result).toBe(true)
  })

  it('setEntityTags - type inconnu - retourne false sans appel API', async () => {
    const store = useTagStore()
    const result = await store.setEntityTags('unknown', 1, [1])

    expect(mockPut).not.toHaveBeenCalled()
    expect(result).toBe(false)
  })

  it('setEntityTags - réponse non-200 - retourne false et notifie', async () => {
    mockPut.mockResolvedValueOnce({ status: 404, data: { message: 'Entité introuvable.' } })

    const store = useTagStore()
    const result = await store.setEntityTags('mindmap', 99, [1])

    expect(result).toBe(false)
    expect(mockNotify).toHaveBeenCalled()
  })

  it('setEntityTags - erreur réseau - retourne false et notifie', async () => {
    mockPut.mockRejectedValueOnce(new Error('Network error'))

    const store = useTagStore()
    const result = await store.setEntityTags('mindmap', 1, [1])

    expect(result).toBe(false)
    expect(mockNotify).toHaveBeenCalled()
  })
})
