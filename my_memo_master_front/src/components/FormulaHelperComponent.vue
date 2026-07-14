<template>
  <div class="formula-helper">
    <div class="flex items-start gap-2">
      <div ref="fieldWrap" class="flex-1 min-w-0">
        <slot />
      </div>
      <button
        v-if="!disabled"
        type="button"
        class="shrink-0 mt-1 w-9 h-9 rounded-lg border border-primary/40 bg-white text-primary text-lg font-semibold italic hover:bg-primary/10 transition"
        aria-label="Insérer une formule mathématique"
        title="Insérer une formule"
        @click="openModal"
      >
        ƒ
      </button>
    </div>

    <p v-if="showPreview" class="text-xs text-gray-400 mt-1">
      Aperçu : <FormulaText :text="modelValue" class="text-dark text-sm" />
    </p>

    <Modal
      :visible="modalOpen"
      title="Interpréteur de formules"
      size="lg"
      @close="modalOpen = false"
    >
      <Interpreter v-model="draft" show-apply apply-label="Insérer" @apply="insertFormula" />
    </Modal>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import Modal from '@/components/ModalComponent.vue'
import Interpreter from '@/components/interpreter/Interpreter.vue'
import FormulaText from '@/components/FormulaTextComponent.vue'
import { hasFormula, normalizeFormulaSyntax } from '@/components/interpreter/interpreter.js'

// Assistant de saisie de formules : enveloppe le champ (slot) et pose un bouton
// « ƒ » sur son côté. Le bouton ouvre l'interpréteur (palette + prévisualisation
// KaTeX) dans une modale ; à l'application, la formule — normalisée en syntaxe
// canonique (frac -> over) — est insérée à la position du curseur du champ,
// entourée de $…$ (la convention rendue par FormulaTextComponent). Un aperçu du
// champ s'affiche dès qu'il contient une formule.
const props = defineProps({
  modelValue: { type: String, default: '' },
  // masque le bouton (champ verrouillé pendant une correction, par exemple)
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const fieldWrap = ref(null)
const modalOpen = ref(false)
const draft = ref('')

// position d'insertion capturée à l'ouverture (le focus part vers la modale)
let insertStart = null
let insertEnd = null

const showPreview = computed(() => hasFormula(props.modelValue))

const openModal = () => {
  const field = fieldWrap.value?.querySelector('textarea, input')
  const current = props.modelValue ?? ''
  // On ne fait confiance au curseur que si le champ du slot reflète bien la
  // valeur du v-model ; sinon (champ non synchronisé), on insérera en fin.
  if (field && field.value === current && typeof field.selectionStart === 'number') {
    insertStart = field.selectionStart
    insertEnd = field.selectionEnd
  } else {
    insertStart = current.length
    insertEnd = current.length
  }
  draft.value = ''
  modalOpen.value = true
}

const insertFormula = (content) => {
  const formula = normalizeFormulaSyntax(String(content ?? '').trim())
  if (formula) {
    const current = props.modelValue ?? ''
    const start = Math.min(insertStart ?? current.length, current.length)
    const end = Math.min(insertEnd ?? start, current.length)
    const next = `${current.slice(0, start)}$${formula}$${current.slice(end)}`
    emit('update:modelValue', normalizeFormulaSyntax(next))
  }
  modalOpen.value = false
}
</script>
