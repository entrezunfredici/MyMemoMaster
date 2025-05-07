<template>
  <div>
    <section>
      <DiagramTest />
    </section>
    <section>
      <Interpreter />
    </section>
  </div>
</template>

<script setup>
import DiagramTest from '@/components/DiagramTestComponent.vue'
import Button from '@/components/ButtonComponent.vue'
import Dropdown from '@/components/DropdownComponent.vue'
import Interpreter from '@/components/Interpreter.vue'
import { ref, computed } from 'vue'

const userInput = ref('')
const addToInput = (formulaText) => {
  userInput.value += ' ' + formulaText + '()'
}
const interpretedContent = computed(() => {
  return userInput.value
})
const handleDelete = (event) => {
  const input = userInput.value
  const cursorPos = event.target.selectionStart

  // 1. Formules complexes exactes (à adapter si tu en as d'autres)
  const complexFormulas = [
    '∫_┤^┤(┤)()',
    '∮_┤^┤(┤)()',
    '∯_┤^┤(┤)()',
    '̅()',
    '|┤|()',
    '⌊┤|┤|()',
    '‖┤‖()'
  ]

  for (let formula of complexFormulas) {
    const start = cursorPos - formula.length
    const fragment = input.slice(start, cursorPos)
    if (fragment === formula) {
      let startCut = start
      let endCut = cursorPos

      if (input[startCut - 1] === ' ') startCut -= 1
      else if (input[endCut] === ' ') endCut += 1

      userInput.value = input.slice(0, startCut) + input.slice(endCut)
      event.preventDefault()
      return
    }
  }

  // 2. Délimiteurs (|x|, ‖x‖, ⌊x⌋) avec ()
  const delimiters = [
    { open: '⌊', close: '⌋' },
    { open: '|', close: '|' },
    { open: '‖', close: '‖' }
  ]

  for (let { open, close } of delimiters) {
    const pattern = new RegExp(`\\${open}[^\\${open}\\${close}]*\\${close}\\(\\)`, 'g')
    const matches = [...input.matchAll(pattern)]

    for (let match of matches) {
      const matchStart = match.index
      const matchEnd = matchStart + match[0].length
      if (cursorPos === matchEnd) {
        let startCut = matchStart
        let endCut = matchEnd

        if (input[startCut - 1] === ' ') startCut -= 1
        else if (input[endCut] === ' ') endCut += 1

        userInput.value = input.slice(0, startCut) + input.slice(endCut)
        event.preventDefault()
        return
      }
    }
  }

  // 3. Formules simples type abc()
  const simpleFormulaPattern = /[\ẇ̈^_+=\-*/→‖⌊⌋|∞∅ℕℤℚℝℂ≈≠≤≥]+\(.*?\)/g
  const startToCursor = input.slice(0, cursorPos)
  let match

  while ((match = simpleFormulaPattern.exec(startToCursor)) !== null) {
    const matchStart = match.index
    const matchEnd = matchStart + match[0].length
    if (cursorPos === matchEnd) {
      let startCut = matchStart
      let endCut = matchEnd

      if (input[startCut - 1] === ' ') startCut -= 1
      else if (input[endCut] === ' ') endCut += 1

      userInput.value = input.slice(0, startCut) + input.slice(endCut)
      event.preventDefault()
      return
    }
  }
}
</script>

<style scoped>
textarea {
  width: 100%;
  margin-bottom: 20px;
  background-color: white;
  color: #333333;
  border: 1px solid black;
  padding: 10px;
  font-size: 14px;
}
</style>
