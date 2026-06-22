<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { api } from '@/helpers/api'
import { useToast } from 'vue-toastification'
import MindMapBuilder from '@/components/mindmap/MindMapBuilder.vue'
import { useMindMapBuilderStore } from '@/stores/mindmapBuilder'
import { useSubjectStore } from '@/stores/subjects'
import MenuItem from '@/components/MenuItemComponent.vue'
import ItemListLayout from '@/components/ItemListLayout.vue'

const toast = useToast()
const mindmapStore = useMindMapBuilderStore()
const subjectStore = useSubjectStore()

// ── Vue active ────────────────────────────────────────────────────────────────
const view = ref('list') // 'list' | 'editor'

// ── Liste ─────────────────────────────────────────────────────────────────────
const diagrams = ref([])
const loading = ref(true)
const searchQuery = ref('')
const selectedSubjectId = ref(null)

const subjects = computed(() => subjectStore.subjects)

const subjectName = (id) =>
  subjects.value.find((s) => s.subjectId === id)?.name || ''

const filteredDiagrams = computed(() => {
  return diagrams.value.filter((d) => {
    const matchSubject = selectedSubjectId.value
      ? d.subjectId === selectedSubjectId.value
      : true
    const matchSearch = d.mmName?.toLowerCase().includes(searchQuery.value.toLowerCase())
    return matchSubject && matchSearch
  })
})

// ── Éditeur ───────────────────────────────────────────────────────────────────
const currentDiagramId = ref(null)
const currentDiagramMeta = ref(null)
const currentMapPayload = ref(null)
const isSaving = ref(false)
const isExporting = ref(false)
const showExportModal = ref(false)
const exportName = ref('')
const pendingPayload = ref(null)
const pendingCreate = ref(false)

const AUTO_SAVE_DELAY = 1500
let autoSaveTimer = null

// ── Modal créer ───────────────────────────────────────────────────────────────
const showCreateModal = ref(false)
const createName = ref('Nouvelle carte mentale')
const createSubjectId = ref(null)

// ── Modal renommer ────────────────────────────────────────────────────────────
const showRenameModal = ref(false)
const editedName = ref('')
const editedSubjectId = ref(null)
const currentEditId = ref(null)

// ── Fetch ─────────────────────────────────────────────────────────────────────
const fetchDiagrams = async () => {
  try {
    const response = await api.get('diagrammes')
    diagrams.value = response?.data || []
    if (currentDiagramId.value) {
      const match = diagrams.value.find((d) => d.idMindMap === currentDiagramId.value)
      if (match) currentDiagramMeta.value = { ...match }
    }
  } catch {
    toast.error('Erreur lors du chargement des cartes mentales.')
  }
}

// ── Navigation ────────────────────────────────────────────────────────────────
const openDiagram = (diagram) => {
  try {
    const jsonData =
      typeof diagram.mindMapJson === 'string'
        ? JSON.parse(diagram.mindMapJson)
        : diagram.mindMapJson
    currentDiagramId.value = diagram.idMindMap
    currentDiagramMeta.value = { ...diagram }
    currentMapPayload.value = jsonData
    view.value = 'editor'
  } catch {
    toast.error('Erreur lors du chargement de la carte.')
  }
}

const createNew = () => {
  createName.value = 'Nouvelle carte mentale'
  createSubjectId.value = subjects.value[0]?.subjectId || null
  showCreateModal.value = true
}

const confirmCreate = () => {
  showCreateModal.value = false
  const name = createName.value.trim() || 'Nouvelle carte mentale'
  currentDiagramId.value = null
  currentDiagramMeta.value = { mmName: name, subjectId: createSubjectId.value || 1 }
  currentMapPayload.value = null
  exportName.value = name
  mindmapStore.new(name)
  view.value = 'editor'
}

const backToList = () => {
  clearAutoSaveTimer()
  view.value = 'list'
}

// ── CRUD ──────────────────────────────────────────────────────────────────────
const openRenameModal = (diagram) => {
  currentEditId.value = diagram.idMindMap
  editedName.value = diagram.mmName
  editedSubjectId.value = diagram.subjectId
  showRenameModal.value = true
}

const confirmRename = async () => {
  try {
    const diagram = diagrams.value.find((d) => d.idMindMap === currentEditId.value)
    if (!diagram) return
    const newSubjectId = editedSubjectId.value || diagram.subjectId
    const response = await api.put(`/diagrammes/${currentEditId.value}`, {
      mmName: editedName.value,
      mindMapJson: diagram.mindMapJson,
      subjectId: newSubjectId,
    })
    if (response) {
      toast.success('Carte modifiée.')
      diagram.mmName = editedName.value
      diagram.subjectId = newSubjectId
      if (currentDiagramMeta.value?.idMindMap === diagram.idMindMap) {
        currentDiagramMeta.value.mmName = editedName.value
        currentDiagramMeta.value.subjectId = newSubjectId
      }
    }
    showRenameModal.value = false
  } catch {
    toast.error('Erreur lors de la modification.')
  }
}

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

