<template>
  <div class="reminder-widget">
    <!-- Liste des rappels existants -->
    <div v-if="entityReminders.length > 0" class="reminder-list">
      <div
        v-for="r in entityReminders"
        :key="r.id"
        class="reminder-item"
        :class="`reminder-item--${r.status}`"
      >
        <div class="reminder-item__info">
          <span class="reminder-item__delay">{{ formatDelay(r.delayMinutes) }} avant</span>
          <span v-if="r.message" class="reminder-item__msg">{{ r.message }}</span>
          <span class="reminder-item__status">{{ statusLabel(r.status) }}</span>
        </div>
        <button
          v-if="r.status === 'pending'"
          class="reminder-item__del"
          title="Supprimer"
          @click="remove(r.id)"
        >
          <XMarkIcon class="size-4" />
        </button>
      </div>
    </div>
    <p v-else class="reminder-empty">Aucun rappel pour cet élément.</p>

    <!-- Formulaire ajout -->
    <form class="reminder-form" @submit.prevent="submit">
      <div class="reminder-form__row">
        <label class="reminder-form__label">Délai</label>
        <div class="reminder-presets">
          <button
            v-for="p in PRESETS"
            :key="p.value"
            type="button"
            class="preset-btn"
            :class="{ active: form.delayMinutes === p.value && !customMode }"
            @click="selectPreset(p.value)"
          >
            {{ p.label }}
          </button>
          <button
            type="button"
            class="preset-btn"
            :class="{ active: customMode }"
            @click="customMode = true"
          >
            Perso.
          </button>
        </div>
        <div v-if="customMode" class="custom-delay">
          <input aria-label="Valeur"
            v-model.number="form.customValue"
            type="number"
            min="1"
            class="reminder-input reminder-input--sm"
            placeholder="Valeur"
          />
          <select aria-label="Unité du délai" v-model="form.customUnit" class="reminder-select">
            <option value="minutes">min</option>
            <option value="hours">h</option>
            <option value="days">jours</option>
          </select>
        </div>
      </div>

      <div class="reminder-form__row">
        <label class="reminder-form__label">Message <span class="optional">(optionnel)</span></label>
        <input aria-label="Message du rappel"
          v-model="form.message"
          type="text"
          class="reminder-input"
          placeholder="Ex : Réviser le chapitre 3"
          maxlength="500"
        />
      </div>

      <button type="submit" class="reminder-submit" :disabled="submitting">
        <span v-if="submitting">Ajout...</span>
        <span v-else>+ Ajouter le rappel</span>
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'
import { useReminderStore } from '@/stores/reminders'

const props = defineProps({
  entityType: { type: String, required: true },
  entityId: { type: Number, required: true },
})

const store = useReminderStore()
const submitting = ref(false)
const customMode = ref(false)

const PRESETS = [
  { label: '30 min', value: 30 },
  { label: '1 h', value: 60 },
  { label: '3 h', value: 180 },
  { label: '1 jour', value: 1440 },
  { label: '2 jours', value: 2880 },
  { label: '1 sem.', value: 10080 },
]

const form = ref({
  delayMinutes: 1440,
  customValue: 1,
  customUnit: 'days',
  message: '',
})

const entityReminders = computed(() =>
  store.remindersByEntity(props.entityType, props.entityId)
)

function selectPreset(value) {
  form.value.delayMinutes = value
  customMode.value = false
}

function resolvedDelay() {
  if (!customMode.value) return form.value.delayMinutes
  const { customValue, customUnit } = form.value
  if (customUnit === 'hours') return customValue * 60
  if (customUnit === 'days') return customValue * 1440
  return customValue
}

async function submit() {
  const delay = resolvedDelay()
  if (!delay || delay < 1) return
  submitting.value = true
  await store.createReminder({
    entityType: props.entityType,
    entityId: props.entityId,
    delayMinutes: delay,
    message: form.value.message || undefined,
  })
  form.value.message = ''
  submitting.value = false
}

async function remove(id) {
  await store.deleteReminder(id)
}

function formatDelay(minutes) {
  if (minutes < 60) return `${minutes} min`
  if (minutes < 1440) return `${Math.round(minutes / 60)} h`
  if (minutes < 10080) return `${Math.round(minutes / 1440)} jour${Math.round(minutes / 1440) > 1 ? 's' : ''}`
  return `${Math.round(minutes / 10080)} sem.`
}

function statusLabel(status) {
  if (status === 'sent') return '✓ envoyé'
  if (status === 'failed') return '✗ échoué'
  return ''
}

onMounted(() => {
  if (store.reminders.length === 0) store.fetchReminders()
})
</script>

<style scoped>
.reminder-widget {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ── Liste ── */
.reminder-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.reminder-empty {
  font-size: 12px;
  color: #94a3b8;
  margin: 0;
}

.reminder-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 8px;
  background: #f8fafc;
  border: 0.5px solid #e2e8f0;
}

.reminder-item--sent {
  opacity: 0.6;
}

.reminder-item--failed {
  border-color: #fca5a5;
  background: #fff5f5;
}

.reminder-item__info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}

.reminder-item__delay {
  font-size: 12px;
  font-weight: 600;
  color: #1a1aff;
  white-space: nowrap;
}

.reminder-item__msg {
  font-size: 12px;
  color: #475569;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reminder-item__status {
  font-size: 11px;
  color: #94a3b8;
  white-space: nowrap;
}

.reminder-item__del {
  flex-shrink: 0;
  color: #cbd5e1;
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  transition: color 0.15s;
}

.reminder-item__del:hover {
  color: #ef4444;
}

/* ── Formulaire ── */
.reminder-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 10px;
  border-top: 0.5px solid #f1f5f9;
}

.reminder-form__row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.reminder-form__label {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.optional {
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  color: #94a3b8;
}

.reminder-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.preset-btn {
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  border: 0.5px solid #e2e8f0;
  border-radius: 6px;
  background: #ffffff;
  color: #64748b;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.preset-btn:hover {
  border-color: #1a1aff;
  color: #1a1aff;
}

.preset-btn.active {
  background: #1a1aff;
  color: #ffffff;
  border-color: #1a1aff;
}

.custom-delay {
  display: flex;
  gap: 6px;
  margin-top: 4px;
}

.reminder-input {
  width: 100%;
  padding: 7px 10px;
  font-size: 13px;
  border: 0.5px solid #e2e8f0;
  border-radius: 8px;
  outline: none;
  transition: border-color 0.15s;
  color: #0f172a;
  background: #ffffff;
  box-sizing: border-box;
}

.reminder-input--sm {
  width: 90px;
}

.reminder-input:focus {
  border-color: #1a1aff;
}

.reminder-select {
  padding: 7px 8px;
  font-size: 13px;
  border: 0.5px solid #e2e8f0;
  border-radius: 8px;
  outline: none;
  color: #0f172a;
  background: #ffffff;
  cursor: pointer;
}

.reminder-submit {
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  background: #1a1aff;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: opacity 0.15s;
  align-self: flex-start;
}

.reminder-submit:hover:not(:disabled) {
  opacity: 0.88;
}

.reminder-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
