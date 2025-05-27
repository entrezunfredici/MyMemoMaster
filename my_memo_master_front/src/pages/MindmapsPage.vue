
<script setup>
import DiagramTest from '@/components/DiagramTestComponent.vue';
import { ref, onMounted, computed } from 'vue';
import { api } from '@/helpers/api';
import { useToast } from 'vue-toastification';

const toast = useToast();

// Refs et états
const diagramTestRef = ref(null);
const diagrams = ref([]);
const currentDiagramId = ref(null);
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

// Récupère les diagrammes
const fetchDiagrams = async () => {
  try {
    const response = await api.get('diagramme/all');
    diagrams.value = response.data;
  } catch (error) {
    console.error('Erreur API :', error);
  }
};

// Récupère les users et matières uniques
const fetchFilters = () => {
  users.value = [...new Set(diagrams.value.map(d => d.userId))];
  subjects.value = [...new Set(diagrams.value.map(d => d.idSubject))];
};

// Filtres
const filteredDiagrams = computed(() => {
  return diagrams.value.filter(d => {
    const matchUser = selectedUser.value ? d.userId == selectedUser.value : true;
    const matchSubject = selectedSubject.value ? d.idSubject == selectedSubject.value : true;
    const matchSearch = d.mmName.toLowerCase().includes(searchQuery.value.toLowerCase());
    return matchUser && matchSubject && matchSearch;
  });
});

// Mode édition
const toggleEditMode = () => {
  editMode.value = !editMode.value;
  toast[editMode.value ? 'success' : 'warning'](`Mode édition ${editMode.value ? 'activé' : 'désactivé'}`);
};

// Mode suppression
const toggleDeleteMode = () => {
  deleteMode.value = !deleteMode.value;
  toast[deleteMode.value ? 'success' : 'warning'](`Mode suppression ${deleteMode.value ? 'activé' : 'désactivé'}`);
};

// Supprimer un diagramme
const deleteDiagram = async (id) => {
  if (!deleteMode.value) return;
  const confirmDelete = confirm("Confirmer la suppression ?");
  if (!confirmDelete) return;

  try {
    const response = await api.delete(`/diagramme/${id}`);
    if (response.status === 204 || response.status === 200) {
      toast.success('Diagramme supprimé');
      fetchDiagrams();
    } else {
      toast.warning(`Échec suppression. Statut: ${response?.status}`);
    }
  } catch (error) {
    toast.error('Erreur API suppression');
  }
};
const confirmDelete = async (diagram) => {
  const confirmed = confirm(`🗑️ Supprimer la carte mentale "${diagram.mmName}" ?`);
  if (!confirmed) return;

  try {
    const response = await api.del(`diagramme/${diagram.idMindMap}`);
    if (response && [200, 204].includes(response.status)) {
      toast.success('Diagramme supprimé avec succès');
      diagrams.value = diagrams.value.filter(d => d.idMindMap !== diagram.idMindMap);
    } else {
      toast.warning(`Échec de la suppression. Code : ${response?.status || 'inconnu'}`);
    }
  } catch (error) {
    toast.error('Erreur lors de la suppression du diagramme');
    console.error('Erreur confirmDelete:', error);
  }
};


// Modifier un diagramme
const openEditModal = (diagram) => {
  currentEditId.value = diagram.idMindMap;
  editedName.value = diagram.mmName;
  showEditModal.value = true;
};


const confirmEdit = async () => {
  try {
    const diagram = diagrams.value.find(d => d.idMindMap === currentEditId.value);
    if (!diagram) return;

    await api.put(`/diagramme/${currentEditId.value}`, {
      mmName: editedName.value,
      mindMapJson: diagram.mindMapJson,
      userId: diagram.userId,
      idSubject: diagram.idSubject
    });

    toast.success('Nom modifié');
    fetchDiagrams();
    showEditModal.value = false;
  } catch (error) {
    toast.error('Erreur API modification');
  }
};

