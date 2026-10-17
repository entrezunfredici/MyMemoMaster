<script setup>
import { dialogDirective as vDialog } from '@/directives/dialog'
import { onMounted, onBeforeUnmount } from 'vue'
import { useMindMapBuilderStore } from '@/stores/mindmapBuilder'
import { useMindMapViewSessionStore } from '@/stores/mindmapViewSessions'
import { useMindmapPersistence } from '@/composables/useMindmapPersistence'
import MindMapBuilder from '@/components/mindmap/MindMapBuilder.vue'

const props = defineProps({
  diagramId: { type: Number, default: null },
  diagramMeta: { type: Object, default: null },
  mapPayload: { type: Object, default: null },
  subjects: { type: Array, default: () => [] },
})
const emit = defineEmits(['back'])
const mindmapStore = useMindMapBuilderStore()
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

// ── Enregistrement de la carte (auto-sauvegarde, sauvegarde manuelle, modale) ──────
const {
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
} = useMindmapPersistence(props)

const handleNewMap = (payload) => {
  // La consultation de la carte ouverte à l'origine (le cas échéant) s'arrête ici :
  // le temps passé ensuite sert à créer une carte neuve, pas à consulter viewedMindMapId.
  stopTracking()
  startNewMap(payload)
}

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
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
  window.removeEventListener('pagehide', handlePageHide)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  stopTracking()
})
</script>

<template>
  <div class="editor-view">
    <div class="editor-topbar">
      <button class="editor-back-btn" aria-label="Retour à mes cartes mentales" @click="emit('back')">←<span class="editor-back-label"> Mes cartes mentales</span></button>
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
        :id-mind-map="currentDiagramId"
        :loading="isSaving || isExporting"
        @save="handleSave"
        @export="handleExport"
        @new-map="handleNewMap"
      />
    </div>
  </div>

  <!-- Modal nom (première création / export) -->
  <div v-if="showExportModal" class="modal-overlay" @mousedown.self="showExportModal = false" v-dialog="() => { showExportModal = false }" role="dialog" aria-modal="true" aria-labelledby="mindmap-export-modal-title">
    <div class="modal-panel">
      <button aria-label="Fermer" @click="showExportModal = false" class="modal-close">&times;</button>
      <h2 id="mindmap-export-modal-title" class="modal-title">Enregistrer la carte mentale</h2>
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
  background: var(--slate-100);
}

.editor-topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  background: rgb(var(--white));
  border-bottom: 1px solid var(--slate-200);
  box-shadow: 0 2px 8px rgb(var(--slate-900-rgb) / 0.06);
  flex-shrink: 0;
}

.editor-back-btn {
  background: none;
  border: 1px solid var(--slate-300);
  border-radius: 8px;
  padding: 6px 14px;
  font-size: 14px;
  font-weight: 600;
  color: var(--slate-600);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
}
.editor-back-btn:hover {
  background: var(--slate-100);
  color: var(--slate-800);
}

.editor-map-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--gray-800);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.editor-save-status {
  font-size: 13px;
  color: var(--slate-500);
  white-space: nowrap;
}
.editor-save-status--saved { color: var(--green-800); }
.editor-save-status--error { color: var(--red-700); font-weight: 600; }

.editor-canvas {
  flex: 1;
  min-height: 0;
}

/* Mobile : l'éditeur occupe tout l'écran (par-dessus en-tête, bandeaux et barre de navigation) */
@media (max-width: 768px) {
  .editor-view {
    position: fixed;
    inset: 0;
    /* au-dessus de la barre de navigation mobile (46), sous les modals (50) */
    z-index: 47;
    height: 100dvh;
  }

  .editor-topbar {
    gap: 8px;
    padding: 8px 12px;
  }

  .editor-back-btn {
    min-width: 44px;
    min-height: 44px;
    padding: 6px 12px;
  }

  .editor-back-label {
    display: none;
  }

  .editor-map-name {
    font-size: 14px;
  }

  .editor-save-status {
    font-size: 11px;
  }

  .editor-canvas {
    padding: 0 8px 8px;
  }
}
</style>
