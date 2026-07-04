const mockDefine = jest.fn()

const mockInstance = {
  define: (name, attributes, options) => {
    mockDefine(name, attributes, options)
    return { name, rawAttributes: attributes, belongsTo: jest.fn(), hasMany: jest.fn(), hasOne: jest.fn() }
  }
}

const mockUser = {}
const mockModels = { User: mockUser }

describe('AuditLog model — schéma', () => {
  let AuditLogFactory
  let model

  beforeAll(() => {
    AuditLogFactory = require('../../models/AuditLog.model')
    model = AuditLogFactory(mockInstance)
    model.associate(mockModels)
  })

  it('appelle instance.define avec le nom "AuditLog"', () => {
    expect(mockDefine).toHaveBeenCalledWith(
      'AuditLog',
      expect.any(Object),
      expect.objectContaining({ tableName: 'AuditLog', timestamps: false })
    )
  })

  it('possède un champ id PK auto-incrémenté', () => {
    const [, attrs] = mockDefine.mock.calls[0]
    expect(attrs.id.primaryKey).toBe(true)
    expect(attrs.id.autoIncrement).toBe(true)
    expect(attrs.id.allowNull).toBe(false)
  })

  it('possède un champ actorId nullable avec ON DELETE SET NULL', () => {
    const [, attrs] = mockDefine.mock.calls[0]
    expect(attrs.actorId.allowNull).toBe(true)
    expect(attrs.actorId.onDelete).toBe('SET NULL')
    expect(attrs.actorId.references).toEqual({ model: 'User', key: 'userId' })
  })

  it('possède un champ action NOT NULL (max 50 chars)', () => {
    const [, attrs] = mockDefine.mock.calls[0]
    expect(attrs.action.allowNull).toBe(false)
  })

  it('possède un champ entityType NOT NULL (max 30 chars)', () => {
    const [, attrs] = mockDefine.mock.calls[0]
    expect(attrs.entityType.allowNull).toBe(false)
  })

  it('possède un champ entityId nullable', () => {
    const [, attrs] = mockDefine.mock.calls[0]
    expect(attrs.entityId.allowNull).toBe(true)
  })

  it('possède un champ metadata JSON nullable', () => {
    const [, attrs] = mockDefine.mock.calls[0]
    expect(attrs.metadata.allowNull).toBe(true)
  })

  it('possède createdAt (pas de updatedAt — log immuable)', () => {
    const [, attrs] = mockDefine.mock.calls[0]
    expect(attrs).toHaveProperty('createdAt')
    expect(attrs).not.toHaveProperty('updatedAt')
  })

  it('définit des index sur actorId, (entityType, entityId), createdAt', () => {
    const [,, options] = mockDefine.mock.calls[0]
    const indexFieldSets = options.indexes.map((i) => i.fields)
    expect(indexFieldSets).toContainEqual(['actorId'])
    expect(indexFieldSets).toContainEqual(['entityType', 'entityId'])
    expect(indexFieldSets).toContainEqual(['createdAt'])
  })

  it('expose une fonction associate', () => {
    expect(typeof model.associate).toBe('function')
  })
})
