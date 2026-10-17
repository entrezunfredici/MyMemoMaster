<template>
  <div class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-3">
    <h3 class="text-base font-semibold text-dark">Ajouter une échéance</h3>
    <input aria-label="Titre" v-model="deadlineForm.name" type="text" placeholder="Titre *"
      class="w-full rounded-lg border-2 border-gray-500 px-3 py-2 text-sm" />
    <select aria-label="Type d'échéance" v-model="deadlineForm.type" class="w-full rounded-lg border-2 border-gray-500 px-3 py-2 text-sm bg-white">
      <option value="ds">DS</option>
      <option value="devoir">Devoir / DM</option>
      <option value="exposé">Exposé</option>
      <option value="autre">Autre</option>
    </select>
    <select aria-label="Séance concernée" v-model="deadlineForm.occurrenceId" class="w-full rounded-lg border-2 border-gray-500 px-3 py-2 text-sm bg-white">
      <option value="">Séance concernée *</option>
      <option v-for="occ in allOccurrences" :key="occ.id" :value="occ.id">
        {{ occ.calendarEvent?.name }} — {{ formatDate(occ.date) }}
      </option>
    </select>
    <input aria-label="Date limite" v-model="deadlineForm.dueDate" type="date" placeholder="Date limite *"
      class="w-full rounded-lg border-2 border-gray-500 px-3 py-2 text-sm" />
    <input aria-label="Heure limite" v-model="deadlineForm.dueTime" type="time"
      class="w-full rounded-lg border-2 border-gray-500 px-3 py-2 text-sm" />
    <select aria-label="Exercice associé" v-model="deadlineForm.testId" class="w-full rounded-lg border-2 border-gray-500 px-3 py-2 text-sm bg-white">
      <option :value="null">Exercice associé (optionnel)</option>
      <option v-for="t in testStore.tests" :key="t.testId" :value="t.testId">{{ t.name }}</option>
    </select>
    <button @click="submitDeadline"
      class="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-light hover:bg-primary/90 transition">
      Ajouter l'échéance
    </button>
    <p v-if="deadlineForm.error" class="text-xs text-secondary">{{ deadlineForm.error }}</p>
  </div>
</template>

<script setup>
// Formulaire d'ajout d'une échéance sur une séance du groupe. Extrait de pages/ClassroomEnseignantView.vue.
import { computed, reactive } from 'vue'
import { useCalendarEventStore } from '@/stores/calendarEvents'
import { useDeadlineStore } from '@/stores/deadlines'
import { useTestStore } from '@/stores/tests'
import { formatDate } from '@/helpers/classroomFormat'

const props = defineProps({ groupId: { type: Number, required: true } })

const calendarStore = useCalendarEventStore()
const deadlineStore = useDeadlineStore()
const testStore = useTestStore()

const deadlineForm = reactive({ name: '', type: 'ds', occurrenceId: '', dueDate: '', dueTime: '', testId: null, error: '' })

// Toutes les séances du groupe, de la plus ancienne à la plus récente
const allOccurrences = computed(() =>
  calendarStore.groupEvents
    .flatMap((ev) => (ev.occurrences ?? []).map((o) => ({ ...o, calendarEvent: ev })))
    .sort((a, b) => new Date(`${a.date}T${a.startTime}`) - new Date(`${b.date}T${b.startTime}`)),
)

async function submitDeadline() {
  deadlineForm.error = ''
  if (!deadlineForm.name.trim()) { deadlineForm.error = 'Le titre est requis.'; return }
  if (!deadlineForm.occurrenceId) { deadlineForm.error = 'Sélectionnez une séance.'; return }
  if (!deadlineForm.dueDate) { deadlineForm.error = 'La date limite est requise.'; return }
  const ok = await deadlineStore.createDeadline({
    name: deadlineForm.name.trim(),
    type: deadlineForm.type,
    occurrenceId: Number(deadlineForm.occurrenceId),
    dueDate: deadlineForm.dueDate,
    dueTime: deadlineForm.dueTime || null,
    testId: deadlineForm.testId || null,
  })
  if (ok) {
    Object.assign(deadlineForm, { name: '', occurrenceId: '', dueDate: '', dueTime: '', testId: null, error: '' })
    await deadlineStore.fetchByGroup(props.groupId)
  }
}
</script>
