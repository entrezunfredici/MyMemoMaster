<template>
  <div class="w-full max-w-5xl mx-auto p-6">

    <div class="flex gap-4 items-center mb-6">
      <div class="relative flex-1 max-w-2xl">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Rechercher un système..."
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <span class="absolute right-4 top-3.5 text-gray-400">🔍</span>
      </div>
      <button
        @click="openCreateModal"
        class="bg-primary hover:bg-primary/90 text-white font-bold py-3 px-6 rounded-lg transition duration-200 shadow-lg whitespace-nowrap ml-auto"
      >
        + Nouveau système
      </button>
    </div>

    <!-- Filtre sujet -->
    <div class="mb-6">
      <div class="flex gap-3 flex-wrap items-center mb-2">
        <label class="text-sm font-semibold text-heading">Filtrer par sujet :</label>
        <button
          v-for="subject in subjects"
          :key="subject.subjectId"
          @click="selectedSubjectId = selectedSubjectId === subject.subjectId ? null : subject.subjectId"
          :class="['px-3 py-1.5 rounded-lg font-semibold transition duration-200 border-2 text-sm', selectedSubjectId === subject.subjectId ? 'bg-primary text-white border-primary' : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200']"
        >
          {{ subject.name }}
        </button>
        <button
          v-if="selectedSubjectId"
          @click="selectedSubjectId = null"
          class="px-3 py-1.5 rounded-lg text-sm font-semibold bg-red-100 text-red-700 border-2 border-red-300 hover:bg-red-200"
        >
          Réinitialiser
        </button>
      </div>
      <p class="text-sm text-gray-600">
        <strong>{{ filteredSystems.length }}</strong> système<span v-if="filteredSystems.length !== 1">s</span> trouvé<span v-if="filteredSystems.length !== 1">s</span>
      </p>
    </div>

    <div v-if="loading" class="text-center text-gray-light py-10">
      Chargement des systèmes...
    </div>

    <div v-else-if="systemStore.systems.length === 0" class="text-center text-gray-light py-10">
      Aucun système Leitner trouvé. Créez-en un pour commencer.
    </div>

    <div v-else-if="filteredSystems.length === 0" class="text-center text-gray-light py-10">
      Aucun système ne correspond à votre recherche.
    </div>

    <div v-else class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <MenuItem
        v-for="system in filteredSystems"
        :key="system.idSystem"
        :title="system.name"
        :description="system.subject?.name || ''"
        action-label="Lancer la session"
        :on-action="() => goToSession(system.idSystem)"
        :on-edit="() => openEditModal(system)"
        :on-delete="() => handleDelete(system)"
      >
        <template #stats>
          <div class="mt-1">
            <div v-if="system.subject" class="mb-2">
              <span class="bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full">
                {{ system.subject.name }}
              </span>
            </div>
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
            <div class="mt-3 flex gap-3">
              <button
                @click.stop="router.push({ name: 'flashcards.cards', params: { systemId: system.idSystem } })"
                class="text-sm text-primary hover:underline font-medium"
              >
                Gérer les cartes →
              </button>
              <button
                @click.stop="openPlanModal(system)"
                class="text-sm text-green-600 hover:underline font-medium"
              >
                + Planifier
              </button>
            </div>
          </div>
        </template>
      </MenuItem>
    </div>

    <!-- Modal créer / modifier -->
    <div
      v-if="showModal"
      class="modal-overlay"
      @click="closeModal"
    >
      <div
        class="modal-panel"
        @click.stop
      >
        <button
          @click="closeModal"
          class="modal-close"
          title="Fermer"
        >&times;</button>

        <h2 class="modal-title">
          {{ editingId ? 'Modifier le système' : 'Nouveau système Leitner' }}
        </h2>

        <form @submit.prevent="submitForm">
          <div class="mb-4">
            <label class="form-label">Nom du système</label>
            <input
              v-model="form.name"
              type="text"
              placeholder="Ex : Maths S1, Vocabulaire anglais..."
              class="form-input"
              required
            />
          </div>

          <div class="mb-6">
            <label class="form-label">Sujet <span class="text-gray-400 font-normal">(optionnel)</span></label>
            <select v-model="form.subjectId" class="form-input">
              <option :value="null">— Sans sujet —</option>
              <option v-for="s in subjects" :key="s.subjectId" :value="s.subjectId">{{ s.name }}</option>
            </select>
            <div v-if="!showNewSubjectForm" class="mt-2">
              <button
                type="button"
                @click="showNewSubjectForm = true"
                class="text-sm text-primary hover:underline font-medium"
              >+ Créer un nouveau sujet</button>
            </div>
            <div v-else class="mt-2 flex gap-2 items-center">
              <input
                v-model="newSubjectName"
                type="text"
                placeholder="Nom du sujet (ex : Physique)"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                @keydown.enter.prevent="createSubjectInline"
                autofocus
              />
              <button
                type="button"
                :disabled="creatingSubject || !newSubjectName.trim()"
                @click="createSubjectInline"
                class="bg-primary hover:bg-primary/90 text-white text-sm font-bold px-4 py-2 rounded-lg transition disabled:opacity-50"
              >{{ creatingSubject ? '...' : 'Créer' }}</button>
              <button
                type="button"
                @click="showNewSubjectForm = false; newSubjectName = ''"
                class="text-gray-500 hover:text-gray-700 text-sm px-2"
              >Annuler</button>
            </div>
          </div>

          <div class="btn-row">
            <button
              type="submit"
              :disabled="submitting"
              class="btn-modal-submit"
            >
              {{ submitting ? 'Enregistrement...' : editingId ? 'Modifier' : 'Créer' }}
            </button>
            <button
              type="button"
              @click="closeModal"
              class="btn-modal-cancel"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>

  <!-- Modal planification de session -->
  <div
    v-if="showPlanModal"
    class="modal-overlay"
    @click="closePlanModal"
  >
    <div
      class="modal-panel"
      @click.stop
    >
      <button
        @click="closePlanModal"
        class="modal-close"
      >&times;</button>

      <h2 class="modal-title" style="margin-bottom: 0.25rem">Planifier une session</h2>
      <p class="text-sm text-gray-500 mb-6">Système : <span class="font-semibold text-primary">{{ planningSystem?.name }}</span></p>

      <form @submit.prevent="submitPlanForm">
        <div class="form-group">
          <label class="form-label">Nom de la session</label>
          <input
            v-model="planForm.name"
            type="text"
            class="form-input"
            required
          />
        </div>

        <div class="form-group">
          <label class="form-label">Date</label>
          <input
            v-model="planForm.date"
            type="date"
            class="form-input"
            required
          />
        </div>

        <div class="flex gap-4 mb-6">
          <div class="flex-1">
            <label class="form-label">Heure de début</label>
            <input
              v-model="planForm.startTime"
              type="time"
              class="form-input"
              required
            />
          </div>
          <div class="flex-1">
            <label class="form-label">Heure de fin</label>
            <input
              v-model="planForm.endTime"
              type="time"
              class="form-input"
              required
            />
          </div>
        </div>

        <p v-if="planError" class="text-red-600 text-sm mb-4">{{ planError }}</p>

        <div class="btn-row">
          <button
            type="submit"
            :disabled="submittingPlan"
            class="btn-modal-submit"
          >
            {{ submittingPlan ? 'Enregistrement...' : 'Planifier' }}
          </button>
          <button
            type="button"
            @click="closePlanModal"
            class="btn-modal-cancel"
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
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import MenuItem from '@/components/MenuItemComponent.vue'
import { useLeitnerSystemStore } from '@/stores/leitnerSystems'
import { useLeitnerCardStore } from '@/stores/leitnerCards'
import { useLeitnerBoxStore } from '@/stores/leitnerBoxes'
import { useRevisionSessionStore } from '@/stores/revisionSessions'
import { useSubjectStore } from '@/stores/subjects'
import { api } from '@/helpers/api'

