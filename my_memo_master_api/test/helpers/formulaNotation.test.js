const { unifyFormulaNotation } = require('../../helpers/formulaNotation')

describe('unifyFormulaNotation — raccourcis over()/frac()', () => {
  test.each([
    ['over(1,2)', '1/2'],
    ['frac(a, b)', 'a/b'],
    ['OVER(  x+1  ,  y  )', '(x+1)/y'],
    ['Ec = frac(1,2) m v^2', 'ec=1/2mv^2'],
  ])('%s -> %s', (input, expected) => {
    expect(unifyFormulaNotation(input)).toBe(expected)
  })

  test('abs() devient |…|', () => {
    expect(unifyFormulaNotation('abs(x)')).toBe('|x|')
  })

  test('entrée absente ou non textuelle : chaîne vide', () => {
    expect(unifyFormulaNotation(undefined)).toBe('')
    expect(unifyFormulaNotation(42)).toBe('')
  })
})

describe('unifyFormulaNotation — résistance aux entrées adverses (ReDoS)', () => {
  const MAX_MS = 1500
  test.each([
    ['espaces avant la virgule', 'over(' + ' '.repeat(100000) + 'x'],
    ['espaces sans fermeture', 'frac(1,' + ' '.repeat(100000)],
    ['ouvertures répétées', 'over(a'.repeat(30000)],
  ])('%s : temps borné', (_label, input) => {
    const start = process.hrtime.bigint()
    unifyFormulaNotation(input)
    expect(Number(process.hrtime.bigint() - start) / 1e6).toBeLessThan(MAX_MS)
  })
})
