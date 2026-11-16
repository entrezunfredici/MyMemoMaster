const MS_PER_DAY = 86400000

// CHOIX: numéro de jour calculé en UTC sur la chaîne YYYY-MM-DD plutôt que dayjs().diff('day')
// RAISON: un changement d'heure rend un jour local de 23 h ou 25 h, et diff() tronque alors à 0 ou 1.
const dayNumber = (dateStr) => Math.floor(Date.parse(`${dateStr}T00:00:00Z`) / MS_PER_DAY)

// Un jour manqué est toléré si le dernier jour de grâce utilisé date d'au moins 7 jours
// (« 1 jour manqué par fenêtre de 7 jours » — diagrams/gamification_badges.md §5).
const GRACE_WINDOW_DAYS = 7

/**
 * Calcule la série courante et la meilleure série à partir des jours d'activité.
 * Un jour manqué isolé ne casse pas la série (jour de grâce) mais n'est pas compté ;
 * la série courante est nulle si le dernier jour d'activité n'est ni aujourd'hui ni hier.
 *
 * @param {string[]} dates - jours d'activité (YYYY-MM-DD), dans n'importe quel ordre, doublons tolérés
 * @param {string} today - jour courant (YYYY-MM-DD)
 * @returns {{ current: number, best: number }}
 */
function computeStreaks(dates, today) {
  const days = [...new Set(dates)].map(dayNumber).sort((a, b) => a - b)
  if (days.length === 0) return { current: 0, best: 0 }

  let run = 1
  let best = 1
  let lastGraceDay = null

  for (let i = 1; i < days.length; i++) {
    const gap = days[i] - days[i - 1]
    if (gap === 1) {
      run++
    } else if (gap === 2 && (lastGraceDay === null || days[i - 1] + 1 - lastGraceDay >= GRACE_WINDOW_DAYS)) {
      lastGraceDay = days[i - 1] + 1
      run++
    } else {
      run = 1
      lastGraceDay = null
    }
    if (run > best) best = run
  }

  const sinceLast = dayNumber(today) - days[days.length - 1]
  const current = sinceLast === 0 || sinceLast === 1 ? run : 0
  return { current, best }
}

module.exports = { computeStreaks, dayNumber }
