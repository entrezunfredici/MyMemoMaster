import { describe, it, expect } from 'vitest'
import {
  formatDate,
  formatFileSize,
  fileIcon,
  deadlineTypeLabel,
  resourceTypeLabel,
  disciplineScoreClass,
  weeklyBarHeight,
  formatMinutes,
} from '@/helpers/classroomFormat'

describe('formatDate', () => {
  it('format français court', () => {
    expect(formatDate('2026-11-03T10:00:00Z')).toMatch(/^0?3 nov\.? 2026$/)
  })
  it.each([[null], [undefined], ['']])('valeur vide (%s) -> chaîne vide', (v) => {
    expect(formatDate(v)).toBe('')
  })
})

describe('formatFileSize', () => {
  it.each([
    [0, ''],
    [null, ''],
    [500, '500 o'],
    [1023, '1023 o'],
    [1024, '1 Ko'],
    [2048, '2 Ko'],
    [1024 * 1024, '1.0 Mo'],
    [5.5 * 1024 * 1024, '5.5 Mo'],
  ])('%s octets -> « %s »', (bytes, expected) => {
    expect(formatFileSize(bytes)).toBe(expected)
  })
})

describe('fileIcon', () => {
  it.each([
    [null, '📄'],
    ['application/pdf', '📕'],
    ['image/png', '🖼'],
    ['application/msword', '📝'],
    ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', '📝'],
    ['application/vnd.ms-powerpoint', '📊'],
    ['application/vnd.openxmlformats-officedocument.presentationml.presentation', '📊'],
    ['application/vnd.ms-excel', '📈'],
    ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '📈'],
    ['application/zip', '📄'],
  ])('%s -> %s', (mime, icon) => {
    expect(fileIcon(mime)).toBe(icon)
  })
})

describe('libellés', () => {
  it('deadlineTypeLabel : types connus, sinon la valeur brute', () => {
    expect(deadlineTypeLabel('ds')).toBe('DS')
    expect(deadlineTypeLabel('devoir')).toBe('Devoir')
    expect(deadlineTypeLabel('exposé')).toBe('Exposé')
    expect(deadlineTypeLabel('autre')).toBe('Autre')
    expect(deadlineTypeLabel('inconnu')).toBe('inconnu')
  })
  it('resourceTypeLabel : types connus, sinon la valeur brute', () => {
    expect(resourceTypeLabel('cours')).toBe('Cours')
    expect(resourceTypeLabel('carte_mentale')).toBe('Carte mentale')
    expect(resourceTypeLabel('sujet')).toBe('Sujet')
    expect(resourceTypeLabel('x')).toBe('x')
  })
})

describe('disciplineScoreClass', () => {
  it.each([[100, 'text-success'], [70, 'text-success'], [69, 'text-primary'], [40, 'text-primary'], [39, 'text-secondary'], [0, 'text-secondary']])(
    'score %i -> %s',
    (score, cls) => expect(disciplineScoreClass(score)).toBe(cls),
  )
})

describe('weeklyBarHeight', () => {
  it.each([
    [0, '3px'],
    [undefined, '3px'],
    [1, '20%'], // plancher à 20 %
    [3, '43%'],
    [7, '100%'],
    [20, '100%'], // plafond à 100 %
  ])('%s séance(s) -> %s', (count, height) => expect(weeklyBarHeight(count)).toBe(height))
})

describe('formatMinutes', () => {
  it.each([
    [0, '0 min'],
    [null, '0 min'],
    [45, '45 min'],
    [60, '1h'],
    [135, '2h 15min'],
  ])('%s -> %s', (m, expected) => expect(formatMinutes(m)).toBe(expected))
})
