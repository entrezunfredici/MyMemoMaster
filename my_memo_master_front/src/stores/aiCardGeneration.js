import { defineStore } from 'pinia'
import { api } from '@/helpers/api'
import { normalizeFormulaSyntax } from '@/components/interpreter/interpreter.js'

// Store de la feature "Génération de Leitner par IA" (C-01), côté front. Couvre :
// - C-01.08 (Vues 1/2 de diagrams/generation_ia_ui.md) : configuration + lancement de la
//   génération et son état d'attente/erreur (`generate`, `fetchQuota`).
// - C-01.09 (Vues 3/4) : révision d'un batch "pending" — mutation d'une carte proposée
//   (accept/edit/reject), bookkeeping de statut du batch, et promotion des cartes acceptées vers la
//   persistance réelle en réutilisant telle quelle la séquence de
//   `FlashcardsCardsPage.vue#handleCreate` (3 endpoints existants — hypothèse actée par
//   `generation_ia_prompt_cartes.md` §6, aucun nouvel endpoint de création en masse).

export const useAiCardGenerationStore = defineStore('aiCardGeneration', {
  state: () => ({
    status: 'idle',      // 'idle' | 'generating' | 'error' | 'done'
    errorMessage: '',
    lastBatch: null,     // batch "pending" renvoyé par le dernier POST réussi (cards[] inclus)
    quota: null,         // résumé AiQuotaService#getUsageSummary — null tant que non chargé/indisponible
    pendingBatches: [],  // batches "pending" de l'utilisateur (C-01.09 — reprise d'un brouillon)
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

    /**
     * Charge les batches "pending" de l'utilisateur (tous systèmes confondus, le plus récent en
     * premier — cf. `AiGenerationBatch.service.js#findPendingByUser`). Alimente le bandeau "reprendre
     * une génération en attente" de `FlashcardsCardsPage.vue` (C-01.09).
     *
     * @returns {Promise<boolean>}
     */
    async fetchPendingBatches() {
      const resp = await api.get('ai-generation-batches')
      if (!resp || resp.status !== 200) {
        this.pendingBatches = []
        return false
      }
      this.pendingBatches = resp.data
      return true
    },

    /**
     * Modifie une carte proposée (statut accept/edit/reject, et/ou son contenu si édition) — Vue 3/4
     * de la maquette. Écrit systématiquement en base (pas seulement en mémoire locale) : le batch
     * reste "pending" tant qu'il n'est pas validé/abandonné, donc résistant à un rechargement de page
     * en cours de relecture (cf. JSDoc de `AiGenerationBatch.service.js#findPendingByUser`).
     *
     * @param {number} cardId
     * @param {object} updates - Champs à modifier : statement/type/answer/acceptedAnswers/options/status
     * @returns {Promise<object|null>} La carte mise à jour, ou `null` en cas d'échec
     */
    async updateCard(cardId, updates) {
      const resp = await api.patch(`ai-generation-batches/cards/${cardId}`, updates)
      if (!resp || resp.status !== 200) return null
      return resp.data
    },

    /**
     * Marque un batch "validated" (promotion terminée) ou "discarded" (abandon explicite depuis
     * l'écran de révision, Vue 3 — `[Annuler]`) — bookkeeping uniquement, ne crée/supprime aucune
     * carte réelle (cf. `AiGenerationBatch.service.js#markBatchStatus`).
     *
     * @param {number} idBatch
     * @param {'validated'|'discarded'} status
     * @returns {Promise<boolean>}
     */
    async markBatchStatus(idBatch, status) {
      const resp = await api.patch(`ai-generation-batches/${idBatch}/status`, { status })
      return Boolean(resp && resp.status === 200)
    },

    /**
     * Promeut UNE carte proposée (déjà acceptée/éditée à l'écran de révision) vers la persistance
     * réelle — reproduit exactement la séquence de `FlashcardsCardsPage.vue#handleCreate`
     * (3 endpoints existants, aucun nouvel endpoint de création en masse — hypothèse actée par
     * `generation_ia_prompt_cartes.md` §6) : `POST /questions` → (type "open" uniquement)
     * `POST /responses` pour `answer` + chaque `acceptedAnswers` → `POST /leitnercards`.
     *
     * N'écrit PAS le statut de la carte proposée elle-même (`AiGeneratedCard`) — l'appelant reste
     * responsable de retirer la carte promue de sa liste locale (§10 de la maquette : "cartes
     * réussies retirées de la liste").
     *
     * @param {object} params
     * @param {number} params.idSystem
     * @param {string} params.statement
     * @param {'open'|'mcq'} params.type
     * @param {string|null} [params.answer]
     * @param {string[]|null} [params.acceptedAnswers]
     * @param {{text:string, correct:boolean}[]|null} [params.options]
     * @returns {Promise<{success: boolean, message?: string}>}
     */
    async promoteCard({ idSystem, statement, type, answer = null, acceptedAnswers = null, options = null }) {
      const questionPayload = {
        statement: normalizeFormulaSyntax(statement),
        questionPosition: 0,
        type,
        content: type === 'mcq'
          ? { options: (options || []).map(o => ({ text: normalizeFormulaSyntax(o.text), correct: o.correct })) }
          : null,
      }

      const qResp = await api.post('questions', questionPayload)
      if (!qResp || qResp.status !== 201) {
        return { success: false, message: qResp?.data?.message || 'Erreur lors de la création de la question.' }
      }
      const idQuestion = qResp.data.idQuestion

      if (type === 'open') {
        const answers = [answer, ...(acceptedAnswers || [])]
          .map(a => (a || '').trim())
          .filter(Boolean)
        for (const content of answers) {
          const rResp = await api.post('responses', { content: normalizeFormulaSyntax(content), correction: true, idQuestion })
          if (!rResp || rResp.status !== 201) {
            return { success: false, message: rResp?.data?.message || 'Erreur lors de la création de la réponse.' }
          }
        }
      }

      const cResp = await api.post('leitnercards', { idQuestion, idSystem, mindMapNodeId: null })
      if (!cResp || cResp.status !== 201) {
        return { success: false, message: cResp?.data?.message || 'Erreur lors de la création de la carte.' }
      }

      return { success: true }
    },
  },
})
