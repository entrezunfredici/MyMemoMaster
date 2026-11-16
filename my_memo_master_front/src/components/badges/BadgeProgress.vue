<template>
  <div class="flex items-center gap-2">
    <progress
      class="badge-progress"
      :value="current"
      :max="target || 1"
      :aria-label="label"
    />
    <span class="text-xs text-dark/70 whitespace-nowrap">{{ current }} / {{ target }}</span>
  </div>
</template>

<script setup>
defineProps({
  current: { type: Number, default: 0 },
  target: { type: Number, default: 0 },
  label: { type: String, default: 'Progression' },
})
</script>

<style scoped>
.badge-progress {
  width: 100%;
  height: 0.5rem;
  border-radius: 9999px;
  overflow: hidden;
  appearance: none;
  background: var(--gray-200);
}
.badge-progress::-webkit-progress-bar {
  background: var(--gray-200);
}
.badge-progress::-webkit-progress-value {
  background: rgb(var(--primary));
  transition: width 200ms;
}
.badge-progress::-moz-progress-bar {
  background: rgb(var(--primary));
}
@media (prefers-reduced-motion: reduce) {
  .badge-progress::-webkit-progress-value {
    transition: none;
  }
}
</style>
