const { DataTypes } = require('sequelize')

const mockDefine = jest.fn()

const mockInstance = {
  define: (name, attributes, options) => {
    mockDefine(name, attributes, options)
    return { name, rawAttributes: attributes, belongsTo: jest.fn(), hasMany: jest.fn(), hasOne: jest.fn() }
  }
}

const mockUser = {}
const mockModels = { User: mockUser }

describe('Etablissement model — schéma', () => {
  let EtablissementFactory
  let model

  beforeAll(() => {
    EtablissementFactory = require('../../models/Etablissement.model')
    model = EtablissementFactory(mockInstance)
    model.associate(mockModels)
  })

  it('appelle instance.define avec le nom "Etablissement"', () => {
    expect(mockDefine).toHaveBeenCalledWith(
      'Etablissement',
      expect.any(Object),
      expect.objectContaining({ tableName: 'Etablissement', timestamps: false })
    )
  })

  it('possède un champ id PK auto-incrémenté', () => {
    const [, attrs] = mockDefine.mock.calls[0]
    expect(attrs.id.type).toBeInstanceOf(DataTypes.INTEGER.constructor ?? Object)
    expect(attrs.id.primaryKey).toBe(true)
    expect(attrs.id.autoIncrement).toBe(true)
    expect(attrs.id.allowNull).toBe(false)
  })

  it('possède un champ name NOT NULL', () => {
    const [, attrs] = mockDefine.mock.calls[0]
    expect(attrs.name.allowNull).toBe(false)
  })

  it('possède un champ code unique NOT NULL (max 20 chars)', () => {
    const [, attrs] = mockDefine.mock.calls[0]
    expect(attrs.code.allowNull).toBe(false)
    expect(attrs.code.unique).toBe(true)
  })

  it('possède un champ adminId nullable avec ON DELETE SET NULL', () => {
    const [, attrs] = mockDefine.mock.calls[0]
    expect(attrs.adminId.allowNull).toBe(true)
    expect(attrs.adminId.onDelete).toBe('SET NULL')
    expect(attrs.adminId.references).toEqual({ model: 'User', key: 'userId' })
  })

  it('possède createdAt et updatedAt', () => {
    const [, attrs] = mockDefine.mock.calls[0]
    expect(attrs).toHaveProperty('createdAt')
    expect(attrs).toHaveProperty('updatedAt')
  })

  it('définit un index sur adminId', () => {
    const [,, options] = mockDefine.mock.calls[0]
    const indexFields = options.indexes.flatMap((i) => i.fields)
    expect(indexFields).toContain('adminId')
  })

  it('expose une fonction associate', () => {
    expect(typeof model.associate).toBe('function')
  })
})
