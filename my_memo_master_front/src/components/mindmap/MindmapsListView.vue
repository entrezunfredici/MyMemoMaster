<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '@/helpers/api'
import { useToast } from 'vue-toastification'
import MenuItem from '@/components/MenuItemComponent.vue'
import ItemListLayout from '@/components/ItemListLayout.vue'

const props = defineProps({
  subjects: { type: Array, default: () => [] },
})
const emit = defineEmits(['open', 'create'])
const toast = useToast()

// ── Liste ─────────────────────────────────────────────────────────────────────
const diagrams = ref([])
const loading = ref(true)
const searchQuery = ref('')
const selectedSubjectId = ref(null)

const subjectName = (id) => props.subjects.find((s) => s.subjectId === id)?.name || ''

const filteredDiagrams = computed(() =>
  diagrams.value.filter((d) => {
    const matchSubject = selectedSubjectId.value ? d.subjectId === selectedSubjectId.value : true
    const matchSearch = d.mmName?.toLowerCase().includes(searchQuery.value.toLowerCase())
    return matchSubject && matchSearch
  })
)

// ── Fetch ─────────────────────────────────────────────────────────────────────
const fetchDiagrams = async () => {
  try {
    const response = await api.get('diagrammes')
    diagrams.value = response?.data || []
  } catch {
    toast.error('Erreur lors du chargement des cartes mentales.')
  } finally {
    loading.value = false
  }
}

// ── Modal créer ────────────────────────────────────────────────────────────────
const showCreateModal = ref(false)
const createName = ref('Nouvelle carte mentale')
const createSubjectId = ref(null)

const openCreateModal = () => {
  createName.value = 'Nouvelle carte mentale'
  createSubjectId.value = props.subjects[0]?.subjectId || null
  showCreateModal.value = true
}

const confirmCreate = () => {
  showCreateModal.value = false
  emit('create', {
    name: createName.value.trim() || 'Nouvelle carte mentale',
    subjectId: createSubjectId.value || null,
  })
}

// ── Modal renommer ─────────────────────────────────────────────────────────────
const showRenameModal = ref(false)
const editedName = ref('')
const editedSubjectId = ref(null)
const currentEditId = ref(null)

const openRenameModal = (diagram) => {
  currentEditId.value = diagram.idMindMap
  editedName.value = diagram.mmName
  editedSubjectId.value = diagram.subjectId
  showRenameModal.value = true
}

const confirmRename = async () => {
  const diagram = diagrams.value.find((d) => d.idMindMap === currentEditId.value)
  if (!diagram) return
  const newSubjectId = editedSubjectId.value || diagram.subjectId
  try {
    const response = await api.put(`/diagrammes/${currentEditId.value}`, {
      mmName: editedName.value,
      mindMapJson: diagram.mindMapJson,
      subjectId: newSubjectId,
    })
    if (response) {
      toast.success('Carte modifiée.')
      diagram.mmName = editedName.value
      diagram.subjectId = newSubjectId
      showRenameModal.value = false
    }
  } catch {
    toast.error('Erreur lors de la modification.')
  }
}

// ── Supprimer ──────────────────────────────────────────────────────────────────
const confirmDelete = async (diagram) => {
  if (!confirm(`Supprimer la carte "${diagram.mmName}" ? Cette action est irréversible.`)) return
  try {
    const response = await api.del(`diagrammes/${diagram.idMindMap}`)
    if (response && [200, 204].includes(response.status)) {
      toast.success('Carte supprimée.')
      diagrams.value = diagrams.value.filter((d) => d.idMindMap !== diagram.idMindMap)
    } else {
      toast.warning('Suppression impossible.')
    }
  } catch {
    toast.error('Erreur lors de la suppression.')
  }
}

onMounted(fetchDiagrams)
</script>

<template>
  <ItemListLayout
    v-model:search="searchQuery"
    v-model:selectedSubjectId="selectedSubjectId"
    :subjects="subjects"
    :loading="loading"
    :filtered-count="filteredDiagrams.length"
    search-placeholder="Rechercher une carte mentale..."
    create-label="+ Nouvelle carte"
    item-label="carte mentale"
    empty-message="Aucune carte mentale trouvée. Créez-en une !"
    @create="openCreateModal"
  >
    <MenuItem
      v-for="diagram in filteredDiagrams"
      :key="diagram.idMindMap"
      :title="diagram.mmName"
      :description="subjectName(diagram.subjectId)"
      action-label="Ouvrir l'éditeur"
      :on-action="() => emit('open', diagram)"
      :on-edit="() => openRenameModal(diagram)"
      :on-delete="() => confirmDelete(diagram)"
    >
      <template #stats>
        <span v-if="subjectName(diagram.subjectId)" class="subject-badge">
          {{ subjectName(diagram.subjectId) }}
        </span>
      </template>
    </MenuItem>

    <template #modals>
      <!-- Modal créer -->
      <div v-if="showCreateModal" class="modal-overlay" @click="showCreateModal = false">
        <div class="modal-panel" @click.stop>
          <button @click="showCreateModal = false" class="modal-close">&times;</button>
          <h2 class="modal-title">Nouvelle carte mentale</h2>
          <form @submit.prevent="confirmCreate">
            <div class="mb-4">
              <label class="form-label">Nom</label>
              <input v-model="createName" type="text" class="form-input" required autofocus />
            </div>
            <div class="mb-4">
              <label class="form-label">Matière</label>
              <select v-model="createSubjectId" class="form-input">
                <option :value="null">— Aucune matière —</option>
                <option v-for="s in subjects" :key="s.subjectId" :value="s.subjectId">
                  {{ s.name }}
                </option>
              </select>
            </div>
            <div class="btn-row">
              <button type="submit" class="btn-modal-submit">Créer</button>
              <button type="button" @click="showCreateModal = false" class="btn-modal-cancel">
                Annuler
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal renommer -->
      <div v-if="showRenameModal" class="modal-overlay" @click="showRenameModal = false">
        <div class="modal-panel" @click.stop>
          <button @click="showRenameModal = false" class="modal-close">&times;</button>
          <h2 class="modal-title">Modifier la carte</h2>
          <form @submit.prevent="confirmRename">
            <div class="mb-4">
              <label class="form-label">Nom</label>
              <input v-model="editedName" type="text" class="form-input" required autofocus />
            </div>
            <div class="mb-4">
              <label class="form-label">Matière</label>
              <select v-model="editedSubjectId" class="form-input">
                <option :value="null">— Aucune matière —</option>
                <option v-for="s in subjects" :key="s.subjectId" :value="s.subjectId">
                  {{ s.name }}
                </option>
              </select>
            </div>
            <div class="btn-row">
              <button type="submit" class="btn-modal-submit">Valider</button>
              <button type="button" @click="showRenameModal = false" class="btn-modal-cancel">
                Annuler
              </button>
            </div>
          </form>
        </div>
      </div>
    </template>
  </ItemListLayout>
</template>

<style scoped>
.subject-badge {
  display: inline-block;
  background: #eff6ff;
  color: #2563eb;
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
  padding: 2px 8px;
  margin-top: 4px;
}
</style>
