<template>
  <ModalComponent :visible="visible" title="Modifier la carte proposée" size="md" @close="emit('close')">
    <form @submit.prevent="submit">
      <div class="form-group">
        <label class="form-label">Énoncé</label>
        <FormulaHelper v-model="form.statement">
          <textarea
            aria-label="Énoncé de la carte"
            v-model="form.statement"
            class="form-input"
            rows="3"
            required
          />
        </FormulaHelper>
      </div>

      <div v-if="form.type === 'open'" class="form-group--lg">
        <label class="form-label">Réponse</label>
        <FormulaHelper v-model="form.answer">
          <textarea
            aria-label="Réponse de la carte"
            v-model="form.answer"
            class="form-input"
            rows="2"
            required
          />
        </FormulaHelper>
      </div>

      <div v-if="form.type === 'open'" class="form-group--lg">
        <label class="form-label">
          Réponses alternatives acceptées <span class="text-gray-400 font-normal">(optionnel)</span>
        </label>
        <div v-for="(alt, ai) in form.acceptedAnswers" :key="ai" class="flex items-center gap-2 mb-2">
          <input
            :aria-label="`Réponse alternative ${ai + 1}`"
            v-model="form.acceptedAnswers[ai]"
            type="text"
            class="form-input flex-1"
          />
          <button
            type="button"
            :aria-label="`Supprimer la réponse alternative ${ai + 1}`"
            @click="form.acceptedAnswers.splice(ai, 1)"
            class="text-gray-400 hover:text-red-500 text-lg leading-none"
          >✕</button>
        </div>
        <button type="button" @click="form.acceptedAnswers.push('')" class="text-sm text-primary hover:underline font-medium">
          + Ajouter une variante
        </button>
      </div>

      <div v-if="form.type === 'mcq'" class="form-group--lg">
        <label id="ai-edit-mcq-legend" class="form-label">Options (sélectionne la bonne réponse)</label>
        <div class="space-y-2" role="radiogroup" aria-labelledby="ai-edit-mcq-legend">
          <div v-for="(opt, oi) in form.options" :key="oi" class="flex items-center gap-2">
            <input
              :aria-label="`Marquer l'option ${oi + 1} comme correcte`"
              type="radio"
              name="ai-edit-mcq-correct"
              :checked="opt.correct"
              @change="setMcqCorrect(oi)"
              class="accent-primary shrink-0"
            />
            <input
              :aria-label="`Texte de l'option ${oi + 1}`"
              v-model="opt.text"
              type="text"
              class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
            <button
              v-if="form.options.length > 2"
              type="button"
              :aria-label="`Supprimer l'option ${oi + 1}`"
              @click="removeOption(oi)"
              class="text-gray-400 hover:text-red-500 text-lg leading-none"
            >✕</button>
          </div>
        </div>
        <button type="button" @click="addOption" class="mt-2 text-sm text-primary hover:underline font-medium">
          + Ajouter une option
        </button>
      </div>

      <!-- Nœud de la carte mentale liée (optionnel, même sélecteur qu'à la création manuelle) -->
      <div v-if="mindMapJson" class="form-group--lg">
        <label class="form-label">
          Nœud de la carte mentale <span class="text-gray-400 font-normal">(optionnel)</span>
        </label>
        <MindMapNodePicker
          v-model="form.mindMapNodeId"
          :mind-map-json="mindMapJson"
        />
      </div>

      <p v-if="formError" class="text-red-600 text-sm mb-4">{{ formError }}</p>
    </form>

    <template #footer>
      <button type="button" class="btn-modal-cancel" @click="emit('close')">Annuler</button>
      <button type="button" class="btn-modal-submit" @click="submit">Enregistrer</button>
    </template>
  </ModalComponent>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import ModalComponent from '@/components/ModalComponent.vue'
import FormulaHelper from '@/components/FormulaHelperComponent.vue'
import MindMapNodePicker from '@/components/MindMapNodePickerComponent.vue'

// Vue 4 de diagrams/generation_ia_ui.md (§7) — édition d'une carte proposée par l'IA avant
// acceptation, à l'écran de révision (C-01.09). CHOIX : composant dédié plutôt que la réutilisation
// littérale de la modal handleCreate/handleUpdate de FlashcardsCardsPage.vue suggérée par la
// maquette — cette dernière persiste directement en base (POST /questions puis /responses puis
// /leitnercards) alors qu'ici on modifie un brouillon (PATCH /ai-generation-batches/cards/:cardId,
// aucune écriture dans Question/Response/LeitnerCard tant que le brouillon n'est pas validé). Un
// second mode de soumission dans le formulaire déjà volumineux de FlashcardsCardsPage.vue aurait
// risqué de régresser la création manuelle ; un composant isolé, visuellement identique, garde les
// deux flux indépendants — voir DECISIONS.md.

const props = defineProps({
  visible: { type: Boolean, required: true },
  card: { type: Object, default: null }, // { statement, type, answer, acceptedAnswers, options, mindMapNodeId }
  // Carte mentale liée au système, pour le sélecteur de nœud — absente (null) si le système n'en a pas.
  mindMapJson: { type: [Object, String], default: null },
})
const emit = defineEmits(['close', 'save'])

const formError = ref('')
const form = reactive({
  statement: '',
  type: 'open',
  answer: '',
  acceptedAnswers: [],
  options: [{ text: '', correct: true }, { text: '', correct: false }],
  mindMapNodeId: null,
})

// Repeuple le formulaire à chaque ouverture avec la carte à éditer — contrairement à
// AiGenerateCardsModalComponent.vue (état à préserver entre Vue 1/Vue 2), ici chaque ouverture cible
// une carte potentiellement différente : repartir des valeurs de `card` à chaque fois est correct.
watch(
  () => [props.visible, props.card],
  ([isVisible, card]) => {
    if (!isVisible || !card) return
    formError.value = ''
    form.statement = card.statement || ''
    form.type = card.type || 'open'
    form.answer = card.answer || ''
    form.acceptedAnswers = Array.isArray(card.acceptedAnswers) ? [...card.acceptedAnswers] : []
    form.options = Array.isArray(card.options) && card.options.length
      ? card.options.map(o => ({ text: o.text, correct: !!o.correct }))
      : [{ text: '', correct: true }, { text: '', correct: false }]
    form.mindMapNodeId = card.mindMapNodeId || null
  },
  { immediate: true },
)

function setMcqCorrect(idx) {
  form.options = form.options.map((o, i) => ({ ...o, correct: i === idx }))
}

function addOption() {
  form.options = [...form.options, { text: '', correct: false }]
}

function removeOption(idx) {
  form.options = form.options.filter((_, i) => i !== idx)
}

function submit() {
  formError.value = ''

  if (!form.statement.trim()) {
    formError.value = 'L\'énoncé est requis.'
    return
  }

  if (form.type === 'mcq') {
    if (form.options.some(o => !o.text.trim())) {
      formError.value = 'Toutes les options doivent avoir un texte.'
      return
    }
    if (!form.options.some(o => o.correct)) {
      formError.value = 'Sélectionne la bonne réponse (radio).'
      return
    }
  } else if (!form.answer.trim()) {
    formError.value = 'La réponse est requise.'
    return
  }

  emit('save', {
    statement: form.statement.trim(),
    type: form.type,
    answer: form.type === 'open' ? form.answer.trim() : null,
    acceptedAnswers: form.type === 'open' ? form.acceptedAnswers.map(a => a.trim()).filter(Boolean) : null,
    options: form.type === 'mcq' ? form.options.map(o => ({ text: o.text.trim(), correct: o.correct })) : null,
    mindMapNodeId: form.mindMapNodeId || null,
  })
}
</script>
