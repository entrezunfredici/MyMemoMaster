<template>
  <div>
    <label>
      <input type="checkbox" v-model="showPalette" />
      Afficher la palette
    </label>

    <div v-if="showPalette">
      <h2>Symboles Disponibles</h2>
      <div ref="diagramDiv" style="width: 100%; height: 600px; border: 1px solid gray"></div>
    </div>

    <h2>Zone de texte</h2>
    <textarea
      v-model="userInput"
      ref="inputRef"
      rows="5"
      cols="50"
      @keydown.delete="handleDelete"
      @keydown.backspace="handleDelete"
    ></textarea>

    <h3>Résultat :</h3>
    <div
      v-html="renderedContent"
      style="
        width: 100%;
        min-height: 100px;
        border: 1px solid black;
        padding: 10px;
        background-color: white;
        margin-top: 10px;
      "
    ></div>
  </div>
</template>

<script>
import * as go from 'gojs'

export default {
  data() {
    return {
      userInput: '',
      renderedContent: '',
      showPalette: false,
      diagramInitialized: false,
      selectedFormulas: [],
      colorFields: {
        1: '#007bff',
        2: '#e83e8c',
        3: '#28a745',
        4: '#fd7e14',
        5: '#6f42c1',
        6: '#dc3545',
        7: '#17a2b8',
        8: '#343a40'
      }
    }
  },
  watch: {
    userInput: {
      immediate: true,
      handler() {
        this.parseContent()
      }
    },
    showPalette(newVal) {
      if (newVal) {
        this.$nextTick(() => {
          this.initializeDiagram()
        })
      }
    }
  },
  methods: {
    initializeDiagram() {
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

      const $ = go.GraphObject.make

      const diagram = $(go.Diagram, this.$refs.diagramDiv, {
        'undoManager.isEnabled': true
      })

      diagram.nodeTemplate = $(
        go.Node,
        'Auto',
        {
          movable: false,
          click: (e, node) => {
            const diagram = node.diagram
            const formula = node.data.formula
            const isMetaKey = e.control || e.meta

            if (isMetaKey) {
              this.selectedFormulas.push(formula)
              this.userInput += ' ' + formula
              node.isSelected = true
            } else {
              const index = this.selectedFormulas.lastIndexOf(formula)

              if (index !== -1) {
                this.selectedFormulas.splice(index, 1)

                const pattern = ` ${formula}`
                const lastIndex = this.userInput.lastIndexOf(pattern)

                if (lastIndex !== -1) {
                  this.userInput =
                    this.userInput.slice(0, lastIndex) +
                    this.userInput.slice(lastIndex + pattern.length)
                }

                if (!this.selectedFormulas.includes(formula)) {
                  node.isSelected = false
                }
              } else {
                const formulasSet = new Set(this.selectedFormulas)
                this.userInput = this.userInput
                  .split(/\s+/)
                  .filter((token) => {
                    return !Array.from(formulasSet).includes(token.replace(/\(\)/g, ''))
                  })
                  .join(' ')

                diagram.clearSelection()
                this.selectedFormulas = [formula]
                this.userInput += ' ' + formula
                node.isSelected = true
              }
            }
          }
        },
        $(go.Shape, 'RoundedRectangle', {
          stroke: 'black',
          strokeWidth: 2,
          fill: 'white'
        }),
        $(go.TextBlock, { margin: 8 }, new go.Binding('text', 'key'))
      )

      const nodeDataArray = Object.keys(formulaMapping).map((symbol) => ({
        key: symbol,
        formula: formulaMapping[symbol]
      }))

      diagram.model = new go.GraphLinksModel(nodeDataArray)
    },
    getColorById(id) {
      return this.colorFields[id] || 'black'
    },
    addToInput(formulaText) {
      if (this.selectedFormula === formulaText) {
        const regex = new RegExp(`\\s?${formula}`, 'g')
        this.userInput = this.userInput.replace(regex, '')
        this.selectedFormula = null
      } else {
        if (this.selectedFormula) {
          const oldRegex = new RegExp(`\\s?${this.selectedFormula}`, 'g')
          this.userInput = this.userInput.replace(oldRegex, '')
        }
        this.userInput += ' ' + formulaText
        this.selectedFormula = formulaText
      }
    },
    handleDelete(event) {
      setTimeout(() => {
        const input = this.userInput
        const inputElement = this.$refs.inputRef
        if (!inputElement) return

        const cursorPos = inputElement.selectionStart

        const complexFormulas = ['∫_┤^┤(┤)', '∮_┤^┤(┤)', '∯_┤^┤(┤)', '̅', '|┤|', '⌊┤⌋', '‖┤‖']

        for (let formula of complexFormulas) {
          const start = cursorPos - formula.length - 1
          const end = cursorPos
          const fragment = input.slice(start, end)

          const cleanedFragment = fragment.replace(/\s/g, '')
          const cleanedFormula = formula.replace(/\s/g, '')

          console.log('✏️ Testing fragment:', JSON.stringify(fragment))
          console.log('↔︎ Against formula:', JSON.stringify(formula))

          if (cleanedFragment === cleanedFormula) {
            this.userInput = input.slice(0, start) + input.slice(end)
            event.preventDefault()
            return
          }
        }

        const simpleFormulaPattern = /[\ẇ̈^_+=\-*/→‖⌊⌋|∞∅ℕℤℚℝℂ≈≠≤≥]+/g
        const matches = [...input.matchAll(simpleFormulaPattern)]

        for (let match of matches) {
          const matchStart = match.index
          const matchEnd = matchStart + match[0].length

          if (cursorPos === matchEnd) {
            this.userInput = input.slice(0, matchStart) + input.slice(matchEnd)
            event.preventDefault()
            return
          }
        }
      }, 0)
    },
    checkUnitHomogeneity(expression) {
      const units = ['m', 's', 'kg', 'J', 'N', 'Pa', 'W', 'V', 'A', 'Ω', 'Hz']
      const unitPattern = /(\d+)\s*([a-zA-Z]+)/g

      let lines = expression.split(/\n+/)

      for (let line of lines) {
        let matches = [...line.matchAll(unitPattern)]
        let foundUnits = matches.map((match) => match[2])

        if (foundUnits.length > 1) {
          let uniqueUnits = [...new Set(foundUnits)]
          if (uniqueUnits.length > 1) {
            return `Erreur : Unités incompatibles dans "${line}" (${uniqueUnits.join(' et ')}).`
          }
        }
      }

      return null
    },

    async parseContent() {
      let html = this.userInput
      const reverseMapping = this.getReverseMapping()

      let unitError = this.checkUnitHomogeneity(html)
      if (unitError) {
        this.renderedContent = `<span style="color: red; font-weight: bold;">${unitError}</span>`
        return
      }

      html = html
        .replace(
          /nsqrt\((.*?),(.*?)\)/g,
          '<span style="font-size: 0.75em; vertical-align: super;">$1</span>√($2)'
        )
        .replace(/sqrt\((.*?)\)/g, '√($1)')
        .replace(
          /over\((.*?),(.*?)\)/g,
          '<span style="display: inline-flex; flex-direction: column; align-items: center; justify-content: center; font-size: 1.2em;"><span>$1</span><span style="width: 100%; height: 1px; background-color: black; margin: 1px 0;"></span><span>$2</span></span>'
        )
        .replace(/\^\((.*?)\)/g, '<i style="vertical-align: super; font-size: 0.75em;">$1</i>')
        .replace(/(\S+)\^(\S+)/g, '$1<i style="vertical-align: super; font-size: 0.75em;">$2</i>')
        .replace(
          /([a-zA-Z0-9]+)_\((.*?)\)/g,
          (_, base, sub) => `${base}<sub>${sub.replace(/,/g, '')}</sub>`
        )
        .replace(
          /∫_(.*?)\^(.*?)\((.*?)\)/g,
          '<span style="font-style: italic;">∫<sub>$1</sub><sup>$2</sup> $3</span>'
        )
        .replace(
          /∮_(.*?)\^(.*?)\((.*?)\)/g,
          '<span style="font-style: italic;">∮<sub>$1</sub><sup>$2</sup> $3</span>'
        )
        .replace(
          /∯_(.*?)\^(.*?)\((.*?)\)/g,
          '<span style="font-style: italic;">∯<sub>$1</sub><sup>$2</sup> $3</span>'
        )
        .replace(
          /e\^([^\s^]+)\^([^\s^]+)/g,
          'e<span style="vertical-align: super; font-size: 0.75em;">$1<span style="vertical-align: super; font-size: 0.65em;">$2</span></span>'
        )
        .replace(
          /\^\((.*?)\)/g,
          '<span style="vertical-align: super; font-size: 0.75em;">$1</span>'
        )
        .replace(/([a-zA-Z0-9]+)((?:\^\d+)+)/g, (_, base, exps) => {
          const expParts = exps.slice(1).split('^')
          let result = base
          for (const exp of expParts) {
            result += `<sup>${exp}</sup>`
          }
          return result
        })
        .replace(/ln\((.*?)\)/g, 'ln($1)')
        .replace(
          /̇(\S+)/g,
          '<span style="position: relative; display: inline-block; text-align: center;"><span>$1</span><span style="position: absolute; top: -0.5em; left: 50%; transform: translateX(-50%); font-size: 0.75em;">˙</span></span>'
        )
        .replace(
          /̈(\S+)/g,
          '<span style="position: relative; display: inline-block; text-align: center;"><span>$1</span><span style="position: absolute; top: -0.5em; left: 50%; transform: translateX(-50%); font-size: 0.75em; letter-spacing: -0.1em;">¨</span></span>'
        )
        .replace(
          /̅(\S+)/g,
          '<span style="text-decoration: overline; display: inline-block;">$1</span>'
        )
        .replace(
          /widevec\((.*?)\)/g,
          '<span style="display: inline-block; position: relative; text-align: center;"><span style="text-decoration: none;">$1</span><span style="position: absolute; top: -0.5em; left: 50%; transform: translateX(-50%); font-size: 0.8em; font-weight: bold;">→</span></span>'
        )

        .replace(/\|\|(.*?)\|\|/g, '‖$1‖')
        .replace(/\|(.*?)\|/g, '|$1|')
        .replace(/⌊(.*?)⌋/g, '⌊$1⌋')
        .replace(/ℕ/g, '&#8469;')
        .replace(/ℤ/g, '&#8484;')
        .replace(/ℚ/g, '&#8474;')
        .replace(/ℝ/g, '&#8477;')
        .replace(/ℂ/g, '&#8450;')
        .replace(/∞/g, '&#8734;')
        .replace(/²/g, '<sup>2</sup>')

      // Interprétation des balises <text>
      html = html.replace(/<text([^>]*)>([\s\S]*?)<\/text>/gi, (match, attributes, content) => {
        let openTags = ''
        let closeTags = ''

        let styles = ''
        if (attributes.includes('bold')) styles += 'font-weight: bold;'
        if (attributes.includes('italic')) styles += 'font-style: italic;'

        const colorMatch = attributes.match(/color:([a-zA-Z]+)/)
        if (colorMatch) styles += `color: ${colorMatch[1]};`

        if (styles) {
          openTags += `<span style="${styles}">`
          closeTags = '</span>' + closeTags
        }

        const contentWithBreaks = content.replace(/\n/g, '<br>')

        return `${openTags}${contentWithBreaks}${closeTags}`
      })
      html = html.replace(/\n/g, '<br>')

      this.renderedContent = html

      this.$nextTick(() => {
        if (window.MathJax) {
          window.MathJax.typesetPromise().catch((err) => console.error('Erreur MathJax :', err))
        }
      })
    },
    getReverseMapping() {
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

      const reversed = {}
      for (let key in formulaMapping) {
        reversed[formulaMapping[key]] = key
      }
      return reversed
    }
  }
}
</script>

<style scoped>
textarea {
  width: 100%;
  margin-bottom: 20px;
  background-color: white;
  color: #333;
  border: 1px solid black;
  padding: 10px;
  font-size: 14px;
}
</style>
