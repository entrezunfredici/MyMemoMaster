import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/helpers/api'
import { notif } from '@/helpers/notif'

export const usePlanningStore = defineStore('planning', () => {
  const priorities = ref({ overdue: [], today: [], upcoming: [] })
  const load = ref([])

  async function fetchPriorities() {
    try {
      const res = await api.get('/planning/priorities')
      if (res && res.status === 200) {
        priorities.value = res.data.data
      }
    } catch {
      notif.notify('Erreur lors du chargement des priorités.', 'error')
    }
  }

  async function fetchLoad(days = 14) {
    try {
      const res = await api.get('/planning/load', { days })
      if (res && res.status === 200) {
        load.value = res.data.data
      }
    } catch {
      notif.notify('Erreur lors du chargement de la charge de révision.', 'error')
    }
  }

  return { priorities, load, fetchPriorities, fetchLoad }
})
