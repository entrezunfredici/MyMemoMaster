<template>
  <div>
    Salut salut
  </div>
  <div class="flex h-screen">
  <!-- Colonne gauche avec scroll -->
  <div class="w-1/3 h-screen rounded-lg overflow-auto bg-blue-500 p-4 m-4 border border-white">
    <p class="h-[200vh]">Contenu long qui permet de scroller...</p>
  </div>

  <!-- Colonne droite fixe -->
  <div class="w-2/3 h-screen rounded-lg bg-green-500 p-4 m-4 border border-white sticky top-0">
    <DiagramTest ref="diagramTestRef"/>
    </div>
</div>

  <!-- Liste des diagrammes existants -->
  <h2>Liste des diagrammes</h2>
  <ul>
    <li v-for="diagram in diagrams" :key="diagram.idMindMap">
      <span @click="loadDiagram(diagram)" style="cursor: pointer; color: blue;">
        {{ diagram.mmName }}
      </span>
    </li>
  </ul>

</template>

<script setup>
import DiagramTest from '@/components/DiagramTestComponent.vue'
import { ref, onMounted } from 'vue';
import { api } from '@/helpers/api';  // Assure-toi que ton instance Axios est bien configurée

// Références pour les éléments HTML
const diagramTestRef = ref(null);

// Liste des diagrammes
const diagrams = ref([]);

// Fonction pour récupérer les diagrammes depuis la base de données
const fetchDiagrams = async () => {
  try {
    const response = await api.get('diagramme/all'); // Remplace par ton endpoint API
    diagrams.value = response.data; // Met à jour la liste des diagrammes
  } catch (error) {
    console.error('Erreur lors de la récupération des diagrammes :', error);
  }
};

// Fonction pour charger un diagramme existant
const loadDiagram = (diagram) => {
  try {
    let jsonData = diagram.mindMapJson;

    // Vérifier si c'est une chaîne, et la parser uniquement si nécessaire
    if (typeof jsonData === 'string') {
      jsonData = JSON.parse(jsonData);
    }

    // Appeler la fonction importDiagram du composant DiagramTest
    console.log(diagramTestRef.value)
    if (diagramTestRef.value && diagramTestRef.value.importDiagram) {
      diagramTestRef.value.importDiagram(jsonData);
    } else {
      console.error('La méthode importDiagram est introuvable sur diagramTestRef.');
    }
  } catch (error) {
    console.error('Erreur lors du chargement du diagramme :', error);
  }
};

// Charger les diagrammes au montage du composant
onMounted(() => {
  fetchDiagrams();
});

</script>
