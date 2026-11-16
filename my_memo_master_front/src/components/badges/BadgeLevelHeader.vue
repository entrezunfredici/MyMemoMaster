<template>
  <div class="bg-white border-2 border-gray-100 rounded-xl p-4">
    <p class="text-sm text-dark/70">Niveau</p>
    <p class="text-2xl font-bold text-primary"><span aria-hidden="true">🎖</span> {{ level.name }}</p>
    <div class="mt-2">
      <BadgeProgress :current="summary.earnedCount ?? 0" :target="nextMin" label="Progression vers le niveau suivant" v-if="!level.isMax" />
      <p class="text-sm text-dark/70 mt-1">{{ level.text }}</p>
    </div>
    <hr class="my-3 border-gray-200" />
    <div class="flex flex-wrap gap-x-8 gap-y-1">
      <p><span aria-hidden="true">🔥</span> Série actuelle : <strong>{{ plural(summary.streakCurrent ?? 0) }}</strong></p>
      <p><span aria-hidden="true">🏆</span> Meilleure série : <strong>{{ plural(summary.streakBest ?? 0) }}</strong></p>
    </div>
    <p v-if="message" class="text-sm text-dark/70 mt-2">{{ message }}</p>
    <p class="text-sm text-dark/70 mt-2">Un jour de grâce protège ta série : 1 jour manqué par semaine ne la casse pas.</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import BadgeProgress from '@/components/badges/BadgeProgress.vue'
import { levelProgress, streakMessage } from '@/helpers/badges'

const props = defineProps({
  summary: { type: Object, required: true },
})

const level = computed(() => levelProgress(props.summary))
const nextMin = computed(() => props.summary.level?.next?.min ?? 0)
const message = computed(() => streakMessage(props.summary))

function plural(n) {
  return `${n} jour${n > 1 ? 's' : ''}`
}
</script>
