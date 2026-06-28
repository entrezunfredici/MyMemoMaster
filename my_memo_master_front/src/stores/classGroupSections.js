import { defineStore } from 'pinia'
import { api } from '@/helpers/api'
import { notif } from '@/helpers/notif'

export const useClassGroupSectionStore = defineStore('classGroupSections', {
  state: () => ({
    sections: [],
    currentGroupId: null,
    _cache: {}, // { [groupId]: timestamp } — TTL 5 min
  }),

  actions: {
    async fetchByGroup(groupId, force = false) {
      const TTL = 5 * 60 * 1000
      if (!force && this.currentGroupId === groupId && this._cache[groupId] && Date.now() - this._cache[groupId] < TTL) return true
      try {
        const resp = await api.get(`class-groups/${groupId}/sections`)
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || 'Erreur lors du chargement des sections.', 'error')
          return false
        }
        this.sections = resp.data.data
        this.currentGroupId = groupId
        this._cache[groupId] = Date.now()
        return true
      } catch {
        notif.notify('Erreur lors du chargement des sections.', 'error')
        return false
      }
    },

    async create(groupId, payload) {
      try {
        const resp = await api.post(`class-groups/${groupId}/sections`, payload)
        if (resp?.status !== 201) {
          notif.notify(resp?.data?.message || 'Erreur lors de la création.', 'error')
          return false
        }
        this.sections.push(resp.data.data)
        this._cache[groupId] = Date.now()
        notif.notify('Section créée.', 'success')
        return resp.data.data
      } catch {
        notif.notify('Erreur lors de la création.', 'error')
        return false
      }
    },

    async update(groupId, sectionId, payload) {
      try {
        const resp = await api.put(`class-groups/${groupId}/sections/${sectionId}`, payload)
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || 'Erreur lors de la mise à jour.', 'error')
          return false
        }
        const idx = this.sections.findIndex((s) => s.id === sectionId)
        if (idx !== -1) this.sections[idx] = resp.data.data
        this._cache[groupId] = Date.now()
        notif.notify('Section mise à jour.', 'success')
        return true
      } catch {
        notif.notify('Erreur lors de la mise à jour.', 'error')
        return false
      }
    },

    async delete(groupId, sectionId) {
      try {
        const resp = await api.del(`class-groups/${groupId}/sections/${sectionId}`)
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || 'Erreur lors de la suppression.', 'error')
          return false
        }
        this.sections = this.sections.filter((s) => s.id !== sectionId)
        this._cache[groupId] = Date.now()
        notif.notify('Section supprimée.', 'success')
        return true
      } catch {
        notif.notify('Erreur lors de la suppression.', 'error')
        return false
      }
    },
  },
})
