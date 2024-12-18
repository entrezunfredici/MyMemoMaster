<template>
  <div>
    <div ref="output" v-html="renderedContent"></div>
  </div>
</template>

<script>
export default {
  props: {
    content: String
  },
  data() {
    return {
      renderedContent: ''
    }
  },
  watch: {
    content: {
      immediate: true,
      handler() {
        this.parseContent()
      }
    }
  },
  methods: {
    async parseContent() {
      let html = this.content

      html = html.replace(/<formula>(.*?)<\/formula>/gs, (match, formula) => {
        return `\\(${formula}\\)`
      })

      html = html.replace(/<text(.*?)>(.*?)<\/text>/gs, (match, attributes, text) => {
        const bold = attributes.includes('bold') ? 'font-weight: bold;' : ''
        const italic = attributes.includes('italic') ? 'font-style: italic;' : ''
        const colorMatch = attributes.match(/color:([a-zA-Z0-9#]+)/)
        const color = colorMatch ? `color: ${colorMatch[1]};` : ''

        // Générer le style final
        const style = `${bold} ${italic} ${color}`
        return `<span style="${style.trim()}">${text}</span>`
      })

      this.renderedContent = html

      // Attendre que Vue mette à jour le DOM
      this.$nextTick(() => {
        if (window.MathJax) {
          window.MathJax.typesetPromise().catch((err) => console.error('MathJax error:', err))
        }
      })
    }
  }
}
</script>

<style scoped>
.interpreter-output {
  color: #333333;
  font-size: 16px;
}
</style>
