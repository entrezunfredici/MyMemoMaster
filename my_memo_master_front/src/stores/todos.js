import { defineStore } from 'pinia'
import { isInPeriod } from '@/helpers/todoHelpers'

/**
 * Generates a simple unique ID (no backend needed).
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export const useTodosStore = defineStore('todos', {
  persist: true,

  state: () => ({
    // All todos stored locally
    todos: [],
    loading: false,
    // User preferences — persisted in localStorage
    period: 'week',
    statusFilters: ['pending', 'in_progress'],
    sortOrder: 'asc',
    searchQuery: '',
  }),

  getters: {
    /**
     * Returns todos filtered by period, status, search and sorted by deadline.
     * Todos without a deadline always appear in the list (but not the calendar).
     */
    filteredTodos(state) {
      let result = [...state.todos]

      // Period filter — todos with no deadline are always included
      result = result.filter((todo) => {
        if (!todo.deadline) return true
        return isInPeriod(todo.deadline, state.period)
      })

      // Status filter
      if (state.statusFilters.length > 0) {
        result = result.filter((todo) => state.statusFilters.includes(todo.status))
      }

      // Search filter (case-insensitive on title)
      if (state.searchQuery.trim()) {
        const q = state.searchQuery.toLowerCase()
        result = result.filter((todo) => todo.title.toLowerCase().includes(q))
      }

      // Sort by deadline (nulls go last)
      result.sort((a, b) => {
        if (!a.deadline && !b.deadline) return 0
        if (!a.deadline) return 1
        if (!b.deadline) return -1
        const diff = new Date(a.deadline) - new Date(b.deadline)
        return state.sortOrder === 'asc' ? diff : -diff
      })

      return result
    },
  },

  actions: {
    /**
     * Simulate a fetch — shows skeleton briefly, then reveals data from state.
     */
    async fetchTodos() {
      this.loading = true
      await new Promise((resolve) => setTimeout(resolve, 120))
      this.loading = false
    },

    /**
     * Create a new todo and add it to the local list.
     * @returns {boolean} success
     */
    createTodo(payload) {
      const newTodo = {
        id: generateId(),
        title: payload.title,
        description: payload.description || '',
        deadline: payload.deadline || null,
        status: payload.status || 'pending',
        createdAt: new Date().toISOString(),
      }
      this.todos.unshift(newTodo)
      return true
    },

    /**
     * Update an existing todo in the local list.
     * @returns {boolean} success
     */
    updateTodo(id, payload) {
      const idx = this.todos.findIndex((t) => t.id === id)
      if (idx === -1) return false
      this.todos[idx] = { ...this.todos[idx], ...payload, id }
      return true
    },

    /**
     * Delete a todo from the local list.
     * @returns {boolean} success
     */
    deleteTodo(id) {
      const idx = this.todos.findIndex((t) => t.id === id)
      if (idx === -1) return false
      this.todos.splice(idx, 1)
      return true
    },

    /**
     * Toggle a status filter on/off.
     */
    toggleStatusFilter(status) {
      const idx = this.statusFilters.indexOf(status)
      if (idx === -1) {
        this.statusFilters.push(status)
      } else {
        this.statusFilters.splice(idx, 1)
      }
    },

    setPeriod(period) {
      this.period = period
    },

    setSortOrder(order) {
      this.sortOrder = order
    },

    setSearchQuery(q) {
      this.searchQuery = q
    },
  },
})
