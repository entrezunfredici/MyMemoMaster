<template>
  <ItemListLayout
    v-model:search="searchQuery"
    v-model:selectedSubjectId="selectedSubjectId"
    :subjects="subjects"
    :loading="loading"
    :filtered-count="filteredSystems.length"
    search-placeholder="Rechercher un système..."
    create-label="+ Nouveau système"
    item-label="système"
    empty-message="Aucun système ne correspond à votre recherche. Créez-en un !"
    @create="openCreateModal"
  >
    <!-- Cartes -->
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
            <span class="subject-badge">{{ system.subject.name }}</span>
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

    <!-- Modals -->
    <template #modals>

      <!-- Modal créer / modifier système -->
      <div v-if="showModal" class="modal-overlay" @click="closeModal">
        <div class="modal-panel" @click.stop>
          <button @click="closeModal" class="modal-close" title="Fermer">&times;</button>
          <h2 class="modal-title">
            {{ editingId ? 'Modifier le système' : 'Nouveau système Leitner' }}
          </h2>
          <form @submit.prevent="submitForm">
            <div class="mb-4">
              <label class="form-label">Nom du système</label>
              <input aria-label="Nom du système de Leitner"
                v-model="form.name"
                type="text"
                placeholder="Ex : Maths S1, Vocabulaire anglais..."
                class="form-input"
                required
              />
            </div>
            <div class="mb-4">
              <label class="form-label">Sujet <span class="text-gray-400 font-normal">(optionnel)</span></label>
              <SubjectSelectorComponent v-model="form.subjectId" />
            </div>
            <div class="mb-4">
              <label class="form-label">Carte mentale liée <span class="text-gray-400 font-normal">(optionnel)</span></label>
              <select
                aria-label="Carte mentale liée au système"
                v-model="form.idMindMap"
                class="form-input bg-white"
              >
                <option :value="null">Aucune</option>
                <option v-for="mm in availableMindMaps" :key="mm.idMindMap" :value="mm.idMindMap">
                  {{ mm.mmName }}
                </option>
              </select>
              <p class="text-xs text-gray-500 mt-1">
                Permet de lier chaque carte à un nœud de la carte mentale lors de sa création.
              </p>
            </div>
            <div class="mb-6">
              <label class="form-label">Tags <span class="text-gray-400 font-normal">(optionnel)</span></label>
              <TagSelectorComponent v-model="form.tagIds" />
            </div>
            <div class="btn-row">
              <button type="submit" :disabled="submitting" class="btn-modal-submit">
                {{ submitting ? 'Enregistrement...' : editingId ? 'Modifier' : 'Créer' }}
              </button>
              <button type="button" @click="closeModal" class="btn-modal-cancel">Annuler</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal planification de session -->
      <div v-if="showPlanModal" class="modal-overlay" @click="closePlanModal">
        <div class="modal-panel" @click.stop>
          <button aria-label="Fermer" @click="closePlanModal" class="modal-close">&times;</button>
          <h2 class="modal-title" style="margin-bottom: 0.25rem">Planifier une session</h2>
          <p class="text-sm text-gray-500 mb-6">Système : <span class="font-semibold text-primary">{{ planningSystem?.name }}</span></p>
          <form @submit.prevent="submitPlanForm">
            <div class="form-group">
              <label class="form-label">Nom de la session</label>
              <input aria-label="Nom de la session" v-model="planForm.name" type="text" class="form-input" required />
            </div>
            <div class="form-group">
              <label class="form-label">Date</label>
              <input aria-label="Date de la session" v-model="planForm.date" type="date" class="form-input" required />
            </div>
            <div class="flex gap-4 mb-6">
              <div class="flex-1">
                <label class="form-label">Heure de début</label>
                <input aria-label="Heure de début" v-model="planForm.startTime" type="time" class="form-input" required />
              </div>
              <div class="flex-1">
                <label class="form-label">Heure de fin</label>
                <input aria-label="Heure de fin" v-model="planForm.endTime" type="time" class="form-input" required />
              </div>
            </div>
            <p v-if="planError" class="text-red-600 text-sm mb-4">{{ planError }}</p>
            <div class="btn-row">
              <button type="submit" :disabled="submittingPlan" class="btn-modal-submit">
                {{ submittingPlan ? 'Enregistrement...' : 'Planifier' }}
              </button>
              <button type="button" @click="closePlanModal" class="btn-modal-cancel">Annuler</button>
            </div>
          </form>
        </div>
      </div>

    </template>
  </ItemListLayout>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import MenuItem from '@/components/MenuItemComponent.vue'
