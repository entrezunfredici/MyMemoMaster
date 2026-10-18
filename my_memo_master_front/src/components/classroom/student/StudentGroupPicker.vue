<template>
  <div class="flex gap-3 overflow-x-auto pb-1">
    <div
      v-for="g in groups" :key="g.id"
      role="button"
      tabindex="0"
      :aria-pressed="selectedId === g.id"
      @click="emit('select', g.id)"
      @keydown.enter.prevent="emit('select', g.id)"
      @keydown.space.prevent="emit('select', g.id)"
      :class="[selectedId === g.id ? 'border-primary bg-light/70' : 'border-gray', 'min-w-[200px] cursor-pointer rounded-xl border-2 p-3 shadow-sm transition hover:-translate-y-0.5']">
      <p class="text-xs text-dark/60 uppercase tracking-wide">{{ g.level }}</p>
      <p class="text-lg font-semibold text-primary">{{ g.name }}</p>
      <p class="text-xs text-dark/60">{{ g.code }}</p>
    </div>
    <p v-if="groups.length === 0" class="text-sm text-dark/60">Aucun groupe.</p>
  </div>
</template>

<script setup>
// Choix du groupe classe (une carte par groupe). Extrait de pages/ClassroomEtudiantView.vue.

defineProps({
  groups: { type: Array, required: true },
  selectedId: { type: [Number, String], default: null },
})
const emit = defineEmits(['select'])
</script>
