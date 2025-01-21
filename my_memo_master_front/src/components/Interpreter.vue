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
        // Transformer les formules spéciales en équivalents HTML/CSS
        let parsedFormula = formula
          .replace(/sqrt\((.*?)\)/g, '√($1)') // Racine carrée
          .replace(/mattrix\((.*?)\)/g, '[$1]') // Matrice simple (approximatif)
          .replace(
            /(.*?)over(.*?)/g,
            '<span style="display: inline-block; vertical-align: middle;">$1</span>/<span style="display: inline-block; vertical-align: middle;">$2</span>'
          ) // Fraction
          .replace(/(.*?)\^(.*?)/g, '$1<sup>$2</sup>') // Exposants
          .replace(/(.*?)_(.*?)/g, '$1<sub>$2</sub>') // Indices
          .replace(/ln\((.*?)\)/g, 'ln($1)') // Logarithme
          .replace(/e\^(.*?)/g, 'e<sup>$1</sup>') // Exponentielle
          .replace(
            /∫_(.*?)\^(.*?)\((.*?)\)/g,
            '<span style="font-style: italic;">∫<sub>$1</sub><sup>$2</sup>($3)</span>'
          ) // Intégrale
          .replace(/\|\|(.*?)\|\|/g, '‖$1‖') // Norme
          .replace(/\|(.*?)\|/g, '|$1|') // Valeur absolue
          .replace(/⌊(.*?)⌋/g, '⌊$1⌋') // Partie entière inférieure
          .replace(/nsqrt\((.*?),(.*?)\)/g, '<sup>$1</sup>√($2)') // Racine n-ième
          .replace(/([+\-*/!=≠≃≈≤≥⨁⊛±∀∃∄∋∈∉∪∩⊂⊃∝⋌⋋∠∡⊥%])/g, '$1') // Opérateurs affichés tels quels
          .replace(/ℕ/g, '&#8469;') // Ensembles
          .replace(/ℤ/g, '&#8484;')
          .replace(/ℚ/g, '&#8474;')
          .replace(/ℝ/g, '&#8477;')
          .replace(/ℂ/g, '&#8450;')
          .replace(/∞/g, '&#8734;') // Infini
          .replace(/²/g, '<sup>2</sup>') // Exposant 2
          .replace(
            /frac\{(.*?)\}\{(.*?)\}/g,
            '<span style="display: inline-flex; flex-direction: column; align-items: center; font-size: 0.9em;"><span>$1</span><span style="border-top: 1px solid; width: 100%;">$2</span></span>'
          ) // Fraction

        // Retourner la formule transformée dans un conteneur <span> ou autre balise
        return `<span class="formula">${parsedFormula}</span>`
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
            .then(() => console.log('Formules MathJax rendues avec succès.'))
            .catch((err) => console.error('Erreur lors du rendu des formules MathJax :', err))
        } else {
          console.error('MathJax n’est pas chargé dans la page.')
        }
      })
    }
  }
}
</script>
