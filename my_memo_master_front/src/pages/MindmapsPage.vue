<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import { useMindMapBuilderStore } from '@/stores/mindmapBuilder'
import { useSubjectStore } from '@/stores/subjects'
import MindmapsListView from '@/components/mindmap/MindmapsListView.vue'
import MindmapsEditorView from '@/components/mindmap/MindmapsEditorView.vue'

const toast = useToast()
const mindmapStore = useMindMapBuilderStore()
const subjectStore = useSubjectStore()
const subjects = computed(() => subjectStore.subjects)

// ── Navigation entre vues ─────────────────────────────────────────────────────
const view = ref('list')
const editorDiagramId = ref(null)
const editorDiagramMeta = ref(null)
const editorMapPayload = ref(null)

const handleOpen = (diagram) => {
  try {
    const payload =
      typeof diagram.mindMapJson === 'string'
        ? JSON.parse(diagram.mindMapJson)
        : diagram.mindMapJson
    editorDiagramId.value = diagram.idMindMap
    editorDiagramMeta.value = { ...diagram }
    editorMapPayload.value = payload
    view.value = 'editor'
  } catch {
    toast.error('Erreur lors du chargement de la carte.')
  }
}

const handleCreate = ({ name, subjectId }) => {
  const resolvedName = name || 'Nouvelle carte mentale'
  editorDiagramId.value = null
  editorDiagramMeta.value = { mmName: resolvedName, subjectId: subjectId || 1 }
  editorMapPayload.value = null
  mindmapStore.new(resolvedName)
  view.value = 'editor'
}

const handleBack = () => {
  view.value = 'list'
}

onMounted(() => subjectStore.fetchSubjects())
</script>

<template>
  <MindmapsListView
    v-if="view === 'list'"
    :subjects="subjects"
    @open="handleOpen"
    @create="handleCreate"
  />
  <MindmapsEditorView
    v-else
    :diagram-id="editorDiagramId"
    :diagram-meta="editorDiagramMeta"
    :map-payload="editorMapPayload"
    :subjects="subjects"
    @back="handleBack"
  />
</template>
