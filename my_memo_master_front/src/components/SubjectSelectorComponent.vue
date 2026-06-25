<template>
  <div>
    <select
      v-model="selected"
      class="form-input"
      :required="required"
    >
      <option v-if="required" value="">Sélectionner un sujet</option>
      <option v-else :value="null">— Sans sujet —</option>
      <option
        v-for="s in subjectStore.subjects"
        :key="s.subjectId"
        :value="s.subjectId"
      >
        {{ s.name }}
      </option>
    </select>

    <div v-if="!showForm" class="mt-2">
      <button type="button" @click="openForm" class="subject-create-link">
        + Créer un nouveau sujet
      </button>
    </div>
    <div v-else class="subject-inline-form">
      <input
        ref="nameInputRef"
        v-model="newName"
        type="text"
        placeholder="Nom du sujet (ex : Physique)"
        class="subject-inline-input"
        @keydown.enter.prevent="create"
      />
      <button
        type="button"
        :disabled="creating || !newName.trim()"
        @click="create"
        class="subject-inline-btn"
      >
        {{ creating ? '...' : 'Créer' }}
      </button>
      <button type="button" @click="cancel" class="subject-inline-cancel">
        Annuler
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useSubjectStore } from '@/stores/subjects'
import { api } from '@/helpers/api'
import { notif } from '@/helpers/notif'

const props = defineProps({
  modelValue: { default: null },
  required:   { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue'])

const subjectStore = useSubjectStore()
const showForm    = ref(false)
const newName     = ref('')
const creating    = ref(false)
const nameInputRef = ref(null)

// v-model interne — normalise toujours vers Number | null
const selected = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val ? Number(val) : null)
})

// Ferme le formulaire inline quand le parent réinitialise la valeur à null/''
watch(() => props.modelValue, (val) => {
  if (val === null || val === '') cancel()
})

function openForm() {
  showForm.value = true
  nextTick(() => nameInputRef.value?.focus())
}

function cancel() {
  showForm.value = false
  newName.value = ''
}

async function create() {
  const name = newName.value.trim()
  if (!name || creating.value) return
  creating.value = true
  try {
    const resp = await api.post('subjects', { name })
    if (!resp || resp.status !== 201) {
      notif.notify(resp?.data?.message || 'Erreur lors de la création du sujet.', 'error')
      return
    }
    await subjectStore.fetchSubjects()
    emit('update:modelValue', resp.data.subjectId)
    cancel()
  } catch {
    notif.notify('Erreur lors de la création du sujet.', 'error')
  } finally {
    creating.value = false
  }
}

onMounted(async () => {
  if (subjectStore.subjects.length === 0) await subjectStore.fetchSubjects()
})
</script>
