<template>
  <button
    type="button"
    :class="[
      'w-full h-full text-left rounded-xl border-2 p-3 flex flex-col gap-1 bg-white',
      badge.earned ? rarity.classes : 'bg-gray-100 border-gray-300 text-gray-700',
    ]"
    :aria-label="ariaLabel"
    @click="$emit('select', badge)"
  >
    <span class="flex items-start justify-between gap-2">
      <span class="text-2xl" :class="{ 'opacity-60': !badge.earned }" aria-hidden="true">{{ badge.icon }}</span>
      <span v-if="isNew" class="text-xs font-semibold bg-primary text-on-primary rounded-full px-2 py-0.5">Nouveau</span>
    </span>
    <span class="font-semibold text-sm text-dark">{{ badge.label }}</span>
    <span class="text-xs text-dark/70">{{ badge.description }}</span>
    <span v-if="badge.earned" class="text-xs text-dark/70 mt-auto pt-1">
      ✔ Obtenu<template v-if="earnedDate"> le {{ earnedDate }}</template>
    </span>
    <BadgeProgress
      v-else
      class="mt-auto pt-1"
      :current="badge.progress?.current ?? 0"
      :target="badge.progress?.target ?? 0"
      :label="`Progression : ${badge.label}`"
    />
    <span class="text-xs text-dark/70"><span aria-hidden="true">{{ rarity.shape }}</span> {{ rarity.label }}</span>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import BadgeProgress from '@/components/badges/BadgeProgress.vue'
import { badgeAriaLabel, formatEarnedDate, rarityMeta } from '@/helpers/badges'

const props = defineProps({
  badge: { type: Object, required: true },
  isNew: { type: Boolean, default: false },
})
defineEmits(['select'])

const rarity = computed(() => rarityMeta(props.badge.rarity))
const earnedDate = computed(() => formatEarnedDate(props.badge.earnedAt))
const ariaLabel = computed(() => badgeAriaLabel(props.badge) + (props.isNew ? ', nouveau' : ''))
</script>
