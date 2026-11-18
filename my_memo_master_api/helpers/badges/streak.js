const MS_PER_DAY = 86400000

// CHOIX: numéro de jour calculé en UTC sur la chaîne YYYY-MM-DD plutôt que dayjs().diff('day')
// RAISON: un changement d'heure rend un jour local de 23 h ou 25 h, et diff() tronque alors à 0 ou 1.
const dayNumber = (dateStr) => Math.floor(Date.parse(`${dateStr}T00:00:00Z`) / MS_PER_DAY)
const dateOf = (dayNum) => new Date(dayNum * MS_PER_DAY).toISOString().slice(0, 10)

// Un jour manqué est toléré si le dernier jour de grâce utilisé date d'au moins 7 jours
// (« 1 jour manqué par fenêtre de 7 jours » — diagrams/gamification_badges.md §5).
const GRACE_WINDOW_DAYS = 7

// Gel de série (A3) : 1 gel gagné chaque fois que la série atteint un multiple de 14 jours pratiqués, jamais
// acheté. Un gel couvre UN jour manqué. Le jour de grâce joue toujours en premier, les gels couvrent le reste.
// Le stock est plafonné : accumuler sans limite viderait la série de son sens.
const FREEZE_EVERY_DAYS = 14
const MAX_FREEZES = 2

/**
 * Calcule la série courante, la meilleure série et l'état des gels à partir des jours d'activité.
 * Fonction pure rejouable : le stock de gels se déduit de l'historique (rien n'est stocké), donc un
 * rattrapage ou un changement de fuseau reste cohérent.
 *
 * Un jour manqué isolé ne casse pas la série (jour de grâce) ; au-delà, un gel en réserve couvre chaque
 * jour manqué supplémentaire, sinon la série est cassée. Les jours couverts ne sont pas comptés.
 * La série courante est nulle si le dernier jour d'activité n'est ni aujourd'hui ni hier.
 *
 * @param {string[]} dates - jours d'activité (YYYY-MM-DD), dans n'importe quel ordre, doublons tolérés
 * @param {string} today - jour courant (YYYY-MM-DD)
 * @returns {{ current: number, best: number, freezesAvailable: number, freezesUsed: number,
 *   freezeProgress: number, lastFreezeEarnedOn: string|null, lastFreezeUsedOn: string|null }}
 *   `freezeProgress` : jours pratiqués dans le cycle de 14 jours en cours ; `lastFreezeUsedOn` : jour de
 *   pratique qui a suivi un trou couvert par un gel
 */
function computeStreakDetails(dates, today) {
  const empty = { current: 0, best: 0, freezesAvailable: 0, freezesUsed: 0, freezeProgress: 0, lastFreezeEarnedOn: null, lastFreezeUsedOn: null }
  const days = [...new Set(dates)].map(dayNumber).sort((a, b) => a - b)
  if (days.length === 0) return empty

  let run = 1
  let best = 1
  let lastGraceDay = null
  let freezes = 0
  let freezesUsed = 0
  let lastFreezeEarnedOn = null
  let lastFreezeUsedOn = null

  const earnFreeze = (dayNum) => {
    if (run % FREEZE_EVERY_DAYS !== 0 || freezes >= MAX_FREEZES) return
    freezes++
    lastFreezeEarnedOn = dateOf(dayNum)
  }

  for (let i = 1; i < days.length; i++) {
    const missed = days[i] - days[i - 1] - 1
    if (missed === 0) {
      run++
      earnFreeze(days[i])
    } else {
      const firstMissed = days[i - 1] + 1
      const graceAvailable = lastGraceDay === null || firstMissed - lastGraceDay >= GRACE_WINDOW_DAYS
      const freezesNeeded = missed - (graceAvailable ? 1 : 0)
      if (freezesNeeded <= freezes) {
        if (graceAvailable) lastGraceDay = firstMissed
        if (freezesNeeded > 0) {
          freezes -= freezesNeeded
          freezesUsed += freezesNeeded
          lastFreezeUsedOn = dateOf(days[i])
        }
        run++
        earnFreeze(days[i])
      } else {
        run = 1
        lastGraceDay = null
      }
    }
    if (run > best) best = run
  }

  const sinceLast = dayNumber(today) - days[days.length - 1]
  const current = sinceLast === 0 || sinceLast === 1 ? run : 0
  return {
    current,
    best,
    freezesAvailable: freezes,
    freezesUsed,
    freezeProgress: current > 0 ? run % FREEZE_EVERY_DAYS : 0,
    lastFreezeEarnedOn,
    lastFreezeUsedOn
  }
}

/**
 * Série courante et meilleure série (voir `computeStreakDetails`, qui renvoie aussi l'état des gels).
 *
 * @param {string[]} dates
 * @param {string} today
 * @returns {{ current: number, best: number }}
 */
function computeStreaks(dates, today) {
  const { current, best } = computeStreakDetails(dates, today)
  return { current, best }
}

module.exports = { computeStreaks, computeStreakDetails, dayNumber, FREEZE_EVERY_DAYS, MAX_FREEZES, GRACE_WINDOW_DAYS }
