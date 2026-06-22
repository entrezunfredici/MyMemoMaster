<template>
  <div class="bg-neutral-primary-soft block p-6 border border-default rounded-base shadow-xs hover:bg-neutral-secondary-medium hover:shadow-lg transition-all duration-200 flex flex-col h-full">

    <div class="flex items-start justify-between gap-4 mb-4">
      <h5 class="text-2xl font-semibold tracking-tight text-heading leading-8">{{ title }}</h5>
      <div class="flex gap-2 flex-shrink-0">
        <button
          v-if="onEdit"
          @click="onEdit"
          class="hover:bg-gray-100 text-gray-600 font-bold py-1 px-2 rounded transition duration-200 border border-gray-300 hover:scale-110"
          title="Modifier"
        >
          ✎
        </button>
        <button
          v-if="onDelete"
          @click="onDelete"
          class="hover:bg-red-50 text-gray-600 font-bold py-1 px-2 rounded transition duration-200 border border-gray-300 hover:scale-110"
          title="Supprimer"
        >
          ✕
        </button>
      </div>
    </div>

    <div class="mb-4 flex-1">
      <p v-if="description" class="text-body text-sm text-gray-500 mb-3">{{ description }}</p>
      <slot name="stats" />
    </div>

    <button
      @click="onAction"
      class="w-full py-2 px-4 rounded-full border border-gray-300 font-semibold text-heading bg-white hover:bg-gray-50 transition duration-200 mt-2"
    >
      {{ actionLabel }}
    </button>

  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  actionLabel: { type: String, required: true },
  onAction: { type: Function, required: true },
  onEdit: { type: Function, default: null },
  onDelete: { type: Function, default: null },
})
</script>
