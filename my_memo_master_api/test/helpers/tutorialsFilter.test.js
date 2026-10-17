const { Op } = require('sequelize')
const { buildTutorialsWhere, parseRevisionTips } = require('../../helpers/tutorialsFilter')

describe('parseRevisionTips', () => {
  test.each([
    ['true', true],
    ['1', true],
    [true, true],
    ['false', false],
    ['0', false],
    [false, false],
  ])('%p -> %p', (input, expected) => {
    expect(parseRevisionTips(input)).toBe(expected)
  })

  test.each([[undefined], [null], [''], ['oui'], ['TRUE '], [2]])('valeur non reconnue %p -> non filtré', (input) => {
    expect(parseRevisionTips(input)).toBeUndefined()
  })
})

describe('buildTutorialsWhere', () => {
  test('sans critère : aucune condition', () => {
    expect(buildTutorialsWhere()).toEqual({})
    expect(buildTutorialsWhere({})).toEqual({})
  })

  test('recherche : par nom, avec LIKE', () => {
    expect(buildTutorialsWhere({ search: 'react' })).toEqual({ [Op.or]: [{ name: { [Op.like]: '%react%' } }] })
  })

  test('sujet', () => {
    expect(buildTutorialsWhere({ subjectId: '3' })).toEqual({ subjectId: '3' })
  })

  test('tips de révision : cible la colonne revision_tips (et non revisionTips, qui n’existe pas)', () => {
    expect(buildTutorialsWhere({ revisionTips: 'true' })).toEqual({ revision_tips: true })
    expect(buildTutorialsWhere({ revisionTips: 'false' })).toEqual({ revision_tips: false })
    expect(buildTutorialsWhere({ revisionTips: 'true' })).not.toHaveProperty('revisionTips')
  })

  test('« false » filtre bien les tutoriels qui ne sont PAS des tips (valeur falsy mais valide)', () => {
    expect('revision_tips' in buildTutorialsWhere({ revisionTips: 'false' })).toBe(true)
  })

  test('tips de révision inconnus : ignorés', () => {
    expect(buildTutorialsWhere({ revisionTips: 'peut-être' })).toEqual({})
  })

  test('tous les critères ensemble', () => {
    expect(buildTutorialsWhere({ search: 'x', subjectId: 2, revisionTips: 'true' })).toEqual({
      [Op.or]: [{ name: { [Op.like]: '%x%' } }],
      subjectId: 2,
      revision_tips: true,
    })
  })
})
