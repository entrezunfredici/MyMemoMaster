import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/helpers/api'

export const usePlanningStore = defineStore('planning', () => {
  const priorities = ref({ overdue: [], today: [], upcoming: [] })
  const load = ref([])

  async function fetchPriorities() {
    const res = await api.get('/planning/priorities')
    if (res && res.status === 200) {
      priorities.value = res.data.data
    }
  }

  async function fetchLoad(days = 14) {
    const res = await api.get('/planning/load', { days })
    if (res && res.status === 200) {
      load.value = res.data.data
    }
  }

  return { priorities, load, fetchPriorities, fetchLoad }
})
