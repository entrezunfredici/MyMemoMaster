import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { api } from '@/helpers/api';
import { useToast } from 'vue-toastification';
import MindMapBuilder from '@/components/mindmap/MindMapBuilder.vue';
import { useMindMapBuilderStore } from '@/stores/mindmapBuilder';

const toast = useToast();
const mindmapStore = useMindMapBuilderStore();

const builderRef = ref(null);
const diagrams = ref([]);
const currentDiagramId = ref(null);
const currentDiagramMeta = ref(null);
const currentMapPayload = ref(null);
const searchQuery = ref('');
const editMode = ref(false);
const deleteMode = ref(false);
const showEditModal = ref(false);
const editedName = ref('');
const currentEditId = ref(null);
const users = ref([]);
const subjects = ref([]);
const selectedUser = ref('');
const selectedSubject = ref('');
const isSaving = ref(false);
const isExporting = ref(false);
const showExportModal = ref(false);
const exportName = ref('');
const pendingPayload = ref(null);
const pendingCreate = ref(false);

const AUTO_SAVE_DELAY = 1500;
let autoSaveTimer = null;

const fetchDiagrams = async () => {
  try {
    const response = await api.get('diagrammes/all');
    diagrams.value = response?.data || [];
    if (currentDiagramId.value) {
      const match = diagrams.value.find((d) => d.idMindMap === currentDiagramId.value);
      if (match) {
        currentDiagramMeta.value = { ...match };
      }
    }
    fetchFilters();
  } catch (error) {
    console.error('Erreur API :', error);
  }
};

const fetchFilters = () => {
  users.value = [...new Set(diagrams.value.map((d) => d.userId).filter(Boolean))];
  subjects.value = [...new Set(diagrams.value.map((d) => d.subjectId).filter(Boolean))];
};

const filteredDiagrams = computed(() => {
  return diagrams.value.filter((diagram) => {
    const matchUser = selectedUser.value ? String(diagram.userId) === String(selectedUser.value) : true;
    const matchSubject = selectedSubject.value ? String(diagram.subjectId) === String(selectedSubject.value) : true;
    const matchSearch = diagram.mmName?.toLowerCase().includes(searchQuery.value.toLowerCase());
    return matchUser && matchSubject && matchSearch;
  });
});

const toggleEditMode = () => {
  editMode.value = !editMode.value;
  toast[editMode.value ? 'success' : 'warning'](`Mode edition ${editMode.value ? 'active' : 'desactive'}`);
};

const toggleDeleteMode = () => {
  deleteMode.value = !deleteMode.value;
  toast[deleteMode.value ? 'success' : 'warning'](`Mode suppression ${deleteMode.value ? 'active' : 'desactive'}`);
};

const confirmDelete = async (diagram) => {
  const confirmed = confirm(`Supprimer la carte mentale "${diagram.mmName}" ?`);
  if (!confirmed) return;
  try {
    const response = await api.del(`diagrammes/${diagram.idMindMap}`);
    if (response && [200, 204].includes(response.status)) {
      toast.success('Diagramme supprime');
      diagrams.value = diagrams.value.filter((d) => d.idMindMap !== diagram.idMindMap);
      if (currentDiagramId.value === diagram.idMindMap) {
        currentDiagramId.value = null;
        currentDiagramMeta.value = null;
        currentMapPayload.value = null;
      }
    } else {
      toast.warning('Suppression impossible');
    }
  } catch (error) {
    toast.error('Erreur suppression diagramme');
  }
};

const openEditModal = (diagram) => {
  currentEditId.value = diagram.idMindMap;
  editedName.value = diagram.mmName;
  showEditModal.value = true;
};

