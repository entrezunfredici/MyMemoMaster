import { ref } from 'vue'
import { api } from '@/helpers/api'

// Store simple pour gérer la liste des tutoriels avec filtres/pagination
export function useTutorialsStore() {
  const items = ref([])
  const pagination = ref({ total: 0, page: 1, perPage: 10, totalPages: 0 })
  const loading = ref(false)
  const error = ref(null)

  async function fetchTutorials(params = {}) {
    loading.value = true
    error.value = null
    try {
      // Appelle la bonne route backend: /tutorials/all
      const resp = await api.get('tutorials/all', params)
      if (!resp) return

      const payload = resp.data
      // Backend renvoie { status, data, pagination }
      items.value = payload?.data || []
      pagination.value = payload?.pagination || pagination.value
    } catch (e) {
      error.value = e?.message || 'Erreur lors de la récupération des tutoriels'
    } finally {
      loading.value = false
    }
  }

  return { items, pagination, loading, error, fetchTutorials }
}
