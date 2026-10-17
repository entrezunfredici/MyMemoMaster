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
      <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div v-for="field in createFields" :key="field.key" class="flex flex-col gap-1">
          <label :for="`create-group-${field.key}`" class="text-sm font-medium text-dark">{{ field.label }}</label>
          <input :id="`create-group-${field.key}`" v-model="createGroupForm[field.key]" type="text"
            :placeholder="field.hint" :aria-required="field.required ? 'true' : undefined"
            class="rounded-lg border-2 border-gray-500 px-3 py-2 text-sm" />
        </div>
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
      <!-- Carte = bouton de sélection + bouton de suppression FRÈRES (jamais imbriqués : RGAA 7.1 / 8.2) -->
      <div v-for="g in groups" :key="g.id"
        :class="[selectedId === g.id ? 'border-primary bg-light/70' : 'border-gray', 'relative min-w-[220px] rounded-xl border-2 shadow-sm transition hover:-translate-y-0.5']">
        <button type="button" :aria-pressed="selectedId === g.id" @click="emit('select', g.id)"
          class="block w-full rounded-xl p-3 pr-10 text-left">
          <span class="block text-xs text-dark/60 uppercase tracking-wide">{{ g.level }}</span>
          <span class="block text-lg font-semibold text-primary">{{ g.name }}</span>
          <span class="block text-xs text-dark/60">{{ g.code }}</span>
          <span class="mt-2 block text-xs text-dark/60">{{ g.members?.length ?? 0 }} {{ plural(g.members?.length ?? 0, 'membre') }}</span>
        </button>
        <button type="button" :aria-label="`Supprimer le groupe ${g.name}`" @click="confirmDeleteGroup(g)"
          class="absolute right-2 top-2 text-secondary hover:text-secondary/70 text-lg leading-none">×</button>
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
import { useConfirmAction } from '@/composables/useConfirmAction'

defineProps({
  groups: { type: Array, required: true },
  selectedId: { type: [Number, String], default: null },
})
const emit = defineEmits(['select', 'deleted'])

const classGroupStore = useClassGroupStore()
const askConfirm = useConfirmAction()
const showCreateGroup = ref(false)
// Champs du formulaire : libellé visible (RGAA 11.1/11.4), exemple en indication
const createFields = [
  { key: 'name', label: 'Nom *', hint: '', required: true },
  { key: 'code', label: 'Code', hint: 'ex : MP2I-A' },
  { key: 'level', label: 'Niveau', hint: 'ex : Prépa' },
  { key: 'description', label: 'Description', hint: '' },
]
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

function confirmDeleteGroup(g) {
  askConfirm(
    'Supprimer le groupe',
    `Supprimer le groupe « ${g.name} » ? Cette action est irréversible.`,
    async () => {
      const ok = await classGroupStore.deleteGroup(g.id)
      if (ok) emit('deleted', g.id)
    },
  )
}
</script>
