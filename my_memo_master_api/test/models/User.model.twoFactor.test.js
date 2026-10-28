const { Sequelize } = require('sequelize')
const defineUser = require('../../models/User.model')

describe('User model — double authentification', () => {
  const sequelize = new Sequelize('sqlite::memory:', { logging: false })
  const User = defineUser(sequelize)

  afterAll(() => sequelize.close())

  it('twoFactorEnabled - activée par défaut à la création d\'un compte', () => {
    expect(User.rawAttributes.twoFactorEnabled.defaultValue).toBe(true)
    expect(User.build({ email: 'a@b.fr', name: 'Bob', password: 'x' }).twoFactorEnabled).toBe(true)
  })

  it('twoFactorEnabled - une valeur explicite reste possible', () => {
    expect(User.build({ email: 'a@b.fr', name: 'Bob', password: 'x', twoFactorEnabled: false }).twoFactorEnabled).toBe(false)
  })

  it('le code de connexion et ses compteurs n\'ont aucune valeur par défaut exploitable', () => {
    const user = User.build({ email: 'a@b.fr', name: 'Bob', password: 'x' })
    expect(user.twoFactorCode == null).toBe(true)
    expect(user.twoFactorCodeExpiresAt == null).toBe(true)
    expect(user.twoFactorCodeAttempts).toBe(0)
  })
})
