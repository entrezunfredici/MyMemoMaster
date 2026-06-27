<template>
  <div
    v-if="visible"
    class="modal-overlay"
    role="dialog"
    aria-modal="true"
    @click="emit('close')"
  >
    <div
      :class="['modal-panel', sizeClass]"
      @click.stop
    >
      <button class="modal-close" @click="emit('close')">&times;</button>
      <h2 v-if="title" class="modal-title">{{ title }}</h2>
      <slot />
      <div v-if="$slots.footer" class="btn-row" style="margin-top: 1.5rem">
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  visible: { type: Boolean, required: true },
  title:   { type: String,  default: '' },
  // 'sm' (24rem) | 'md' par défaut (28rem) | 'lg' (42rem, scrollable)
  size:    { type: String,  default: 'md' },
})

const emit = defineEmits(['close'])

const sizeClass = computed(() => ({
  sm: 'modal-panel--sm',
  lg: 'modal-panel--lg',
}[props.size] ?? ''))

function handleKeydown(e) {
  if (e.key === 'Escape' && props.visible) emit('close')
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>
