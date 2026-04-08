import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getDayRange,
  getWeekRange,
  getMonthRange,
  isInPeriod,
  formatDeadline,
  isOverdue,
} from '../todoHelpers'

// ─── getDayRange ──────────────────────────────────────────────────────────────
describe('getDayRange', () => {
  it('start is midnight of today', () => {
    const { start } = getDayRange()
    expect(start.getHours()).toBe(0)
    expect(start.getMinutes()).toBe(0)
    expect(start.getSeconds()).toBe(0)
  })

  it('end is 23:59:59 of today', () => {
    const { end } = getDayRange()
    expect(end.getHours()).toBe(23)
    expect(end.getMinutes()).toBe(59)
    expect(end.getSeconds()).toBe(59)
  })

  it('start and end share the same calendar date', () => {
    const { start, end } = getDayRange()
    expect(start.toDateString()).toBe(end.toDateString())
  })
})

// ─── getWeekRange ─────────────────────────────────────────────────────────────
describe('getWeekRange', () => {
  it('start is a Monday (day index 1)', () => {
    const { start } = getWeekRange()
    expect(start.getDay()).toBe(1)
  })

  it('end is a Sunday (day index 0)', () => {
    const { end } = getWeekRange()
    expect(end.getDay()).toBe(0)
  })

  it('range spans exactly 7 days', () => {
    const { start, end } = getWeekRange()
    const diffMs = end.getTime() - start.getTime()
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
    expect(diffDays).toBe(6)
  })

  it('today falls within the range', () => {
    const now = new Date()
    const { start, end } = getWeekRange()
    expect(now >= start && now <= end).toBe(true)
  })
})

// ─── getMonthRange ────────────────────────────────────────────────────────────
describe('getMonthRange', () => {
  it('start is the first day of the current month', () => {
    const { start } = getMonthRange()
    expect(start.getDate()).toBe(1)
    expect(start.getMonth()).toBe(new Date().getMonth())
  })

  it('end is the last day of the current month', () => {
    const now = new Date()
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const { end } = getMonthRange()
    expect(end.getDate()).toBe(lastDay)
  })

  it('today falls within the range', () => {
    const now = new Date()
    const { start, end } = getMonthRange()
    expect(now >= start && now <= end).toBe(true)
  })
})

// ─── isInPeriod ───────────────────────────────────────────────────────────────
describe('isInPeriod', () => {
  it('returns false for a null deadline', () => {
    expect(isInPeriod(null, 'day')).toBe(false)
    expect(isInPeriod(null, 'week')).toBe(false)
    expect(isInPeriod(null, 'month')).toBe(false)
  })

  it('returns false for an unknown period key', () => {
    expect(isInPeriod(new Date().toISOString(), 'year')).toBe(false)
  })

  it('returns true for today ISO string in "day" period', () => {
    const today = new Date().toISOString()
    expect(isInPeriod(today, 'day')).toBe(true)
  })

  it('returns true for today in "week" period', () => {
    const today = new Date().toISOString()
    expect(isInPeriod(today, 'week')).toBe(true)
  })

  it('returns true for today in "month" period', () => {
    const today = new Date().toISOString()
    expect(isInPeriod(today, 'month')).toBe(true)
  })

  it('returns false for a date far in the past for "day" period', () => {
    expect(isInPeriod('2000-01-01T00:00:00.000Z', 'day')).toBe(false)
  })
})

// ─── formatDeadline ───────────────────────────────────────────────────────────
describe('formatDeadline', () => {
  it('returns null for a null input', () => {
    expect(formatDeadline(null)).toBeNull()
  })

  it('returns a non-empty string for a valid date string', () => {
    const result = formatDeadline('2025-06-15')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('contains the year in the formatted string', () => {
    const result = formatDeadline('2025-06-15')
    expect(result).toContain('2025')
  })
})

// ─── isOverdue ────────────────────────────────────────────────────────────────
describe('isOverdue', () => {
  it('returns false for a null deadline', () => {
    expect(isOverdue(null)).toBe(false)
  })

  it('returns true for a date in the past', () => {
    expect(isOverdue('2000-01-01')).toBe(true)
  })

  it('returns false for a date in the future', () => {
    expect(isOverdue('2099-12-31')).toBe(false)
  })
})
