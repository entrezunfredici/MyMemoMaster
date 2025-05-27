import { initMathJax } from 'mathjax/es5/tex-mml-chtml.js'

export const loadMathJax = (element) => {
  if (!window.MathJax) {
    window.MathJax = {
      tex: {
        inlineMath: [
          ['$', '$'],
          ['\\(', '\\)']
        ] // Configuration des formules
      },
      svg: {
        fontCache: 'global'
      }
    }
  }

  return new Promise((resolve) => {
    initMathJax().then(() => {
      window.MathJax.typesetPromise([element]).then(() => {
        resolve()
      })
    })
  })
}