const router = useRouter()
const systemStore = useLeitnerSystemStore()
const cardStore = useLeitnerCardStore()
const boxStore = useLeitnerBoxStore()
const sessionStore = useRevisionSessionStore()
const subjectStore = useSubjectStore()

const loading = ref(true)
const searchQuery = ref('')
const selectedSubjectId = ref(null)
const showModal = ref(false)
const submitting = ref(false)
const editingId = ref(null)
const showNewSubjectForm = ref(false)
const newSubjectName = ref('')
const creatingSubject = ref(false)

const form = reactive({ name: '', subjectId: null })

const subjects = computed(() => subjectStore.subjects)

const filteredSystems = computed(() => {
  let list = systemStore.systems
  if (selectedSubjectId.value) {
    list = list.filter(s => s.subjectId === selectedSubjectId.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(s => s.name?.toLowerCase().includes(q))
  }
  return list
})

// --- Planification de session ---
const showPlanModal = ref(false)
const planningSystem = ref(null)
const submittingPlan = ref(false)
const planError = ref('')
const planForm = reactive({ name: '', date: '', startTime: '', endTime: '' })

const openPlanModal = (system) => {
  planningSystem.value = system
  planForm.name = system.name
  planForm.date = ''
  planForm.startTime = ''
  planForm.endTime = ''
  planError.value = ''
  showPlanModal.value = true
}

const closePlanModal = () => {
  showPlanModal.value = false
  planningSystem.value = null
}

const submitPlanForm = async () => {
  submittingPlan.value = true
  planError.value = ''
  const ok = await sessionStore.createSession({
    name: planForm.name,
    date: planForm.date,
    startTime: planForm.startTime,
    endTime: planForm.endTime,
    idSystem: planningSystem.value.idSystem
  })
  submittingPlan.value = false
  if (ok) closePlanModal()
  else planError.value = 'Erreur lors de la création de la session.'
}

const loadStats = async () => {
  if (systemStore.systems.length > 0) {
    await cardStore.loadSystemStats(systemStore.systems.map(s => s.idSystem))
  }
}

onMounted(async () => {
  await Promise.all([systemStore.fetchSystems(), subjectStore.fetchSubjects()])
  await Promise.all([loadStats(), boxStore.fetchBoxes()])
  loading.value = false
})

const goToSession = (systemId) => {
  router.push({ name: 'flashcardssession', params: { systemId } })
}

const openCreateModal = () => {
  editingId.value = null
  form.name = ''
  form.subjectId = null
  showNewSubjectForm.value = false
  newSubjectName.value = ''
  showModal.value = true
}

const openEditModal = (system) => {
  editingId.value = system.idSystem
  form.name = system.name
  form.subjectId = system.subjectId || null
  showNewSubjectForm.value = false
  newSubjectName.value = ''
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingId.value = null
  form.name = ''
  form.subjectId = null
}

async function createSubjectInline() {
  const name = newSubjectName.value.trim()
  if (!name || creatingSubject.value) return
  creatingSubject.value = true
  try {
    const resp = await api.post('subjects', { name })
    if (!resp || resp.status !== 201) return
    await subjectStore.fetchSubjects()
    form.subjectId = resp.data.subjectId
    showNewSubjectForm.value = false
    newSubjectName.value = ''
  } finally {
    creatingSubject.value = false
  }
}

const submitForm = async () => {
  submitting.value = true
  systemStore.system = { name: form.name, subjectId: form.subjectId || null }

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
