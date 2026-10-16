<template>
  <Transition
    enter-active-class="transition ease-out duration-150"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition ease-in duration-100"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div v-if="open" class="detail-overlay" @click.self="$emit('close')">
      <div class="detail-modal" role="dialog" aria-modal="true" aria-labelledby="create-session-title">
        <div class="detail-modal__header">
          <div class="detail-modal__meta">
            <span class="detail-modal__badge detail-modal__badge--revision">Révision</span>
            <h3 id="create-session-title" class="detail-modal__title">Nouvelle séance</h3>
          </div>
          <button type="button" class="detail-modal__close" aria-label="Fermer" @click="$emit('close')">
            <XMarkIcon class="size-5" />
          </button>
        </div>

        <form class="create-form" @submit.prevent="submit">
          <div class="create-form__field">
            <label>Nom <span class="required">*</span></label>
            <input aria-label="Nom de la séance" v-model="form.name" type="text" placeholder="Ex: Maths — Chapitre 3" maxlength="150" required />
          </div>

          <div class="create-form__row">
            <div class="create-form__field">
              <label>Date <span class="required">*</span></label>
              <input aria-label="Date de la séance" v-model="form.date" type="date" required />
            </div>
          </div>

          <div class="create-form__row">
            <div class="create-form__field">
              <label>Début <span class="required">*</span></label>
              <input aria-label="Heure de début" v-model="form.startTime" type="time" required />
            </div>
            <div class="create-form__field">
              <label>Fin <span class="required">*</span></label>
              <input aria-label="Heure de fin" v-model="form.endTime" type="time" required />
            </div>
          </div>

          <div class="create-form__field">
            <label for="create-session-system">Système de Leitner lié</label>
            <select id="create-session-system" v-model="form.idSystem" @change="onSystemChange">
              <option :value="null">Aucun</option>
              <option v-for="sys in leitnerStore.systems" :key="sys.idSystem" :value="sys.idSystem">
                {{ sys.name }}
              </option>
            </select>
          </div>

          <div class="create-form__field">
            <label>Description</label>
            <textarea aria-label="Notes optionnelles" v-model="form.description" placeholder="Notes optionnelles…" rows="2" maxlength="1000" />
          </div>

          <div class="create-form__actions">
            <button type="button" class="btn-cancel" @click="$emit('close')">Annuler</button>
            <button type="submit" class="btn-submit" :disabled="creating">
              {{ creating ? 'Création…' : 'Créer la séance' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Transition>
</template>

<script setup>
// Fenêtre « Nouvelle séance » de révision : formulaire, création via l'API, parcours guidé.
// Rendue dans `.calendar-page` : ses classes viennent de calendar.css.
import { ref, watch, onMounted } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'
import { useRevisionSessionStore } from '@/stores/revisionSessions'
import { useLeitnerSystemStore } from '@/stores/leitnerSystems'
import { useGuidedTourStore } from '@/stores/guidedTour'
import { toInputDate } from '@/helpers/calendar'

const props = defineProps({
  open: { type: Boolean, default: false },
  // Jour sur lequel la séance est créée : { y, m, d } (mois à partir de 0), ou null (date à saisir)
  day: { type: Object, default: null },
})
const emit = defineEmits(['close', 'created'])

const revisionStore = useRevisionSessionStore()
const leitnerStore = useLeitnerSystemStore()
const guidedTourStore = useGuidedTourStore()

const creating = ref(false)
const form = ref({ name: '', date: '', startTime: '', endTime: '', description: '', idSystem: null })

onMounted(() => leitnerStore.fetchSystems())

// À chaque ouverture, le formulaire repart d'un état neuf.
watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    // Parcours guidé : le système de Leitner créé à l'étape 2 est pré-sélectionné
    const tourSystem = guidedTourStore.active ? guidedTourStore.links.leitnerSystemId : null
    form.value = {
      idSystem: tourSystem,
      name: leitnerStore.systems.find((s) => s.idSystem === tourSystem)?.name || '',
      date: props.day ? toInputDate(props.day.y, props.day.m, props.day.d) : '',
      startTime: '',
      endTime: '',
      description: '',
    }
  }
)

// Pré-remplit le nom de la séance avec celui du système choisi, tant que l'utilisateur n'a rien saisi
function onSystemChange() {
  const sys = leitnerStore.systems.find((s) => s.idSystem === form.value.idSystem)
  if (sys && !form.value.name.trim()) form.value.name = sys.name
}

async function submit() {
  creating.value = true
  const payload = {
    name: form.value.name,
    date: form.value.date,
    startTime: form.value.startTime,
    endTime: form.value.endTime,
    ...(form.value.description ? { description: form.value.description } : {}),
    ...(form.value.idSystem ? { idSystem: form.value.idSystem } : {}),
  }
  const ok = await revisionStore.createSession(payload)
  creating.value = false
  if (ok) {
    const created = revisionStore.sessions[revisionStore.sessions.length - 1]
    guidedTourStore.recordLinks({ revisionSessionId: created?.id ?? -1 })
    emit('created')
    emit('close')
  }
}
</script>
