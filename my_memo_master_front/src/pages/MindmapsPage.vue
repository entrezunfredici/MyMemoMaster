<script setup>
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
</script>

<template>
  <div class="mindmaps-page">
    <header class="mindmaps-page__header">
      <h1>Mind Maps</h1>
    </header>
    <div class="mindmaps-page__layout">
      <aside class="mindmaps-page__sidebar">
        <div class="sidebar__tools">
          <div class="sidebar__modes">
            <button @click="toggleEditMode" :class="{ active: editMode }">Editer</button>
            <button @click="toggleDeleteMode" :class="{ active: deleteMode }">Supprimer</button>
          </div>
          <input v-model="searchQuery" placeholder="Rechercher..." />
          <select v-model="selectedUser">
            <option value="">Tous les utilisateurs</option>
            <option v-for="user in users" :key="user" :value="user">Utilisateur {{ user }}</option>
          </select>
          <select v-model="selectedSubject">
            <option value="">Toutes les matieres</option>
            <option v-for="subject in subjects" :key="subject" :value="subject">Matiere {{ subject }}</option>
          </select>
        </div>
        <ul class="sidebar__list">
          <li
            v-for="diagram in filteredDiagrams"
            :key="diagram.idMindMap"
            :class="['sidebar__item', { active: diagram.idMindMap === currentDiagramId }]"
          >
            <div class="sidebar__item-main" @click="loadDiagram(diagram)">
              <span class="sidebar__item-title">{{ diagram.mmName }}</span>
              <small class="sidebar__item-meta">Utilisateur {{ diagram.userId }} - Matiere {{ diagram.subjectId }}</small>
            </div>
            <div class="sidebar__item-actions">
              <button v-if="editMode" @click.stop="openEditModal(diagram)">Renommer</button>
              <button v-if="deleteMode" class="danger" @click.stop="confirmDelete(diagram)">Supprimer</button>
            </div>
          </li>
        </ul>
      </aside>

      <main class="mindmaps-page__content">
        <MindMapBuilder
          ref="builderRef"
          :map-payload="currentMapPayload"
          :loading="isSaving || isExporting"
          @save="handleSave"
          @export="handleExport"
          @new-map="handleNewMap"
        />
      </main>
    </div>

    <div v-if="showEditModal" class="modal">
      <div class="modal__dialog">
        <h2>Modifier le nom</h2>
        <input v-model="editedName" />
        <div class="modal__actions">
          <button @click="showEditModal = false">Annuler</button>
          <button class="primary" @click="confirmEdit">Valider</button>
        </div>
      </div>
    </div>

    <div v-if="showExportModal" class="modal">
      <div class="modal__dialog">
        <h2>Nom de la carte mentale</h2>
        <input v-model="exportName" />
        <div class="modal__actions">
          <button @click="showExportModal = false">Annuler</button>
          <button class="primary" @click="confirmExportModal" :disabled="isExporting">Valider</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mindmaps-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 100vh;
  background: rgb(var(--surface-muted));
  padding: 16px;
}

.mindmaps-page__header {
  background: rgb(var(--white));
  padding: 16px;
  border-radius: 16px;
  box-shadow: 0 8px 20px rgb(var(--text-strong) / 0.08);
}

.mindmaps-page__header h1 {
  font-size: 24px;
  font-weight: 700;
  color: rgb(var(--text-base));
}

.mindmaps-page__layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 16px;
  flex: 1;
}

.mindmaps-page__sidebar {
  background: rgb(var(--white));
  border-radius: 20px;
  padding: 16px;
  box-shadow: 0 12px 24px rgb(var(--text-strong) / 0.08);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sidebar__tools {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sidebar__modes {
  display: flex;
  gap: 8px;
}

.sidebar__modes button {
  flex: 1;
  padding: 8px 12px;
  border-radius: 12px;
  border: none;
  background: rgb(var(--surface-neutral));
  cursor: pointer;
  font-weight: 600;
}

.sidebar__modes button.active {
  background: rgb(var(--info));
  color: rgb(var(--white));
}

.sidebar__tools input,
.sidebar__tools select {
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgb(var(--border-strong));
  font-size: 14px;
}

.sidebar__list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  overflow-y: auto;
}

.sidebar__item {
  background: rgb(var(--surface-soft));
  border-radius: 14px;
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: border 0.2s ease, transform 0.2s ease;
}

.sidebar__item.active {
  border-color: rgb(var(--info));
  transform: translateY(-1px);
}

.sidebar__item-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sidebar__item-title {
  font-weight: 600;
  color: rgb(var(--text-base));
}

.sidebar__item-meta {
  color: rgb(var(--text-soft));
  font-size: 12px;
}

.sidebar__item-actions {
  display: flex;
  gap: 6px;
}

.sidebar__item-actions button {
  padding: 6px 10px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  background: rgb(var(--surface-info));
  color: rgb(var(--text-strong));
}

.sidebar__item-actions .danger {
  background: rgb(var(--danger-soft));
  color: rgb(var(--danger));
}

.mindmaps-page__content {
  background: transparent;
  border-radius: 20px;
  min-height: 0;
}

.modal {
  position: fixed;
  inset: 0;
  background: rgb(var(--text-strong) / 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal__dialog {
  background: rgb(var(--white));
  padding: 20px;
  border-radius: 16px;
  width: 320px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modal__dialog input {
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgb(var(--border-strong));
}

.modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.modal__actions button {
  padding: 8px 12px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-weight: 600;
}

.modal__actions .primary {
  background: rgb(var(--info));
  color: rgb(var(--white));
}
</style>

