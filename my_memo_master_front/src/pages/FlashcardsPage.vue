<template>
  <div class="w-full max-w-5xl mx-auto p-6">

    <div class="flex justify-end mb-6">
      <button
        @click="openCreateModal"
        class="bg-primary hover:bg-primary/90 text-white font-bold py-3 px-6 rounded-lg transition duration-200 shadow-lg"
      >
        + Nouveau système
      </button>
    </div>

    <div v-if="loading" class="text-center text-gray-light py-10">
      Chargement des systèmes...
    </div>

    <div v-else-if="systemStore.systems.length === 0" class="text-center text-gray-light py-10">
      Aucun système Leitner trouvé. Créez-en un pour commencer.
    </div>

    <div v-else class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <MenuItem
        v-for="system in systemStore.systems"
        :key="system.idSystem"
        :title="system.name"
        action-label="Lancer la session"
        :on-action="() => goToSession(system.idSystem)"
        :on-edit="() => openEditModal(system)"
        :on-delete="() => handleDelete(system)"
      >
        <template #stats>
          <div class="mt-1">
            <div v-if="cardStore.systemStats[system.idSystem]">
              <span class="text-sm text-gray-500">
                {{ cardStore.systemStats[system.idSystem].total }}
                carte{{ cardStore.systemStats[system.idSystem].total !== 1 ? 's' : '' }} à réviser
              </span>
              <div class="flex gap-1 mt-2 w-full">
                <div
                  v-for="level in (boxStore.levelsForSystem(system.idSystem).length ? boxStore.levelsForSystem(system.idSystem) : [1, 2, 3, 4, 5])"
                  :key="level"
                  class="flex-1 text-center bg-white border border-gray-200 rounded p-1"
                >
                  <div class="text-[10px] text-gray-400 font-bold">B{{ level }}</div>
                  <div class="text-xs font-semibold text-primary">
                    {{ cardStore.systemStats[system.idSystem].totalByLevel?.[level] || 0 }}
                  </div>
                  <div
                    class="text-[10px] font-semibold"
                    :class="(cardStore.systemStats[system.idSystem].boxes[level] || 0) > 0 ? 'text-orange-500' : 'text-gray-300'"
                  >
                    {{ cardStore.systemStats[system.idSystem].boxes[level] || 0 }}↑
                  </div>
                </div>
              </div>
            </div>
            <button
              @click.stop="router.push({ name: 'flashcards.cards', params: { systemId: system.idSystem } })"
              class="mt-3 text-sm text-primary hover:underline font-medium"
            >
              Gérer les cartes →
            </button>
          </div>
        </template>
      </MenuItem>
    </div>

    <!-- Modal créer / modifier -->
    <div
      v-if="showModal"
      class="fixed inset-0 flex items-center justify-center z-50"
      style="background-color: rgba(0,0,0,0.5)"
      @click="closeModal"
    >
      <div
        class="rounded-lg shadow-xl p-8 w-full max-w-md relative"
        style="background-color: white"
        @click.stop
      >
        <button
          @click="closeModal"
          class="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl leading-none font-bold"
          title="Fermer"
        >&times;</button>

        <h2 class="text-2xl font-bold mb-6 text-heading">
          {{ editingId ? 'Modifier le système' : 'Nouveau système Leitner' }}
        </h2>

        <form @submit.prevent="submitForm">
          <div class="mb-6">
            <label class="block text-sm font-semibold text-heading mb-2">Nom du système</label>
            <input
              v-model="form.name"
              type="text"
              placeholder="Ex : Maths S1, Vocabulaire anglais..."
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div class="flex gap-4">
            <button
              type="submit"
              :disabled="submitting"
              class="flex-1 bg-primary hover:bg-primary/90 text-white font-bold py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50"
            >
              {{ submitting ? 'Enregistrement...' : editingId ? 'Modifier' : 'Créer' }}
            </button>
            <button
              type="button"
              @click="closeModal"
              class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg transition duration-200"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import MenuItem from '@/components/MenuItemComponent.vue'
import { useLeitnerSystemStore } from '@/stores/leitnerSystems'
import { useLeitnerCardStore } from '@/stores/leitnerCards'
import { useLeitnerBoxStore } from '@/stores/leitnerBoxes'

const router = useRouter()
const systemStore = useLeitnerSystemStore()
const cardStore = useLeitnerCardStore()
const boxStore = useLeitnerBoxStore()

const loading = ref(true)
const showModal = ref(false)
const submitting = ref(false)
const editingId = ref(null)
const form = reactive({ name: '' })

const loadStats = async () => {
  if (systemStore.systems.length > 0) {
    await cardStore.loadSystemStats(systemStore.systems.map(s => s.idSystem))
  }
}

onMounted(async () => {
  await systemStore.fetchSystems()
  await Promise.all([loadStats(), boxStore.fetchBoxes()])
  loading.value = false
})

const goToSession = (systemId) => {
  router.push({ name: 'flashcardssession', params: { systemId } })
}

const openCreateModal = () => {
  editingId.value = null
  form.name = ''
  showModal.value = true
}

const openEditModal = (system) => {
  editingId.value = system.idSystem
  form.name = system.name
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingId.value = null
  form.name = ''
}

const submitForm = async () => {
  submitting.value = true
  systemStore.system = { name: form.name }

  const ok = editingId.value
    ? await systemStore.updateSystem(editingId.value)
    : await systemStore.createSystem()

  submitting.value = false
  if (ok) {
    closeModal()
    await loadStats()
  }
}

const handleDelete = async (system) => {
  if (!confirm(`Supprimer le système "${system.name}" ? Cette action est irréversible.`)) return
  const ok = await systemStore.deleteSystem(system.idSystem)
  if (ok) {
    delete cardStore.systemStats[system.idSystem]
  }
}
</script>
