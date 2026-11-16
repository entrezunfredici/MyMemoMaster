<template>
  <section class="bg-white border-2 border-gray-100 rounded-xl p-4" aria-labelledby="showcase-title">
    <div class="flex items-baseline justify-between gap-2">
      <h2 id="showcase-title" class="text-xl font-bold text-primary">Ma vitrine</h2>
      <button v-if="!editing && earned.length" type="button" class="underline text-primary" @click="startEdit">Modifier</button>
    </div>

    <template v-if="!editing">
      <ul v-if="shown.length" class="flex flex-wrap gap-3 list-none p-0 mt-3" data-testid="showcase-list">
        <li
          v-for="badge in shown"
          :key="badge.code"
          class="w-32 text-center rounded-xl border-2 p-3"
          :class="rarityMeta(badge.rarity).classes"
        >
          <span class="text-3xl block" aria-hidden="true">{{ badge.icon }}</span>
          <span class="font-semibold text-sm block">{{ badge.label }}</span>
        </li>
      </ul>
      <p v-else-if="earned.length" class="text-dark/70 mt-2">Choisis jusqu'à {{ MAX_SHOWCASE }} badges à mettre en avant.</p>
      <p v-else class="text-dark/70 mt-2">Obtiens ton premier badge pour le mettre en avant ici.</p>
      <button v-if="!shown.length && earned.length" type="button" class="mt-2 underline text-primary" @click="startEdit">Choisir</button>
    </template>

    <form v-else class="mt-3" @submit.prevent="save">
      <fieldset class="border-0 p-0 m-0">
        <legend class="text-sm text-dark/70 mb-2">Badges dans ma vitrine ({{ draft.length }} / {{ MAX_SHOWCASE }})</legend>
        <ul class="list-none p-0 space-y-1">
          <li v-for="badge in earned" :key="badge.code">
            <label class="flex items-center gap-2">
              <input
                type="checkbox"
                :checked="draft.includes(badge.code)"
                :disabled="!draft.includes(badge.code) && draft.length >= MAX_SHOWCASE"
                @change="toggle(badge.code)"
              />
              <span aria-hidden="true">{{ badge.icon }}</span> {{ badge.label }}
            </label>
          </li>
        </ul>
      </fieldset>
      <p v-if="draft.length >= MAX_SHOWCASE" class="text-sm text-dark/70 mt-1">{{ MAX_SHOWCASE }} badges maximum.</p>
      <div class="flex gap-3 mt-3">
        <button type="submit" class="px-4 py-1 rounded bg-primary text-on-primary" :disabled="saving">Enregistrer</button>
        <button type="button" class="underline text-primary" @click="editing = false">Annuler</button>
      </div>
    </form>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { MAX_SHOWCASE, rarityMeta, showcaseBadges, toggleShowcaseCode } from '@/helpers/badges'

const props = defineProps({
  badges: { type: Array, required: true },
  codes: { type: Array, default: () => [] },
  saving: { type: Boolean, default: false },
})
const emit = defineEmits(['save'])

const editing = ref(false)
const draft = ref([])

const earned = computed(() => props.badges.filter((badge) => badge.earned))
const shown = computed(() => showcaseBadges(props.badges, props.codes))

function startEdit() {
  draft.value = shown.value.map((badge) => badge.code)
  editing.value = true
}

function toggle(code) {
  draft.value = toggleShowcaseCode(draft.value, code, MAX_SHOWCASE)
}

function save() {
  emit('save', [...draft.value])
  editing.value = false
}
</script>
