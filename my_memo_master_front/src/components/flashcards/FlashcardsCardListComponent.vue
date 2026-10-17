<template>
  <div v-if="empty" class="text-center text-gray-light py-10">
    Aucune carte dans ce système. Ajoutez-en une !
  </div>

  <div v-for="level in [1, 2, 3, 4, 5]" :key="level" class="mb-6">
    <div v-if="cardsByLevel[level]?.length">
      <h3 class="text-sm font-bold uppercase text-gray-500 mb-2">Boîte {{ level }}</h3>
      <div class="flex flex-col gap-2">
        <div
          v-for="card in cardsByLevel[level]"
          :key="card.idCard"
          class="flex items-start justify-between bg-white border border-gray-200 rounded-lg p-4 shadow-xs"
        >
          <div class="flex-1 min-w-0 pr-4">
            <p class="font-semibold text-heading"><FormulaText :text="card.question?.statement || ''" /></p>
            <p class="text-sm text-gray-500 mt-1 italic"><FormulaText :text="card.correctAnswer || '…'" /></p>
          </div>
          <div class="flex gap-2 flex-shrink-0">
            <button
              @click="$emit('edit', card)"
              class="hover:bg-gray-100 text-gray-600 py-1 px-2 rounded border border-gray-300 transition"
              title="Modifier"
            >✎</button>
            <button
              @click="$emit('delete', card)"
              class="hover:bg-red-50 text-gray-600 py-1 px-2 rounded border border-gray-300 transition"
              title="Supprimer"
            >✕</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Cartes d'un système, regroupées par boîte (niveaux 1 à 5), avec leurs actions modifier / supprimer.
import FormulaText from '@/components/FormulaTextComponent.vue'

defineProps({
  // { [niveau]: carte[] }
  cardsByLevel: { type: Object, required: true },
  // true si le système n'a aucune carte (message d'invitation)
  empty: { type: Boolean, default: false },
})
defineEmits(['edit', 'delete'])
</script>
