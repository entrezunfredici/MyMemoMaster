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
        // Racine carrée : √( ┤ )
        .replace(/sqrt\((.*?)\)/g, '√($1)')

        // Matrice : mattrix([ ┤ , ┤ , ┤ ], [ ┤ , ┤ , ┤ ])
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
        })

        // Fraction : ┤over┤
        .replace(
          /(\d+)over(\d+)/g,
          '<span style="display: inline-flex; flex-direction: column; align-items: center;">' +
            '<span>$1</span>' +
            '<span style="width: 100%; height: 1px; background-color: black; margin: 1px 0; display: block;"></span>' +
            '<span>$2</span>' +
            '</span>'
        )

        // Exposant : ┤^┤
        .replace(/(\S+)\^(\S+)/g, '$1<i style="vertical-align: super; font-size: 0.75em;">$2</i>')

        // Indice : ┤_┤
        .replace(/([a-zA-Z0-9]+)_([a-zA-Z0-9]+)/g, '$1<sub>$2</sub>')

        // Intégrale : ∫_┤^┤(┤)
        .replace(
          /∫_(.*?)\^(.*?)\((.*?)\)/g,
          '<span style="font-style: italic;">∫<sub>$1</sub><sup>$2</sup> $3</span>'
        )

        // Variantes d'intégrales : ∮_┤^┤(┤), ∯_┤^┤(┤)
        .replace(
          /∮_(.*?)\^(.*?)\((.*?)\)/g,
          '<span style="font-style: italic;">∮<sub>$1</sub><sup>$2</sup> $3</span>'
        )
        .replace(
          /∯_(.*?)\^(.*?)\((.*?)\)/g,
          '<span style="font-style: italic;">∯<sub>$1</sub><sup>$2</sup> $3</span>'
        )

        // Exponentielle : e^┤
        .replace(/e\^(\S+)/g, 'e<i style="vertical-align: super; font-size: 0.75em;">$1</i>')

        // Logarithme : ln( ┤ )
        .replace(/ln\((.*?)\)/g, 'ln($1)')

        // Dérivée simple : ̇ ┤
        .replace(
          /̇(\S+)/g,
          '<span style="position: relative; display: inline-block; text-align: center;"><span>$1</span><span style="position: absolute; top: -0.7em; left: 50%; transform: translateX(-50%); font-size: 0.75em;">˙</span></span>'
        )

        // Double dérivée : ̈ ┤
        .replace(
          /̈(\S+)/g,
          '<span style="position: relative; display: inline-block; text-align: center;"><span>$1</span><span style="position: absolute; top: -0.7em; left: 50%; transform: translateX(-50%); font-size: 0.75em; letter-spacing: -0.1em;">¨</span></span>'
        )

        // Inverse : ̅ ┤
        .replace(
          /̅(\S+)/g,
          '<span style="text-decoration: overline; display: inline-block;">$1</span>'
        )

        // Vecteur : widevec( ┤ )
        .replace(
          /widevec\((.*?)\)/g,
          '<span style="display: inline-block; position: relative;"><span>$1</span><span style="position: absolute; top: -1em; left: 0; right: 0; font-size: 0.8em; font-weight: bold;">→</span></span>'
        )

        // Racine n-ième : nsqrt( ┤ )
        .replace(/nsqrt\((.*?),(.*?)\)/g, '<sup>$1</sup>√($2)')

        // Norme : ‖┤‖
        .replace(/\|\|(.*?)\|\|/g, '‖$1‖')

        // Valeur absolue : |┤|
        .replace(/\|(.*?)\|/g, '|$1|')

        // Partie entière inférieure : ⌊┤⌋
        .replace(/⌊(.*?)⌋/g, '⌊$1⌋')

        // Ensembles : tels quels (∅, ℕ, ℤ, ℚ, ℝ, ℂ, ∞)
        .replace(/ℕ/g, '&#8469;')
        .replace(/ℤ/g, '&#8484;')
        .replace(/ℚ/g, '&#8474;')
        .replace(/ℝ/g, '&#8477;')
        .replace(/ℂ/g, '&#8450;')
        .replace(/∞/g, '&#8734;')

        // Exposant 2 : ²
        .replace(/²/g, '<sup>2</sup>')

        //Retour à la ligne
        .replace(/\n/g, '<br>')

      // Parenthèses, crochets, accolades, etc. (|┤| ⌊┤⌋ ‖┤‖ (┤) {┤}) : tels quels

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
