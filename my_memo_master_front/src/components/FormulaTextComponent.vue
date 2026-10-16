<template>
  <span class="formula-text" v-html="html" />
</template>

<script setup>
import { computed } from 'vue'
import { renderInlineMath } from '@/components/interpreter/interpreter.js'

// Affiche un texte pouvant contenir des formules délimitées $…$ (rendu KaTeX inline).
// Le texte hors formules est échappé par renderInlineMath — pas d'injection possible.
const props = defineProps({
  text: { type: String, default: '' },
})

const html = computed(() => renderInlineMath(props.text))
</script>

<style scoped>
.formula-text :deep(.katex) {
  font-size: 1em;
}
</style>
