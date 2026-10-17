// Lecture d'une date renvoyée par l'API.
//
// BUG CORRIGÉ: une date sans heure (« 2026-11-20 », colonnes DATEONLY : jour d'une séance, échéance…) est lue
// par `new Date()` comme MINUIT UTC. Affichée ensuite dans le fuseau local, elle devenait « 01:00 » à Paris
// (UTC+1) — et, pour un fuseau à l'ouest d'UTC, elle reculait d'UN JOUR (19 novembre). Une date sans heure est
// un jour du calendrier : on la lit comme minuit LOCAL, ce qui garde toujours le bon jour.
// Une date avec heure (ISO complet) reste lue comme l'instant qu'elle désigne.

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

/** @param {string|number|Date} value @returns {Date} */
export function parseCalendarDate(value) {
  if (typeof value === 'string') {
    const m = DATE_ONLY.exec(value)
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  }
  return new Date(value)
}
