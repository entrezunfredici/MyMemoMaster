<template>
  <div
    v-dialog="close"
    role="dialog"
    aria-modal="true"
    aria-labelledby="badge-detail-title"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    @mousedown.self="close"
  >
    <div class="modal-panel bg-white rounded-xl shadow-xl w-full max-w-md p-5 relative">
      <button type="button" class="absolute top-3 right-3 text-xl text-gray-700" aria-label="Fermer" @click="close">✕</button>
      <div class="flex items-center gap-3">
        <span class="text-4xl" aria-hidden="true">{{ badge.icon }}</span>
        <div>
          <h2 id="badge-detail-title" class="text-xl font-bold text-primary">{{ badge.label }}</h2>
          <p class="text-sm text-dark/70"><span aria-hidden="true">{{ rarity.shape }}</span> {{ rarity.label }}</p>
        </div>
      </div>
      <p class="mt-3 text-dark">{{ badge.description }}</p>
      <dl class="mt-3 text-sm space-y-1">
        <div v-if="!badge.earned">
          <dt class="font-semibold">Progression</dt>
          <dd>
            <BadgeProgress :current="badge.progress?.current ?? 0" :target="badge.progress?.target ?? 0" :label="`Progression : ${badge.label}`" />
          </dd>
        </div>
        <div v-if="badge.earned && earnedDate">
          <dt class="font-semibold">Obtenu le</dt>
          <dd>{{ earnedDate }}</dd>
        </div>
      </dl>
      <div v-if="badge.earned && profileAvailable" class="mt-4 flex flex-wrap gap-3">
        <button type="button" class="px-3 py-1 rounded border-2 border-primary text-primary" @click="emit('toggle-title', badge)">
          {{ isTitle ? 'Retirer le titre' : 'Choisir comme titre' }}
        </button>
        <button
          type="button"
          class="px-3 py-1 rounded border-2 border-primary text-primary disabled:border-gray-500 disabled:text-gray-700"
          :disabled="!inShowcase && showcaseFull"
          @click="emit('toggle-showcase', badge)"
        >
          {{ inShowcase ? 'Retirer de ma vitrine' : 'Ajouter à ma vitrine' }}
        </button>
        <p v-if="!inShowcase && showcaseFull" class="w-full text-sm text-dark/70">{{ MAX_SHOWCASE }} badges maximum dans la vitrine.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { dialogDirective as vDialog } from '@/directives/dialog'
import BadgeProgress from '@/components/badges/BadgeProgress.vue'
import { MAX_SHOWCASE, formatEarnedDate, rarityMeta } from '@/helpers/badges'

const props = defineProps({
  badge: { type: Object, required: true },
  // Actions titre / vitrine : proposées si l'API de profil est disponible et le badge obtenu
  profileAvailable: { type: Boolean, default: false },
  isTitle: { type: Boolean, default: false },
  inShowcase: { type: Boolean, default: false },
  showcaseFull: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'toggle-title', 'toggle-showcase'])

const rarity = computed(() => rarityMeta(props.badge.rarity))
const earnedDate = computed(() => formatEarnedDate(props.badge.earnedAt))

function close() {
  emit('close')
}
</script>
