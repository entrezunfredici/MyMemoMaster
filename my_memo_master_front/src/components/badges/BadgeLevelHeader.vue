<template>
  <div class="bg-white border-2 border-gray-100 rounded-xl p-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p class="text-sm text-dark/70">Niveau</p>
        <p class="text-2xl font-bold text-primary"><span aria-hidden="true">🎖</span> {{ level.name }}</p>
      </div>
      <div v-if="showTitle">
        <label for="badge-title-select" class="block text-sm text-dark/70">Titre affiché</label>
        <select
          id="badge-title-select"
          class="border-2 border-gray-500 rounded px-2 py-1 bg-white"
          :value="titleCode || ''"
          @change="emit('update:title', $event.target.value || null)"
        >
          <option value="">Aucun titre</option>
          <option v-for="badge in earnedBadges" :key="badge.code" :value="badge.code">{{ badge.label }}</option>
        </select>
      </div>
    </div>
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
  // Titre (C1) : le sélecteur n'apparaît que si `showTitle` (API de profil disponible) et qu'un badge est obtenu
  titleCode: { type: String, default: null },
  earnedBadges: { type: Array, default: () => [] },
  profileAvailable: { type: Boolean, default: false },
})
const emit = defineEmits(['update:title'])

const showTitle = computed(() => props.profileAvailable && props.earnedBadges.length > 0)

const level = computed(() => levelProgress(props.summary))
const nextMin = computed(() => props.summary.level?.next?.min ?? 0)
const message = computed(() => streakMessage(props.summary))

function plural(n) {
  return `${n} jour${n > 1 ? 's' : ''}`
}
</script>