// ── Auto-save ─────────────────────────────────────────────────────────────────
const clearAutoSaveTimer = () => {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer)
    autoSaveTimer = null
  }
}

const scheduleAutoSave = () => {
  clearAutoSaveTimer()
  autoSaveTimer = setTimeout(performAutoSave, AUTO_SAVE_DELAY)
}

const updateDiagramsList = (entry) => {
  if (!entry?.idMindMap) return
  const idx = diagrams.value.findIndex((d) => d.idMindMap === entry.idMindMap)
  if (idx === -1) {
    diagrams.value = [entry, ...diagrams.value]
  } else {
    diagrams.value = diagrams.value.map((d, i) =>
      i === idx ? { ...d, ...entry } : d
    )
  }
}

const ensureMeta = (payload) => ({
  subjectId: Number(currentDiagramMeta.value?.subjectId || 1),
  mmName: exportName.value || payload.title || 'Carte mentale',
})

const performAutoSave = async () => {
  autoSaveTimer = null
  if (!mindmapStore.isDirty) return
  if (isSaving.value || isExporting.value || showExportModal.value) {
    scheduleAutoSave()
    return
  }

  const payload = mindmapStore.exportPayload()
  if (!payload) return
  const saveVersion = payload?.updatedAt
  exportName.value = payload.title || exportName.value || 'Carte mentale'
  const meta = ensureMeta(payload)
  const body = { mmName: meta.mmName, mindMapJson: payload, subjectId: meta.subjectId }

  try {
    isSaving.value = true
    if (currentDiagramId.value) {
      const response = await api.put(`/diagrammes/${currentDiagramId.value}`, body)
      if (response) {
        const updatedMeta = { ...body, idMindMap: currentDiagramId.value }
        currentDiagramMeta.value = { ...(currentDiagramMeta.value || {}), ...updatedMeta }
        updateDiagramsList(updatedMeta)
        if (saveVersion && mindmapStore.map.updatedAt === saveVersion) mindmapStore.markSaved()
        pendingPayload.value = null
        pendingCreate.value = false
      }
    } else {
      const response = await api.post('diagrammes', body)
      const newId = response?.data?.id || response?.data?.idMindMap
      if (newId) {
        const createdMeta = { ...body, idMindMap: newId }
        currentDiagramId.value = newId
        currentDiagramMeta.value = createdMeta
        updateDiagramsList(createdMeta)
        if (saveVersion && mindmapStore.map.updatedAt === saveVersion) mindmapStore.markSaved()
        pendingPayload.value = null
        pendingCreate.value = false
      }
    }
  } catch {
    toast.error('Erreur sauvegarde automatique.')
  } finally {
    isSaving.value = false
  }
}

// ── Sauvegarde manuelle / export ──────────────────────────────────────────────
const handleSave = async (payload) => {
  const saveVersion = payload?.updatedAt
  exportName.value = payload.title || exportName.value || 'Carte mentale'
  if (!currentDiagramId.value) {
    pendingCreate.value = true
    pendingPayload.value = payload
    showExportModal.value = true
    return
  }
  try {
    isSaving.value = true
    const meta = ensureMeta(payload)
    const response = await api.put(`/diagrammes/${currentDiagramId.value}`, {
      mmName: meta.mmName,
      mindMapJson: payload,
      subjectId: meta.subjectId,
    })
    if (response) {
      toast.success('Carte sauvegardée.')
      if (currentDiagramMeta.value) {
        currentDiagramMeta.value.mmName = meta.mmName
        currentDiagramMeta.value.mindMapJson = payload
      }
      await fetchDiagrams()
      if (saveVersion && mindmapStore.map.updatedAt === saveVersion) mindmapStore.markSaved()
    }
  } catch {
    toast.error('Erreur lors de la sauvegarde.')
  } finally {
    isSaving.value = false
  }
}

const handleExport = (payload) => {
  exportName.value = payload.title || exportName.value || 'Carte mentale'
  pendingCreate.value = !currentDiagramId.value
  pendingPayload.value = payload
  showExportModal.value = true
}

const handleNewMap = (payload) => {
  currentDiagramId.value = null
  currentDiagramMeta.value = { mmName: payload.title, subjectId: 1 }
  currentMapPayload.value = payload
  exportName.value = payload.title
  toast.success('Nouvelle carte mentale.')
}

