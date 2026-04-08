/**
 * Returns the [start, end] Date range for the current day.
 * @returns {{ start: Date, end: Date }}
 */
export function getDayRange() {
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

/**
 * Returns the [start, end] Date range for the current week (Monday → Sunday).
 * @returns {{ start: Date, end: Date }}
 */
export function getWeekRange() {
  const now = new Date()
  const day = now.getDay() // 0 = Sunday, 1 = Monday …
  const diffToMonday = day === 0 ? -6 : 1 - day
  const start = new Date(now)
  start.setDate(now.getDate() + diffToMonday)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

/**
 * Returns the [start, end] Date range for the current month.
 * @returns {{ start: Date, end: Date }}
 */
export function getMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  start.setHours(0, 0, 0, 0)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

/**
 * Checks whether a deadline date string falls within the given period range.
 * Todos without a deadline are never within a calendar period.
 * @param {string|null} deadlineStr - ISO date string or null
 * @param {'day'|'week'|'month'} period
 * @returns {boolean}
 */
export function isInPeriod(deadlineStr, period) {
  if (!deadlineStr) return false
  const date = new Date(deadlineStr)
  const ranges = { day: getDayRange, week: getWeekRange, month: getMonthRange }
  const getRangeFn = ranges[period]
  if (!getRangeFn) return false
  const { start, end } = getRangeFn()
  return date >= start && date <= end
}

/**
 * Formats a date string to a human-readable French locale string (dd/mm/yyyy).
 * @param {string|null} dateStr
 * @returns {string|null}
 */
export function formatDeadline(dateStr) {
  if (!dateStr) return null
  const date = new Date(dateStr)
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Returns true when the deadline is in the past and the todo is not yet done.
 * @param {string|null} dateStr
 * @returns {boolean}
 */
export function isOverdue(dateStr) {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}
