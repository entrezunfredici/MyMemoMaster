<template>
  <div>
    <!-- Diagram Container -->
    <div ref="diagramDiv" style="width: 100%; height: 600px; border: 1px solid lightgray;"></div>
  </div>
</template>

<script>
import { ref, onMounted } from "vue";
import * as go from "gojs";

export default {
  name: "PageFlowDiagram",
  setup() {
    // Reactive Reference to hold the diagram
    const diagramDiv = ref(null);

    // Initialize Diagram after component mounts
    const initializeDiagram = () => {
      const $ = go.GraphObject.make;

      const diagram = $(go.Diagram, diagramDiv.value, {
        "undoManager.isEnabled": true, // Enable undo/redo
        layout: $(go.LayeredDigraphLayout), // Automatic layout for page flow
      });

      // Define Node Template
      diagram.nodeTemplate = $(
        go.Node,
        "Auto",
        $(go.Shape, "RoundedRectangle", {
          fill: "lightblue",  // Background color
          stroke: "darkblue", // Border color
          strokeWidth: 2,     // Border thickness
        }),
        $(
          go.TextBlock,
          { margin: 8 },
          new go.Binding("text", "key") // Bind text to key property
        )
      );

      // Define Link Template
      diagram.linkTemplate = $(
        go.Link,
        { routing: go.Link.AvoidsNodes, curve: go.Link.JumpOver },
        $(go.Shape), // Link line
        $(go.Shape, { toArrow: "Standard" }) // Arrowhead
      );

      // Set up Model: Nodes and Links
      diagram.model = new go.GraphLinksModel(
        [
          { key: "Home" },
          { key: "Products" },
          { key: "Cart" },
          { key: "Checkout" },
          { key: "Confirmation" },
        ],
        [
          { from: "Home", to: "Products" },
          { from: "Products", to: "Cart" },
          { from: "Cart", to: "Checkout" },
          { from: "Checkout", to: "Confirmation" },
        ]
      );
    };

    // Lifecycle hook
    onMounted(() => {
      initializeDiagram(); // Call the function to set up GoJS

      const canva = document.querySelector("canvas")
      console.dir(canva)
    });

    return {
      diagramDiv,
    };
  },
};
</script>

<style scoped>
/* Optional styles for the diagram container */
</style>
