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

      html = html.replace(/<formula>(.*?)<\/formula>/gs, (match, formula) => formula) // Supprime le traitement des balises <formula>

      // Transformer tout le contenu directement
      html = html
        .replace(/sqrt\((.*?)\)/g, '√($1)') // Racine carrée
        .replace(/mattrix\((.*?)\)/g, (_, matrix) => {
          return (
            `<table style="border-collapse: collapse; text-align: center;">` +
            matrix
              .split(/\],\s*\[/)
              .map((row) => {
                const cells = row
                  .replace(/[\[\]]/g, '')
                  .split(',')
                  .map((cell) => cell.trim())
                return `<tr>${cells.map((cell) => `<td style="padding: 4px;">${cell}</td>`).join('')}</tr>`
              })
              .join('') +
            `</table>`
          )
        }) // Matrice simple (approximatif)
        .replace(
          /(.*?)over(.*?)/g,
          '<span style="display: inline-block; vertical-align: middle;">$1</span>/<span style="display: inline-block; vertical-align: middle;">$2</span>'
        ) // Fraction
        .replace(/\^(\S+)/g, '<i style="vertical-align: super; font-size: 0.75em;">$1</i>')
        .replace(/(.*?)_(.*?)/g, '$1<sub>$2</sub>') // Indices
        .replace(/ln\((.*?)\)/g, 'ln($1)') // Logarithme
        .replace(
          /∫_(.*?)\^(.*?)\((.*?)\)/g,
          '<span style="font-style: italic;">∫<sub>$1</sub><sup>$2</sup>($3)</span>'
        ) // Intégrale
        .replace(/\|\|(.*?)\|\|/g, '‖$1‖') // Norme
        .replace(/\|(.*?)\|/g, '|$1|') // Valeur absolue
        .replace(/⌊(.*?)⌋/g, '⌊$1⌋') // Partie entière inférieure
        .replace(/nsqrt\((.*?),(.*?)\)/g, '<sup>$1</sup>√($2)') // Racine n-ième
        .replace(/ℕ/g, '&#8469;') // Ensembles
        .replace(/∞/g, '&#8734;') // Infini
        .replace(/²/g, '<sup>2</sup>') // Exposant 2
        .replace(
          /frac\{(.*?)\}\{(.*?)\}/g,
          '<span style="display: inline-flex; flex-direction: column; align-items: center; font-size: 0.9em;"><span>$1</span><span style="border-top: 1px solid; width: 100%;">$2</span></span>'
        ) // Fraction
        .replace(
          /widevec\((.*?)\)/g,
          '<span style="display: inline-block; position: relative;"><span>$1</span><span style="position: absolute; top: -1em; left: 0; right: 0; font-size: 0.8em; font-weight: bold;">→</span></span>'
        )

      // Optionnel : Encapsuler dans un conteneur pour distinguer les formules transformées
      // Ne pas encapsuler inutilement le contenu
      html = html

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
<style>
sup {
  vertical-align: super;
  font-size: smaller;
}
sub {
  vertical-align: sub;
  font-size: smaller;
}
</style>
