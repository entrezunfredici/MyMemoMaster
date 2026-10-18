<template>
  <div class="container mx-auto px-4 py-8">

    <!-- Barre de recherche + bouton créer -->
    <!-- CHOIX: recherche et bouton empilés sous sm, côte à côte au-delà ; pr-11 réserve la place de la loupe
         RAISON: sur 360-412 px le bouton prenait la moitié de la ligne et la loupe recouvrait le placeholder -->
    <div class="mb-6 flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
      <div class="relative w-full sm:flex-1 max-w-2xl">
        <input aria-label="Rechercher"
          :value="search"
          @input="$emit('update:search', $event.target.value)"
          type="text"
          :placeholder="searchPlaceholder"
          class="w-full min-w-0 !pl-4 !pr-11 py-3 border border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-ellipsis"
        />
        <span class="absolute right-4 top-3.5 text-gray-500 pointer-events-none" aria-hidden="true">🔍</span>
      </div>
      <button
        @click="$emit('create')"
        class="bg-primary hover:bg-primary/90 text-on-primary font-bold py-3 px-6 rounded-lg transition duration-200 shadow-lg whitespace-nowrap w-full sm:w-auto sm:ml-auto"
      >
        {{ createLabel }}
      </button>
    </div>

    <!-- Filtre sujet -->
    <div class="mb-6">
      <div class="flex gap-3 flex-wrap items-center mb-2" role="group" aria-labelledby="item-list-subject-filter">
        <span id="item-list-subject-filter" class="text-sm font-semibold text-heading">Filtrer par sujet :</span>
        <button
          v-for="subject in subjects"
          :key="subject.subjectId"
          type="button"
          :aria-pressed="selectedSubjectId === subject.subjectId"
          @click="toggleSubject(subject.subjectId)"
          :class="[
            'px-3 py-1.5 rounded-lg font-semibold transition duration-200 border-2 text-sm',
            selectedSubjectId === subject.subjectId
              ? 'bg-primary text-on-primary border-primary'
              : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
          ]"
        >
          {{ subject.name }}
        </button>
        <button
          v-if="selectedSubjectId"
          type="button"
          @click="$emit('update:selectedSubjectId', null)"
          class="px-3 py-1.5 rounded-lg text-sm font-semibold bg-red-100 text-red-700 border-2 border-red-300 hover:bg-red-200"
        >
          Réinitialiser
        </button>
      </div>
      <p class="text-sm text-gray-600">
        <strong>{{ filteredCount }}</strong>
        {{ plural(filteredCount, itemLabel, pluralLabel) }}
        {{ feminine ? plural(filteredCount, 'trouvée', 'trouvées') : plural(filteredCount, 'trouvé', 'trouvés') }}
      </p>
    </div>

    <!-- Chargement -->
    <div v-if="loading" class="text-center text-gray-light py-10">
      Chargement des {{ pluralLabel }}…
    </div>

    <!-- Grille -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <slot />
    </div>

    <!-- État vide -->
    <p v-if="!loading && filteredCount === 0" class="text-center text-gray-500 py-12">
      {{ emptyMessage }}
    </p>

    <!-- Slot pour les modals (portail du parent) -->
    <slot name="modals" />

  </div>
</template>

<script setup>
import { computed } from 'vue'
import { plural } from '@/helpers/plural'

const props = defineProps({
  search:           { type: String,  required: true },
  selectedSubjectId:{ type: Number,  default: null },
  subjects:         { type: Array,   default: () => [] },
  loading:          { type: Boolean, default: false },
  filteredCount:    { type: Number,  required: true },
  searchPlaceholder:{ type: String,  default: 'Rechercher…' },
  createLabel:      { type: String,  default: '+ Créer' },
  itemLabel:        { type: String,  default: 'élément' },
  // Pluriel quand ce n'est pas « singulier + s » (« carte mentale » -> « cartes mentales »)
  itemLabelPlural:  { type: String,  default: '' },
  // Genre féminin : « trouvée(s) » au lieu de « trouvé(s) »
  feminine:         { type: Boolean, default: false },
  emptyMessage:     { type: String,  default: 'Aucun élément trouvé.' },
})

const emit = defineEmits(['update:search', 'update:selectedSubjectId', 'create'])

const pluralLabel = computed(() => props.itemLabelPlural || `${props.itemLabel}s`)

function toggleSubject(subjectId) {
  emit('update:selectedSubjectId', props.selectedSubjectId === subjectId ? null : subjectId)
}
</script>
