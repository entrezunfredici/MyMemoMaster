import { defineStore } from 'pinia'
import { api } from '@/helpers/api'

// Store de "Interface génération exercices" (C-02.06), feature "Génération d'exercices par IA"
// (C-02). Couvre Vue 1/Vue 2 (config + attente/erreur) de diagrams/generation_ia_exercices_ui.md :
// appelle POST /ai-exercise-generations (backend — referme la chaîne C-02.03 Service génération /
// C-02.04 Validation format / C-02.05 Mode dégradé) et porte le résultat en mémoire.
//
// CHOIX : pas d'action `promoteQuestion`/`fetchPendingBatches` équivalente à `stores/aiCardGeneration.js`
// (C-01) — cette route ne persiste RIEN côté serveur (pas de table `AiGenerationBatch` pour les
// exercices, cf. generation_ia_exercices_ui.md §8 : « architecture plus simple, sans tables de
// brouillon, plausible pour C-02 »), donc rien à reprendre après un rechargement de page ni à
// promouvoir un par un. L'ajout des questions acceptées à `form.questions` est orchestré directement
// par `ExercisesPage.vue` via l'Écran de révision (C-02.07) — pas par ce store.
//
// Import PDF (ajouté après C-02.07, demande utilisateur) : `generate` accepte désormais soit
// `sourceText` soit `pdfFile` (exclusifs, comme `stores/aiCardGeneration.js#generate`) — envoyés en
// `multipart/form-data`. La route backend passe maintenant systématiquement par
// `AiExerciseGenerationPipeline.service.js` (chunking, comme C-01), même pour un texte collé tenant
// en un seul chunk — d'où `warnings` (tableau) qui remplace `warning` (chaîne unique) dans la
// réponse, et un timeout étendu aligné sur celui de la feature voisine (multi-passages possibles).

// Même valeur et même raison que stores/aiCardGeneration.js#GENERATE_TIMEOUT_MS (C-01.11) : le
// timeout global de helpers/api.js (10 000 ms) ne suffit plus depuis que cette route peut chunker un
// contenu long (jusqu'à MAX_CHUNKS passages, AiExerciseGenerationPipeline.service.js), chacun jusqu'à
// 2 appels Mistral (1er essai + retry).
const GENERATE_TIMEOUT_MS = 300000

export const useAiExerciseGenerationStore = defineStore('aiExerciseGeneration', {
  state: () => ({
    status: 'idle', // 'idle' | 'generating' | 'error' | 'done'
    questions: [], // questions[] du contrat generation_ia_exercices_types.md §5
    warnings: [],
    errorMessage: '',
    // Mode dégradé (C-02.05) : true si le backend conseille de basculer sur la création manuelle
    // plutôt que de réessayer la génération — affiché en plus du message d'erreur générique.
    suggestManualCreation: false,
  }),

  actions: {
    /**
     * Lance une génération d'exercices par IA (texte collé ou PDF, exclusifs — l'import PDF réutilise
     * le pipeline chunking/OCR déjà existant côté cartes Leitner, `PdfExtraction.service.js`, via
     * `AiExerciseGenerationPipeline.service.js`) et attend le brouillon de questions en retour. Met à
     * jour `status`/`errorMessage` pour piloter la Vue 2 (état de génération) — le composant appelant
     * reste responsable de la transition entre les modales.
     *
     * @param {object} config
     * @param {string|null} [config.sourceText] - Exclusif avec pdfFile
     * @param {File|null} [config.pdfFile] - Exclusif avec sourceText
     * @param {string|null} [config.subjectContext] - Contexte matière libre (≤100 car.)
     * @param {number} config.questionCount
     * @param {'mixed'|'open'|'mcq'|'fill_blank'|'reorder'} [config.questionType]
     * @returns {Promise<boolean>} true si la génération a abouti (voir `questions`/`warnings`)
     */
    async generate({ sourceText = null, pdfFile = null, subjectContext = null, questionCount, questionType = 'mixed' }) {
      this.status = 'generating'
      this.errorMessage = ''
      this.suggestManualCreation = false

      const formData = new FormData()
      formData.append('questionCount', String(questionCount))
      formData.append('questionType', questionType)
      if (subjectContext) formData.append('subjectContext', subjectContext)
      if (pdfFile) {
        formData.append('pdf', pdfFile)
      } else {
        formData.append('sourceText', sourceText || '')
      }

      const resp = await api.post('ai-exercise-generations', formData, { timeout: GENERATE_TIMEOUT_MS })

      if (!resp || resp.status !== 200 || !resp.data?.success) {
        this.status = 'error'
        this.errorMessage = resp?.data?.message || 'La génération a échoué. Réessayez.'
        this.suggestManualCreation = Boolean(resp?.data?.suggestManualCreation)
        return false
      }

      this.questions = resp.data.questions
      this.warnings = resp.data.warnings || []
      this.status = 'done'
      return true
    },

    /**
     * Referme le flux de génération sans rien avoir persisté — remet le store à l'état initial (Vue 1
     * repart vide au prochain lancement). Ne vide PAS `form.questions` côté page : les questions déjà
     * acceptées par l'utilisateur y restent, seul l'état interne du flux IA est réinitialisé.
     */
    reset() {
      this.status = 'idle'
      this.questions = []
      this.warnings = []
      this.errorMessage = ''
      this.suggestManualCreation = false
    },
  },
})