const confirmEdit = async () => {
  try {
    const diagram = diagrams.value.find((d) => d.idMindMap === currentEditId.value);
    if (!diagram) return;
    const payload = {
      mmName: editedName.value,
      mindMapJson: diagram.mindMapJson,
      userId: diagram.userId,
      subjectId: diagram.subjectId,
    };
    const response = await api.put(`/diagrammes/${currentEditId.value}`, payload);
    if (response) {
      toast.success('Nom modifie');
      diagram.mmName = editedName.value;
      if (currentDiagramId.value === diagram.idMindMap && currentDiagramMeta.value) {
        currentDiagramMeta.value.mmName = editedName.value;
      }
    }
    showEditModal.value = false;
  } catch (error) {
    toast.error('Erreur modification nom');
  }
};

const loadDiagram = (diagram) => {
  if (editMode.value) return openEditModal(diagram);
  if (deleteMode.value) return confirmDelete(diagram);

  try {
    const jsonData = typeof diagram.mindMapJson === 'string'
      ? JSON.parse(diagram.mindMapJson)
      : diagram.mindMapJson;
    currentDiagramId.value = diagram.idMindMap;
    currentDiagramMeta.value = { ...diagram };
    currentMapPayload.value = jsonData;
  } catch (error) {
    toast.error('Erreur chargement diagramme');
  }
};

const ensureMeta = (payload) => {
  const fallbackUser = selectedUser.value || currentDiagramMeta.value?.userId || 1;
  const fallbackSubject = selectedSubject.value || currentDiagramMeta.value?.subjectId || 1;
  return {
    userId: Number(fallbackUser),
    subjectId: Number(fallbackSubject),
    mmName: exportName.value || payload.title || 'Carte mentale',
  };
};

const updateDiagramsList = (entry) => {
  if (!entry?.idMindMap) return;
  const existingIndex = diagrams.value.findIndex((diagram) => diagram.idMindMap === entry.idMindMap);
  if (existingIndex === -1) {
    diagrams.value = [entry, ...diagrams.value];
  } else {
    diagrams.value = diagrams.value.map((diagram, index) =>
      index === existingIndex ? { ...diagram, ...entry } : diagram
    );
  }
};

const clearAutoSaveTimer = () => {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
  }
};

const scheduleAutoSave = () => {
  clearAutoSaveTimer();
  autoSaveTimer = setTimeout(performAutoSave, AUTO_SAVE_DELAY);
};

const performAutoSave = async () => {
  autoSaveTimer = null;
  if (!mindmapStore.isDirty) return;
  if (isSaving.value || isExporting.value || showExportModal.value) {
    scheduleAutoSave();
    return;
  }

  const payload = mindmapStore.exportPayload();
  if (!payload) return;
  const saveVersion = payload?.updatedAt;
  exportName.value = payload.title || exportName.value || 'Carte mentale';
  const meta = ensureMeta(payload);
  const body = {
    mmName: meta.mmName,
    mindMapJson: payload,
    userId: meta.userId,
    subjectId: meta.subjectId,
  };

  try {
    isSaving.value = true;
    if (currentDiagramId.value) {
      const response = await api.put(`/diagrammes/${currentDiagramId.value}`, body);
      if (response) {
        const updatedMeta = { ...body, idMindMap: currentDiagramId.value };
        currentDiagramMeta.value = { ...(currentDiagramMeta.value || {}), ...updatedMeta };
        updateDiagramsList(updatedMeta);
        fetchFilters();
        if (saveVersion && mindmapStore.map.updatedAt === saveVersion) {
          mindmapStore.markSaved();
        }
        pendingPayload.value = null;
        pendingCreate.value = false;
      }
    } else {
      const response = await api.post('diagrammes/add', body);
      const newId = response?.data?.id || response?.data?.idMindMap;
      if (newId) {
        const createdMeta = { ...body, idMindMap: newId };
        currentDiagramId.value = newId;
        currentDiagramMeta.value = createdMeta;
        updateDiagramsList(createdMeta);
        fetchFilters();
        if (saveVersion && mindmapStore.map.updatedAt === saveVersion) {
          mindmapStore.markSaved();
        }
        pendingPayload.value = null;
        pendingCreate.value = false;
      }
    }
  } catch (error) {
    console.error('Erreur sauvegarde auto', error);
    toast.error('Erreur sauvegarde automatique');
  } finally {
    isSaving.value = false;
  }
};