// Charger un diagramme dans le composant
const loadDiagram = async (diagram) => {
  if (editMode.value) return openEditModal(diagram);
  if (deleteMode.value) return deleteDiagram(diagram.idMindMap);

  try {
    const jsonData = typeof diagram.mindMapJson === 'string'
      ? JSON.parse(diagram.mindMapJson)
      : diagram.mindMapJson;

    currentDiagramId.value = diagram.idMindMap;
    diagramTestRef.value?.setDiagramId(currentDiagramId.value);
    diagramTestRef.value?.importDiagram(jsonData);
  } catch (error) {
    toast.error('Erreur de chargement du diagramme');
  }
};

onMounted(async () => {
  await fetchDiagrams();
  fetchFilters();
});
</script>

<template>
  <!-- Modal de modification -->
  <div v-if="showEditModal" class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
    <div class="bg-white p-6 rounded shadow-lg w-80" style="background-color: white !important;">
      <h2 class="text-lg font-bold mb-2">Modifier le nom</h2>
      <input v-model="editedName" class="w-full p-2 border rounded mb-4" />
      <div class="flex justify-end gap-2">
        <button @click="showEditModal = false" class="px-3 py-1 bg-gray-300 rounded">Annuler</button>
        <button @click="confirmEdit" class="px-3 py-1 bg-green-600 text-white rounded">Valider</button>
      </div>
    </div>
  </div>

  <div class="min-h-screen bg-gray-100">
    <header class="bg-white shadow p-4 flex justify-between items-center sticky top-0 z-10">
      <h1 class="text-2xl font-bold">Gestion des Diagrammes</h1>
    </header>

    <div class="flex">
      <aside class="w-1/4 bg-white border-r p-4 sticky top-[64px] h-[calc(100vh-64px)] overflow-y-auto">
        <div class="space-y-4">
          <div class="flex justify-between items-center">
            <h2 class="text-xl font-semibold">📋 Mes Diagrammes</h2>
            <div class="flex gap-2">
              <button @click="toggleEditMode" class="p-2 rounded-full bg-blue-500 text-white">✏️</button>
              <button @click="toggleDeleteMode" class="p-2 rounded-full bg-red-500 text-white">🗑️</button>
            </div>
          </div>

          <input v-model="searchQuery" placeholder="🔍 Rechercher..." class="w-full p-2 border rounded" />

          <select v-model="selectedUser" class="w-full p-2 border rounded">
            <option value="">Tous les utilisateurs</option>
            <option v-for="u in users" :key="u" :value="u">Utilisateur {{ u }}</option>
          </select>

          <select v-model="selectedSubject" class="w-full p-2 border rounded">
            <option value="">Toutes les matières</option>
            <option v-for="s in subjects" :key="s" :value="s">Matière {{ s }}</option>
          </select>

          <ul class="space-y-2">
            <li
                v-for="diagram in filteredDiagrams"
                :key="diagram.idMindMap"
                class="flex justify-between items-center p-3 bg-gray-100 rounded hover:bg-blue-100 cursor-pointer transition duration-200 shadow-sm"
                :class="{ 'bg-blue-200 text-blue-900 font-semibold': diagram.idMindMap === currentDiagramId }"
              >
                <span @click="loadDiagram(diagram)" class="flex-1">
                  {{ diagram.mmName }}
                </span>
                
                <!-- Actions : stylo et poubelle -->
                <div class="flex items-center gap-2 ml-4">
                  <button
                    v-if="editMode"
                    @click.stop="openEditModal(diagram)"
                    class="p-1 bg-yellow-500 text-white rounded-full hover:bg-yellow-600 transition-all duration-300"
                    title="Modifier"
                  >
                    ✏️
                  </button>
                  <button
                    v-if="deleteMode"
                    @click.stop="confirmDelete(diagram)"
                    class="p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all duration-300"
                    title="Supprimer"
                  >
                    🗑️
                  </button>
                  </div>
                </li>

          </ul>
        </div>
      </aside>

      <main class="w-3/4 p-4">
        <DiagramTest ref="diagramTestRef" />
      </main>
    </div>
  </div>
</template>
