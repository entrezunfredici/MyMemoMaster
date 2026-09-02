import { defineStore } from 'pinia'
import { api } from '@/helpers/api'

// Store de l'écran "Interface génération (upload, paramètres)" — C-01.08. Couvre les Vues 1 et 2
// de la maquette (diagrams/generation_ia_ui.md) : configuration + lancement de la génération et son
// état d'attente/erreur. L'Écran de validation (Vue 3) est hors périmètre de ce ticket (question
// posée à l'utilisateur, tranchée le 2026-09-02) — une génération réussie reste un batch "pending",
// récupérable via GET /ai-generation-batches par un futur ticket, ce store ne fait qu'exposer
// `lastBatch` pour lui laisser ce point d'accroche.

export const useAiCardGenerationStore = defineStore('aiCardGeneration', {
  state: () => ({
    status: 'idle',      // 'idle' | 'generating' | 'error' | 'done'
    errorMessage: '',
    lastBatch: null,     // batch "pending" renvoyé par le dernier POST réussi (cards[] inclus)
    quota: null,         // résumé AiQuotaService#getUsageSummary — null tant que non chargé/indisponible
  }),

  actions: {
    /**
     * Charge le résumé de consommation IA de l'utilisateur (quota quotidien + budget mensuel) pour
     * l'affichage "Quota restant" (Vue 1, §4.2). Best-effort : un échec n'empêche pas de générer,
     * il laisse simplement `quota` à `null` (le bandeau d'affichage se masque dans ce cas).
     */
    async fetchQuota() {
      const resp = await api.get('ai-generation-batches/quota')
      if (!resp || resp.status !== 200) {
        this.quota = null
        return false
      }
      this.quota = resp.data
      return true
    },

    /**
     * Lance une génération de cartes par IA (texte collé ou PDF, exclusif) et attend le brouillon
     * "pending" en retour. Met à jour `status`/`errorMessage` pour piloter la Vue 2 (état de
     * génération) — le composant appelant reste responsable de la transition entre les modales.
     *
     * @param {object} config
     * @param {number} config.idSystem
     * @param {string|null} [config.sourceText] - Exclusif avec pdfFile
     * @param {File|null} [config.pdfFile] - Exclusif avec sourceText
     * @param {string|null} [config.subjectContext] - Contexte matière libre (≤100 car.), envoyé tel quel au prompt
     * @param {number} config.cardCount
     * @param {'open'|'mcq'|'mixed'} config.cardType
     * @returns {Promise<boolean>} true si la génération a abouti (voir `lastBatch`)
     */
    async generate({ idSystem, sourceText = null, pdfFile = null, subjectContext = null, cardCount, cardType }) {
      this.status = 'generating'
      this.errorMessage = ''

      const formData = new FormData()
      formData.append('idSystem', String(idSystem))
      formData.append('cardCount', String(cardCount))
      formData.append('cardType', cardType)
      if (subjectContext) formData.append('subjectContext', subjectContext)
      if (pdfFile) {
        formData.append('pdf', pdfFile)
      } else {
        formData.append('sourceText', sourceText || '')
      }

      const resp = await api.post('ai-generation-batches', formData)

      if (!resp || resp.status !== 201) {
        this.status = 'error'
        this.errorMessage = resp?.data?.message || 'La génération a échoué. Réessayez.'
        return false
      }

      this.lastBatch = resp.data
      this.status = 'done'
      return true
    },

    /**
     * Referme l'écran de génération sans rien persister — remet le store à l'état initial (Vue 1
     * repart vide au prochain lancement).
     */
    reset() {
      this.status = 'idle'
      this.errorMessage = ''
      this.lastBatch = null
    },
  },
})
