<template>
  <div>
    <!-- Input pour créer des blocs -->
    <input id="monInput" ref="inputRef" type="text" placeholder="Entrez un texte" style="color:black" />
    <input id="colorInput" ref="colorRef" type="color" />
    <button @click="addNode">Ajouter un Bloc</button>
    <br />
    <div class="grid ">
      <label>Ajouter des links</label>
      <label class="switch">
        <input type="checkbox" @click="addLinksChecked">
          <span class="slider round"></span>
    </label>
    </div>

<button @click="exportDiagram">Exporter en JSON</button>

<!-- Importer un fichier JSON -->
<input type="file" @change="loadJsonFile" />
<div style="display: flex;">
      <!-- Palette -->
      <div ref="paletteDiv" style="width: 20%; height: 600px; border: 1px solid lightgray; margin-right: 10px;"></div>

      <!-- Diagramme principal -->
      <div ref="diagramDiv" style="width: 80%; height: 600px; border: 1px solid lightgray;"></div>
    </div>
</div>
</template>

<script>
import * as go from "gojs";
import { ref, onMounted } from "vue";
import { useToast } from 'vue-toastification';

export default {
setup() {
const diagramDiv = ref(null); // Référence pour le conteneur du diagramme
const paletteDiv = ref(null);
const inputRef = ref(null); // Référence pour l'input
const colorRef = ref(null); // Référence pour l'input de couleur
const toast = useToast(); 
var linkEditable = false;
let diagram;

// Initialise le diagramme
const initializeDiagram = () => {
  const $ = go.GraphObject.make;
      
  diagram = $(go.Diagram, diagramDiv.value, {
    "undoManager.isEnabled": true,
    // layout: $(go.LayeredDigraphLayout),
  });

  // Définir les templates
  diagram.nodeTemplate = $(
        go.Node,
        "Auto",
        {
          click: (e, node) => onNodeClick(node),
          doubleClick: (e, node) => onNodeDoubleClick(node), // Modifier un bloc
          locationSpot: go.Spot.Center, // Définit le point de référence pour la position
        },
        new go.Binding("location", "location", go.Point.parse).makeTwoWay(go.Point.stringify),
        $(
          go.Shape,
          "RoundedRectangle",
          {
            stroke: "darkblue",
            strokeWidth: 2,
            fill: "lightblue", // Valeur par défaut
          },
          new go.Binding("fill", "color") // Liaison de la propriété `color` au remplissage
        ),
        $(go.TextBlock, { margin: 8 }, new go.Binding("text", "key"))
      );


  diagram.linkTemplate = $(
    go.Link,
    { routing: go.Link.Orthogonal, curve: go.Link.JumpOver },
    $(go.Shape),
    $(go.Shape, { toArrow: "Standard" })
  );

  // Modèle initial vide (sera remplacé par un JSON si importé)
  diagram.model = new go.GraphLinksModel([], []);
};

 // Initialiser la palette
 const initializePalette = () => {
      const $ = go.GraphObject.make;

      const palette = $(go.Palette, paletteDiv.value, {
        layout: $(go.GridLayout, { alignment: go.GridLayout.Location }),
      });

      // Utiliser le même template pour les nœuds que dans le diagramme principal
      palette.nodeTemplate = $(
        go.Node,
        "Auto",
        $(
          go.Shape,
          "RoundedRectangle",
          {
            stroke: "darkblue",
            strokeWidth: 2,
          },
          new go.Binding("fill", "color") // Liaison pour la couleur
        ),
        $(go.TextBlock, { margin: 8 }, new go.Binding("text", "key"))
      );

      // Ajouter des blocs d'exemple à la palette
      palette.model = new go.GraphLinksModel([
        { key: "Bloc Rouge", color: "red" },
        { key: "Bloc Vert", color: "green" },
        { key: "Bloc Bleu", color: "blue" },
        { key: "Bloc Jaune", color: "yellow" },
      ]);
    };

// Ajouter un bloc
const addNode = () => {
  const inputValue = inputRef.value.value.trim();
  const inputColor = colorRef.value.value || "#ADD8E6"; // Utiliser la couleur sélectionnée ou une couleur par défaut
  if (inputValue) {
        const newNode = { key: inputValue, color: inputColor};
        diagram.model.addNodeData(newNode);
        inputRef.value.value = "";
        colorRef.value.value = "#ADD8E6"; // Réinitialiser la couleur à la valeur par défaut
      } else {
        alert("Veuillez entrer un texte pour le bloc.");
      }
};

// Gestion des clics pour créer un lien
let firstSelectedNode = null; // Stocke temporairement le nœud de départ

    const onNodeClick = (node) => {
      if(!linkEditable){
        console.log('mettre à true')
        return;
      }
      const data = node.data;
      if (firstSelectedNode === null) {
        // Pas encore de nœud sélectionné, on le stocke comme point de départ
        firstSelectedNode = data.key;
        toast.warning('Noeud selectionné :' + firstSelectedNode, {
          position: 'bottom-right', // Options de position du toast
          autoClose: 3000, // Millisecondes avant que le toast ne se ferme automatiquement
          closeOnClick: true,
    });
      } else {
        // Point de départ déjà sélectionné, créer un lien vers ce nœud
        const targetNodeKey = data.key;
        if (firstSelectedNode !== targetNodeKey) {
          diagram.model.addLinkData({ from: firstSelectedNode, to: targetNodeKey });
        } else {
          alert("Impossible de créer un lien vers le même nœud !");
        }
        // Réinitialiser le point de départ
        firstSelectedNode = null;
      }
    };

// Modifier un bloc via double-clic
const onNodeDoubleClick = (node) => {
  const data = node.data;
  const newValue = prompt("Modifier le texte :", data.key); // Ouvre une boîte de dialogue pour la modification
  if (newValue !== null && newValue.trim() !== "") {
    diagram.model.startTransaction("updateNode");
    diagram.model.setDataProperty(data, "key", newValue.trim());
    diagram.model.commitTransaction("updateNode");
  }
};

// Exporter le diagramme en JSON
const exportDiagram = () => {
  const json = diagram.model.toJson();
  console.log("Diagramme exporté en JSON :", json);
  alert("Le diagramme a été exporté. Vérifiez la console.");
};

// Importer un diagramme à partir d'un JSON
const importDiagram = (json) => {
  try {
    diagram.model = go.Model.fromJson(json);
    alert("Diagramme importé avec succès !");
  } catch (error) {
    console.error("Erreur lors de l'importation du diagramme :", error);
    alert("Le fichier JSON est invalide.");
  }
};

// Charger un fichier JSON
const loadJsonFile = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const json = JSON.parse(e.target.result); // Lire et analyser le JSON
      importDiagram(json); // Importer le diagramme
    } catch (error) {
      console.error("Erreur de lecture du fichier JSON :", error);
      alert("Le fichier JSON est invalide.");
    }
  };
  reader.readAsText(file);
};

const addLinksChecked = (event) => {
      let checked = event.target.checked; // Mise à jour de l'état basé sur l'événement `click`
      if(checked){
        linkEditable = true;
      }else{
        linkEditable = false;
      }
      console.log(linkEditable)
      // Exemple de message toast
      toast.success('Lien ajouté avec succès!', {
      position: 'bottom-left', // Options de position du toast
      autoClose: 5000, // Millisecondes avant que le toast ne se ferme automatiquement
      closeOnClick: true,
    });
    };

// Hook de cycle de vie
onMounted(() => {
  initializeDiagram();
  initializePalette();
});

return { diagramDiv,paletteDiv, inputRef,colorRef, addNode, exportDiagram, loadJsonFile ,addLinksChecked};
},
};
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
