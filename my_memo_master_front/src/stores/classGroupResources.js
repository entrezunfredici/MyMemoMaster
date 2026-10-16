import { defineStore } from 'pinia'
import { api } from '@/helpers/api'
import { notif } from '@/helpers/notif'

export const useClassGroupResourceStore = defineStore('classGroupResources', {
  state: () => ({
    resources: [],
    currentGroupId: null,
    uploading: false,
    _cache: {}, // { [groupId]: timestamp } — TTL 5 min
  }),

  actions: {
    async fetchByGroup(groupId, force = false) {
      const TTL = 5 * 60 * 1000
      if (!force && this.currentGroupId === groupId && this._cache[groupId] && Date.now() - this._cache[groupId] < TTL) return true
      try {
        const resp = await api.get(`class-groups/${groupId}/resources`)
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || 'Erreur lors du chargement des ressources.', 'error')
          return false
        }
        this.resources = resp.data.data
        this.currentGroupId = groupId
        this._cache[groupId] = Date.now()
        return true
      } catch {
        notif.notify('Erreur lors du chargement des ressources.', 'error')
        return false
      }
    },

    async uploadAndCreate(groupId, file, metadata) {
      this.uploading = true
      try {
        const form = new FormData()
        form.append('file', file)
        const uploadResp = await api.post('storage/upload', form)
        if (uploadResp?.status !== 201) {
          notif.notify(uploadResp?.data?.message || "Erreur lors de l'upload.", 'error')
          return false
        }
        const { url, key, mimetype, size } = uploadResp.data
        const createResp = await api.post(`class-groups/${groupId}/resources`, {
          ...metadata,
          url,
          fileKey: key,
          mimeType: mimetype,
          originalName: file.name,
          fileSize: size,
        })
        if (createResp?.status !== 201) {
          notif.notify(createResp?.data?.message || 'Erreur lors de la création de la ressource.', 'error')
          return false
        }
        this.resources.unshift(createResp.data.data)
        this._cache[groupId] = Date.now()
        notif.notify('Ressource ajoutée.', 'success')
        return createResp.data.data
      } catch {
        notif.notify("Erreur lors de l'upload de la ressource.", 'error')
        return false
      } finally {
        this.uploading = false
      }
    },

    async delete(groupId, resourceId) {
      try {
        const resp = await api.del(`class-groups/${groupId}/resources/${resourceId}`)
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || 'Erreur lors de la suppression.', 'error')
          return false
        }
        this.resources = this.resources.filter((r) => r.id !== resourceId)
        this._cache[groupId] = Date.now()
        notif.notify('Ressource supprimée.', 'success')
        return true
      } catch {
        notif.notify('Erreur lors de la suppression.', 'error')
        return false
      }
    },
  },
})
