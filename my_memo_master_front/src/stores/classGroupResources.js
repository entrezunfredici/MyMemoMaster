import { defineStore } from 'pinia'
import { api } from '@/helpers/api'
import { notif } from '@/helpers/notif'
import { discardUploadedFile } from '@/helpers/storageCleanup'

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

    /**
     * Téléverse le fichier UNE fois puis crée une ressource par groupe (`groupId` + `otherGroupIds`),
     * toutes sur la même clé de stockage. Le fichier n'est supprimé que si aucune création n'aboutit.
     * @returns {Promise<object|boolean>} la ressource du groupe courant (ou la première créée), `false` si aucune
     */
    async uploadAndCreate(groupId, file, metadata, otherGroupIds = []) {
      this.uploading = true
      let uploadedKey = null
      try {
        const form = new FormData()
        form.append('file', file)
        const uploadResp = await api.post('storage/upload', form)
        if (uploadResp?.status !== 201) {
          notif.notify(uploadResp?.data?.message || "Erreur lors de l'upload.", 'error')
          return false
        }
        const { url, key, mimetype, size } = uploadResp.data
        uploadedKey = key
        const groupIds = [groupId, ...otherGroupIds.filter((id) => id !== groupId)]
        const created = []
        let firstError = null
        for (const gid of groupIds) {
          try {
            const createResp = await api.post(`class-groups/${gid}/resources`, {
              ...metadata,
              url,
              fileKey: key,
              mimeType: mimetype,
              originalName: file.name,
              fileSize: size,
            })
            if (createResp?.status === 201) {
              created.push({ groupId: gid, resource: createResp.data.data })
            } else {
              firstError ??= createResp?.data?.message || 'Erreur lors de la création de la ressource.'
            }
          } catch {
            firstError ??= "Erreur lors de l'upload de la ressource."
          }
        }
        if (!created.length) {
          await discardUploadedFile(uploadedKey)
          notif.notify(firstError, 'error')
          return false
        }
        const current = created.find((c) => c.groupId === groupId)
        if (current) {
          this.resources.unshift(current.resource)
          this._cache[groupId] = Date.now()
        }
        if (created.length === groupIds.length) {
          notif.notify(groupIds.length > 1 ? `Ressource partagée dans ${groupIds.length} groupes.` : 'Ressource ajoutée.', 'success')
        } else {
          notif.notify(`Ressource partagée dans ${created.length} groupe(s) sur ${groupIds.length} : ${firstError}`, 'warning')
        }
        return (current ?? created[0]).resource
      } catch {
        await discardUploadedFile(uploadedKey)
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
