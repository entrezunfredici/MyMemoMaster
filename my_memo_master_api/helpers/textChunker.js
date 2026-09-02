// Découpage d'un texte long en chunks pour C-01.05 (« Pipeline traitement — PDF, chunking, LLM »).
// Périmètre : un algorithme simple, déterministe, sans dépendance externe — pas un tokenizer réel
// (la longueur en caractères est une approximation grossière du nombre de tokens, cf. DECISIONS.md).
//
// Stratégie : découpe d'abord par paragraphes (double saut de ligne), puis empile les paragraphes
// dans un chunk tant que la longueur maximale n'est pas dépassée. Un paragraphe qui dépasse à lui
// seul la longueur maximale est re-découpé par phrases, puis par force (longueur brute) si une
// phrase seule dépasse encore — garantit qu'aucun chunk ne dépasse la limite et que l'algorithme
// termine toujours, quel que soit le texte en entrée.

const DEFAULT_MAX_CHUNK_LENGTH = 4000

/**
 * @param {string} text
 * @returns {string[]} Paragraphes non vides, préservant leur ordre
 */
function splitIntoParagraphs(text) {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
}

/**
 * Redécoupe un paragraphe trop long en morceaux ≤ maxLength, par phrases puis par force.
 *
 * @param {string} paragraph
 * @param {number} maxLength
 * @returns {string[]}
 */
function splitOversizedParagraph(paragraph, maxLength) {
  const sentences = paragraph.split(/(?<=[.!?])\s+/)
  const pieces = []
  let current = ''

  for (const sentence of sentences) {
    if (sentence.length > maxLength) {
      if (current) {
        pieces.push(current)
        current = ''
      }
      for (let i = 0; i < sentence.length; i += maxLength) {
        pieces.push(sentence.slice(i, i + maxLength))
      }
      continue
    }

    const candidate = current ? `${current} ${sentence}` : sentence
    if (candidate.length > maxLength) {
      if (current) pieces.push(current)
      current = sentence
    } else {
      current = candidate
    }
  }

  if (current) pieces.push(current)
  return pieces
}

/**
 * Découpe un texte en chunks ≤ maxChunkLength caractères, en respectant autant que possible les
 * frontières de paragraphes.
 *
 * @param {string} text
 * @param {{ maxChunkLength?: number }} [options]
 * @returns {string[]} Liste de chunks (vide si le texte est vide/blanc)
 */
function chunkText(text, { maxChunkLength = DEFAULT_MAX_CHUNK_LENGTH } = {}) {
  const normalized = typeof text === 'string' ? text.trim() : ''
  if (!normalized) return []

  const paragraphs = splitIntoParagraphs(normalized)
  const chunks = []
  let current = ''

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph

    if (candidate.length <= maxChunkLength) {
      current = candidate
      continue
    }

    if (current) {
      chunks.push(current)
      current = ''
    }

    if (paragraph.length > maxChunkLength) {
      chunks.push(...splitOversizedParagraph(paragraph, maxChunkLength))
    } else {
      current = paragraph
    }
  }

  if (current) chunks.push(current)

  return chunks
}

module.exports = { chunkText, DEFAULT_MAX_CHUNK_LENGTH }
