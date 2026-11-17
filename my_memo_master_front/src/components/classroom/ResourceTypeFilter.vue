<template>
  <div role="group" aria-label="Filtrer par type de ressource" class="flex flex-wrap gap-2">
    <button v-for="opt in options" :key="opt.value" type="button" :aria-pressed="modelValue === opt.value"
      @click="$emit('update:modelValue', opt.value)"
      :class="[
        'rounded-full border px-3 py-1 text-xs transition',
        modelValue === opt.value ? 'border-primary bg-primary text-light' : 'border-gray text-dark/70 hover:border-primary'
      ]">
      {{ opt.label }} ({{ counts[opt.value] ?? 0 }})
    </button>
  </div>
</template>

<script setup>
// Filtre de la bibliothèque de ressources par type (« Tous » + un bouton par type, avec effectif).
import { computed } from 'vue'
import { RESOURCE_TYPES, countResourcesByType, resourceTypeLabel } from '@/helpers/classroomFormat'

const props = defineProps({
  modelValue: { type: String, default: '' },
  resources: { type: Array, default: () => [] },
})
defineEmits(['update:modelValue'])

const counts = computed(() => countResourcesByType(props.resources))
const options = [{ value: '', label: 'Tous' }, ...RESOURCE_TYPES.map((value) => ({ value, label: resourceTypeLabel(value) }))]
</script>
