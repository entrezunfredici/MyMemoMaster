<template>
  <div class="relative" v-click-outside="close">
    <!-- Bouton cloche -->
    <button
      @click="toggle"
      class="relative p-2 rounded-lg transition-colors duration-150"
      :class="open ? 'text-light bg-primary' : 'text-primary bg-light hover:bg-gray-100'"
      title="Rappels"
    >
      <BellIcon class="size-7" />
      <span
        v-if="pendingCount > 0"
        class="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full leading-none"
      >
        {{ pendingCount > 9 ? '9+' : pendingCount }}
      </span>
    </button>

    <!-- Panneau -->
    <Transition
      enter-active-class="transition ease-out duration-150"
      enter-from-class="opacity-0 translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-1"
    >
      <div
        v-if="open"
        class="absolute right-0 mt-2 w-80 border-2 border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden"
        style="background-color: #ffffff"
      >
        <!-- En-tête panneau -->
        <div class="flex items-center justify-between px-4 py-3 bg-primary border-b border-blue-700">
          <h3 class="font-semibold text-white text-base">Rappels</h3>
          <button
            @click="refresh"
            :disabled="loading"
            class="text-xs text-blue-200 hover:text-white transition-colors"
            title="Rafraîchir"
          >
            <ArrowPathIcon :class="['size-4', loading ? 'animate-spin' : '']" />
          </button>
        </div>

        <!-- Liste -->
        <div class="max-h-80 overflow-y-auto" style="background-color: #ffffff">
          <div v-if="loading && reminders.length === 0" class="flex justify-center py-8">
            <ArrowPathIcon class="size-5 animate-spin text-gray-400" />
          </div>

          <div v-else-if="reminders.length === 0" class="flex flex-col items-center py-8 text-gray-400">
            <BellSlashIcon class="size-8 mb-2" />
            <p class="text-sm">Aucun rappel en attente</p>
          </div>

          <ul v-else class="divide-y divide-gray-100">
            <li
              v-for="reminder in reminders"
              :key="reminder.id"
              class="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <!-- Icône type -->
              <div class="flex-shrink-0 mt-0.5">
                <span
                  :class="[
                    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                    reminder.entityType === 'deadline'
                      ? 'bg-red-100 text-red-700'
                      : reminder.entityType === 'kpi_digest'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                  ]"
                >
                  {{ entityLabel(reminder.entityType) }}
                </span>
              </div>

              <!-- Contenu standard -->
              <div v-if="reminder.entityType !== 'kpi_digest'" class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-800 truncate">
                  {{ reminder.message || 'Rappel programmé' }}
                </p>
                <p class="text-xs text-gray-500 mt-0.5">
                  {{ formatReminderAt(reminder.reminderAt) }}
                </p>
              </div>

              <!-- Contenu digest KPI -->
              <div v-else class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-gray-800 mb-1">Bilan de progression</p>
                <ul class="space-y-1">
                  <li
                    v-for="(item, i) in parseDigest(reminder.message)"
                    :key="i"
                    class="text-xs text-gray-600 flex gap-1"
                  >
                    <span>{{ item.icon }}</span>
                    <span>{{ item.text }}</span>
                  </li>
                </ul>
              </div>

              <!-- Supprimer -->
              <button
                @click.stop="deleteReminder(reminder.id)"
                class="flex-shrink-0 text-gray-300 hover:text-red-400 transition-colors p-1 rounded"
                title="Supprimer ce rappel"
              >
                <XMarkIcon class="size-4" />
              </button>
            </li>
          </ul>
        </div>

        <!-- Pied panneau -->
        <div v-if="sentCount > 0" class="px-4 py-2 border-t border-gray-100 text-xs text-gray-400 text-center">
          {{ sentCount }} rappel{{ sentCount > 1 ? 's' : '' }} déjà envoyé{{ sentCount > 1 ? 's' : '' }}
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { BellIcon, BellSlashIcon, XMarkIcon, ArrowPathIcon } from '@heroicons/vue/24/outline'
import { useReminderStore } from '@/stores/reminders'
import { useAuthStore } from '@/stores/auth'
import vClickOutside from '@/directives/clickOutside.js'

const store = useReminderStore()
const authStore = useAuthStore()
const open = ref(false)
const loading = ref(false)

const reminders = computed(() =>
  store.reminders.filter((r) => r.status === 'pending')
)
const pendingCount = computed(() => reminders.value.length)
const sentCount = computed(() =>
  store.reminders.filter((r) => r.status === 'sent').length
)

function entityLabel(type) {
  if (type === 'deadline') return 'Échéance'
  if (type === 'kpi_digest') return 'Progression'
  return 'Révision'
}

function parseDigest(message) {
  try { return JSON.parse(message) } catch { return [] }
}

function formatReminderAt(dateStr) {
  if (!dateStr) return ''
  const now = Date.now()
  const target = new Date(dateStr).getTime()
  const diff = target - now

  if (diff < 0) return 'Imminent'
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `Dans ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Dans ${hours}h`
  const days = Math.floor(hours / 24)
  return `Dans ${days} jour${days > 1 ? 's' : ''}`
}

async function refresh() {
  loading.value = true
  await store.fetchReminders()
  loading.value = false
}

async function deleteReminder(id) {
  await store.deleteReminder(id)
}

function toggle() {
  open.value = !open.value
  if (open.value && store.reminders.length === 0) refresh()
}

function close() {
  open.value = false
}

let pollInterval = null

onMounted(() => {
  if (!authStore.authenticated) return
  store.fetchReminders()
  pollInterval = setInterval(() => {
    if (authStore.authenticated) store.fetchReminders()
  }, 5 * 60 * 1000)
})

onBeforeUnmount(() => {
  if (pollInterval) clearInterval(pollInterval)
})
</script>
