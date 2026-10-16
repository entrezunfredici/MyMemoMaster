// Équivalence déterministe de nombres et de dates écrits de façons différentes :
// « 1789 » ≡ « mille sept cent quatre-vingt-neuf », « 18/09/2026 » ≡ « dix-huit septembre deux mille
// vingt-six », « 3,14 » ≡ « trois virgule quatorze ».
//
// CHOIX: règles déterministes plutôt qu'un modèle. RAISON: mesuré le 2026-10-09, l'embedding MiniLM
//        confond « 1789 » et « 1798 » (score 0,89) et rejette « mille sept cent quatre-vingt-neuf »
//        (0,48) ; une comparaison de valeurs est exacte, gratuite et sans CPU d'inférence.
// PÉRIMÈTRE: valeurs « pures » uniquement (aucun autre mot que la valeur elle-même, hors « % » /
//            « pour cent »). Dès qu'une réponse contient autre chose (unité, phrase), le texte n'est
//            pas comparable ici (`null`) et c'est au juge (Mistral) de trancher.

const UNITS = {
  zero: 0, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9,
  dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16
}
const TENS = { vingt: 20, vingts: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60 }
const SCALES = { mille: 1e3, million: 1e6, millions: 1e6, milliard: 1e9, milliards: 1e9 }

const MONTHS = {
  janvier: 1, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7, aout: 8,
  septembre: 9, octobre: 10, novembre: 11, decembre: 12
}

/** Minuscules, sans accents, espaces normalisés (espaces insécables compris). */
function normalize(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[\u00a0\u202f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Lit un entier écrit en toutes lettres en français (« quatre-vingt-dix-sept », « deux mille vingt-six »).
 *
 * @param {string[]} tokens - Mots déjà normalisés (sans tirets ni « et »)
 * @returns {number|null} `null` si un mot n'est pas un mot-nombre
 */
function parseIntegerWords(tokens) {
  if (tokens.length === 0) return null
  let result = 0
  let group = 0
  let previous = null
  for (const token of tokens) {
    if (token in UNITS) {
      group += UNITS[token]
    } else if (token in TENS) {
      // « quatre-vingt(s) » : 4 déjà ajouté par « quatre » → on le remplace par 80
      if ((token === 'vingt' || token === 'vingts') && previous === 'quatre') group = group - 4 + 80
      else group += TENS[token]
    } else if (token === 'cent' || token === 'cents') {
      group = (group || 1) * 100
    } else if (token in SCALES) {
      result += (group || 1) * SCALES[token]
      group = 0
    } else {
      return null
    }
    previous = token
  }
  return result + group
}

/** Découpe « quatre-vingt-dix-sept » / « vingt et un » en mots, en retirant le « et » de liaison. */
function wordTokens(text) {
  return normalize(text)
    .split(/[\s-]+/)
    .filter((t) => t && t !== 'et')
}

/**
 * Lit un nombre écrit en chiffres (« 3,14 », « 1 000 », « -5 ») ou en toutes lettres
 * (« trois virgule quatorze », « mille sept cent quatre-vingt-neuf »).
 *
 * @param {string} text
 * @returns {{ value: number, percent: boolean }|null}
 */
function parseNumber(text) {
  let s = normalize(text)
  if (!s) return null

  let percent = false
  if (/%$/.test(s)) {
    percent = true
    s = s.replace(/\s*%$/, '')
  } else if (/\bpour ?cent$/.test(s)) {
    percent = true
    s = s.replace(/\s*pour ?cent$/, '')
  }

  // Chiffres : « 1 000,5 », « 3.14 », « -2 »
  const digits = s.replace(/^−\s*/, '-')
  // « 1.000 » : séparateur de milliers français ou décimale anglo-saxonne ? Ambigu → non comparable.
  if (/^-?\d{1,3}\.\d{3}$/.test(digits)) return null
  if (/^-?\d{1,3}( \d{3})+([,.]\d+)?$/.test(digits) || /^-?\d+([,.]\d+)?$/.test(digits)) {
    return { value: Number(digits.replace(/ /g, '').replace(',', '.')), percent }
  }

  // Toutes lettres, avec « virgule » / « point » décimal
  let negative = false
  let words = s
  if (/^(moins) /.test(words)) {
    negative = true
    words = words.replace(/^moins /, '')
  }
  const parts = words.split(/ (?:virgule|point) /)
  if (parts.length > 2) return null
  const integerPart = parseIntegerWords(wordTokens(parts[0]))
  if (integerPart === null) return null
  let value = integerPart
  if (parts.length === 2) {
    const decimalTokens = wordTokens(parts[1])
    let leadingZeros = 0
    while (decimalTokens[0] === 'zero') {
      leadingZeros += 1
      decimalTokens.shift()
    }
    const rest = decimalTokens.length ? parseIntegerWords(decimalTokens) : 0
    if (rest === null) return null
    const decimals = '0'.repeat(leadingZeros) + (decimalTokens.length ? String(rest) : '')
    if (!decimals) return null
    value = Number(`${integerPart}.${decimals}`)
  }
  return { value: negative ? -value : value, percent }
}

/** Lit un jour du mois : « 18 », « 1er », « premier », « dix-huit ». */
function parseDay(text) {
  const s = normalize(text)
  if (/^\d{1,2}(er)?$/.test(s)) return parseInt(s, 10)
  if (s === 'premier') return 1
  const n = parseIntegerWords(wordTokens(s))
  return n
}

/**
 * Lit une date complète (jour, mois, année) : « 18/09/2026 », « 2026-09-18 », « le 18 septembre 2026 »,
 * « dix-huit septembre deux mille vingt-six », « le premier mai 1789 ».
 *
 * @param {string} text
 * @returns {{ year: number, month: number, day: number }|null}
 */
function parseDate(text) {
  const s = normalize(text).replace(/^le /, '')
  if (!s) return null

  let m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/)
  if (m) return validDate(+m[3], +m[2], +m[1])
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) return validDate(+m[1], +m[2], +m[3])

  const tokens = s.split(' ')
  const monthIndex = tokens.findIndex((t) => t in MONTHS)
  if (monthIndex < 1 || monthIndex === tokens.length - 1) return null
  const day = parseDay(tokens.slice(0, monthIndex).join(' '))
  const yearText = tokens.slice(monthIndex + 1).join(' ')
  const year = /^\d{4}$/.test(yearText) ? parseInt(yearText, 10) : parseIntegerWords(wordTokens(yearText))
  if (day === null || year === null) return null
  return validDate(year, MONTHS[tokens[monthIndex]], day)
}

