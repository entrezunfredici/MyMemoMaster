<template>
  <div class="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
    <h3 class="text-sm font-semibold text-primary">Nouveau créneau</h3>
    <div class="grid grid-cols-1 gap-2 md:grid-cols-2">
      <input aria-label="Nom" v-model="eventForm.name" type="text" placeholder="Nom *"
        class="rounded-lg border-2 border-gray-500 px-3 py-2 text-sm" />
      <select aria-label="Type d'événement" v-model="eventForm.type" class="rounded-lg border-2 border-gray-500 px-3 py-2 text-sm bg-white">
        <option value="cours">Cours</option>
        <option value="examen">Examen</option>
        <option value="autre">Autre</option>
      </select>
    </div>

    <!-- Mode récurrence -->
    <div class="flex gap-2">
      <button @click="eventForm.recurrenceMode = 'auto'"
        :class="[eventForm.recurrenceMode === 'auto' ? 'bg-primary text-light' : 'bg-light text-primary border-2 border-gray', 'rounded-lg px-3 py-2 text-sm flex-1']">
        Récurrent
      </button>
      <button @click="eventForm.recurrenceMode = 'manual'"
        :class="[eventForm.recurrenceMode === 'manual' ? 'bg-primary text-light' : 'bg-light text-primary border-2 border-gray', 'rounded-lg px-3 py-2 text-sm flex-1']">
        Séance unique
      </button>
    </div>

    <!-- Récurrence automatique -->
    <template v-if="eventForm.recurrenceMode === 'auto'">
      <select aria-label="Fréquence" v-model="eventForm.frequency" class="w-full rounded-lg border-2 border-gray-500 px-3 py-2 text-sm bg-white">
        <option value="weekly">Hebdomadaire</option>
        <option value="biweekly">Bi-hebdomadaire</option>
        <option value="monthly">Mensuel</option>
      </select>
      <!-- CHOIX: role="group" + aria-labelledby (légende visuellement masquée) plutôt que <fieldset>/<legend>
           RAISON: équivalent ARIA valide au RGAA 11.6/11.7 ; aucun texte visible n'existait déjà pour ce
           regroupement (contrairement aux QCM), donc une légende dédiée est ajoutée plutôt que réutilisée. -->
      <div class="flex flex-wrap gap-2" v-if="eventForm.frequency !== 'monthly'" role="group" aria-labelledby="etab-days-legend">
        <span id="etab-days-legend" class="sr-only">Jours de la semaine</span>
        <label v-for="day in weekDays" :key="day.value" class="flex items-center gap-1 text-sm cursor-pointer">
          <input type="checkbox" :value="day.value" v-model="eventForm.days" class="rounded" />
          {{ day.label }}
        </label>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="text-xs text-dark/60">Début de période</label>
          <input aria-label="Date de début" v-model="eventForm.startDate" type="date" class="w-full rounded-lg border-2 border-gray-500 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="text-xs text-dark/60">Fin de période</label>
          <input aria-label="Date de fin" v-model="eventForm.endDate" type="date" class="w-full rounded-lg border-2 border-gray-500 px-3 py-2 text-sm" />
        </div>
      </div>
    </template>

    <!-- Séance unique -->
    <template v-else>
      <div>
        <label class="text-xs text-dark/60">Date</label>
        <input aria-label="Date" v-model="eventForm.date" type="date" class="w-full rounded-lg border-2 border-gray-500 px-3 py-2 text-sm" />
      </div>
    </template>

    <div class="grid grid-cols-2 gap-2">
      <div>
        <label class="text-xs text-dark/60">Heure début</label>
        <input aria-label="Heure de début" v-model="eventForm.startTime" type="time" class="w-full rounded-lg border-2 border-gray-500 px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="text-xs text-dark/60">Heure fin</label>
        <input aria-label="Heure de fin" v-model="eventForm.endTime" type="time" class="w-full rounded-lg border-2 border-gray-500 px-3 py-2 text-sm" />
      </div>
    </div>

    <button @click="submitEvent"
      class="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-light hover:bg-primary/90 transition">
      Créer le créneau
    </button>
    <p v-if="eventForm.error" class="text-xs text-secondary">{{ eventForm.error }}</p>
    <p v-if="eventForm.success" class="text-xs text-success">{{ eventForm.success }}</p>
  </div>
</template>

<script setup>
// Formulaire de création d'un créneau (récurrent ou séance unique) pour le groupe sélectionné.
// Extrait de pages/ClassroomEtablissementView.vue.
import { reactive } from 'vue'
import { useCalendarEventStore } from '@/stores/calendarEvents'

const props = defineProps({
  groupId: { type: Number, required: true },
})

const calendarStore = useCalendarEventStore()

const weekDays = [
  { label: 'Lun', value: 'monday' },
  { label: 'Mar', value: 'tuesday' },
  { label: 'Mer', value: 'wednesday' },
  { label: 'Jeu', value: 'thursday' },
  { label: 'Ven', value: 'friday' },
  { label: 'Sam', value: 'saturday' },
]

const eventForm = reactive({
  name: '', type: 'cours', recurrenceMode: 'auto',
  frequency: 'weekly', days: ['monday'], startDate: '', endDate: '',
  date: '', startTime: '09:00', endTime: '11:00',
  error: '', success: ''
})

async function submitEvent() {
  eventForm.error = ''
  eventForm.success = ''
  if (!eventForm.name.trim()) { eventForm.error = 'Le nom est requis.'; return }
  if (!eventForm.startTime || !eventForm.endTime) { eventForm.error = "L'heure de début et de fin sont requises."; return }

  let payload = {
    name: eventForm.name.trim(),
    type: eventForm.type,
    classGroupId: props.groupId,
    recurrenceMode: eventForm.recurrenceMode,
  }

  if (eventForm.recurrenceMode === 'auto') {
    if (!eventForm.startDate || !eventForm.endDate) { eventForm.error = 'Les dates de début et fin de période sont requises.'; return }
    if (eventForm.frequency !== 'monthly' && eventForm.days.length === 0) { eventForm.error = 'Sélectionnez au moins un jour.'; return }
    payload.recurrenceRule = {
      frequency: eventForm.frequency,
      days: eventForm.frequency !== 'monthly' ? eventForm.days : undefined,
      startDate: eventForm.startDate,
      endDate: eventForm.endDate,
      startTime: eventForm.startTime,
      endTime: eventForm.endTime,
    }
  } else {
    if (!eventForm.date) { eventForm.error = 'La date est requise.'; return }
    payload.occurrences = [{ date: eventForm.date, startTime: eventForm.startTime, endTime: eventForm.endTime }]
  }

  const ok = await calendarStore.createEvent(payload)
  if (ok) {
    eventForm.success = 'Créneau créé avec succès.'
    eventForm.name = ''
    eventForm.date = ''
    await calendarStore.fetchByGroup(props.groupId, true)
  }
}
</script>
