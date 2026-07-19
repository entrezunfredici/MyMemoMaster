<template>
  <div class="container mx-auto px-4 py-8">

    <!-- Barre de recherche + bouton créer -->
    <div class="mb-6 flex gap-4 items-center">
      <div class="relative flex-1 max-w-2xl">
        <input aria-label="Rechercher"
          :value="search"
          @input="$emit('update:search', $event.target.value)"
          type="text"
          :placeholder="searchPlaceholder"
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <span class="absolute right-4 top-3.5 text-gray-400">🔍</span>
      </div>
      <button
        @click="$emit('create')"
        class="bg-primary hover:bg-primary/90 text-white font-bold py-3 px-6 rounded-lg transition duration-200 shadow-lg whitespace-nowrap ml-auto"
      >
        {{ createLabel }}
      </button>
    </div>

    <!-- Filtre sujet -->
    <div class="mb-6">
      <div class="flex gap-3 flex-wrap items-center mb-2">
        <label class="text-sm font-semibold text-heading">Filtrer par sujet :</label>
        <button
          v-for="subject in subjects"
          :key="subject.subjectId"
          @click="toggleSubject(subject.subjectId)"
          :class="[
            'px-3 py-1.5 rounded-lg font-semibold transition duration-200 border-2 text-sm',
            selectedSubjectId === subject.subjectId
              ? 'bg-primary text-white border-primary'
              : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
          ]"
        >
          {{ subject.name }}
        </button>
        <button
          v-if="selectedSubjectId"
          @click="$emit('update:selectedSubjectId', null)"
          class="px-3 py-1.5 rounded-lg text-sm font-semibold bg-red-100 text-red-700 border-2 border-red-300 hover:bg-red-200"
        >
          Réinitialiser
        </button>
      </div>
      <p class="text-sm text-gray-600">
        <strong>{{ filteredCount }}</strong>
        {{ itemLabel }}<span v-if="filteredCount !== 1">s</span>
        trouvé<span v-if="filteredCount !== 1">s</span>
      </p>
    </div>

    <!-- Chargement -->
    <div v-if="loading" class="text-center text-gray-light py-10">
      Chargement des {{ itemLabel }}s…
    </div>

    <!-- Grille -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <slot />
    </div>

    <!-- État vide -->
    <p v-if="!loading && filteredCount === 0" class="text-center text-gray-400 py-12">
      {{ emptyMessage }}
    </p>

    <!-- Slot pour les modals (portail du parent) -->
    <slot name="modals" />

  </div>
</template>

<script setup>
const props = defineProps({
  search:           { type: String,  required: true },
  selectedSubjectId:{ type: Number,  default: null },
  subjects:         { type: Array,   default: () => [] },
  loading:          { type: Boolean, default: false },
  filteredCount:    { type: Number,  required: true },
  searchPlaceholder:{ type: String,  default: 'Rechercher…' },
  createLabel:      { type: String,  default: '+ Créer' },
  itemLabel:        { type: String,  default: 'élément' },
  emptyMessage:     { type: String,  default: 'Aucun élément trouvé.' },
})

const emit = defineEmits(['update:search', 'update:selectedSubjectId', 'create'])

function toggleSubject(subjectId) {
  emit('update:selectedSubjectId', props.selectedSubjectId === subjectId ? null : subjectId)
}
</script>