const handleSave = async (payload) => {
  const saveVersion = payload?.updatedAt;
  exportName.value = payload.title || exportName.value || 'Carte mentale';
  if (!currentDiagramId.value) {
    pendingCreate.value = true;
    pendingPayload.value = payload;
    showExportModal.value = true;
    return;
  }
  try {
    isSaving.value = true;
    const meta = ensureMeta(payload);
    const response = await api.put(`/diagrammes/${currentDiagramId.value}`, {
      mmName: meta.mmName,
      mindMapJson: payload,
      userId: meta.userId,
      subjectId: meta.subjectId,
    });
    if (response) {
      toast.success('Diagramme sauvegarde');
      if (currentDiagramMeta.value) {
        currentDiagramMeta.value.mmName = meta.mmName;
        currentDiagramMeta.value.mindMapJson = payload;
      }
      await fetchDiagrams();
      if (saveVersion && mindmapStore.map.updatedAt === saveVersion) {
        mindmapStore.markSaved();
      }
    }
  } catch (error) {
    toast.error('Erreur sauvegarde');
  } finally {
    isSaving.value = false;
  }
};

const handleExport = (payload) => {
  exportName.value = payload.title || exportName.value || 'Carte mentale';
  pendingCreate.value = !currentDiagramId.value;
  pendingPayload.value = payload;
  showExportModal.value = true;
};

const handleNewMap = (payload) => {
  currentDiagramId.value = null;
  currentDiagramMeta.value = {
    mmName: payload.title,
    userId: selectedUser.value || 1,
    subjectId: selectedSubject.value || 1,
  };
  currentMapPayload.value = payload;
  exportName.value = payload.title;
  toast.success('Nouvelle carte mentale');
};

const confirmExportModal = async () => {
  if (!pendingPayload.value) return;
  const saveVersion = pendingPayload.value?.updatedAt;
  try {
    isExporting.value = true;
    const meta = ensureMeta(pendingPayload.value);
    const body = {
      mmName: meta.mmName,
      mindMapJson: pendingPayload.value,
      userId: meta.userId,
      subjectId: meta.subjectId,
    };

    if (!pendingCreate.value && currentDiagramId.value) {
      const response = await api.put(`/diagrammes/${currentDiagramId.value}`, body);
      if (response) {
        toast.success('Diagramme mis a jour');
        if (currentDiagramMeta.value) {
          currentDiagramMeta.value.mmName = meta.mmName;
          currentDiagramMeta.value.mindMapJson = pendingPayload.value;
        }
        if (saveVersion && mindmapStore.map.updatedAt === saveVersion) {
          mindmapStore.markSaved();
        }
      }
    } else {
      const response = await api.post('diagrammes/add', body);
      const newId = response?.data?.id || response?.data?.idMindMap;
      if (newId) {
        currentDiagramId.value = newId;
        currentDiagramMeta.value = { ...body, idMindMap: newId };
        toast.success('Diagramme cree');
        if (saveVersion && mindmapStore.map.updatedAt === saveVersion) {
          mindmapStore.markSaved();
        }
      }
    }
    await fetchDiagrams();
  } catch (error) {
    toast.error('Erreur export');
  } finally {
    isExporting.value = false;
    showExportModal.value = false;
    pendingPayload.value = null;
    pendingCreate.value = false;
  }
};

watch(
  () => mindmapStore.map.updatedAt,
  () => {
    if (mindmapStore.isDirty) {
      scheduleAutoSave();
    }
  }
);

watch(
  () => showExportModal.value,
  (isOpen) => {
    if (!isOpen && mindmapStore.isDirty) {
      scheduleAutoSave();
    }
  }
);

onMounted(async () => {
    await fetchDiagrams();
});

onBeforeUnmount(() => {
    clearAutoSaveTimer();
});