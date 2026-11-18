const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')

dayjs.extend(utc)
dayjs.extend(timezone)

const DAY_FORMAT = 'YYYY-MM-DD'

/**
 * Indique si une chaîne est un fuseau IANA connu (ex. « Europe/Paris »).
 *
 * @param {unknown} zone
 * @returns {boolean}
 */
function isValidZone(zone) {
  if (typeof zone !== 'string' || zone.length === 0 || zone.length > 64) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone })
    return true
  } catch {
    return false
  }
}

/**
 * Instant exprimé dans le fuseau de l'utilisateur. Sans fuseau (ou fuseau inconnu), le fuseau du
 * serveur est utilisé : comportement historique, conservé pour les comptes qui n'ont jamais envoyé le leur.
 *
 * @param {Date|string|number} [date]
 * @param {string|null} [zone]
 * @returns {import('dayjs').Dayjs}
 */
function inZone(date = new Date(), zone = null) {
  return isValidZone(zone) ? dayjs(date).tz(zone) : dayjs(date)
}

/**
 * Jour calendaire (YYYY-MM-DD) d'un instant dans le fuseau de l'utilisateur.
 *
 * @param {Date|string|number} [date]
 * @param {string|null} [zone]
 * @returns {string}
 */
function dayString(date = new Date(), zone = null) {
  return inZone(date, zone).format(DAY_FORMAT)
}

/**
 * Début et fin (inclus) du jour courant de l'utilisateur, en instants absolus.
 *
 * @param {Date} [now]
 * @param {string|null} [zone]
 * @returns {{ start: Date, end: Date }}
 */
function dayBounds(now = new Date(), zone = null) {
  const local = inZone(now, zone)
  return { start: local.startOf('day').toDate(), end: local.endOf('day').toDate() }
}

module.exports = { isValidZone, inZone, dayString, dayBounds, DAY_FORMAT }
