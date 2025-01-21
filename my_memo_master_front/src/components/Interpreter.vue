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
        return `<span class="mathjax-formula">\\(${formula}\\)</span>`
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
          window.MathJax.typesetPromise()
            .then(() => console.log('MathJax rendu terminé'))
            .catch((err) => console.error('Erreur MathJax :', err))
        } else {
          console.error('MathJax n’est pas chargé.')
        }
      })
    }
  }
}
</script>
