<template>
  <ModalComponent :visible="visible" title="Générer des questions par IA" size="lg" @close="emit('close')">
    <div class="form-group--lg">
      <label class="form-label">Source du contenu</label>
      <div class="flex gap-4 mb-3">
        <label class="flex items-center gap-2 text-sm cursor-pointer">
          <input type="radio" name="ai-exercise-source" value="text" v-model="source" class="accent-primary" />
          Coller du texte
        </label>
        <label class="flex items-center gap-2 text-sm cursor-pointer">
          <input type="radio" name="ai-exercise-source" value="pdf" v-model="source" class="accent-primary" />
          Importer un PDF
        </label>
      </div>

      <template v-if="source === 'text'">
        <textarea
          aria-label="Texte source pour la génération de questions d'exercice"
          v-model="sourceText"
          placeholder="Collez votre texte ici…"
          class="form-input"
          rows="6"
        />
        <p class="text-xs text-gray-400 mt-1 text-right">{{ sourceText.length }} caractère{{ sourceText.length > 1 ? 's' : '' }}</p>
      </template>

      <template v-else>
        <div
          class="border-2 border-dashed rounded-lg p-4 text-center transition"
          :class="dragOver ? 'border-primary bg-primary/5' : 'border-gray-300'"
          @dragover.prevent="dragOver = true"
          @dragleave.prevent="dragOver = false"
          @drop.prevent="handleDrop"
        >
          <template v-if="!pdfFile">
            <p class="text-sm text-gray-500">
              📄 Glissez un PDF ici ou
              <button type="button" class="text-primary font-medium hover:underline" @click="fileInput?.click()">
                Parcourir...
              </button>
            </p>
          </template>
          <div v-else class="flex items-center justify-between text-sm bg-gray-50 rounded px-3 py-2">
            <span class="truncate">{{ pdfFile.name }} ({{ formatFileSize(pdfFile.size) }})</span>
            <button type="button" aria-label="Retirer le fichier" class="text-gray-400 hover:text-red-500 ml-2" @click="pdfFile = null">
              ✕
            </button>
          </div>
          <input
            ref="fileInput"
            aria-label="Sélectionner un fichier PDF"
            type="file"
            accept="application/pdf"
            class="hidden"
            @change="handleFileSelect"
          />
        </div>
        <p v-if="fileError" class="text-red-600 text-xs mt-1">{{ fileError }}</p>
      </template>
    </div>

    <div class="form-group--lg">
      <label class="form-label">Matière <span class="text-gray-400 font-normal">(optionnel — contexte pour l'IA)</span></label>
      <input
        aria-label="Matière"
        v-model="subjectContext"
        type="text"
        maxlength="100"
        placeholder="Ex : SVT"
        class="form-input"
      />
    </div>

    <div class="form-group--lg">
      <label class="form-label">Nombre de questions souhaité : {{ questionCount }}</label>
      <input
        aria-label="Nombre de questions souhaité"
        v-model.number="questionCount"
        type="range"
        min="1"
        :max="MAX_QUESTION_COUNT"
        class="w-full accent-primary"
      />
    </div>

    <div class="form-group--lg">
      <label id="ai-question-type-legend" class="form-label">Type de question</label>
      <div class="flex flex-wrap gap-3" role="radiogroup" aria-labelledby="ai-question-type-legend">
        <label class="flex items-center gap-2 text-sm cursor-pointer">
          <input type="radio" name="ai-question-type" value="mixed" v-model="questionType" class="accent-primary" />
          Mixte
        </label>
        <label class="flex items-center gap-2 text-sm cursor-pointer">
          <input type="radio" name="ai-question-type" value="open" v-model="questionType" class="accent-primary" />
          Ouverte
        </label>
        <label class="flex items-center gap-2 text-sm cursor-pointer">
          <input type="radio" name="ai-question-type" value="mcq" v-model="questionType" class="accent-primary" />
          QCM
        </label>
        <label class="flex items-center gap-2 text-sm cursor-pointer">
          <input type="radio" name="ai-question-type" value="fill_blank" v-model="questionType" class="accent-primary" />
          Texte à trous
        </label>
        <label class="flex items-center gap-2 text-sm cursor-pointer">
          <input type="radio" name="ai-question-type" value="reorder" v-model="questionType" class="accent-primary" />
          Remise en ordre
        </label>
      </div>
    </div>

    <template #footer>
      <button type="button" class="btn-modal-cancel" @click="emit('close')">Annuler</button>
      <button type="button" class="btn-modal-submit" :disabled="!canSubmit" @click="submit">
        Générer les questions
      </button>
    </template>
  </ModalComponent>
</template>

<script setup>
import { ref, computed } from 'vue'
import ModalComponent from '@/components/ModalComponent.vue'

// Vue 1 de diagrams/generation_ia_exercices_ui.md (§5) — modal de configuration (source, matière,
// nombre et type de questions). Calqué sur AiGenerateCardsModalComponent.vue (C-01.08), avec 5
// valeurs de `questionType` (contre 3 côté cartes Leitner) et un défaut "mixed" (pas "open" — cohérent
// avec la décision de generation_ia_exercices_types.md §3.2 : un exercice composé uniquement de
// questions "open" serait moins représentatif de ce qu'un enseignant construit à la main).
//
// Import PDF (ajouté après C-02.07, demande utilisateur) : à l'origine (C-02.06), cette modal
// n'offrait que « Coller du texte » — aucun pipeline d'extraction/chunking PDF n'existait côté
// exercices (écart d'audit documenté dans DECISIONS.md à l'époque). Depuis, un pipeline dédié
// (`AiExerciseGenerationPipeline.service.js`, réutilise `PdfExtraction.service.js`/
// `helpers/textChunker.js` tels quels) a été construit — l'option est donc réintroduite, calquée sur
// AiGenerateCardsModalComponent.vue (radio source + drag&drop).
//
// CHOIX : aucune taille maximale codée en dur côté client pour le PDF (contrairement à
// AiGenerateCardsModalComponent.vue#MAX_PDF_SIZE, qui code encore 10 Mo alors que le backend accepte
// désormais MAX_UPLOAD_SIZE_MB, 20 Mo par défaut — incohérence déjà signalée dans
// generation_ia_exercices_ui.md §5.2/§11 au moment de la conception de cette modal).
// RAISON : reproduire une valeur figée aurait perpétué exactement l'écart déjà repéré — un rejet
// client sur un fichier que le serveur accepterait. Le serveur (`aiPdfUpload.middleware.js`, limite
// `MAX_UPLOAD_SIZE_MB`) reste la seule source de vérité ; un fichier trop volumineux est rejeté par
// l'API (400, message affiché tel quel via `AiGenerationProgressModalComponent.vue`, Vue 2) plutôt
// qu'en amont ici. Voir DECISIONS.md.
//
// Le lancement effectif (transition vers la Vue 2) est orchestré par le parent (ExercisesPage.vue) via
// l'événement `submit`, ce composant ne connaît pas le store aiExerciseGeneration.

// Dupliqué de validators/AiExerciseGeneration.validators.js#MAX_QUESTION_COUNT côté back — même choix
// assumé que pour AiGenerateCardsModalComponent.vue#MAX_CARD_COUNT (DECISIONS.md, 2026-09-01).
const MAX_QUESTION_COUNT = 20

const props = defineProps({
  visible: { type: Boolean, required: true },
  defaultSubjectContext: { type: String, default: '' },
})
const emit = defineEmits(['close', 'submit'])

const source = ref('text')
const sourceText = ref('')
const pdfFile = ref(null)
const fileError = ref('')
const dragOver = ref(false)
const fileInput = ref(null)
const subjectContext = ref(props.defaultSubjectContext)
const questionCount = ref(6)
const questionType = ref('mixed')

const canSubmit = computed(() => {
  if (source.value === 'text') return sourceText.value.trim().length > 0
  return Boolean(pdfFile.value) && !fileError.value
})

function formatFileSize(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function validateAndSetFile(file) {
  fileError.value = ''
  if (!file) return
  if (file.type !== 'application/pdf') {
    fileError.value = 'Seuls les fichiers PDF sont acceptés.'
    return
  }
  pdfFile.value = file
}

function handleFileSelect(event) {
  validateAndSetFile(event.target.files?.[0] || null)
}

function handleDrop(event) {
  dragOver.value = false
  validateAndSetFile(event.dataTransfer.files?.[0] || null)
}

function submit() {
  if (!canSubmit.value) return
  emit('submit', {
    sourceText: source.value === 'text' ? sourceText.value.trim() : null,
    pdfFile: source.value === 'pdf' ? pdfFile.value : null,
    subjectContext: subjectContext.value.trim() || null,
    questionCount: questionCount.value,
    questionType: questionType.value,
  })
}

// CHOIX: pas de watcher de reset sur `visible` — même raison que AiGenerateCardsModalComponent.vue :
// les champs doivent survivre à un aller-retour vers la Vue 2 (état de génération) puis un
// [Réessayer]. Le parent (ExercisesPage.vue) monte ce composant via `v-if` pour toute la durée du
// flux IA et seul `visible` bascule entre les deux modales.
</script>
