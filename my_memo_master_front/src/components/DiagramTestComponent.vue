<template>
  <div class="p-6 bg-gray-100 min-h-screen">
    <!-- Barre de création -->
    <div class="bg-white p-6 rounded shadow-md mb-6 space-y-6">
      <h2 class="text-xl font-semibold text-gray-800">🎨 Créer un bloc</h2>

      <!-- Ligne : Input, couleur, bouton -->
      <div class="flex flex-wrap items-center gap-4">
        <input
          id="monInput"
          ref="inputRef"
          type="text"
          placeholder="Entrez un texte"
          class="flex-grow border border-gray-300 rounded px-4 py-2 focus:ring focus:ring-blue-300 text-gray-900"
        />
        <input
          id="colorInput"
          ref="colorRef"
          type="color"
          class="w-12 h-10 p-1 border border-gray-300 rounded"
        />
        <button
          @click="addNode"
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Ajouter un bloc
        </button>
      </div>

      <!-- Ligne : checkbox ajout lien -->
      <div class="flex items-center gap-4">
        <label class="font-medium text-gray-700">🔗 Ajouter des liens</label>
        <label class="switch">
          <input type="checkbox" @click="addLinksChecked" />
          <span class="slider round"></span>
        </label>
      </div>

      <!-- Ligne : Save, Export, Fichier -->
      <div class="flex flex-wrap items-center gap-4">
        <button
          v-if="diagramId"
          @click="saveDiagram"
          class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          💾 Sauvegarder
        </button>

        <button
          v-else
          @click="showExportModal = true"
          class="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
        >
          📤 Exporter en BDD
        </button>
        <!-- Bouton Nouveau Diagramme -->
<button
  @click="newDiagram"
  class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
>
  🆕 Nouveau diagramme
</button>

      </div>

      <!-- Popup pour demander le nom -->
      <div v-if="showExportModal" class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
        <div class="bg-white p-6 rounded shadow-lg w-80 z-50" style="background-color: white !important;">
          <h2 class="text-lg font-bold mb-2">Nom de la carte mentale</h2>
          <input
            v-model="exportName"
            placeholder="Entrez un nom"
            class="w-full p-2 border rounded mb-4"
          />
          <div class="flex justify-end gap-2">
            <button @click="showExportModal = false" class="px-3 py-1 bg-gray-300 rounded">Annuler</button>
            <button @click="confirmExport" class="px-3 py-1 bg-blue-600 text-white rounded">Valider</button>
          </div>
        </div>
      </div>
        <input
          type="file"
          @change="loadJsonFile"
          class="border rounded p-2 bg-white text-sm"
        />
    </div>

    <!-- Zone palette + diagramme -->
    <div class="flex flex-col lg:flex-row gap-6">
      <div
        ref="paletteDiv"
        class="w-full lg:w-1/4 h-[600px] border rounded shadow bg-white"
      ></div>
      <div
        ref="diagramDiv"
        class="w-full lg:w-3/4 h-[600px] border rounded shadow bg-white"
      ></div>
    </div>
  </div>
</template>


<script setup>
import * as go from "gojs";
import { ref, onMounted } from "vue";
import { useToast } from 'vue-toastification';
import { api } from '@/helpers/api';

const diagramDiv = ref(null);
const paletteDiv = ref(null);
const inputRef = ref(null);
const colorRef = ref(null);
const toast = useToast();
const showExportModal = ref(false);
const exportName = ref('');

let diagram;
let linkEditable = false;
let firstSelectedNode = null;
const diagramId = ref(null); // 👈 ID dynamique du diagramme

// 👇 Méthode exposée pour le parent
const setDiagramId = (id) => {
  diagramId.value = id;
};

const initializeDiagram = () => {
  const $ = go.GraphObject.make;

  diagram = $(go.Diagram, diagramDiv.value, {
    "undoManager.isEnabled": true,
  });

  diagram.nodeTemplate = $(
    go.Node, "Auto",
    { click: (e, node) => onNodeClick(node), doubleClick: (e, node) => onNodeDoubleClick(node), locationSpot: go.Spot.Center },
    new go.Binding("location", "location", go.Point.parse).makeTwoWay(go.Point.stringify),
    $(go.Shape, "RoundedRectangle", { stroke: "darkblue", strokeWidth: 2, fill: "lightblue" }, new go.Binding("fill", "color")),
    $(go.TextBlock, { margin: 8 }, new go.Binding("text", "key"))
  );

  diagram.linkTemplate = $(
    go.Link,
    { routing: go.Link.Orthogonal, curve: go.Link.JumpOver },
    $(go.Shape),
    $(go.Shape, { toArrow: "Standard" })
  );

  diagram.model = new go.GraphLinksModel([], []);
};