function validDate(year, month, day) {
  if (year < 1000 || year > 2999 || month < 1 || month > 12 || day < 1 || day > 31) return null
  return { year, month, day }
}

/**
 * Compare une valeur attendue et la réponse d'un étudiant.
 *
 * @param {string} reference
 * @param {string} answer
 * @returns {true|false|null} `true` même valeur, `false` valeurs différentes, `null` non comparable
 *   (l'un des deux n'est pas une valeur pure, ou nature différente : date contre nombre…)
 */
function sameValue(reference, answer) {
  const refDate = parseDate(reference)
  const ansDate = parseDate(answer)
  if (refDate || ansDate) {
    if (!(refDate && ansDate)) return null
    return refDate.year === ansDate.year && refDate.month === ansDate.month && refDate.day === ansDate.day
  }
  const refNumber = parseNumber(reference)
  const ansNumber = parseNumber(answer)
  if (!refNumber || !ansNumber) return null
  if (refNumber.percent !== ansNumber.percent) return null
  return Math.abs(refNumber.value - ansNumber.value) < 1e-9
}

/**
 * Verdict numérique sur plusieurs valeurs attendues.
 *
 * @param {string[]} references
 * @param {string} answer
 * @returns {'equal'|'different'|null} `equal` si au moins une référence a la même valeur ;
 *   `different` si TOUTES les références sont comparables et aucune n'est égale ; sinon `null`
 */
function numericVerdict(references, answer) {
  if (!references || references.length === 0) return null
  const results = references.map((ref) => sameValue(ref, answer))
  if (results.some((r) => r === true)) return 'equal'
  if (results.every((r) => r === false)) return 'different'
  return null
}

module.exports = { parseNumber, parseDate, sameValue, numericVerdict }
