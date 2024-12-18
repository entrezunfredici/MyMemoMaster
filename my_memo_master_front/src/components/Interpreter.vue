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

      // Convertir les balises <formula> en code compatible MathJax
      html = html.replace(/<formula>(.*?)<\/formula>/gs, (match, formula) => {
        return `\\(${formula}\\)` // MathJax LaTeX syntaxe
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
  color: #333333; /* Texte noir par défaut */
  font-size: 16px; /* Taille de police */
}
</style>
