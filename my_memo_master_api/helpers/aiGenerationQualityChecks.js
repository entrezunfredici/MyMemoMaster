// Vérifications de QUALITÉ de génération (C-01.10), distinctes des vérifications de CONFORMITÉ DE
// SCHÉMA déjà faites par AiCardGenerationService#validatePayload/validateCard (C-01.04). Le schéma
// garantit qu'une carte est bien formée (champs présents, mcq à 1 seule bonne réponse...) ; il ne
// garantit PAS que le contenu respecte les garde-fous de generation_ia_prompt_cartes.md §5
// (anti-hallucination, atomicité/absence de doublon) — c'est ce que ce module vérifie.
//
// Fonctions pures, sans appel réseau : testables sans clé Mistral (voir
// test/helpers/aiGenerationQualityChecks.test.js). Utilisées par le protocole empirique C-01.10
// (scripts/quality-check-ai-generation.js), qui lui appelle réellement l'API sur un jeu de
// référence — voir docs/RAPPORT_QUALITE_GENERATION_IA.md.

/**
 * Normalise un texte pour comparaison tolérante aux espaces/casse (une IA peut reformater des
 * espaces ou une majuscule sans que ce soit une hallucination).
 * @param {string} text
 * @returns {string}
 */
function normalize(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Vérifie que `sourceExcerpt` est un passage réellement présent dans `sourceText` (§5.1 —
 * anti-hallucination : le mécanisme de vérifiabilité n'a de valeur que si l'extrait cité existe
 * vraiment). Tolérant aux espaces/casse, pas au reformulage : un extrait paraphrasé plutôt que cité
 * mot pour mot est considéré comme un échec de ce contrôle, par construction (c'est justement ce que
 * "cite le passage exact" doit empêcher).
 *
 * @param {string} sourceExcerpt
 * @param {string} sourceText
 * @returns {boolean}
 */
function isExcerptGenuine(sourceExcerpt, sourceText) {
  if (typeof sourceExcerpt !== 'string' || !sourceExcerpt.trim()) return false
  if (typeof sourceText !== 'string' || !sourceText.trim()) return false
  return normalize(sourceText).includes(normalize(sourceExcerpt))
}

/**
 * Détecte les doublons de notion entre cartes d'un même batch (§5.2 — atomicité : deux cartes ne
 * doivent jamais porter sur exactement la même notion). Heuristique volontairement simple :
 * égalité après normalisation, ou chevauchement lexical élevé — ne remplace pas une relecture
 * humaine sur des reformulations plus subtiles, documenté comme limite (voir rapport).
 *
 * @param {{ statement: string }[]} cards
 * @returns {{ index: number, duplicateOf: number }[]} paires en doublon (indices dans `cards`)
 */
function findDuplicateStatements(cards) {
  const duplicates = []
  const normalized = (cards || []).map((c) => normalize(c?.statement))

  for (let i = 0; i < normalized.length; i++) {
    for (let j = i + 1; j < normalized.length; j++) {
      if (!normalized[i] || !normalized[j]) continue
      if (normalized[i] === normalized[j] || wordOverlapRatio(normalized[i], normalized[j]) >= 0.8) {
        duplicates.push({ index: j, duplicateOf: i })
      }
    }
  }
  return duplicates
}

/**
 * Ratio de chevauchement lexical (Jaccard sur les mots) entre deux textes normalisés — proxy de
 * similarité, pas une mesure sémantique.
 * @param {string} a
 * @param {string} b
 * @returns {number} entre 0 et 1
 */
function wordOverlapRatio(a, b) {
  const wordsA = new Set(a.split(' ').filter(Boolean))
  const wordsB = new Set(b.split(' ').filter(Boolean))
  if (!wordsA.size || !wordsB.size) return 0
  let intersection = 0
  wordsA.forEach((w) => {
    if (wordsB.has(w)) intersection++
  })
  const union = wordsA.size + wordsB.size - intersection
  return union === 0 ? 0 : intersection / union
}

/**
 * Retire les cartes en doublon d'un batch, ne gardant que la première occurrence de chaque notion
 * (cf. findDuplicateStatements). Filet de sécurité applicatif — indépendant de la discipline du
 * modèle — utilisé par AiCardGenerationService#generateCards en plus du renforcement du prompt
 * système (règle 7) suite à l'écart trouvé par le protocole C-01.10 (docs/RAPPORT_QUALITE_GENERATION_IA.md
 * §4) : sur du contenu insuffisant, le modèle peut combler jusqu'au cardCount demandé par
 * reformulation plutôt que de réduire le nombre de cartes.
 *
 * @param {object[]} cards
 * @returns {{ cards: object[], removedCount: number }}
 */
function dedupeCards(cards) {
  const duplicates = findDuplicateStatements(cards)
  if (!duplicates.length) return { cards: cards || [], removedCount: 0 }

  const removedIndices = new Set(duplicates.map((d) => d.index))
  return {
    cards: (cards || []).filter((_, index) => !removedIndices.has(index)),
    removedCount: removedIndices.size
  }
}

/**
 * Vérifie qu'un batch respecte §5.3 (contenu source insuffisant) : si moins de cartes que demandé
 * ont été produites, `warning` doit être renseigné plutôt que silencieux.
 *
 * @param {{ cards: object[], warning: string|null }} payload
 * @param {number} requestedCardCount
 * @returns {boolean}
 */
function respectsShortfallWarning(payload, requestedCardCount) {
  const produced = Array.isArray(payload?.cards) ? payload.cards.length : 0
  if (produced >= requestedCardCount) return true
  return typeof payload?.warning === 'string' && payload.warning.trim().length > 0
}

module.exports = {
  normalize,
  isExcerptGenuine,
  findDuplicateStatements,
  wordOverlapRatio,
  dedupeCards,
  respectsShortfallWarning
}
