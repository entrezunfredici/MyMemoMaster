import { defineStore } from 'pinia'
import { api } from '@/helpers/api'
import { notif } from '@/helpers/notif'

export const useLeitnerCardStore = defineStore('leitnerCards', {
  state: () => ({
    card: {},
    cards: [],
    dueCards: [],
    lastCorrection: null,
    systemStats: {}
  }),

  actions: {
    async fetchCardsByBox(boxId) {
      try {
        const resp = await api.get(`leitnercards/leitnerboxes/${boxId}`)
        if (resp.status !== 200) {
          notif.notify(resp.data?.message || 'Erreur lors du chargement des cartes.', 'error')
          return false
        }
        this.cards = resp.data
        return true
      } catch (err) {
        notif.notify('Erreur lors du chargement des cartes.', 'error')
        return false
      }
    },

    async fetchCardById(id) {
      try {
        const resp = await api.get(`leitnercards/${id}`)
        if (resp.status !== 200) {
          notif.notify(resp.data?.message || 'Carte introuvable.', 'error')
          return false
        }
        this.card = resp.data
        return true
      } catch (err) {
        notif.notify('Erreur lors de la récupération de la carte.', 'error')
        return false
      }
    },

    async fetchDueCards(systemId) {
      try {
        const resp = await api.get(`leitnercards/due/${systemId}`)
        if (resp.status !== 200) {
          notif.notify(resp.data?.message || 'Erreur lors du chargement des cartes à réviser.', 'error')
          return false
        }
        this.dueCards = resp.data
        return true
      } catch (err) {
        notif.notify('Erreur lors du chargement des cartes à réviser.', 'error')
        return false
      }
    },

    async createCard() {
      try {
        const resp = await api.post('leitnercards', this.card)
        if (resp.status !== 201) {
          notif.notify(resp.data?.message || 'Erreur lors de la création.', 'error')
          return false
        }
        this.card = resp.data
        notif.notify('Carte créée avec succès.', 'success')
        return true
      } catch (err) {
        notif.notify('Erreur lors de la création de la carte.', 'error')
        return false
      }
    },

    async updateCard(id) {
      try {
        const resp = await api.put(`leitnercards/${id}`, this.card)
        if (resp.status !== 200) {
          notif.notify(resp.data?.message || 'Erreur lors de la mise à jour.', 'error')
          return false
        }
        notif.notify('Carte mise à jour avec succès.', 'success')
        return true
      } catch (err) {
        notif.notify('Erreur lors de la mise à jour de la carte.', 'error')
        return false
      }
    },

    async submitResponse(cardId, studentAnswer) {
      try {
        const resp = await api.post('leitnercards/response', { cardId, studentAnswer }, { timeout: 90000 })
        if (resp.status !== 200) {
          notif.notify(resp.data?.message || 'Erreur lors de la correction.', 'error')
          return false
        }
        this.lastCorrection = resp.data
        const newLevel = resp.data.newLevel
        if (newLevel) {
          const card = this.dueCards.find(c => c.idCard === cardId)
          if (card?.leitnerBox) card.leitnerBox.level = newLevel
        }
        return true
      } catch (err) {
        notif.notify('Erreur lors de la correction de la réponse.', 'error')
        return false
      }
    },

    async loadSystemStats(systemIds) {
      const boxResp = await api.get('leitnerboxes')
      const allBoxes = boxResp?.status === 200 ? boxResp.data : []

      await Promise.all(
        systemIds.map(async (systemId) => {
          try {
            const systemBoxes = allBoxes.filter(b => b.idSystem === systemId)

            const [dueResp, ...boxCardResps] = await Promise.all([
              api.get(`leitnercards/due/${systemId}`),
              ...systemBoxes.map(b => api.get(`leitnercards/leitnerboxes/${b.idBox}`)),
            ])

            if (!dueResp || dueResp.status !== 200) return

            const dueByLevel = {}
            dueResp.data.forEach(card => {
              const level = card.leitnerBox?.level
              if (level) dueByLevel[level] = (dueByLevel[level] || 0) + 1
            })

            const totalByLevel = {}
            systemBoxes.forEach((box, idx) => {
              if (boxCardResps[idx]?.status === 200)
                totalByLevel[box.level] = boxCardResps[idx].data.length
            })

            this.systemStats[systemId] = {
              total: dueResp.data.length,
              boxes: dueByLevel,
              totalByLevel,
            }
          } catch {
            // erreur silencieuse par système
          }
        })
      )
    },

    async deleteCard(id) {
      try {
        const resp = await api.del(`leitnercards/${id}`)
        if (resp.status !== 200) {
          notif.notify(resp.data?.message || 'Erreur lors de la suppression.', 'error')
          return false
        }
        notif.notify('Carte supprimée avec succès.', 'success')
        return true
      } catch (err) {
        notif.notify('Erreur lors de la suppression de la carte.', 'error')
        return false
      }
    }
  }
})
