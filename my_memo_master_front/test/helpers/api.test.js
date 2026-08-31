import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.hoisted garantit que ces mocks sont disponibles avant que vi.mock() ne soit évalué
const { mockGet, mockPost, mockPut, mockDelete, mockRouterPush, mockLogout } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockDelete: vi.fn(),
  mockRouterPush: vi.fn(),
  mockLogout: vi.fn(),
}))

vi.mock('@/config', () => ({
  VITE_API_URL: 'http://localhost/api/v1',
  VITE_API_SECURITY_MODE: 'public',
  VITE_API_KEY_HEADER: 'X-API-Key',
  VITE_API_KEY_VALUE: '',
  VITE_API_BEARER_HEADER: 'Authorization',
  VITE_API_BEARER_TOKEN: '',
  VITE_API_GOOGLE_TOKEN_URL: '',
  VITE_API_GOOGLE_AUDIENCE: '',
  VITE_API_GOOGLE_AUTH_HEADER: 'Authorization',
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    authenticated: false,
    token: null,
    user: {},
    logout: mockLogout,
  }),
}))

vi.mock('@/router', () => ({
  default: { push: mockRouterPush },
}))

vi.mock('axios', () => ({
  default: {
    create: () => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
      get: mockGet,
      post: mockPost,
      put: mockPut,
      delete: mockDelete,
    }),
  },
}))

import { api } from '@/helpers/api'

