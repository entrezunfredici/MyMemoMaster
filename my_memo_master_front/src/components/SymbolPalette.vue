<template>
  <div ref="diagramDiv" style="width: 100%; height: 600px; border: 1px solid gray"></div>
</template>

<script setup>
import * as go from 'gojs'
import { ref, defineEmits, onMounted } from 'vue'

const diagramDiv = ref(null)
const emit = defineEmits(['symbolDropped'])

// Mapping des symboles vers leur interprétation
const formulaMapping = {
  '√x': 'sqrt',
  'x²': '^',
  'x/y': 'over',
  xₙ: '_',
  '∫_a^b f(x)': '∫_┤^┤(┤)',
  '∮_a^b f(x)': '∮_┤^┤(┤)',
  '∯_a^b f(x)': '∯_┤^┤(┤)',
  'e^x': 'e^',
  'ln(x)': 'ln',
  ẋ: '̇',
  ẍ: '̈',
  x̅: '̅',
  '→x': 'widevec',
  'ⁿ√x': 'nsqrt',
  '|x|': '|┤|',
  '⌊x⌋': '⌊┤⌋',
  '‖x‖': '‖┤‖',
  '∅': '∅',
  ℕ: 'ℕ',
  ℤ: 'ℤ',
  ℚ: 'ℚ',
  ℝ: 'ℝ',
  ℂ: 'ℂ',
  '∞': '∞',
  '+': '+',
  '-': '-',
  '*': '*',
  '/': '/',
  '=': '=',
  '≠': '≠',
  '≈': '≈',
  '≤': '≤',
  '≥': '≥'
}

// Initialisation du diagramme GoJS
const initializeDiagram = () => {
  const $ = go.GraphObject.make

  const diagram = $(go.Diagram, diagramDiv.value, {
    'undoManager.isEnabled': true
  })

  diagram.nodeTemplate = $(
    go.Node,
    'Auto',
    {
      movable: true,
      dragComputation: (node) => onNodeDrop(node)
    },
    $(go.Shape, 'RoundedRectangle', { stroke: 'black', strokeWidth: 2, fill: 'white' }),
    $(go.TextBlock, { margin: 8 }, new go.Binding('text', 'key'))
  )

  // Création des blocs de symboles
  const nodeDataArray = Object.keys(formulaMapping).map((symbol) => ({
    key: symbol
  }))

  diagram.model = new go.GraphLinksModel(nodeDataArray)
}

// Fonction déclenchée lorsqu'un bloc est déplacé
const onNodeDrop = (node) => {
  const symbol = node.data.key
  const formulaText = formulaMapping[symbol]

  if (formulaText) {
    emit('symbolDropped', formulaText)
  }
}

// Exécuter l'initialisation après le montage du composant
onMounted(() => {
  initializeDiagram()
})
</script>
