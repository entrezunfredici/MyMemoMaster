import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  shuffleInPlace,
  createQuestionState,
  selectFragment,
  unselectFragment,
  parseFillTemplate,
  normalizeAnswer,
  formatPoints,
  partialPoints,
  resultTone,
  formatUserAnswer,
  formatCorrectAnswer,
  formatResultDate,
  formatDeadlineDate,
} from '@/helpers/exerciseQuiz'

afterEach(() => vi.restoreAllMocks())

describe('shuffleInPlace', () => {
  it('conserve les mêmes éléments, sans en perdre ni dupliquer', () => {
    const a = [1, 2, 3, 4, 5, 6]
    shuffleInPlace(a)
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5, 6])
  })
  it('mélange réellement (tirage fixe : le premier passe en dernier)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const a = ['a', 'b', 'c']
    shuffleInPlace(a)
    expect(a).toEqual(['b', 'c', 'a'])
  })
  it('tableau vide ou d’un élément : inchangé', () => {
    const a = []
    shuffleInPlace(a)
    const b = [7]
    shuffleInPlace(b)
    expect(a).toEqual([])
    expect(b).toEqual([7])
  })
})

describe('createQuestionState', () => {
  it('question ouverte : réponse vide, aucun fragment', () => {
    expect(createQuestionState({ type: 'open' })).toEqual({ answer: '', order: [], shuffled: [], selected: [] })
  })
  it('QCM : réponse nulle, ordre d’affichage = permutation des indices des options', () => {
    const s = createQuestionState({ type: 'mcq', content: { options: [{}, {}, {}, {}] } })
    expect(s.answer).toBeNull()
    expect([...s.order].sort()).toEqual([0, 1, 2, 3])
  })
  it('QCM : la bonne réponse n’est pas toujours en premier (ordre mélangé)', () => {
    const firsts = new Set()
    for (let i = 0; i < 40; i++) firsts.add(createQuestionState({ type: 'mcq', content: { options: [{}, {}, {}, {}] } }).order[0])
    expect(firsts.size).toBeGreaterThan(1)
  })
  it('texte à trous : un champ vide par trou', () => {
    expect(createQuestionState({ type: 'fill_blank', content: { blanks: ['a', 'b', 'c'] } }).answer).toEqual(['', '', ''])
  })
  it('phrase à constituer : fragments mélangés (mêmes éléments), réponse vide', () => {
    const s = createQuestionState({ type: 'reorder', content: { fragments: ['Il', 'était', 'une', 'fois'] } })
    expect(s.answer).toEqual([])
    expect([...s.shuffled].sort()).toEqual(['fois', 'il'.replace('il', 'Il'), 'une', 'était'].sort())
  })
  it('ne mélange pas le tableau d’origine', () => {
    const fragments = ['a', 'b', 'c', 'd']
    createQuestionState({ type: 'reorder', content: { fragments } })
    expect(fragments).toEqual(['a', 'b', 'c', 'd'])
  })
  it('contenu absent : pas d’exception', () => {
    expect(() => createQuestionState({ type: 'mcq' })).not.toThrow()
    expect(createQuestionState({ type: 'fill_blank' }).answer).toEqual([])
  })
  it('l’ordre des tirages est « options d’abord, puis fragments » (reproductibilité des tests)', () => {
    const calls = []
    vi.spyOn(Math, 'random').mockImplementation(() => { calls.push(1); return 0 })
    createQuestionState({ type: 'mcq', content: { options: [{}, {}, {}] } })
    expect(calls.length).toBe(2) // n - 1 tirages pour 3 options
  })
})

describe('fragments', () => {
  const state = () => ({ answer: [], shuffled: ['une', 'Il', 'fois', 'était'], selected: [] })

  it('selectFragment ajoute à la suite et recompose la réponse', () => {
    const s = state()
    selectFragment(s, 1)
    selectFragment(s, 3)
    expect(s.selected).toEqual([1, 3])
    expect(s.answer).toEqual(['Il', 'était'])
  })
  it('unselectFragment retire à la position donnée', () => {
    const s = state()
    selectFragment(s, 1)
    selectFragment(s, 3)
    selectFragment(s, 0)
    unselectFragment(s, 1)
    expect(s.selected).toEqual([1, 0])
    expect(s.answer).toEqual(['Il', 'une'])
  })
  it('tout retirer : réponse vide', () => {
    const s = state()
    selectFragment(s, 2)
    unselectFragment(s, 0)
    expect(s.answer).toEqual([])
  })
})

