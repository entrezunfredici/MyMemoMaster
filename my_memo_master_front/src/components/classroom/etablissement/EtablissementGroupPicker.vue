<template>
  <section class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-dark">Groupes classes</h2>
      <button @click="showCreateGroup = !showCreateGroup"
        class="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-light hover:bg-primary/90 transition">
        + Nouvelle classe
      </button>
    </div>

    <!-- Formulaire création groupe -->
    <div v-if="showCreateGroup" class="rounded-xl border border-primary/40 bg-primary/5 p-4 space-y-3">
      <h3 class="text-sm font-semibold text-primary">Nouvelle classe</h3>
      <div class="grid grid-cols-1 gap-2 md:grid-cols-2">
        <input aria-label="Nom" v-model="createGroupForm.name" type="text" placeholder="Nom *"
          class="rounded-lg border-2 border-gray-500 px-3 py-2 text-sm" />
        <input aria-label="Code (ex: MP2I-A)" v-model="createGroupForm.code" type="text" placeholder="Code (ex: MP2I-A)"
          class="rounded-lg border-2 border-gray-500 px-3 py-2 text-sm" />
        <input aria-label="Niveau (ex: Prépa)" v-model="createGroupForm.level" type="text" placeholder="Niveau (ex: Prépa)"
          class="rounded-lg border-2 border-gray-500 px-3 py-2 text-sm" />
        <input aria-label="Description" v-model="createGroupForm.description" type="text" placeholder="Description"
          class="rounded-lg border-2 border-gray-500 px-3 py-2 text-sm" />
      </div>
      <div class="flex gap-2">
        <button @click="submitCreateGroup"
          class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-light hover:bg-primary/90 transition">Créer</button>
        <button @click="showCreateGroup = false"
          class="rounded-lg border border-gray px-4 py-2 text-sm hover:bg-light transition">Annuler</button>
      </div>
      <p v-if="createGroupForm.error" class="text-xs text-secondary">{{ createGroupForm.error }}</p>
    </div>

    <!-- Liste des groupes -->
    <div class="flex gap-3 overflow-x-auto pb-1">
      <div v-for="g in groups" :key="g.id"
        role="button"
        tabindex="0"
        @click="emit('select', g.id)"
        @keydown.enter.prevent="emit('select', g.id)"
        @keydown.space.prevent="emit('select', g.id)"
        :class="[selectedId === g.id ? 'border-primary bg-light/70' : 'border-gray', 'min-w-[220px] cursor-pointer rounded-xl border-2 p-3 shadow-sm transition hover:-translate-y-0.5']">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-xs text-dark/60 uppercase tracking-wide">{{ g.level }}</p>
            <p class="text-lg font-semibold text-primary">{{ g.name }}</p>
            <p class="text-xs text-dark/60">{{ g.code }}</p>
          </div>
          <button aria-label="Supprimer le groupe" @click.stop="confirmDeleteGroup(g)" class="text-secondary hover:text-secondary/70 text-lg leading-none">×</button>
        </div>
        <p class="mt-2 text-xs text-dark/60">{{ g.members?.length ?? 0 }} {{ plural(g.members?.length ?? 0, 'membre') }}</p>
      </div>
      <p v-if="groups.length === 0" class="text-sm text-dark/60">Aucun groupe. Créez-en un.</p>
    </div>
  </section>
</template>

<script setup>
// Bandeau des groupes classes : liste (sélection), création et suppression.
// Extrait de pages/ClassroomEtablissementView.vue ; la page décide de la sélection après une suppression.
import { plural } from '@/helpers/plural'
import { ref, reactive } from 'vue'
import { useClassGroupStore } from '@/stores/classGroups'

defineProps({
  groups: { type: Array, required: true },
  selectedId: { type: [Number, String], default: null },
})
const emit = defineEmits(['select', 'deleted'])

const classGroupStore = useClassGroupStore()
const showCreateGroup = ref(false)
const createGroupForm = reactive({ name: '', code: '', level: '', description: '', error: '' })

async function submitCreateGroup() {
  createGroupForm.error = ''
  if (!createGroupForm.name.trim()) { createGroupForm.error = 'Le nom est requis.'; return }
  const created = await classGroupStore.createGroup({
    name: createGroupForm.name.trim(),
    code: createGroupForm.code.trim() || null,
    level: createGroupForm.level.trim() || null,
    description: createGroupForm.description.trim() || null,
  })
  if (created) {
    showCreateGroup.value = false
    Object.assign(createGroupForm, { name: '', code: '', level: '', description: '', error: '' })
  }
}

async function confirmDeleteGroup(g) {
  if (!confirm(`Supprimer le groupe "${g.name}" ? Cette action est irréversible.`)) return
  const ok = await classGroupStore.deleteGroup(g.id)
  if (ok) emit('deleted', g.id)
}
</script>
