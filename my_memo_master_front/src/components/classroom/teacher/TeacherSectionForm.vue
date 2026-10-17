<template>
  <div class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-3">
    <h3 class="text-base font-semibold text-dark">Créer une section / un rendu</h3>
    <input aria-label="Titre" v-model="sectionForm.title" type="text" placeholder="Titre *"
      class="w-full rounded-lg border-2 border-gray-500 px-3 py-2 text-sm" />
    <div class="flex gap-2">
      <button @click="sectionForm.type = 'section'"
        :class="[sectionForm.type === 'section' ? 'bg-primary text-light' : 'bg-light text-primary border-2 border-gray', 'rounded-lg px-3 py-2 text-sm flex-1']">Section</button>
      <button @click="sectionForm.type = 'rendu'"
        :class="[sectionForm.type === 'rendu' ? 'bg-secondary text-light' : 'bg-light text-secondary border-2 border-gray', 'rounded-lg px-3 py-2 text-sm flex-1']">Rendu</button>
    </div>
    <input aria-label="Description" v-model="sectionForm.description" type="text" placeholder="Description"
      class="w-full rounded-lg border-2 border-gray-500 px-3 py-2 text-sm" />
    <input aria-label="Date limite" v-model="sectionForm.dueDate" type="date" class="w-full rounded-lg border-2 border-gray-500 px-3 py-2 text-sm" />
    <button @click="submitSection"
      class="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-light hover:bg-primary/90 transition">
      Créer
    </button>
    <p v-if="sectionForm.error" class="text-xs text-secondary">{{ sectionForm.error }}</p>
  </div>
</template>

<script setup>
// Formulaire de création d'une section ou d'un rendu. Extrait de pages/ClassroomEnseignantView.vue.
import { reactive } from 'vue'
import { useClassGroupSectionStore } from '@/stores/classGroupSections'

const props = defineProps({ groupId: { type: Number, required: true } })

const sectionStore = useClassGroupSectionStore()
const sectionForm = reactive({ title: '', type: 'section', description: '', dueDate: '', error: '' })

async function submitSection() {
  sectionForm.error = ''
  if (!sectionForm.title.trim()) { sectionForm.error = 'Le titre est requis.'; return }
  const ok = await sectionStore.create(props.groupId, {
    title: sectionForm.title.trim(),
    type: sectionForm.type,
    description: sectionForm.description.trim() || null,
    dueDate: sectionForm.dueDate || null,
  })
  if (ok) Object.assign(sectionForm, { title: '', description: '', dueDate: '', error: '' })
}
</script>
