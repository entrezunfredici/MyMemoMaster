// Calendrier : constantes, dates et types d'événements, sans état ni appel API.
// Les clés de jour utilisent un mois À PARTIR DE 0 (comme `Date`) ; les dates de l'API sont
// en `AAAA-MM-JJ` avec un mois à partir de 1 (voir parseDateToKey).

export const MONTHS = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
]

export const DAYS_SHORT = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di']

// Types d'événements affichés : libellé et variante de couleur (classes `pill-<couleur>` /
// `ev-card <couleur>` des composants). Les trois types viennent de l'API (événement de calendrier,
// échéance, séance de révision) ; une variante de couleur supplémentaire (amber, purple) est
// prévue par les styles pour un futur type.
export const EVENT_TYPES = {
  calendar: { label: 'Événement', color: 'blue' },
  deadline: { label: 'Échéance', color: 'red' },
  revision: { label: 'Révision', color: 'green' },
}

export const eventTypeLabel = (type) => EVENT_TYPES[type]?.label || EVENT_TYPES.calendar.label
export const eventTypeColor = (type) => EVENT_TYPES[type]?.color || EVENT_TYPES.calendar.color

// Nombre de jours du mois m (0-11 ; accepte -1 et 12 : mois précédent / suivant).
export function getDaysInMonth(y, m) {
  return new Date(y, (((m % 12) + 12) % 12) + 1, 0).getDate()
}

// Index du 1er jour du mois dans la semaine, lundi = 0.
export function getFirstDay(y, m) {
  const d = new Date(y, m, 1).getDay()
  return d === 0 ? 6 : d - 1
}

// Clé interne d'un jour : « 2026-05-07 » avec un mois à partir de 0.
export function eventKey(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

// Date de l'API (« 2026-06-02 », mois à partir de 1) → clé interne (mois à partir de 0).
export function parseDateToKey(dateStr) {
  const [y, m, d] = String(dateStr).split('-').map(Number)
  return eventKey(y, m - 1, d)
}

// « 2 Juin 2026 · 09:00 – 10:30 » (horaires facultatifs).
export function formatSessionDate(session) {
  const [y, m, d] = session.date.split('-').map(Number)
  const hours = [session.startTime, session.endTime].filter(Boolean).map((t) => t.slice(0, 5))
  const when = `${d} ${MONTHS[m - 1]} ${y}`
  return hours.length ? `${when} · ${hours.join(' – ')}` : when
}

// Date saisie dans le formulaire (`type="date"`) pour un jour du calendrier.
export function toInputDate(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
