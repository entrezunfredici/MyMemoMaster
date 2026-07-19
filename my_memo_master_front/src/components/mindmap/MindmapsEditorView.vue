<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { api } from '@/helpers/api'
import { useToast } from 'vue-toastification'
import { useMindMapBuilderStore } from '@/stores/mindmapBuilder'
import { useGuidedTourStore } from '@/stores/guidedTour'
import MindMapBuilder from '@/components/mindmap/MindMapBuilder.vue'

const props = defineProps({
  diagramId: { type: Number, default: null },
  diagramMeta: { type: Object, default: null },
  mapPayload: { type: Object, default: null },
  subjects: { type: Array, default: () => [] },
})
const emit = defineEmits(['back'])
const toast = useToast()
const mindmapStore = useMindMapBuilderStore()
const guidedTourStore = useGuidedTourStore()

// ── État interne ──────────────────────────────────────────────────────────────
const currentDiagramId = ref(props.diagramId)
const currentDiagramMeta = ref(props.diagramMeta ? { ...props.diagramMeta } : null)
const isSaving = ref(false)
const isExporting = ref(false)
const saveHasFailed = ref(false)
const showExportModal = ref(false)
const exportName = ref(props.diagramMeta?.mmName || '')
const pendingPayload = ref(null)
const pendingCreate = ref(false)

// ── Auto-save ─────────────────────────────────────────────────────────────────
const AUTO_SAVE_DELAY = 1500
const AUTO_SAVE_RETRY_DELAY = 5000
const AUTO_SAVE_MAX_RETRY = 3
let autoSaveTimer = null
let autoSaveRetryCount = 0

const clearAutoSaveTimer = () => {
  if (autoSaveTimer) { clearTimeout(autoSaveTimer); autoSaveTimer = null }
}

const scheduleAutoSave = () => {
  clearAutoSaveTimer()
  autoSaveRetryCount = 0
  saveHasFailed.value = false
  autoSaveTimer = setTimeout(performAutoSave, AUTO_SAVE_DELAY)
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
        currentDiagramMeta.value = { ...(currentDiagramMeta.value || {}), ...body, idMindMap: currentDiagramId.value }
        if (saveVersion && mindmapStore.map.updatedAt === saveVersion) mindmapStore.markSaved()
        pendingPayload.value = null
        pendingCreate.value = false
        autoSaveRetryCount = 0
        saveHasFailed.value = false
      }
    } else {
      const response = await api.post('diagrammes', body)
      const newId = response?.data?.id || response?.data?.idMindMap
      if (newId) {
        currentDiagramId.value = newId
        currentDiagramMeta.value = { ...body, idMindMap: newId }
        guidedTourStore.recordLinks({ mindMapId: newId, subjectId: meta.subjectId })
        if (saveVersion && mindmapStore.map.updatedAt === saveVersion) mindmapStore.markSaved()
        pendingPayload.value = null
        pendingCreate.value = false
        autoSaveRetryCount = 0
        saveHasFailed.value = false
      }
    }
  } catch {
    autoSaveRetryCount++
    saveHasFailed.value = true
    if (autoSaveRetryCount === 1) toast.warning('Sauvegarde impossible, nouvelle tentative dans 5 s…')
    if (autoSaveRetryCount <= AUTO_SAVE_MAX_RETRY) {
      autoSaveTimer = setTimeout(performAutoSave, AUTO_SAVE_RETRY_DELAY)
    } else {
      autoSaveRetryCount = 0
      toast.error('Sauvegarde automatique échouée. Vérifiez votre connexion.')
    }
  } finally {
    isSaving.value = false
  }
}

// ── Sauvegarde manuelle ───────────────────────────────────────────────────────
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
  currentDiagramMeta.value = { mmName: payload.title, subjectId: currentDiagramMeta.value?.subjectId || 1 }
  exportName.value = payload.title
  toast.success('Nouvelle carte mentale.')
}

const confirmExportModal = async () => {
  if (!pendingPayload.value) return
  const saveVersion = pendingPayload.value?.updatedAt
  try {
    isExporting.value = true
    const meta = ensureMeta(pendingPayload.value)
    const body = { mmName: meta.mmName, mindMapJson: pendingPayload.value, subjectId: meta.subjectId }
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
        guidedTourStore.recordLinks({ mindMapId: newId, subjectId: meta.subjectId })
        toast.success('Carte créée.')
        if (saveVersion && mindmapStore.map.updatedAt === saveVersion) mindmapStore.markSaved()
      }
    }
  } catch {
    toast.error('Erreur lors de la sauvegarde.')
  } finally {
    isExporting.value = false
    showExportModal.value = false
    pendingPayload.value = null
    pendingCreate.value = false
  }
}

// ── Watchers ──────────────────────────────────────────────────────────────────
watch(
  () => mindmapStore.map.updatedAt,
  () => { if (mindmapStore.isDirty) scheduleAutoSave() }
)

watch(
  () => showExportModal.value,
  (isOpen) => { if (!isOpen && mindmapStore.isDirty) scheduleAutoSave() }
)

// ── Lifecycle ─────────────────────────────────────────────────────────────────
const handleBeforeUnload = (event) => {
  if (mindmapStore.isDirty) { event.preventDefault(); event.returnValue = '' }
}

onMounted(() => window.addEventListener('beforeunload', handleBeforeUnload))

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
  clearAutoSaveTimer()
})
</script>

<template>
  <div class="editor-view">
    <div class="editor-topbar">
      <button class="editor-back-btn" @click="emit('back')">← Mes cartes mentales</button>
      <span class="editor-map-name">{{ currentDiagramMeta?.mmName || 'Nouvelle carte' }}</span>
      <span v-if="isSaving" class="editor-save-status">Sauvegarde…</span>
      <span v-else-if="saveHasFailed" class="editor-save-status editor-save-status--error">
        ⚠ Connexion perdue — réessai en cours…
      </span>
      <span v-else-if="!mindmapStore.isDirty" class="editor-save-status editor-save-status--saved">
        Sauvegardé ✓
      </span>
    </div>

    <div class="editor-canvas">
      <MindMapBuilder
        :map-payload="props.mapPayload"
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
      <button aria-label="Fermer" @click="showExportModal = false" class="modal-close">&times;</button>
      <h2 class="modal-title">Enregistrer la carte mentale</h2>
      <form @submit.prevent="confirmExportModal">
        <div class="mb-4">
          <label class="form-label">Nom</label>
          <input aria-label="Nom de la carte mentale" v-model="exportName" type="text" class="form-input" required autofocus />
        </div>
        <div class="mb-4">
          <label class="form-label">Matière</label>
          <select aria-label="Sujet associé"
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
          <button type="submit" :disabled="isExporting" class="btn-modal-submit">Valider</button>
          <button type="button" @click="showExportModal = false" class="btn-modal-cancel">
            Annuler
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
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
.editor-save-status--saved { color: #22c55e; }
.editor-save-status--error { color: #ef4444; font-weight: 600; }

.editor-canvas {
  flex: 1;
  min-height: 0;
}
</style>