const initializePalette = () => {
  const $ = go.GraphObject.make;

  const palette = $(go.Palette, paletteDiv.value, {
    layout: $(go.GridLayout, { alignment: go.GridLayout.Location }),
  });

  palette.nodeTemplate = $(
    go.Node, "Auto",
    $(go.Shape, "RoundedRectangle", { stroke: "darkblue", strokeWidth: 2 }, new go.Binding("fill", "color")),
    $(go.TextBlock, { margin: 8 }, new go.Binding("text", "key"))
  );

  palette.model = new go.GraphLinksModel([
    { key: "Bloc Rouge", color: "red" },
    { key: "Bloc Vert", color: "green" },
    { key: "Bloc Bleu", color: "blue" },
    { key: "Bloc Jaune", color: "yellow" },
  ]);
};

const addNode = () => {
  const inputValue = inputRef.value.value.trim();
  const inputColor = colorRef.value.value || "#ADD8E6";

  if (inputValue) {
    const newNode = { key: inputValue, color: inputColor };
    diagram.model.addNodeData(newNode);
    inputRef.value.value = "";
    colorRef.value.value = "#ADD8E6";
  } else {
    alert("Veuillez entrer un texte pour le bloc.");
  }
};

const onNodeClick = (node) => {
  if (!linkEditable) return;

  const data = node.data;
  if (firstSelectedNode === null) {
    firstSelectedNode = data.key;
    toast.warning('Noeud sélectionné : ' + firstSelectedNode, { position: 'bottom-right', autoClose: 3000 });
  } else {
    const targetNodeKey = data.key;
    if (firstSelectedNode !== targetNodeKey) {
      diagram.model.addLinkData({ from: firstSelectedNode, to: targetNodeKey });
    } else {
      alert("Impossible de créer un lien vers le même nœud !");
    }
    firstSelectedNode = null;
  }
};

const onNodeDoubleClick = (node) => {
  const data = node.data;
  const newValue = prompt("Modifier le texte :", data.key);
  if (newValue && newValue.trim()) {
    diagram.model.startTransaction("updateNode");
    diagram.model.setDataProperty(data, "key", newValue.trim());
    diagram.model.commitTransaction("updateNode");
  }
};

const saveDiagram = async () => {
  try {
    const json = diagram.model.toJson();
    if (!diagramId.value) {
      toast.error("Aucun ID — impossible de sauvegarder");
      return;
    }

    await api.put(`/diagrammes/${diagramId.value}`, { diagram: json });
    toast.success("Diagramme sauvegardé !");
  } catch (error) {
    console.error('Erreur de sauvegarde :', error);
  }
};

const confirmExport = async () => {
  try {
    const json = diagram.model.toJson();
    const dataToSend = {
      mmName: exportName.value || 'Nom par défaut',
      mindMapJson: JSON.parse(json),
      userId: 1,
      idSubject: 1,
    };

    const response = await api.post('diagrammes/add', dataToSend);
    diagramId.value = response.data.id; // stocke l'ID retourné
    toast.success('Diagramme exporté en BDD');
    showExportModal.value = false;
  } catch (error) {
    console.error('Erreur export BDD :', error);
  }
};
const newDiagram = () => {
  diagram.clear(); // ou diagram.model.clear(); selon la lib que tu utilises
  diagramId.value = null;
  exportName.value = '';
  toast.success('Nouveau diagramme créé');
};


// 💡 Quand tu charges une carte mentale depuis la BDD, n'oublie de faire :
/*
  diagramId.value = data.id;
*/

const importDiagram = (json) => {
  diagram.model = go.Model.fromJson(json);
  console.log('Diagramme importé');
};

const loadJsonFile = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const json = JSON.parse(e.target.result);
      importDiagram(json);
    } catch (error) {
      alert("Fichier JSON invalide.");
    }
  };
  reader.readAsText(file);
};

const addLinksChecked = (event) => {
  linkEditable = event.target.checked;
  toast.success('Mode lien : ' + (linkEditable ? 'activé' : 'désactivé'), { position: 'bottom-left', autoClose: 5000 });
};

onMounted(() => {
  initializeDiagram();
  initializePalette();
});

// Expose pour le parent
defineExpose({ importDiagram, setDiagramId });
</script>


<style scoped>
button {
  margin-right: 10px;
  margin-bottom: 10px;
}
input {
  margin-right: 10px;
  padding: 5px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 34px;
}

.switch input { 
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  -webkit-transition: .4s;
  transition: .4s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 26px;
  width: 26px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  -webkit-transition: .4s;
  transition: .4s;
}

input:checked + .slider {
  background-color: #2196F3;
}

input:focus + .slider {
  box-shadow: 0 0 1px #2196F3;
}

input:checked + .slider:before {
  -webkit-transform: translateX(26px);
  -ms-transform: translateX(26px);
  transform: translateX(26px);
}

/* Rounded sliders */
.slider.round {
  border-radius: 34px;
}

.slider.round:before {
  border-radius: 50%;
}
</style>
