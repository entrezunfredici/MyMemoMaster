<template>
  <div class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-4">
    <h2 class="text-lg font-semibold text-dark">Modération du contenu</h2>
    <div v-if="!etabStore.content" class="text-sm text-dark/60">Chargement...</div>
    <template v-else>
      <div class="space-y-2">
        <p class="text-sm font-semibold text-dark">Ressources ({{ etabStore.content.resources?.length ?? 0 }})</p>
        <div v-if="!etabStore.content.resources?.length" class="text-xs text-dark/50">Aucune ressource.</div>
        <div v-for="r in etabStore.content.resources" :key="r.id"
          class="rounded-lg border border-gray/50 px-3 py-2 text-xs flex items-center justify-between gap-2">
          <div class="min-w-0">
            <p class="font-medium text-dark truncate">{{ r.title }}</p>
            <p class="text-dark/50">{{ r.classGroup?.name }} · {{ r.type }} · {{ r.creator?.name }}</p>
          </div>
          <button @click="confirmDeleteContent('resource', r.id, r.title)"
            class="shrink-0 rounded-lg bg-secondary/10 px-2 py-1 text-secondary hover:bg-secondary/20 transition">
            Supprimer
          </button>
        </div>
      </div>
      <div class="space-y-2">
        <p class="text-sm font-semibold text-dark">Sections ({{ etabStore.content.sections?.length ?? 0 }})</p>
        <div v-if="!etabStore.content.sections?.length" class="text-xs text-dark/50">Aucune section.</div>
        <div v-for="s in etabStore.content.sections" :key="s.id"
          class="rounded-lg border border-gray/50 px-3 py-2 text-xs flex items-center justify-between gap-2">
          <div class="min-w-0">
            <p class="font-medium text-dark truncate">{{ s.title }}</p>
            <p class="text-dark/50">{{ s.classGroup?.name }} · {{ s.type }} · {{ s.creator?.name }}</p>
          </div>
          <button @click="confirmDeleteContent('section', s.id, s.title)"
            class="shrink-0 rounded-lg bg-secondary/10 px-2 py-1 text-secondary hover:bg-secondary/20 transition">
            Supprimer
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
// Onglet « Contenu » : modération des ressources et sections de l'établissement. Extrait de pages/ClassroomEtablissementView.vue.
import { useEtablissementStore } from '@/stores/etablissement'
import { useConfirmAction } from '@/composables/useConfirmAction'

const props = defineProps({
  etabId: { type: Number, default: null },
})

const etabStore = useEtablissementStore()
const askConfirm = useConfirmAction()

function confirmDeleteContent(type, id, title) {
  askConfirm(
    'Supprimer le contenu',
    `Supprimer « ${title} » ? Cette action est irréversible.`,
    () => etabStore.deleteContent(props.etabId, type, id),
  )
}
</script>
