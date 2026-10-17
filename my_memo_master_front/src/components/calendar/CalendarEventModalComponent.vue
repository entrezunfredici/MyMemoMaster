<template>
  <Transition
    enter-active-class="transition ease-out duration-150"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition ease-in duration-100"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div v-if="event" class="detail-overlay" @click.self="$emit('close')">
      <div class="detail-modal" role="dialog" aria-modal="true" aria-labelledby="calendar-event-title">
        <!-- En-tête -->
        <div class="detail-modal__header">
          <div class="detail-modal__meta">
            <span class="detail-modal__badge" :class="`detail-modal__badge--${event.type}`">
              {{ eventTypeLabel(event.type) }}
            </span>
            <h3 id="calendar-event-title" class="detail-modal__title">{{ event.label }}</h3>
          </div>
          <button type="button" class="detail-modal__close" aria-label="Fermer" @click="$emit('close')">
            <XMarkIcon class="size-5" />
          </button>
        </div>

        <!-- Détail d'une séance de révision : horaires, système lié, lancement -->
        <div v-if="event.type === 'revision' && event.session" class="detail-modal__body">
          <p class="detail-modal__info">
            {{ formatSessionDate(event.session) }}
          </p>
          <p v-if="event.session.leitnerSystem" class="detail-modal__info">
            Système de Leitner lié : <strong>{{ event.session.leitnerSystem.name }}</strong>
          </p>
          <p v-else class="detail-modal__info">Aucun système de Leitner lié.</p>
          <button
            v-if="event.session.leitnerSystem"
            type="button"
            class="btn-submit"
            @click="launchSession(event.session.leitnerSystem.idSystem)"
          >
            Lancer la session
          </button>
        </div>

        <!-- Rappels (échéance et séance de révision uniquement) -->
        <div v-if="event.type !== 'calendar'" class="detail-modal__body">
          <p class="detail-modal__section-title">Rappels</p>
          <ReminderWidget :entity-type="reminderEntityType(event.type)" :entity-id="event.id" />
        </div>
        <div v-else class="detail-modal__body">
          <p class="detail-modal__info">Les rappels ne sont pas disponibles pour les événements de calendrier.</p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
// Fiche d'un événement du calendrier : type, séance de révision (horaires, système, lancement), rappels.
// Rendue dans `.calendar-page` : ses classes viennent de calendar.css.
import { useRouter } from 'vue-router'
import { XMarkIcon } from '@heroicons/vue/24/outline'
import ReminderWidget from '@/components/ReminderWidget.vue'
import { eventTypeLabel, formatSessionDate } from '@/helpers/calendar'

defineProps({
  // Événement affiché (voir useCalendar) ; null = fenêtre fermée
  event: { type: Object, default: null },
})
defineEmits(['close'])

const router = useRouter()

function launchSession(idSystem) {
  router.push({ name: 'flashcardssession', params: { systemId: idSystem } })
}

// Le type affiché « revision » s'appelle « revision_session » côté rappels.
function reminderEntityType(type) {
  return type === 'revision' ? 'revision_session' : type
}
</script>
