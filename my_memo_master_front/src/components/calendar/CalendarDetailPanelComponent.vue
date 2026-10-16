<template>
  <!-- Panneau du jour sélectionné (apport de la branche calendrier) : liste les événements du jour ;
       chaque événement ouvre sa fiche (rappels, lancement de la séance). `inert` : fermé, il ne
       doit être ni focalisable au clavier ni lu par un lecteur d'écran. -->
  <aside
    class="detail-panel"
    :class="{ open: day !== null }"
    :inert="day === null ? '' : undefined"
    aria-label="Détail du jour sélectionné"
  >
    <div class="detail-header">
      <span class="detail-date" v-if="day"> {{ day.d }} {{ MONTHS[day.m] }} {{ day.y }} </span>
      <button class="detail-close" type="button" aria-label="Fermer le détail du jour" @click="$emit('close')">&#10005;</button>
    </div>

    <div class="detail-body" v-if="day">
      <p v-if="events.length === 0" class="detail-empty">Aucun événement ce jour.</p>
      <button
        v-for="(ev, i) in events"
        :key="`${ev.type}-${ev.id}-${i}`"
        type="button"
        class="ev-card"
        :class="ev.color"
        :aria-label="`${eventTypeLabel(ev.type)} : ${ev.label}. Afficher le détail`"
        @click="$emit('open-event', ev)"
      >
        <span class="ev-label" :class="ev.color">{{ eventTypeLabel(ev.type) }}</span>
        <span class="ev-title" :class="ev.color">{{ ev.label }}</span>
        <span class="ev-meta" :class="ev.color" v-if="ev.meta">{{ ev.meta }}</span>
      </button>
      <button type="button" class="detail-add" @click="$emit('create', day)">+ Nouvelle séance ce jour</button>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { MONTHS, eventTypeLabel } from '@/helpers/calendar'

const props = defineProps({
  day: { type: Object, default: null }, // { y, m, d } | null
  getEvents: { type: Function, required: true },
})

defineEmits(['close', 'open-event', 'create'])

const events = computed(() => (props.day ? props.getEvents(props.day.y, props.day.m, props.day.d) : []))
</script>

<style scoped>
.detail-panel {
  width: 0;
  overflow: hidden;
  background: rgb(var(--white));
  border-left: 0.5px solid var(--slate-200);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: width 0.2s ease;
}

.detail-panel.open {
  width: 240px;
}

.detail-header {
  padding: 16px 16px 12px;
  border-bottom: 0.5px solid var(--slate-200);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.detail-date {
  font-size: 13px;
  font-weight: 500;
  color: rgb(var(--accent));
}

.detail-close {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--slate-500);
  font-size: 16px;
  line-height: 1;
  padding: 4px 6px;
  border-radius: 6px;
  transition:
    background 0.15s,
    color 0.15s;
}

.detail-close:hover {
  background: var(--slate-100);
  color: var(--slate-700);
}

.detail-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-empty {
  font-size: 13px;
  color: var(--slate-500);
}

.ev-card {
  /* <button> : remise à zéro des styles natifs, l'apparence reste celle d'une carte */
  display: block;
  width: 100%;
  text-align: left;
  font: inherit;
  cursor: pointer;
  border-radius: 8px;
  padding: 9px 11px;
  border: 0.5px solid transparent;
}

.ev-card:hover {
  filter: brightness(0.97);
}

.ev-label,
.ev-title,
.ev-meta {
  display: block;
}

.detail-add {
  margin-top: 4px;
  padding: 8px 10px;
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  color: rgb(var(--accent));
  background: transparent;
  border: 1px dashed rgb(var(--accent) / 0.5);
  border-radius: 8px;
  cursor: pointer;
}

.detail-add:hover {
  background: rgb(var(--accent) / 0.07);
}

.ev-card.blue {
  background: rgb(var(--accent) / 0.07);
  border-color: rgb(var(--accent) / 0.2);
}
.ev-card.green {
  background: var(--status-green-bg);
  border-color: var(--status-green-border);
}
.ev-card.amber {
  background: var(--status-amber-bg);
  border-color: var(--status-amber-border);
}
.ev-card.red {
  background: var(--status-red-bg);
  border-color: var(--status-red-border);
}
.ev-card.purple {
  background: var(--status-purple-bg);
  border-color: var(--status-purple-border);
}

.ev-label {
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin-bottom: 2px;
}

.ev-title {
  font-size: 13px;
  font-weight: 500;
}
.ev-meta {
  font-size: 11px;
  margin-top: 3px;
  /* pas d'opacité réduite : elle faisait descendre le texte sous 4,5:1 sur les fonds teintés (RGAA 3.2) */
}

.ev-label.blue,
.ev-title.blue,
.ev-meta.blue {
  color: rgb(var(--accent));
}
.ev-label.green,
.ev-title.green,
.ev-meta.green {
  color: var(--status-green-text);
}
.ev-label.amber,
.ev-title.amber,
.ev-meta.amber {
  color: var(--status-amber-text);
}
.ev-label.red,
.ev-title.red,
.ev-meta.red {
  color: var(--status-red-text);
}
.ev-label.purple,
.ev-title.purple,
.ev-meta.purple {
  color: var(--status-purple-text);
}

@media (max-width: 900px) {
  .detail-panel.open {
    width: 200px;
  }
}
@media (max-width: 600px) {
  .detail-panel.open {
    width: 160px;
  }
}
</style>