import ItemListLayout from '@/components/ItemListLayout.vue'
import { useLeitnerSystemStore } from '@/stores/leitnerSystems'
import { useLeitnerCardStore } from '@/stores/leitnerCards'
import { useLeitnerBoxStore } from '@/stores/leitnerBoxes'
import { useRevisionSessionStore } from '@/stores/revisionSessions'
import { useSubjectStore } from '@/stores/subjects'
import { useTagStore } from '@/stores/tags'
import { useGuidedTourStore } from '@/stores/guidedTour'
import { useDiagrammeStore } from '@/stores/diagrammes'
import TagSelectorComponent from '@/components/TagSelectorComponent.vue'
import SubjectSelectorComponent from '@/components/SubjectSelectorComponent.vue'

const router = useRouter()
const systemStore = useLeitnerSystemStore()
const cardStore = useLeitnerCardStore()
const boxStore = useLeitnerBoxStore()
const sessionStore = useRevisionSessionStore()
const subjectStore = useSubjectStore()
const tagStore = useTagStore()
const guidedTourStore = useGuidedTourStore()
const diagrammeStore = useDiagrammeStore()

const loading = ref(true)
const searchQuery = ref('')
const selectedSubjectId = ref(null)
const showModal = ref(false)
const submitting = ref(false)
const editingId = ref(null)

const form = reactive({ name: '', subjectId: null, tagIds: [], idMindMap: null })
const subjects = computed(() => subjectStore.subjects)

// Cartes mentales proposées pour la liaison : celles de la matière choisie, sinon toutes
const availableMindMaps = computed(() => {
  const all = diagrammeStore.diagrammes || []
  if (!form.subjectId) return all
  return all.filter((mm) => mm.subjectId === form.subjectId)
})

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

// ── Planification ─────────────────────────────────────────────────────────────
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
  if (ok) {
    // Parcours guidé : planifier une session valide aussi l'étape « planification »
    const created = sessionStore.sessions[sessionStore.sessions.length - 1]
    guidedTourStore.recordLinks({ revisionSessionId: created?.id ?? -1 })
    closePlanModal()
  } else planError.value = 'Erreur lors de la création de la session.'
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
const loadStats = async () => {
  if (systemStore.systems.length > 0) {
    await cardStore.loadSystemStats(systemStore.systems.map(s => s.idSystem))
  }
}

onMounted(async () => {
  await Promise.all([
    systemStore.fetchSystems(),
    subjectStore.fetchSubjects(),
    diagrammeStore.fetchDiagrammes()
  ])
  await Promise.all([loadStats(), boxStore.fetchBoxes()])
  loading.value = false
})

// ── Navigation ────────────────────────────────────────────────────────────────
const goToSession = (systemId) => {
  router.push({ name: 'flashcardssession', params: { systemId } })
}

// ── Modal système ─────────────────────────────────────────────────────────────
const openCreateModal = () => {
  editingId.value = null
  form.name = ''
  // Parcours guidé : pré-sélectionne la matière et la carte mentale créées à l'étape précédente
  form.subjectId = guidedTourStore.active ? guidedTourStore.links.subjectId : null
  form.idMindMap = guidedTourStore.active ? guidedTourStore.links.mindMapId : null
  form.tagIds = []
  showModal.value = true
}

const openEditModal = (system) => {
  editingId.value = system.idSystem
  form.name = system.name
  form.subjectId = system.subjectId || null
  form.idMindMap = system.idMindMap || null
  form.tagIds = (system.tags || []).map((t) => t.tagId)
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingId.value = null
  form.name = ''
  form.subjectId = null
  form.idMindMap = null
  form.tagIds = []
}

const submitForm = async () => {
  submitting.value = true
  systemStore.system = {
    name: form.name,
    subjectId: form.subjectId || null,
    idMindMap: form.idMindMap || null
  }
  const ok = editingId.value
    ? await systemStore.updateSystem(editingId.value)
    : await systemStore.createSystem()
  if (ok) {
    const systemId = editingId.value || systemStore.system.idSystem
    if (!editingId.value) guidedTourStore.recordLinks({ leitnerSystemId: systemId })
    await tagStore.setEntityTags('leitnersystem', systemId, form.tagIds)
    closeModal()
    await systemStore.fetchSystems()
    await loadStats()
  }
  submitting.value = false
}

const handleDelete = async (system) => {
  if (!confirm(`Supprimer le système "${system.name}" ? Cette action est irréversible.`)) return
  const ok = await systemStore.deleteSystem(system.idSystem)
  if (ok) {
    delete cardStore.systemStats[system.idSystem]
  }
}
</script>
