<template>
  <!--
    CHOIX: fermeture sur @mousedown.self plutôt que @click(.stop sur le panneau).
    RAISON: avec @click, sélectionner du texte dans le panneau puis relâcher le bouton
    en dehors (overlay) fermait la modale au relâchement — le clic "démarre" dans le
    panneau mais son ancêtre commun avec le point de relâchement est l'overlay, qui
    recevait alors le click. @mousedown.self ne se déclenche que si l'appui a lieu
    directement sur l'overlay, dès l'appui plutôt qu'au relâchement.
  -->
  <div
    v-if="visible"
    class="modal-overlay"
    role="dialog"
    aria-modal="true"
    :aria-label="title || 'Fenêtre de dialogue'"
    @mousedown.self="emit('close')"
  >
    <div
      ref="panel"
      :class="['modal-panel', sizeClass]"
      tabindex="-1"
      @keydown.tab="trapFocus"
    >
      <button class="modal-close" aria-label="Fermer" @click="emit('close')">&times;</button>
      <h2 v-if="title" class="modal-title">{{ title }}</h2>
      <slot />
      <div v-if="$slots.footer" class="btn-row" style="margin-top: 1.5rem">
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  visible: { type: Boolean, required: true },
  title:   { type: String,  default: '' },
  // 'sm' (24rem) | 'md' par défaut (28rem) | 'lg' (42rem) — les trois sont scrollables (max-height: 90vh)
  size:    { type: String,  default: 'md' },
})

const emit = defineEmits(['close'])

const panel = ref(null)

const sizeClass = computed(() => ({
  sm: 'modal-panel--sm',
  lg: 'modal-panel--lg',
}[props.size] ?? ''))

function handleKeydown(e) {
  if (e.key === 'Escape' && props.visible) emit('close')
}

// ── Gestion du focus (accessibilité — RGAA 7.x : pas de piège, pas de fuite) ──
// À l'ouverture : focus déplacé dans le panneau ; à la fermeture : restitué à
// l'élément qui l'avait avant — un utilisateur clavier ne "perd" jamais sa position.
let previouslyFocused = null

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

watch(
  () => props.visible,
  async (isVisible) => {
    if (isVisible) {
      previouslyFocused = document.activeElement
      await nextTick()
      panel.value?.focus()
    } else if (previouslyFocused instanceof HTMLElement) {
      previouslyFocused.focus()
      previouslyFocused = null
    }
  },
  { immediate: true },
)

// Tab et Shift+Tab bouclent à l'intérieur du panneau tant que la modale est ouverte
function trapFocus(e) {
  const focusables = panel.value?.querySelectorAll(FOCUSABLE_SELECTOR)
  if (!focusables?.length) return

  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  const active = document.activeElement

  if (e.shiftKey && (active === first || active === panel.value)) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && active === last) {
    e.preventDefault()
    first.focus()
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>
