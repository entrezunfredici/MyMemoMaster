<template>
  <ModalComponent :visible="visible" title="Générer des cartes par IA" size="lg" @close="emit('close')">
    <div class="form-group--lg">
      <label class="form-label">Source du contenu</label>
      <div class="flex gap-4 mb-3">
        <label class="flex items-center gap-2 text-sm cursor-pointer">
          <input type="radio" name="ai-source" value="text" v-model="source" class="accent-primary" />
          Coller du texte
        </label>
        <label class="flex items-center gap-2 text-sm cursor-pointer">
          <input type="radio" name="ai-source" value="pdf" v-model="source" class="accent-primary" />
          Importer un PDF
        </label>
      </div>

      <template v-if="source === 'text'">
        <textarea
          aria-label="Texte source pour la génération de cartes"
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
      <label class="form-label">Nombre de cartes souhaité : {{ cardCount }}</label>
      <input
        aria-label="Nombre de cartes souhaité"
        v-model.number="cardCount"
        type="range"
        min="1"
        :max="MAX_CARD_COUNT"
        class="w-full accent-primary"
      />
    </div>

    <div class="form-group--lg">
      <label id="ai-card-type-legend" class="form-label">Type de cartes</label>
      <div class="flex gap-3" role="radiogroup" aria-labelledby="ai-card-type-legend">
        <label class="flex items-center gap-2 text-sm cursor-pointer">
          <input type="radio" name="ai-card-type" value="open" v-model="cardType" class="accent-primary" />
          Question ouverte
        </label>
        <label class="flex items-center gap-2 text-sm cursor-pointer">
          <input type="radio" name="ai-card-type" value="mcq" v-model="cardType" class="accent-primary" />
          QCM
        </label>
        <label class="flex items-center gap-2 text-sm cursor-pointer">
          <input type="radio" name="ai-card-type" value="mixed" v-model="cardType" class="accent-primary" />
          Les deux (mixte)
        </label>
      </div>
    </div>

    <div v-if="quota" class="text-xs text-gray-500 border-t border-gray-200 pt-3 mb-2">
      Quota restant aujourd'hui : {{ quota.remainingGenerationsToday }} / {{ quota.maxGenerationsPerDay }} générations
    </div>

    <template #footer>
      <button type="button" class="btn-modal-cancel" @click="emit('close')">Annuler</button>
      <button type="button" class="btn-modal-submit" :disabled="!canSubmit" @click="submit">
        Générer les cartes
      </button>
    </template>
  </ModalComponent>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import ModalComponent from '@/components/ModalComponent.vue'
import { useAiCardGenerationStore } from '@/stores/aiCardGeneration'

// Vue 1 de diagrams/generation_ia_ui.md (§4) — modal de configuration (source, matière, nombre et
// type de cartes). Le lancement effectif (transition vers la Vue 2 — état de génération) est
// orchestré par le parent (FlashcardsCardsPage.vue) via l'événement `submit`, ce composant ne
// connaît pas le store aiCardGeneration au-delà du quota (affichage) et de MAX_CARD_COUNT.

// Dupliqué de validators/AiGenerationBatch.validators.js#MAX_CARD_COUNT côté back — même choix
// assumé que documenté dans DECISIONS.md (2026-09-01) pour les autres plafonds dupliqués front/back.
const MAX_CARD_COUNT = 20

const props = defineProps({
  visible: { type: Boolean, required: true },
  idSystem: { type: Number, required: true },
  defaultSubjectContext: { type: String, default: '' },
})
const emit = defineEmits(['close', 'submit'])

const aiCardGenerationStore = useAiCardGenerationStore()
const quota = computed(() => aiCardGenerationStore.quota)

const source = ref('text')
const sourceText = ref('')
const pdfFile = ref(null)
const fileError = ref('')
const dragOver = ref(false)
const fileInput = ref(null)
const subjectContext = ref(props.defaultSubjectContext)
const cardCount = ref(8)
const cardType = ref('open')

const MAX_PDF_SIZE = 10 * 1024 * 1024 // 10 Mo — même plafond que aiPdfUpload.middleware.js

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
  if (file.size > MAX_PDF_SIZE) {
    fileError.value = 'Le fichier dépasse la taille maximale autorisée (10 Mo).'
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
    idSystem: props.idSystem,
    sourceText: source.value === 'text' ? sourceText.value.trim() : null,
    pdfFile: source.value === 'pdf' ? pdfFile.value : null,
    subjectContext: subjectContext.value.trim() || null,
    cardCount: cardCount.value,
    cardType: cardType.value,
  })
}

// CHOIX: pas de watcher de reset sur `visible` — les champs doivent survivre à un aller-retour
// vers la Vue 2 (état de génération) puis un [Réessayer] (§5/§10 de la maquette : "retour Vue 1,
// champs conservés"). Le parent (FlashcardsCardsPage.vue) monte ce composant via `v-if` pour toute
// la durée du flux IA (config → génération → erreur éventuelle) et seul `visible` bascule entre les
// deux modales : tant que l'instance n'est pas détruite, son état local (refs ci-dessus) persiste
// naturellement. Une réouverture après fermeture complète du flux recrée l'instance (nouvel état
// par défaut), sans code de réinitialisation dédié.
onMounted(() => {
  aiCardGenerationStore.fetchQuota()
})
</script>
