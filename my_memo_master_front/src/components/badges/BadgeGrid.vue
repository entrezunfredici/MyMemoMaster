<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div role="group" aria-label="Filtrer par état" class="flex gap-2">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          type="button"
          :aria-pressed="status === tab.value"
          :class="[
            'px-3 py-1 rounded-full border-2 text-sm font-medium',
            status === tab.value ? 'bg-primary text-on-primary border-primary' : 'bg-white text-gray-700 border-gray-500',
          ]"
          @click="status = tab.value"
        >
          {{ tab.label }} ({{ tab.count }})
        </button>
      </div>
      <div class="flex items-center gap-2">
        <label for="badge-category" class="text-sm text-dark/70">Catégorie</label>
        <select id="badge-category" v-model="category" class="border-2 border-gray-500 rounded-md bg-white px-2 py-1 text-sm">
          <option value="all">Toutes</option>
          <option v-for="group in allGroups" :key="group.category" :value="group.category">{{ group.label }}</option>
        </select>
      </div>
    </div>

    <div v-if="groups.length === 0" class="text-center py-8">
      <p class="text-dark/70">Aucun badge ne correspond à ce filtre.</p>
      <button type="button" class="mt-2 underline text-primary" @click="reset">Réinitialiser les filtres</button>
    </div>

    <section v-for="group in groups" :key="group.category" class="mb-6">
      <h3 class="text-lg font-semibold text-primary mb-2">{{ group.label }}</h3>
      <ul class="grid gap-3 list-none p-0" style="grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr))">
        <li v-for="badge in group.badges" :key="badge.code">
          <BadgeCard :badge="badge" :is-new="newCodes.includes(badge.code)" @select="$emit('select', $event)" />
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import BadgeCard from '@/components/badges/BadgeCard.vue'
import { filterBadges, groupByCategory } from '@/helpers/badges'

const props = defineProps({
  badges: { type: Array, default: () => [] },
  newCodes: { type: Array, default: () => [] },
})
defineEmits(['select'])

const status = ref('all')
const category = ref('all')

const allGroups = computed(() => groupByCategory(props.badges))
const groups = computed(() => groupByCategory(filterBadges(props.badges, { status: status.value, category: category.value })))
const tabs = computed(() => [
  { value: 'all', label: 'Tous', count: props.badges.length },
  { value: 'earned', label: 'Obtenus', count: props.badges.filter((b) => b.earned).length },
  { value: 'locked', label: 'En cours', count: props.badges.filter((b) => !b.earned).length },
])

function reset() {
  status.value = 'all'
  category.value = 'all'
}
</script>
