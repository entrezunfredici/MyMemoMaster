import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useToast } from 'vue-toastification'
import { mindmapApi } from '@/helpers/mindmap/mindmapApi'
import { useMindMapBuilderStore } from '@/stores/mindmapBuilder'
import { useGuidedTourStore } from '@/stores/guidedTour'

const AUTO_SAVE_DELAY = 1500
const AUTO_SAVE_RETRY_DELAY = 5000
const AUTO_SAVE_MAX_RETRY = 3

/**
 * Enregistrement d'une carte mentale dans l'éditeur : auto-sauvegarde (avec reprises),
 * sauvegarde manuelle et enregistrement par la modale « nom / matière ».
 *
 * Les trois chemins passent par UNE fonction `persist` (créer ou mettre à jour, tenir à jour les
 * métadonnées, le parcours guidé et l'état « modifié ») ; ils ne diffèrent que par leurs messages
 * et leur gestion d'erreur.
 *
 * @param {{ diagramId: number|null, diagramMeta: object|null }} props - props réactives de l'éditeur
 */
export function useMindmapPersistence(props) {
  const toast = useToast()
  const mindmapStore = useMindMapBuilderStore()
  const guidedTourStore = useGuidedTourStore()

  // ── État ──────────────────────────────────────────────────────────────────────
  const currentDiagramId = ref(props.diagramId)
  const currentDiagramMeta = ref(props.diagramMeta ? { ...props.diagramMeta } : null)
  const isSaving = ref(false)
  const isExporting = ref(false)
  const saveHasFailed = ref(false)
  const showExportModal = ref(false)
  const exportName = ref(props.diagramMeta?.mmName || '')
  const pendingPayload = ref(null) // carte en attente de validation dans la modale

  // ── Noyau commun ──────────────────────────────────────────────────────────────

  // Parcours guidé : l'étape « carte mentale » exige un minimum de nœuds autour du nœud central
  const recordTourProgress = (payload) => {
    const nodeCount = Object.keys(payload?.nodes || {}).length
    guidedTourStore.recordLinks({ mindMapChildNodes: Math.max(0, nodeCount - 1) })
  }

  const ensureMeta = (payload) => ({
    subjectId: Number(currentDiagramMeta.value?.subjectId || 1),
    mmName: exportName.value || payload.title || 'Carte mentale',
  })

  /**
   * Envoie la carte : met à jour la carte existante, ou la crée si elle n'a pas encore d'identifiant
   * (l'identifiant reçu est alors adopté, les sauvegardes suivantes mettent à jour).
   * Après un envoi réussi : métadonnées, parcours guidé et état « modifié » sont mis à jour — sauf si la
   * carte a encore changé pendant l'envoi (son `updatedAt` n'est plus celui qui a été envoyé).
   *
   * @returns {Promise<{ created: boolean }|null>} null si l'API n'a rien confirmé ; lève en cas d'erreur réseau
   */
  const persist = async (payload) => {
    const saveVersion = payload?.updatedAt
    const meta = ensureMeta(payload)
    const body = { mmName: meta.mmName, mindMapJson: payload, subjectId: meta.subjectId }
    let created = false

    if (currentDiagramId.value) {
      if (!(await mindmapApi.updateDiagram(currentDiagramId.value, body))) return null
      currentDiagramMeta.value = { ...(currentDiagramMeta.value || {}), ...body, idMindMap: currentDiagramId.value }
    } else {
      const response = await mindmapApi.createDiagram(body)
      const newId = response?.data?.id || response?.data?.idMindMap
      if (!newId) return null
      currentDiagramId.value = newId
      currentDiagramMeta.value = { ...body, idMindMap: newId }
      guidedTourStore.recordLinks({ mindMapId: newId, subjectId: meta.subjectId })
      created = true
    }

    recordTourProgress(payload)
    if (saveVersion && mindmapStore.map.updatedAt === saveVersion) mindmapStore.markSaved()
    return { created }
  }

  // ── Auto-sauvegarde ───────────────────────────────────────────────────────────
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

  async function performAutoSave() {
    autoSaveTimer = null
    if (!mindmapStore.isDirty) return
    // un envoi ou la modale sont en cours : on repasse plus tard plutôt que d'envoyer deux fois
    if (isSaving.value || isExporting.value || showExportModal.value) {
      scheduleAutoSave()
      return
    }

    const payload = mindmapStore.exportPayload()
    if (!payload) return
    exportName.value = payload.title || exportName.value || 'Carte mentale'

    try {
      isSaving.value = true
      if (await persist(payload)) {
        pendingPayload.value = null
        autoSaveRetryCount = 0
        saveHasFailed.value = false
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
    exportName.value = payload.title || exportName.value || 'Carte mentale'
    if (!currentDiagramId.value) {
      // première sauvegarde : on demande d'abord le nom et la matière
      pendingPayload.value = payload
      showExportModal.value = true
      return
    }
    try {
      isSaving.value = true
      if (await persist(payload)) toast.success('Carte sauvegardée.')
    } catch {
      toast.error('Erreur lors de la sauvegarde.')
    } finally {
      isSaving.value = false
    }
  }

  // ── Enregistrement par la modale ──────────────────────────────────────────────
  const handleExport = (payload) => {
    exportName.value = payload.title || exportName.value || 'Carte mentale'
    pendingPayload.value = payload
    showExportModal.value = true
  }

  const confirmExportModal = async () => {
    if (!pendingPayload.value) return
    try {
      isExporting.value = true
      const result = await persist(pendingPayload.value)
      if (result) toast.success(result.created ? 'Carte créée.' : 'Carte mise à jour.')
    } catch {
      toast.error('Erreur lors de la sauvegarde.')
    } finally {
      isExporting.value = false
      showExportModal.value = false
      pendingPayload.value = null
    }
  }

  /** Bascule vers une carte neuve (pas encore enregistrée) dans le même éditeur. */
  const startNewMap = (payload) => {
    currentDiagramId.value = null
    currentDiagramMeta.value = { mmName: payload.title, subjectId: currentDiagramMeta.value?.subjectId || 1 }
    exportName.value = payload.title
    toast.success('Nouvelle carte mentale.')
  }

  // ── Observation de la carte et cycle de vie ───────────────────────────────────
  watch(
    () => mindmapStore.map.updatedAt,
    () => { if (mindmapStore.isDirty) scheduleAutoSave() }
  )

  watch(
    () => showExportModal.value,
    (isOpen) => { if (!isOpen && mindmapStore.isDirty) scheduleAutoSave() }
  )

  onMounted(() => {
    // CHOIX: déclencher la sauvegarde automatique dès l'ouverture d'une carte
    // fraîchement créée (pas d'id existant), plutôt que d'attendre une
    // première modification ou un clic manuel sur "Sauvegarder".
    // RAISON: le nom saisi dans la modale de création doit être persisté
    // immédiatement, sans action supplémentaire de l'utilisateur.
    if (!currentDiagramId.value) {
      mindmapStore.touch()
    } else if (props.diagramMeta?.mindMapJson) {
      // CHOIX: valider l'étape « carte mentale » dès l'ouverture d'une carte déjà enregistrée
      // et suffisamment remplie, plutôt que d'exiger une modification dans l'éditeur.
      // RAISON: une carte arrivée du serveur déjà complète laissait « Étape suivante » inactif.
      guidedTourStore.recordLinks({ mindMapId: currentDiagramId.value, subjectId: props.diagramMeta.subjectId })
      recordTourProgress(props.diagramMeta.mindMapJson)
    }
  })

  onBeforeUnmount(clearAutoSaveTimer)

  return {
    currentDiagramId,
    currentDiagramMeta,
    isSaving,
    isExporting,
    saveHasFailed,
    showExportModal,
    exportName,
    handleSave,
    handleExport,
    confirmExportModal,
    startNewMap,
  }
}
