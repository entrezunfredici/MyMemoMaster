// Nettoyage des corps de requête : retire les VRAIES balises HTML des chaînes (défense en profondeur
// contre l'injection de HTML ; le front échappe de toute façon le texte qu'il affiche).
//
// CHOIX: ne retirer que ce qui est réellement une balise HTML, pas tout ce qui est entre « < » et « > ».
// RAISON: l'ancienne expression `/<[^>]*>/g` supprimait « < 2 et y > » dans « si x<2 et y>3 » : tout texte
// mathématique avec deux comparaisons était tronqué à l'enregistrement (cartes mentales, flashcards,
// exercices — un cas courant dans cette application).
//
// Une balise = « < » (ou « </ ») + un nom d'élément HTML connu, puis soit la fermeture directe (`<b>`,
// `<br/>`, `<script>`), soit une zone d'attributs contenant au moins un « = » (`<img src=x onerror=...>`,
// `<svg/onload=...>`). Sans « = », « <b et c> » (comparaison de variables) n'est pas une balise utile à
// un attaquant : le texte est conservé. Les commentaires, déclarations et instructions de traitement
// (`<!-- -->`, `<!DOCTYPE>`, `<?xml ?>`) sont retirés.

const HTML_ELEMENTS = [
  'a', 'abbr', 'address', 'area', 'article', 'aside', 'audio', 'b', 'base', 'bdi', 'bdo', 'blockquote', 'body',
  'br', 'button', 'canvas', 'caption', 'cite', 'code', 'col', 'colgroup', 'data', 'datalist', 'dd', 'del',
  'details', 'dfn', 'dialog', 'div', 'dl', 'dt', 'em', 'embed', 'fieldset', 'figcaption', 'figure', 'footer',
  'form', 'frame', 'frameset', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr', 'html', 'i',
  'iframe', 'img', 'input', 'ins', 'kbd', 'label', 'legend', 'li', 'link', 'main', 'map', 'mark', 'math', 'menu',
  'meta', 'meter', 'nav', 'noscript', 'object', 'ol', 'optgroup', 'option', 'output', 'p', 'param', 'picture',
  'pre', 'progress', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'script', 'search', 'section', 'select', 'slot',
  'small', 'source', 'span', 'strong', 'style', 'sub', 'summary', 'sup', 'svg', 'table', 'tbody', 'td',
  'template', 'textarea', 'tfoot', 'th', 'thead', 'time', 'title', 'tr', 'track', 'u', 'ul', 'var', 'video', 'wbr',
]

const HTML_TAG_RE = new RegExp('<\\/?(?:' + HTML_ELEMENTS.join('|') + ')(?:[\\s/][^<>]*=[^<>]*)?\\s*\\/?>', 'gi')
const HTML_MARKUP_RE = /<!--[\s\S]*?-->|<![a-z][^<>]*>|<\?[\s\S]*?\?>/gi

// Retire les balises jusqu'à stabilité : « <scr<script>ipt> » redevient « <script> » après un seul passage.
function stripHtml(text) {
  let previous
  let current = text
  do {
    previous = current
    current = current.replace(HTML_MARKUP_RE, '').replace(HTML_TAG_RE, '')
  } while (current !== previous)
  return current
}

function sanitizeValue(value) {
  if (typeof value === 'string') return stripHtml(value.trim())
  if (Array.isArray(value)) return value.map(sanitizeValue)
  if (value && typeof value === 'object') return sanitizeObject(value)
  return value
}

function sanitizeObject(obj) {
  const result = {}
  for (const key of Object.keys(obj)) {
    result[key] = sanitizeValue(obj[key])
  }
  return result
}

module.exports = (req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body)
  }
  next()
}

module.exports.stripHtml = stripHtml
