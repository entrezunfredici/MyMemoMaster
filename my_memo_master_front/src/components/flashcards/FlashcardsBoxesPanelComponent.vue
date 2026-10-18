<template>
  <!-- Boîtes du système -->
  <div class="mb-8 p-4 bg-white border border-gray-200 rounded-lg">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-bold uppercase text-gray-500">Boîtes du système</h3>
      <button @click="$emit('add')" class="text-sm text-primary hover:underline font-medium">+ Ajouter une boîte</button>
    </div>
    <div class="flex flex-wrap gap-2">
      <div
        v-for="box in boxes"
        :key="box.idBox"
        class="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 text-sm"
      >
        <span
          class="inline-block w-3 h-3 rounded-full border border-black/10"
          :style="{ backgroundColor: boxColorToHex(box.color) }"
          aria-hidden="true"
        ></span>
        <span class="font-semibold text-primary">B{{ box.level }}</span>
        <span class="text-gray-500" :title="`${box.intervall} s`">{{ formatDuration(box.intervall) || `${box.intervall} s` }}</span>
        <button type="button" @click="$emit('edit', box)" class="text-gray-500 hover:text-primary" title="Modifier" :aria-label="`Modifier la boîte B${box.level}`">✎</button>
        <button type="button" @click="$emit('delete', box)" class="text-gray-500 hover:text-red-600" title="Supprimer" :aria-label="`Supprimer la boîte B${box.level}`">✕</button>
      </div>
      <p v-if="boxes.length === 0" class="text-gray-500 text-sm italic">Aucune boîte — ajoutez-en une pour commencer.</p>
    </div>
  </div>
</template>

<script setup>
// Liste des boîtes d'un système de Leitner (niveau, durée, couleur) avec leurs actions.
import { boxColorToHex } from '@/helpers/mindmap/mindmap'
import { formatDuration } from '@/helpers/functions'

defineProps({
  boxes: { type: Array, required: true },
})
defineEmits(['add', 'edit', 'delete'])
</script>
