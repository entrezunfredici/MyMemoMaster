import { describe, it, expect } from 'vitest'
import {
  defaultQuestion,
  nextQuestionKey,
  resetQuestionFields,
  setOptionText,
  addOption,
  removeOption,
  syncFillBlanks,
  isBlankUntouchedQuestion,
  extractErrorMessage,
} from '@/helpers/exerciseQuestionEdit'

const mcq = (correct = 0, n = 3) => ({
  mcqOptions: Array.from({ length: n }, (_, i) => ({ text: `o${i}` })),
  mcqCorrectIdx: correct,
})

describe('defaultQuestion', () => {
  it('question ouverte vierge, sans identifiant serveur, avec tous les champs de tous les types', () => {
    const q = defaultQuestion()
    expect(q).toMatchObject({
      idQuestion: null,
      statement: '',
      type: 'open',
      openAnswer: '',
      openAltAnswers: [],
      mcqOptions: [{ text: '' }, { text: '' }],
      mcqCorrectIdx: 0,
      fillTemplate: '',
      fillBlanks: [],
      reorderFragments: ['', ''],
      imageUrl: null,
    })
  })

  it('chaque question reçoit une clé de rendu unique et croissante', () => {
    const a = defaultQuestion()
    const b = defaultQuestion()
    expect(b._key).toBeGreaterThan(a._key)
    expect(nextQuestionKey()).toBeGreaterThan(b._key)
  })

  it('deux questions ne partagent aucun tableau (pas de mutation croisée)', () => {
    const a = defaultQuestion()
    const b = defaultQuestion()
    a.openAltAnswers.push('x')
    a.mcqOptions.push({ text: 'y' })
    expect(b.openAltAnswers).toEqual([])
    expect(b.mcqOptions).toHaveLength(2)
  })
})

describe('resetQuestionFields', () => {
  it('remet les champs de contenu à zéro mais garde énoncé, type, identifiant et image', () => {
    const q = { ...defaultQuestion(), statement: 'Énoncé', type: 'mcq', idQuestion: 5, imageUrl: '/i.png', openAnswer: 'a', mcqCorrectIdx: 1 }
    resetQuestionFields(q)
    expect(q.openAnswer).toBe('')
    expect(q.mcqCorrectIdx).toBe(0)
    expect(q.statement).toBe('Énoncé')
    expect(q.type).toBe('mcq')
    expect(q.idQuestion).toBe(5)
    expect(q.imageUrl).toBe('/i.png')
  })
})

describe('options de QCM', () => {
  it('setOptionText modifie une seule option, sans muter les objets existants', () => {
    const q = mcq()
    const before = q.mcqOptions
    setOptionText(q, 1, 'nouveau')
    expect(q.mcqOptions.map((o) => o.text)).toEqual(['o0', 'nouveau', 'o2'])
    expect(before[1].text).toBe('o1')
  })

  it('addOption ajoute une option vide à la fin', () => {
    const q = mcq()
    addOption(q)
    expect(q.mcqOptions).toHaveLength(4)
    expect(q.mcqOptions[3]).toEqual({ text: '' })
  })

  it.each([
    // [index de la bonne réponse, option retirée, nouvelle bonne réponse]
    [2, 0, 1], // on retire une option AVANT la bonne : l'indice recule
    [0, 2, 0], // on retire APRÈS : inchangé
    [1, 1, 1], // on retire la bonne réponse : l'option qui prend sa place
    [2, 2, 1], // on retire la bonne réponse en dernière position : retombe sur la dernière
  ])('removeOption — bonne réponse %i, retrait de %i -> bonne réponse %i', (correct, removed, expected) => {
    const q = mcq(correct, 3)
    removeOption(q, removed)
    expect(q.mcqOptions).toHaveLength(2)
    expect(q.mcqCorrectIdx).toBe(expected)
  })
})

describe('syncFillBlanks', () => {
  const fill = (fillTemplate, fillBlanks = []) => ({ fillTemplate, fillBlanks })

  it('crée autant de réponses que le plus grand trou + 1', () => {
    const q = fill('Du {{0}} grâce à la lumière {{2}}.')
    syncFillBlanks(q)
    expect(q.fillBlanks).toEqual(['', '', ''])
  })

  it('conserve les réponses déjà saisies et complète', () => {
    const q = fill('{{0}} et {{1}}', ['oxygène'])
    syncFillBlanks(q)
    expect(q.fillBlanks).toEqual(['oxygène', ''])
  })

  it('retire les réponses en trop quand un trou disparaît', () => {
    const q = fill('{{0}}', ['a', 'b', 'c'])
    syncFillBlanks(q)
    expect(q.fillBlanks).toEqual(['a'])
  })

  it('aucun trou : plus aucune réponse', () => {
    const q = fill('Pas de trou ici', ['a'])
    syncFillBlanks(q)
    expect(q.fillBlanks).toEqual([])
  })

  it('un même trou répété ne compte qu’une fois', () => {
    const q = fill('{{0}} puis encore {{0}}')
    syncFillBlanks(q)
    expect(q.fillBlanks).toEqual([''])
  })
})

describe('isBlankUntouchedQuestion', () => {
  it('vrai pour la question ouverte vierge', () => {
    expect(isBlankUntouchedQuestion(defaultQuestion())).toBe(true)
  })

  it.each([
    ['énoncé renseigné', { statement: 'Q ?' }],
    ['réponse renseignée', { openAnswer: 'R' }],
    ['formulation alternative', { openAltAnswers: ['x'] }],
    ['autre type', { type: 'mcq' }],
  ])('faux : %s', (_label, patch) => {
    expect(isBlankUntouchedQuestion({ ...defaultQuestion(), ...patch })).toBe(false)
  })

  it('des espaces seuls restent « vierge »', () => {
    expect(isBlankUntouchedQuestion({ ...defaultQuestion(), statement: '   ', openAnswer: ' ' })).toBe(true)
  })
})

describe('extractErrorMessage', () => {
  it('priorité au message métier', () => {
    expect(extractErrorMessage({ data: { message: 'M', errors: [{ msg: 'E' }] } }, 'F')).toBe('M')
  })
  it('puis au premier message de validation', () => {
    expect(extractErrorMessage({ data: { errors: [{ msg: 'E1' }, { msg: 'E2' }] } }, 'F')).toBe('E1')
  })
  it('sinon le texte de repli, y compris pour une réponse absente', () => {
    expect(extractErrorMessage({ data: {} }, 'F')).toBe('F')
    expect(extractErrorMessage(undefined, 'F')).toBe('F')
    expect(extractErrorMessage({ data: { errors: [] } }, 'F')).toBe('F')
  })
})
