/**
 * Mesure du contraste réel des textes là où axe-core répond « à vérifier » (règle
 * color-contrast « incomplete ») : dans l'éditeur de carte mentale le texte est posé dans
 * des <foreignObject> sur une forme SVG (le fond du nœud), ce qu'axe ne sait pas résoudre.
 *
 * La fonction est évaluée DANS la page (page.evaluate) : elle doit rester autonome, sans
 * référence à ce module. Elle renvoie une ligne par élément textuel visible sous le seuil
 * RGAA 3.2 / WCAG 1.4.3 (4,5:1, ou 3:1 pour un grand texte), fond composé avec la
 * transparence de chaque ancêtre et l'opacité cumulée.
 */
export function measureContrast(rootSelector) {
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/)
    if (!m) return null
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number)
    return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] }
  }
  const over = (top, bottom) => {
    const a = top.a + bottom.a * (1 - top.a)
    if (a === 0) return { r: 0, g: 0, b: 0, a: 0 }
    const mix = (k) => (top[k] * top.a + bottom[k] * bottom.a * (1 - top.a)) / a
    return { r: mix('r'), g: mix('g'), b: mix('b'), a }
  }
  const lum = ({ r, g, b }) => {
    const c = [r, g, b].map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
  }
  const backgroundOf = (el) => {
    const layers = []
    for (let node = el; node; node = node.parentElement) {
      const cs = getComputedStyle(node)
      const bg = parse(cs.backgroundColor)
      if (bg && bg.a > 0) layers.push(bg)
      if (bg && bg.a >= 1) break
      if (node.tagName.toLowerCase() === 'foreignobject') {
        // sous un <foreignObject> : la forme SVG du nœud
        const shape = node.parentElement.querySelector(':scope > rect')
        if (shape) {
          const s = getComputedStyle(shape)
          const fill = parse(s.fill)
          if (fill) {
            const alpha = fill.a * Number(s.fillOpacity)
            layers.push({ ...fill, a: alpha })
            if (alpha >= 1) break
          }
        }
      }
    }
    layers.push({ r: 255, g: 255, b: 255, a: 1 })
    return layers.reduceRight((acc, layer) => over(layer, acc))
  }
  const opacityOf = (el) => {
    let o = 1
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) o *= Number(getComputedStyle(n).opacity)
    return o
  }

  const out = []
  const seen = new Set()
  document.querySelectorAll(`${rootSelector} *`).forEach((el) => {
    const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
    const isField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) && el.type !== 'range' && el.type !== 'color'
    if (!ownText && !isField) return
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.display === 'none') return
    const box = el.getBoundingClientRect()
    if (!box.width || !box.height) return
    const opacity = opacityOf(el)
    if (opacity === 0) return // élément masqué (ex. bouton « + » visible au survol)
    const fgRaw = parse(cs.color)
    if (!fgRaw) return
    const bg = backgroundOf(el)
    const fg = over({ ...fgRaw, a: fgRaw.a * opacity }, bg)
    const [hi, lo] = [lum(fg), lum(bg)].sort((x, y) => y - x)
    const ratio = (hi + 0.05) / (lo + 0.05)
    const size = parseFloat(cs.fontSize)
    const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700)
    const needed = large ? 3 : 4.5
    const label = `${el.tagName.toLowerCase()}.${String(el.getAttribute('class') || '').split(' ')[0]}`
    if (ratio < needed && !seen.has(label)) {
      seen.add(label)
      const text = (el.value || el.textContent || '').trim().slice(0, 30)
      out.push(`${label} « ${text} » ${size}px : ${ratio.toFixed(2)}:1 (minimum ${needed}:1)`)
    }
  })
  return out
}
