<template>
  <div class="relative">
    <input aria-label="Rechercher une section, un rendu, une ressource"
      v-model="search"
      type="text"
      placeholder="Rechercher une section, un rendu, une ressource..."
      class="w-full rounded-xl border-2 border-gray-500 px-4 py-3 !pr-10 text-sm focus:border-primary focus:outline-none transition" />
    <button aria-label="Effacer la recherche" v-if="search" @click="search = ''"
      class="absolute right-3 top-1/2 -translate-y-1/2 text-dark/40 hover:text-dark">✕</button>
  </div>
</template>

<script setup>
// Recherche dans les sections, rendus et ressources du groupe (v-model). Extrait de pages/ClassroomEtudiantView.vue.

const search = defineModel({ type: String, default: '' })
</script>
