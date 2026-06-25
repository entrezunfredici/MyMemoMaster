import { defineStore } from 'pinia'
import { api } from '@/helpers/api'
import { notif } from '@/helpers/notif'

export const useTagStore = defineStore('tags', {
  state: () => ({
    tags: []
  }),

  actions: {
    async fetchTags() {
      try {
        const resp = await api.get('tags')
        if (resp?.status !== 200) return false
        this.tags = resp.data
        return true
      } catch (error) {
        notif.notify(`Erreur lors de la récupération des tags : ${error}`, 'error')
        return false
      }
    },

    /**
     * Crée un nouveau tag et l'ajoute dans le store.
     * @param {string} name
     * @param {string} [color='#6366F1']
     * @returns {object|null} le tag créé ou null en cas d'erreur
     */
    async createTag(name, color = '#6366F1') {
      try {
        const resp = await api.post('tags', { name, color })
        if (resp?.status !== 201) {
          notif.notify(resp?.data?.message || 'Erreur lors de la création du tag.', 'error')
          return null
        }
        const newTag = resp.data.data
        this.tags.push(newTag)
        this.tags.sort((a, b) => a.name.localeCompare(b.name))
        return newTag
      } catch (error) {
        notif.notify(`Erreur lors de la création du tag : ${error}`, 'error')
        return null
      }
    },

    /**
     * Met à jour la couleur d'un tag existant.
     * @param {number} tagId
     * @param {string} color - code hexadécimal (#RRGGBB)
     * @returns {boolean}
     */
    async updateTagColor(tagId, color) {
      try {
        const resp = await api.put(`tags/${tagId}`, { color })
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || 'Erreur lors de la mise à jour de la couleur.', 'error')
          return false
        }
        const tag = this.tags.find((t) => t.tagId === tagId)
        if (tag) tag.color = color
        return true
      } catch (error) {
        notif.notify(`Erreur lors de la mise à jour de la couleur : ${error}`, 'error')
        return false
      }
    },

    async deleteTag(tagId) {
      try {
        const resp = await api.del(`tags/${tagId}`)
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || 'Erreur lors de la suppression du tag.', 'error')
          return false
        }
        this.tags = this.tags.filter((t) => t.tagId !== tagId)
        return true
      } catch (error) {
        notif.notify(`Erreur lors de la suppression du tag : ${error}`, 'error')
        return false
      }
    },

    /**
     * Remplace les tags associés à une entité.
     * @param {'mindmap'|'leitnersystem'|'test'} entityType
     * @param {number} entityId
     * @param {number[]} tagIds
     */
    async setEntityTags(entityType, entityId, tagIds) {
      const endpointMap = {
        mindmap: `tags/diagrammes/${entityId}`,
        leitnersystem: `tags/leitnersystems/${entityId}`,
        test: `tags/tests/${entityId}`
      }
      const endpoint = endpointMap[entityType]
      if (!endpoint) return false
      try {
        const resp = await api.put(endpoint, { tagIds })
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || 'Erreur lors de la mise à jour des tags.', 'error')
          return false
        }
        return true
      } catch (error) {
        notif.notify(`Erreur lors de la mise à jour des tags : ${error}`, 'error')
        return false
      }
    }
  }
})
