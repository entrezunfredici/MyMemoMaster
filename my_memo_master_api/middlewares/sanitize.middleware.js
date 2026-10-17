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

// CHOIX: expressions à ambiguïté nulle (chaque caractère ne peut être consommé que par un seul quantificateur).
// RAISON: la première version, `[^<>]*=[^<>]*` puis `\s*`, était polynomiale : une longue suite d'« = » ou
// d'espaces sans « > » final la faisait revenir en arrière en O(n²) (ReDoS, alerte CodeQL
// js/polynomial-redos). Or ce middleware s'applique à TOUS les corps de requête, dont les cartes mentales
// (limite 100 Mo). Ici la zone d'attributs est « tout sauf < > = » jusqu'au premier « = », puis le reste.
const HTML_TAG_RE = new RegExp('<\\/?(?:' + HTML_ELEMENTS.join('|') + ')(?:[\\s/][^<>=]*=[^<>]*|\\s*\\/?)>', 'gi')
// Déclaration `<!DOCTYPE …>` : bornée par le prochain « < » ou « > », donc linéaire.
const HTML_DECLARATION_RE = /<![a-z][^<>]*>/gi

// Commentaires `<!-- -->` et instructions `<? ?>` : retirés par recherche de la fin avec indexOf (linéaire).
// Une expression lazy `<!--[\s\S]*?-->` est quadratique sur « <!--<!--<!--… » sans fermeture.
function stripDelimited(text, open, close) {
  let out = ''
  let from = 0
  for (;;) {
    const start = text.indexOf(open, from)
    if (start === -1) return out + text.slice(from)
    const end = text.indexOf(close, start + open.length)
    if (end === -1) return out + text.slice(from)
    out += text.slice(from, start)
    from = end + close.length
  }
}

// Retire les balises jusqu'à stabilité : « <scr<script>ipt> » redevient « <script> » après un seul passage.
function stripHtml(text) {
  let previous
  let current = text
  do {
    previous = current
    current = stripDelimited(stripDelimited(current, '<!--', '-->'), '<?', '?>')
      .replace(HTML_DECLARATION_RE, '')
      .replace(HTML_TAG_RE, '')
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
    // defineProperty plutôt que `result[key] =` : avec la clé « __proto__ », l'affectation changerait le
    // prototype de `result` (injection de propriété, alerte CodeQL js/remote-property-injection) ; ici
    // elle crée une simple propriété de données, inoffensive.
    Object.defineProperty(result, key, {
      value: sanitizeValue(obj[key]),
      enumerable: true,
      writable: true,
      configurable: true,
    })
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
