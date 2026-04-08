import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTodosStore } from '../todos'

// Mock the api helper so no real HTTP calls are made
vi.mock('@/helpers/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
  },
}))

// Mock the router so api.js doesn't explode when it tries to navigate on error
vi.mock('@/router', () => ({ default: { push: vi.fn() } }))

// Mock config so the store can be imported cleanly
vi.mock('@/config', () => ({
  VITE_API_URL: 'http://localhost:3000',
  VITE_API_SECURITY_MODE: 'public',
  VITE_API_KEY_HEADER: '',
  VITE_API_KEY_VALUE: '',
  VITE_API_BEARER_HEADER: '',
  VITE_API_BEARER_TOKEN: '',
  VITE_API_GOOGLE_TOKEN_URL: '',
  VITE_API_GOOGLE_AUDIENCE: '',
  VITE_API_GOOGLE_AUTH_HEADER: '',
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ authenticated: false, logout: vi.fn() }),
}))

import { api } from '@/helpers/api'

describe('useTodosStore — initial state', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('has correct default period', () => {
    const store = useTodosStore()
    expect(store.period).toBe('week')
  })

  it('has pending and in_progress as default status filters', () => {
    const store = useTodosStore()
    expect(store.statusFilters).toEqual(['pending', 'in_progress'])
  })

  it('sorts ascending by default', () => {
    const store = useTodosStore()
    expect(store.sortOrder).toBe('asc')
  })

  it('starts with an empty todos list', () => {
    const store = useTodosStore()
    expect(store.todos).toEqual([])
  })
})

describe('useTodosStore — toggleStatusFilter', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('adds a status that is not yet in the filter list', () => {
    const store = useTodosStore()
    store.statusFilters = []
    store.toggleStatusFilter('done')
    expect(store.statusFilters).toContain('done')
  })

  it('removes a status that is already in the filter list', () => {
    const store = useTodosStore()
    store.statusFilters = ['pending', 'in_progress']
    store.toggleStatusFilter('pending')
    expect(store.statusFilters).not.toContain('pending')
  })

  it('keeps other statuses unchanged when toggling one', () => {
    const store = useTodosStore()
    store.statusFilters = ['pending', 'in_progress']
    store.toggleStatusFilter('pending')
    expect(store.statusFilters).toContain('in_progress')
  })
})

describe('useTodosStore — setPeriod / setSortOrder / setSearchQuery', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('updates period', () => {
    const store = useTodosStore()
    store.setPeriod('month')
    expect(store.period).toBe('month')
  })

  it('updates sortOrder', () => {
    const store = useTodosStore()
    store.setSortOrder('desc')
    expect(store.sortOrder).toBe('desc')
  })

  it('updates searchQuery', () => {
    const store = useTodosStore()
    store.setSearchQuery('math')
    expect(store.searchQuery).toBe('math')
  })
})

describe('useTodosStore — fetchTodos', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('calls api.get with period, status, sort params', async () => {
    api.get.mockResolvedValue({ data: [], status: 200 })
    const store = useTodosStore()
    store.period = 'day'
    store.statusFilters = ['pending']
    store.sortOrder = 'desc'
    await store.fetchTodos()
    expect(api.get).toHaveBeenCalledWith('todos', {
      period: 'day',
      status: 'pending',
      sort: 'desc',
    })
  })

  it('populates todos from API response', async () => {
    const mockTodos = [{ id: 1, title: 'Test', status: 'pending' }]
    api.get.mockResolvedValue({ data: mockTodos, status: 200 })
    const store = useTodosStore()
    await store.fetchTodos()
    expect(store.todos).toEqual(mockTodos)
  })

  it('sets todos to empty array when API returns nothing', async () => {
    api.get.mockResolvedValue(undefined)
    const store = useTodosStore()
    store.todos = [{ id: 99 }]
    await store.fetchTodos()
    expect(store.todos).toEqual([])
  })

  it('includes q param when searchQuery is set', async () => {
    api.get.mockResolvedValue({ data: [], status: 200 })
    const store = useTodosStore()
    store.searchQuery = 'histoire'
    await store.fetchTodos()
    expect(api.get).toHaveBeenCalledWith('todos', expect.objectContaining({ q: 'histoire' }))
  })

  it('sets loading to false after fetch completes', async () => {
    api.get.mockResolvedValue({ data: [], status: 200 })
    const store = useTodosStore()
    await store.fetchTodos()
    expect(store.loading).toBe(false)
  })
})

describe('useTodosStore — createTodo', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('calls api.post with the payload', async () => {
    api.post.mockResolvedValue({ data: { id: 2 }, status: 201 })
    api.get.mockResolvedValue({ data: [], status: 200 })
    const store = useTodosStore()
    const payload = { title: 'Nouvelle tâche', status: 'pending', deadline: null }
    await store.createTodo(payload)
    expect(api.post).toHaveBeenCalledWith('todos', payload)
  })

  it('returns true on success', async () => {
    api.post.mockResolvedValue({ data: { id: 2 }, status: 201 })
    api.get.mockResolvedValue({ data: [], status: 200 })
    const store = useTodosStore()
    const result = await store.createTodo({ title: 'X', status: 'pending' })
    expect(result).toBe(true)
  })

  it('returns false when API returns nothing', async () => {
    api.post.mockResolvedValue(undefined)
    const store = useTodosStore()
    const result = await store.createTodo({ title: 'X', status: 'pending' })
    expect(result).toBe(false)
  })
})

describe('useTodosStore — updateTodo', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('calls api.put with the correct endpoint and payload', async () => {
    api.put.mockResolvedValue({ data: {}, status: 200 })
    api.get.mockResolvedValue({ data: [], status: 200 })
    const store = useTodosStore()
    await store.updateTodo(5, { title: 'Updated', status: 'done' })
    expect(api.put).toHaveBeenCalledWith('todos/5', { title: 'Updated', status: 'done' })
  })

  it('returns true on success', async () => {
    api.put.mockResolvedValue({ data: {}, status: 200 })
    api.get.mockResolvedValue({ data: [], status: 200 })
    const store = useTodosStore()
    const result = await store.updateTodo(5, { title: 'X' })
    expect(result).toBe(true)
  })
})

describe('useTodosStore — deleteTodo', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('calls api.del with the correct endpoint', async () => {
    api.del.mockResolvedValue({ data: {}, status: 204 })
    const store = useTodosStore()
    await store.deleteTodo(7)
    expect(api.del).toHaveBeenCalledWith('todos/7')
  })

  it('removes the todo from the local list on success', async () => {
    api.del.mockResolvedValue({ data: {}, status: 204 })
    const store = useTodosStore()
    store.todos = [
      { id: 7, title: 'A' },
      { id: 8, title: 'B' },
    ]
    await store.deleteTodo(7)
    expect(store.todos.find((t) => t.id === 7)).toBeUndefined()
    expect(store.todos.find((t) => t.id === 8)).toBeDefined()
  })

  it('returns false when API returns nothing', async () => {
    api.del.mockResolvedValue(undefined)
    const store = useTodosStore()
    const result = await store.deleteTodo(7)
    expect(result).toBe(false)
  })
})