const confirmExportModal = async () => {
  if (!pendingPayload.value) return
  const saveVersion = pendingPayload.value?.updatedAt
  try {
    isExporting.value = true
    const meta = ensureMeta(pendingPayload.value)
    const body = {
      mmName: meta.mmName,
      mindMapJson: pendingPayload.value,
      subjectId: meta.subjectId,
    }
    if (!pendingCreate.value && currentDiagramId.value) {
      const response = await api.put(`/diagrammes/${currentDiagramId.value}`, body)
      if (response) {
        toast.success('Carte mise à jour.')
        if (currentDiagramMeta.value) {
          currentDiagramMeta.value.mmName = meta.mmName
          currentDiagramMeta.value.mindMapJson = pendingPayload.value
        }
        if (saveVersion && mindmapStore.map.updatedAt === saveVersion) mindmapStore.markSaved()
      }
    } else {
      const response = await api.post('diagrammes', body)
      const newId = response?.data?.id || response?.data?.idMindMap
      if (newId) {
        currentDiagramId.value = newId
        currentDiagramMeta.value = { ...body, idMindMap: newId }
        toast.success('Carte créée.')
        if (saveVersion && mindmapStore.map.updatedAt === saveVersion) mindmapStore.markSaved()
      }
    }
    await fetchDiagrams()
  } catch {
    toast.error('Erreur lors de la sauvegarde.')
  } finally {
    isExporting.value = false
    showExportModal.value = false
    pendingPayload.value = null
    pendingCreate.value = false
  }
}

// ── Watchers auto-save ────────────────────────────────────────────────────────
watch(
  () => mindmapStore.map.updatedAt,
  () => {
    if (mindmapStore.isDirty && view.value === 'editor') scheduleAutoSave()
  }
)

watch(
  () => showExportModal.value,
  (isOpen) => {
    if (!isOpen && mindmapStore.isDirty) scheduleAutoSave()
  }
)

// ── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([fetchDiagrams(), subjectStore.fetchSubjects()])
  loading.value = false
})

onBeforeUnmount(() => {
  clearAutoSaveTimer()
})
</script>

<template>
  <!-- ── Vue liste ─────────────────────────────────────────────────────────── -->
  <template v-if="view === 'list'">
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
      @create="createNew"
    >
      <MenuItem
        v-for="diagram in filteredDiagrams"
        :key="diagram.idMindMap"
        :title="diagram.mmName"
        :description="subjectName(diagram.subjectId)"
        action-label="Ouvrir l'éditeur"
        :on-action="() => openDiagram(diagram)"
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
                <input
                  v-model="createName"
                  type="text"
                  class="form-input"
                  required
                  autofocus
                />
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
                <input
                  v-model="editedName"
                  type="text"
                  class="form-input"
                  required
                  autofocus
                />
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

  <!-- ── Vue éditeur ───────────────────────────────────────────────────────── -->
  <template v-else>
    <div class="editor-view">
      <div class="editor-topbar">
        <button class="editor-back-btn" @click="backToList">← Mes cartes mentales</button>
        <span class="editor-map-name">{{ currentDiagramMeta?.mmName || 'Nouvelle carte' }}</span>
        <span v-if="isSaving" class="editor-save-status">Sauvegarde…</span>
        <span v-else-if="!mindmapStore.isDirty" class="editor-save-status editor-save-status--saved">
          Sauvegardé
        </span>
      </div>

      <div class="editor-canvas">
        <MindMapBuilder
          :map-payload="currentMapPayload"
          :loading="isSaving || isExporting"
          @save="handleSave"
          @export="handleExport"
          @new-map="handleNewMap"
        />
      </div>
    </div>

    <!-- Modal nom (première création / export) -->
    <div v-if="showExportModal" class="modal-overlay" @click="showExportModal = false">
      <div class="modal-panel" @click.stop>
        <button @click="showExportModal = false" class="modal-close">&times;</button>
        <h2 class="modal-title">Enregistrer la carte mentale</h2>
        <form @submit.prevent="confirmExportModal">
          <div class="mb-4">
            <label class="form-label">Nom</label>
            <input
              v-model="exportName"
              type="text"
              class="form-input"
              required
              autofocus
            />
          </div>
          <div class="mb-4">
            <label class="form-label">Matière</label>
            <select
              :value="currentDiagramMeta?.subjectId"
              @change="currentDiagramMeta && (currentDiagramMeta.subjectId = Number($event.target.value) || null)"
              class="form-input"
            >
              <option :value="null">— Aucune matière —</option>
              <option v-for="s in subjects" :key="s.subjectId" :value="s.subjectId">
                {{ s.name }}
              </option>
            </select>
          </div>
          <div class="btn-row">
            <button type="submit" :disabled="isExporting" class="btn-modal-submit">
              Valider
            </button>
            <button type="button" @click="showExportModal = false" class="btn-modal-cancel">
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  </template>
</template>

<style scoped>
/* ── Vue éditeur ─────────────────────────────────────────────────────────────── */
.editor-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f1f5f9;
}

.editor-topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
  flex-shrink: 0;
}

.editor-back-btn {
  background: none;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 6px 14px;
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
}
.editor-back-btn:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.editor-map-name {
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.editor-save-status {
  font-size: 13px;
  color: #94a3b8;
  white-space: nowrap;
}
.editor-save-status--saved {
  color: #22c55e;
}

.editor-canvas {
  flex: 1;
  min-height: 0;
}

/* ── Badge sujet (vue liste) ─────────────────────────────────────────────────── */
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
