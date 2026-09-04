<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { api } from '@/helpers/api'
import { useToast } from 'vue-toastification'
import { useMindMapBuilderStore } from '@/stores/mindmapBuilder'
import { useGuidedTourStore } from '@/stores/guidedTour'
import { useMindMapViewSessionStore } from '@/stores/mindmapViewSessions'
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
const mindMapViewSessionStore = useMindMapViewSessionStore()

// ── Chronométrage de la consultation ───────────────────────────────────────────
// CHOIX: chronométrer uniquement l'ouverture d'une carte EXISTANTE (props.diagramId
// non nul au montage), pas la création d'une carte neuve dans ce même éditeur.
// RAISON: alimente le KPI "Temps total de révision" au même titre que les sessions
// Leitner et les exercices — "regarder une carte mentale" suppose une carte qui
// existe déjà ; créer une carte est une activité de création, pas de révision.
const viewedMindMapId = props.diagramId

// CHOIX: mesure par segments (ouverts/clos à chaque bascule visible ⇄ caché de
// l'onglet), plutôt qu'une seule mesure de bout en bout du montage au démontage.
// RAISON: un onglet laissé ouvert en arrière-plan (changement d'onglet, écran en
// veille, application mobile mise en arrière-plan) ne doit pas compter comme du
// temps de consultation ; et sur mobile, l'OS peut tuer l'onglet en arrière-plan
// sans jamais déclencher `pagehide` — sans clôture au passage en arrière-plan,
// tout le temps déjà passé serait perdu plutôt que journalisé. `visibilitychange`
// → 'hidden' clôt le segment en cours (via beacon, page potentiellement en train
// de se décharger) ; 'visible' en ouvre un nouveau si le suivi n'est pas arrêté.
// Chaque segment est journalisé séparément (plusieurs lignes MindMapViewSession
// pour une même consultation) — le KPI les additionne déjà toutes, voir
// Kpi.service.js#_computeRealMinutes.
let segmentStartedAt = viewedMindMapId ? Date.now() : null
let trackingActive = Boolean(viewedMindMapId)

/**
 * Clôt et journalise le segment de consultation en cours, s'il y en a un.
 * Ne referme PAS le suivi dans son ensemble — un nouveau segment peut
 * redémarrer ensuite (voir resumeSegment) tant que stopTracking() n'a pas été
 * appelé.
 *
 * @param {boolean} [useBeacon=false] - true si le segment se clôt parce que la
 *   page se cache ou se décharge (pagehide, visibilitychange 'hidden') : la
 *   requête normale (Axios) serait annulée par le navigateur, voir CHOIX dans
 *   stores/mindmapViewSessions.js.
 */
const flushSegment = (useBeacon = false) => {
  if (!trackingActive || segmentStartedAt === null) return
  const durationSeconds = Math.round((Date.now() - segmentStartedAt) / 1000)
  segmentStartedAt = null
  if (durationSeconds <= 0) return // rien à journaliser — évite le bruit des bascules trop brèves
  if (useBeacon) {
    mindMapViewSessionStore.logSessionBeacon(viewedMindMapId, durationSeconds)
  } else {
    mindMapViewSessionStore.logSession(viewedMindMapId, durationSeconds)
  }
}

/**
 * Clôt définitivement le suivi de `viewedMindMapId` (bouton Retour, bascule
 * "Nouvelle carte", fermeture d'onglet) : journalise le segment en cours s'il
 * y en a un, puis empêche tout redémarrage ultérieur (ex: un `visibilitychange`
 * tardif après démontage).
 *
 * @param {boolean} [useBeacon=false]
 */
const stopTracking = (useBeacon = false) => {
  flushSegment(useBeacon)
  trackingActive = false
}

/** Redémarre un segment quand l'onglet redevient visible, si le suivi est toujours actif. */
const resumeSegment = () => {
  if (!trackingActive || segmentStartedAt !== null) return
  segmentStartedAt = Date.now()
}

const handleVisibilityChange = () => {
  if (document.visibilityState === 'hidden') {
    flushSegment(true)
  } else if (document.visibilityState === 'visible') {
    resumeSegment()
  }
}

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
  // La consultation de la carte ouverte à l'origine (le cas échéant) s'arrête ici :
  // le temps passé ensuite sert à créer une carte neuve, pas à consulter viewedMindMapId.
  stopTracking()
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

// CHOIX: clôturer définitivement le suivi sur `pagehide` plutôt que de se
// reposer uniquement sur onBeforeUnmount (hook Vue). RAISON: `onBeforeUnmount`
// ne se déclenche que sur un démontage du composant (ex: clic sur "← Mes cartes
// mentales") — une fermeture réelle de l'onglet/du navigateur détruit le
// contexte JS sans exécuter les hooks Vue, donc sans jamais appeler
// stopTracking(). `pagehide` se déclenche dans les deux cas (navigation,
// fermeture d'onglet, mise en cache bfcache) et — contrairement à
// `beforeunload` — seulement quand la page se décharge réellement, pas quand
// l'utilisateur annule une boîte de dialogue de confirmation. Les gardes
// `trackingActive`/`segmentStartedAt` évitent un double envoi si `pagehide` se
// déclenche après un `visibilitychange` 'hidden' déjà traité, ou avant le
// démontage normal du composant.
const handlePageHide = () => stopTracking(true)

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
  window.addEventListener('pagehide', handlePageHide)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  // CHOIX: déclencher la sauvegarde automatique dès l'ouverture d'une carte
  // fraîchement créée (pas d'id existant), plutôt que d'attendre une
  // première modification ou un clic manuel sur "Sauvegarder".
  // RAISON: le nom saisi dans la modale de création doit être persisté
  // immédiatement, sans action supplémentaire de l'utilisateur.
  if (!currentDiagramId.value) {
    mindmapStore.touch()
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
  window.removeEventListener('pagehide', handlePageHide)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  clearAutoSaveTimer()
  stopTracking()
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
  <div v-if="showExportModal" class="modal-overlay" @mousedown.self="showExportModal = false">
    <div class="modal-panel">
      <button aria-label="Fermer" @click="showExportModal = false" class="modal-close">&times;</button>
      <h2 class="modal-title">Enregistrer la carte mentale</h2>
      <form @submit.prevent="confirmExportModal">
        <div class="mb-4">
          <label class="form-label">Nom</label>
          <input aria-label="Nom de la carte mentale" v-model="exportName" type="text" class="form-input" maxlength="50" required autofocus />
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
