// Niveau par matière (B1) : Novice → Initié → Confirmé → Expert, selon les cartes maîtrisées (boîtes 4 et 5
// du système de Leitner) et les résultats des exercices personnels. Pas de points : des seuils lisibles,
// affichés tels quels à l'utilisateur.

const LEVELS = [
  { code: 'novice', label: 'Novice', icon: '🌱' },
  { code: 'initiate', label: 'Initié', icon: '📘' },
  { code: 'confirmed', label: 'Confirmé', icon: '🎯' },
  { code: 'expert', label: 'Expert', icon: '🏅' }
]

// Cartes maîtrisées nécessaires pour les paliers 1, 2 et 3.
const CARD_TIERS = [10, 50, 150]

// Exercices terminés ET moyenne (%) nécessaires pour les paliers 1, 2 et 3. Une moyenne basse sur peu
// d'essais ne prouve rien, d'où les deux conditions.
const EXERCISE_TIERS = [
  { count: 2, percent: 50 },
  { count: 5, percent: 65 },
  { count: 10, percent: 80 }
]

/**
 * Palier atteint côté cartes (0 à 3).
 *
 * @param {number} masteredCards
 * @returns {number}
 */
const cardsTier = (masteredCards) => CARD_TIERS.filter((min) => masteredCards >= min).length

/**
 * Palier atteint côté exercices (0 à 3) : le plus haut palier dont les deux conditions sont remplies.
 *
 * @param {number} exercises - nombre d'exercices personnels terminés
 * @param {number} averagePercent - moyenne des scores, en %
 * @returns {number}
 */
function exercisesTier(exercises, averagePercent) {
  let tier = 0
  EXERCISE_TIERS.forEach((req, i) => {
    if (exercises >= req.count && averagePercent >= req.percent) tier = i + 1
  })
  return tier
}

/**
 * Niveau d'une matière. Le niveau Initié demande l'un OU l'autre des deux axes ; Confirmé et Expert
 * demandent les deux (un élève qui ne fait que des cartes, ou que des exercices, ne dépasse pas Initié).
 *
 * @param {{ masteredCards: number, exercises: number, averagePercent: number }} stats
 * @returns {{ rank: number, level: { code: string, label: string, icon: string }, next: object|null }}
 *   `next` : prochain niveau et ce qu'il demande, avec l'avancement ; null au niveau maximal
 */
function levelForSubject({ masteredCards, exercises, averagePercent }) {
  const cards = cardsTier(masteredCards)
  const exo = exercisesTier(exercises, averagePercent)
  const rank = Math.max(Math.min(cards, exo), cards >= 1 || exo >= 1 ? 1 : 0)
  const level = LEVELS[rank]
  if (rank >= LEVELS.length - 1) return { rank, level, next: null }

  const target = rank + 1
  const exerciseReq = EXERCISE_TIERS[target - 1]
  return {
    rank,
    level,
    next: {
      ...LEVELS[target],
      // « either » : l'un des deux axes suffit (Initié) ; « both » : les deux sont requis
      mode: target === 1 ? 'either' : 'both',
      cards: { current: masteredCards, target: CARD_TIERS[target - 1] },
      exercises: { current: exercises, target: exerciseReq.count },
      averagePercent: { current: averagePercent, target: exerciseReq.percent }
    }
  }
}

module.exports = { LEVELS, CARD_TIERS, EXERCISE_TIERS, cardsTier, exercisesTier, levelForSubject }