describe('parseFillTemplate', () => {
  it('alterne texte et trous, indices lus dans le modèle', () => {
    expect(parseFillTemplate({ content: { template: 'Le {{0}} mange du {{1}}.' } })).toEqual([
      { type: 'text', value: 'Le ' },
      { type: 'blank', index: 0 },
      { type: 'text', value: ' mange du ' },
      { type: 'blank', index: 1 },
      { type: 'text', value: '.' },
    ])
  })
  it('trou en début et en fin, trou répété', () => {
    expect(parseFillTemplate({ content: { template: '{{0}} et {{0}}' } })).toEqual([
      { type: 'blank', index: 0 },
      { type: 'text', value: ' et ' },
      { type: 'blank', index: 0 },
    ])
  })
  it('sans modèle ou sans trou', () => {
    expect(parseFillTemplate({})).toEqual([])
    expect(parseFillTemplate({ content: { template: 'Texte seul' } })).toEqual([{ type: 'text', value: 'Texte seul' }])
  })
})

describe('normalizeAnswer', () => {
  const up = (s) => s.toUpperCase()
  it('chaîne : normalisée', () => expect(normalizeAnswer('abc', up)).toBe('ABC'))
  it('tableau : seules les chaînes sont normalisées, les indices restent intacts', () => {
    expect(normalizeAnswer(['a', 3, null, 'b'], up)).toEqual(['A', 3, null, 'B'])
  })
  it('nombre ou null : inchangés', () => {
    expect(normalizeAnswer(2, up)).toBe(2)
    expect(normalizeAnswer(null, up)).toBeNull()
  })
})

describe('notes', () => {
  it('formatPoints : virgule française, 2 décimales au plus', () => {
    expect(formatPoints(2.4)).toBe('2,4')
    expect(formatPoints(1)).toBe('1')
    expect(formatPoints(0.666)).toBe('0,67')
    expect(formatPoints(undefined)).toBe('0')
  })
  it.each([[0.6, 0.6], [0.01, 0.01], [0, null], [1, null], [1.5, null], ['0.5', null], [undefined, null]])(
    'partialPoints(%s) -> %s',
    (points, expected) => expect(partialPoints({ points })).toBe(expected),
  )
  it('partialPoints : résultat absent -> null', () => expect(partialPoints(undefined)).toBeNull())

  it('resultTone : correct (vert), partiel (ambre), incorrect (rouge)', () => {
    expect(resultTone({ correct: true }).label).toBe('Correct')
    expect(resultTone({ correct: false, points: 0.6 })).toEqual({ label: 'Partiel', badge: 'bg-amber-700', border: 'border-amber-500' })
    expect(resultTone({ correct: false, points: 0 }).label).toBe('Incorrect')
    expect(resultTone(undefined).label).toBe('Incorrect')
  })
  it('un résultat correct à 0,8 reste « Correct »', () => expect(resultTone({ correct: true, points: 0.8 }).label).toBe('Correct'))
})

describe('formatUserAnswer / formatCorrectAnswer', () => {
  const mcq = { type: 'mcq', content: { options: [{ text: '3' }, { text: '4', correct: true }] } }
  it('réponse de l’étudiant selon le type', () => {
    expect(formatUserAnswer({ type: 'open' }, 'Paris')).toBe('Paris')
    expect(formatUserAnswer({ type: 'open' }, '')).toBe('(Pas de réponse)')
    expect(formatUserAnswer(mcq, 1)).toBe('4')
    expect(formatUserAnswer(mcq, null)).toBe('(Pas de réponse)')
    expect(formatUserAnswer(mcq, 9)).toBe('(Pas de réponse)')
    expect(formatUserAnswer({ type: 'fill_blank' }, ['a', 'b'])).toBe('a / b')
    expect(formatUserAnswer({ type: 'fill_blank' }, ['', ''])).toBe(' / ')
    expect(formatUserAnswer({ type: 'reorder' }, ['Il', 'était'])).toBe('Il était')
    expect(formatUserAnswer({ type: 'reorder' }, [])).toBe('(Pas de réponse)')
    expect(formatUserAnswer({ type: 'autre' }, 'x')).toBe('—')
  })
  it('réponse attendue selon le type', () => {
    expect(formatCorrectAnswer({ type: 'open', content: { correct_answer: 'Paris' } })).toBe('Paris')
    expect(formatCorrectAnswer({ type: 'open' })).toBe('—')
    expect(formatCorrectAnswer(mcq)).toBe('4')
    expect(formatCorrectAnswer({ type: 'mcq', content: { options: [{ text: 'x' }] } })).toBe('—')
    expect(formatCorrectAnswer({ type: 'fill_blank', content: { blanks: ['a', 'b'] } })).toBe('a / b')
    expect(formatCorrectAnswer({ type: 'reorder', content: { fragments: ['Il', 'était'] } })).toBe('Il était')
    expect(formatCorrectAnswer({ type: 'autre' })).toBe('—')
  })
})

describe('dates', () => {
  it('résultat : date et heure numériques ; « — » si absente', () => {
    expect(formatResultDate('2026-10-01T10:05:00')).toMatch(/^01\/10\/2026,? (à )?10:05$/)
    expect(formatResultDate(null)).toBe('—')
  })
  it('échéance : date courte ; « — » si absente', () => {
    expect(formatDeadlineDate('2026-11-10T12:00:00')).toMatch(/^10 nov\.? 2026$/)
    expect(formatDeadlineDate('')).toBe('—')
  })
})