describe('api.js — couche API front', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  // ==================== api.get ====================
  describe('api.get', () => {
    it('get - endpoint valide, statut 200 - retourne { data, status }', async () => {
      mockGet.mockResolvedValue({ data: { id: 1 }, status: 200 })
      const result = await api.get('users/1')
      expect(result).toEqual({ data: { id: 1 }, status: 200 })
    })

    it('get - statut 204 - retourne undefined', async () => {
      mockGet.mockResolvedValue({ data: null, status: 204 })
      const result = await api.get('users/1')
      expect(result).toBeUndefined()
    })

    it('get - statut 401 - appelle logout et retourne undefined', async () => {
      mockGet.mockResolvedValue({ data: {}, status: 401 })
      const result = await api.get('users/1')
      expect(mockLogout).toHaveBeenCalledOnce()
      expect(result).toBeUndefined()
    })

    it('get - erreur réseau - redirige vers /error-server et retourne undefined', async () => {
      mockGet.mockRejectedValue(new Error('Network Error'))
      const result = await api.get('users/1')
      expect(mockRouterPush).toHaveBeenCalledWith({ path: '/error-server' })
      expect(result).toBeUndefined()
    })

    it('get - endpoint absent - lève une erreur', async () => {
      await expect(api.get()).rejects.toThrow()
    })

    it('get - endpoint non-string - lève une erreur', async () => {
      await expect(api.get(42)).rejects.toThrow()
    })
  })

  // ==================== api.post ====================
  describe('api.post', () => {
    it('post - données valides, statut 201 - retourne { data, status }', async () => {
      mockPost.mockResolvedValue({ data: { id: 1 }, status: 201 })
      const result = await api.post('users/register', { name: 'Test', email: 'test@test.com' })
      expect(result).toEqual({ data: { id: 1 }, status: 201 })
    })

    it('post - statut 204 - retourne undefined', async () => {
      mockPost.mockResolvedValue({ data: null, status: 204 })
      const result = await api.post('users/1', {})
      expect(result).toBeUndefined()
    })

    it('post - statut 401 - appelle logout et retourne undefined', async () => {
      mockPost.mockResolvedValue({ data: {}, status: 401 })
      const result = await api.post('users/1', {})
      expect(mockLogout).toHaveBeenCalledOnce()
      expect(result).toBeUndefined()
    })

    it('post - erreur réseau - redirige vers /error-server et retourne undefined', async () => {
      mockPost.mockRejectedValue(new Error('Network Error'))
      const result = await api.post('users/1', {})
      expect(mockRouterPush).toHaveBeenCalledWith({ path: '/error-server' })
      expect(result).toBeUndefined()
    })

    it('post - endpoint absent - lève une erreur', async () => {
      await expect(api.post()).rejects.toThrow()
    })

    // Régression : validate.middleware.js renvoie { errors: [...] } (express-validator)
    // sur un 400, jamais { message } — sans cette normalisation, tout appelant qui lit
    // resp.data.message retombait sur son message générique, quelle que soit la vraie
    // raison du rejet (trouvé sur la création de séance de révision).
    it('post - statut 400 avec { errors } (validate.middleware) - data.message reprend errors[0].msg', async () => {
      mockPost.mockResolvedValue({
        data: { errors: [{ msg: "L'heure de fin doit être postérieure à l'heure de début." }] },
        status: 400,
      })
      const result = await api.post('revision-sessions', {})
      expect(result.data.message).toBe("L'heure de fin doit être postérieure à l'heure de début.")
      expect(result.status).toBe(400)
    })

    it('post - statut 400 avec { message } déjà présent - ne le remplace pas par errors', async () => {
      mockPost.mockResolvedValue({
        data: { message: 'Message explicite du contrôleur.', errors: [{ msg: 'Autre message.' }] },
        status: 400,
      })
      const result = await api.post('revision-sessions', {})
      expect(result.data.message).toBe('Message explicite du contrôleur.')
    })

    it('post - statut 400 sans errors ni message - data.message reste absent', async () => {
      mockPost.mockResolvedValue({ data: {}, status: 400 })
      const result = await api.post('revision-sessions', {})
      expect(result.data.message).toBeUndefined()
    })
  })

  // ==================== api.put ====================
  describe('api.put', () => {
    it('put - données valides, statut 200 - retourne { data, status }', async () => {
      mockPut.mockResolvedValue({ data: { id: 1, name: 'Nouveau' }, status: 200 })
      const result = await api.put('users/1', { name: 'Nouveau' })
      expect(result).toEqual({ data: { id: 1, name: 'Nouveau' }, status: 200 })
    })

    it('put - statut 401 - appelle logout et retourne undefined', async () => {
      mockPut.mockResolvedValue({ data: {}, status: 401 })
      const result = await api.put('users/1', {})
      expect(mockLogout).toHaveBeenCalledOnce()
      expect(result).toBeUndefined()
    })

    it('put - erreur réseau - redirige vers /error-server et retourne undefined', async () => {
      mockPut.mockRejectedValue(new Error('Network Error'))
      const result = await api.put('users/1', {})
      expect(mockRouterPush).toHaveBeenCalledWith({ path: '/error-server' })
      expect(result).toBeUndefined()
    })

    it('put - endpoint absent - lève une erreur', async () => {
      await expect(api.put()).rejects.toThrow()
    })
  })

  // ==================== api.del ====================
  describe('api.del', () => {
    it('del - endpoint valide, statut 200 - retourne { data, status }', async () => {
      mockDelete.mockResolvedValue({ data: { message: 'Supprimé' }, status: 200 })
      const result = await api.del('users/1')
      expect(result).toEqual({ data: { message: 'Supprimé' }, status: 200 })
    })

    it('del - statut 204 - retourne undefined', async () => {
      mockDelete.mockResolvedValue({ data: null, status: 204 })
      const result = await api.del('users/1')
      expect(result).toBeUndefined()
    })

    it('del - statut 401 - appelle logout et retourne undefined', async () => {
      mockDelete.mockResolvedValue({ data: {}, status: 401 })
      const result = await api.del('users/1')
      expect(mockLogout).toHaveBeenCalledOnce()
      expect(result).toBeUndefined()
    })

    it('del - erreur réseau - redirige vers /error-server et retourne undefined', async () => {
      mockDelete.mockRejectedValue(new Error('Network Error'))
      const result = await api.del('users/1')
      expect(mockRouterPush).toHaveBeenCalledWith({ path: '/error-server' })
      expect(result).toBeUndefined()
    })

    it('del - endpoint absent - lève une erreur', async () => {
      await expect(api.del()).rejects.toThrow()
    })
  })
})
