import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSubjectStore } from '@/stores/subjects'

const { mockPost, mockNotify } = vi.hoisted(() => ({ mockPost: vi.fn(), mockNotify: vi.fn() }))

vi.mock('@/helpers/api', () => ({ api: { get: vi.fn(), post: mockPost, put: vi.fn(), del: vi.fn() } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: mockNotify } }))

describe('useSubjectStore.createSubject (création à partir d’un nom)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('201 - renvoie le sujet créé, sans toucher à l’état ni notifier', async () => {
    mockPost.mockResolvedValueOnce({ status: 201, data: { subjectId: 9, name: 'Chimie' } })
    const store = useSubjectStore()
    const created = await store.createSubject('Chimie')
    expect(mockPost).toHaveBeenCalledWith('subjects', { name: 'Chimie' })
    expect(created).toEqual({ subjectId: 9, name: 'Chimie' })
    expect(store.subjects).toEqual([])
    expect(mockNotify).not.toHaveBeenCalled()
  })

  it('erreur serveur - notifie son message et renvoie false', async () => {
    mockPost.mockResolvedValueOnce({ status: 409, data: { message: 'Ce sujet existe déjà.' } })
    expect(await useSubjectStore().createSubject('Chimie')).toBe(false)
    expect(mockNotify).toHaveBeenCalledWith('Ce sujet existe déjà.', 'error')
  })

  it('réponse absente - message par défaut', async () => {
    mockPost.mockResolvedValueOnce(undefined)
    expect(await useSubjectStore().createSubject('X')).toBe(false)
    expect(mockNotify).toHaveBeenCalledWith('Erreur lors de la création du sujet.', 'error')
  })

  it('exception réseau - message par défaut, pas d’exception levée', async () => {
    mockPost.mockRejectedValueOnce(new Error('KO'))
    await expect(useSubjectStore().createSubject('X')).resolves.toBe(false)
    expect(mockNotify).toHaveBeenCalledWith('Erreur lors de la création du sujet.', 'error')
  })

  it('n’utilise pas l’état du formulaire d’édition (this.subject)', async () => {
    mockPost.mockResolvedValueOnce({ status: 201, data: { subjectId: 1 } })
    const store = useSubjectStore()
    store.subject = { name: 'Ancien nom' }
    await store.createSubject('Nouveau')
    expect(mockPost).toHaveBeenCalledWith('subjects', { name: 'Nouveau' })
  })
})
