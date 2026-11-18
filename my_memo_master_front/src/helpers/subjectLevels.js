// Affichage des niveaux par matière (B1). Les niveaux et leurs seuils viennent de l'API : ce fichier ne fait
// que mettre en forme ce qu'elle renvoie (GET /badges/me/subject-levels).

/**
 * Conditions du prochain niveau d'une matière, prêtes à afficher (une jauge par condition).
 *
 * @param {{ mode: string, cards: object, exercises: object, averagePercent: object }|null|undefined} next
 * @returns {{ rule: string, items: Array<{ key: string, label: string, current: number, target: number, met: boolean, unit: string }> }|null}
 *   `rule` : phrase qui dit si l'une ou toutes les conditions sont requises ; null au niveau maximal
 */
export function nextLevelRequirements(next) {
  if (!next) return null
  const item = (key, label, { current, target }, unit = '') => ({ key, label, current, target, met: current >= target, unit })
  const items = [
    item('cards', 'Cartes maîtrisées', next.cards),
    item('exercises', 'Exercices terminés', next.exercises),
    item('average', 'Moyenne aux exercices', next.averagePercent, ' %'),
  ]
  const rule =
    next.mode === 'either'
      ? 'Il suffit de remplir les cartes OU les exercices (exercices : nombre et moyenne).'
      : 'Il faut remplir les cartes ET les exercices (exercices : nombre et moyenne).'
  return { rule, items }
}

/**
 * Phrase de synthèse d'une matière : « 12 cartes maîtrisées sur 15 · 2 exercices, moyenne 63 % ».
 *
 * @param {{ masteredCards: number, totalCards: number, exercises: number, averagePercent: number }} stats
 * @returns {string}
 */
export function subjectStatsText(stats) {
  const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`
  const parts = []
  if (stats.totalCards > 0) parts.push(`${plural(stats.masteredCards, 'carte')} ${stats.masteredCards > 1 ? 'maîtrisées' : 'maîtrisée'} sur ${stats.totalCards}`)
  if (stats.exercises > 0) parts.push(`${plural(stats.exercises, 'exercice')}, moyenne ${stats.averagePercent} %`)
  return parts.join(' · ')
}
