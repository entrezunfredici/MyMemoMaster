jest.mock('../../services/AuditLog.service', () => ({
  log: jest.fn().mockResolvedValue({})
}))

jest.mock('../../helpers/tokenBlacklist', () => ({
  revokeUserTokens: jest.fn().mockResolvedValue(undefined)
}))

jest.mock('../../models/index', () => ({
  instance: { getDialect: jest.fn(() => 'sqlite') },
  User: {
    findAll: jest.fn(),
    findAndCountAll: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    count: jest.fn()
  },
  Role: {
    findByPk: jest.fn()
  },
  UserOnboardingState: {
    create: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn()
  },
  Invitation: {
    findAll: jest.fn()
  },
  ClassGroupUsers: {
    findOrCreate: jest.fn()
  },
  Etablissement: {
    findByPk: jest.fn(),
    sequelize: { transaction: jest.fn((cb) => cb({})) }
  }
}))

const { User, Role, UserOnboardingState, Invitation, Etablissement, instance } = require('../../models/index')
const { Op } = require('sequelize')
const bcrypt = require('bcryptjs')
const UserService = require('../../services/User.service')

describe('UserService', () => {
  const originalMaxUsers = process.env.MAX_USERS

  afterEach(() => {
    jest.clearAllMocks()
    if (originalMaxUsers === undefined) delete process.env.MAX_USERS
    else process.env.MAX_USERS = originalMaxUsers
  })

  describe('findAll', () => {
    it('should return all users without passwords', async () => {
      User.findAll.mockResolvedValue([
        { userId: 1, name: 'User 1', password: 'hashedpassword' },
        { id: 2, name: 'User 2' }
      ])

      const users = await UserService.findAll()

      expect(User.findAll).toHaveBeenCalled()
      expect(users).toEqual([
        { userId: 1, name: 'User 1' },
        { id: 2, name: 'User 2' }
      ])
    })
  })

  describe('search', () => {
    const ROWS = [{ userId: 2, name: 'Alice' }]
    const lastCall = () => User.findAndCountAll.mock.calls.at(-1)[0]

    beforeEach(() => {
      User.findAndCountAll.mockResolvedValue({ rows: ROWS, count: 41 })
      instance.getDialect.mockReturnValue('sqlite')
    })

    it('renvoie la page, le total et ne sélectionne que des champs d’affichage', async () => {
      const result = await UserService.search()

      expect(result).toEqual({ users: ROWS, total: 41, page: 1, limit: 20 })
      expect(lastCall().attributes).toEqual(['userId', 'name', 'email', 'roleId', 'isActive', 'hasValidatedEmail', 'createdAt', 'lastLogin'])
      expect(lastCall().attributes).not.toContain('password')
      expect(lastCall().where).toEqual({})
      expect(lastCall().order).toEqual([['name', 'ASC'], ['userId', 'ASC']])
    })

    it('le texte est cherché dans le nom ou l’e-mail, sans espaces autour', async () => {
      await UserService.search({ search: '  ali  ' })
      expect(lastCall().where[Op.or]).toEqual([
        { name: { [Op.like]: '%ali%' } },
        { email: { [Op.like]: '%ali%' } }
      ])
    })

    it('PostgreSQL : recherche insensible à la casse (iLike)', async () => {
      instance.getDialect.mockReturnValue('postgres')
      await UserService.search({ search: 'ali' })
      expect(lastCall().where[Op.or][0]).toEqual({ name: { [Op.iLike]: '%ali%' } })
    })

    it('texte vide ou blanc : aucun filtre ; texte tronqué à 100 caractères', async () => {
      await UserService.search({ search: '   ' })
      expect(lastCall().where).toEqual({})
      await UserService.search({ search: 'x'.repeat(150) })
      expect(lastCall().where[Op.or][0].name[Op.like]).toBe(`%${'x'.repeat(100)}%`)
    })

    it('filtre par rôle (chaîne ou nombre), y compris 0 ; vide = pas de filtre', async () => {
      await UserService.search({ roleId: '4' })
      expect(lastCall().where.roleId).toBe(4)
      await UserService.search({ roleId: 0 })
      expect(lastCall().where.roleId).toBe(0)
      await UserService.search({ roleId: '' })
      expect(lastCall().where).not.toHaveProperty('roleId')
    })

    it.each([
      [{ page: 3, limit: 10 }, 20, 10, 3],
      [{ page: '2', limit: '50' }, 50, 50, 2],
      [{ limit: 1000 }, 0, 100, 1],
      [{ limit: 0 }, 0, 20, 1],
      [{ page: 0 }, 0, 20, 1],
      [{ page: -4, limit: -2 }, 0, 1, 1],
      [{ page: 'abc', limit: 'abc' }, 0, 20, 1]
    ])('pagination %j : offset %i, taille %i, page %i', async (input, offset, limit, page) => {
      const result = await UserService.search(input)
      expect(lastCall()).toMatchObject({ offset, limit })
      expect(result).toMatchObject({ page, limit })
    })
  })

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      User.findOne.mockResolvedValue({
        userId: 1,
        email: 'test@example.com',
        password: 'hashedpassword'
      })

      const user = await UserService.findByEmail('test@example.com')

      expect(User.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } })
      expect(user).toEqual({ userId: 1, email: 'test@example.com' })
    })

    it('should return null if no user is found', async () => {
      User.findOne.mockResolvedValue(null)

      const user = await UserService.findByEmail('nonexistent@example.com')

      expect(User.findOne).toHaveBeenCalledWith({ where: { email: 'nonexistent@example.com' } })
      expect(user).toBeNull()
    })
  })

  describe('findOne', () => {
    it('should return a user by ID', async () => {
      User.findByPk.mockResolvedValue({
        userId: 1,
        name: 'User 1',
        password: 'hashedpassword'
      })

      const user = await UserService.findOne(1)

      expect(User.findByPk).toHaveBeenCalledWith(1)
      expect(user).toEqual({ userId: 1, name: 'User 1', twoFactorRequired: false })
    })

    it('ne renvoie jamais le code de double authentification ni ses compteurs', async () => {
      User.findByPk.mockResolvedValue({
        userId: 1,
        roleId: 2,
        twoFactorEnabled: true,
        twoFactorCode: 'hash',
        twoFactorCodeExpiresAt: new Date(),
        twoFactorCodeAttempts: 2
      })

      const user = await UserService.findOne(1)

      expect(user).toEqual({ userId: 1, roleId: 2, twoFactorEnabled: true, twoFactorRequired: false })
    })

    it('marque twoFactorRequired pour un administrateur', async () => {
      User.findByPk.mockResolvedValue({ userId: 1, roleId: 1, twoFactorEnabled: false })

      const user = await UserService.findOne(1)

      expect(user.twoFactorRequired).toBe(true)
    })

    it('should return null if no user is found', async () => {
      User.findByPk.mockResolvedValue(null)

      const user = await UserService.findOne(99)

      expect(User.findByPk).toHaveBeenCalledWith(99)
      expect(user).toBeNull()
    })
  })

  describe('isRegistrationOpen', () => {
    it('isRegistrationOpen - MAX_USERS non défini - retourne true sans requêter la base', async () => {
      delete process.env.MAX_USERS

      const open = await UserService.isRegistrationOpen()

      expect(open).toBe(true)
      expect(User.count).not.toHaveBeenCalled()
    })

    it('isRegistrationOpen - MAX_USERS à 0 - retourne true (limite désactivée)', async () => {
      process.env.MAX_USERS = '0'

      const open = await UserService.isRegistrationOpen()

      expect(open).toBe(true)
      expect(User.count).not.toHaveBeenCalled()
    })

    it('isRegistrationOpen - total sous la limite - retourne true', async () => {
      process.env.MAX_USERS = '10'
      User.count.mockResolvedValue(9)

      const open = await UserService.isRegistrationOpen()

      expect(open).toBe(true)
    })

    it('isRegistrationOpen - limite atteinte - retourne false', async () => {
      process.env.MAX_USERS = '10'
      User.count.mockResolvedValue(10)

      const open = await UserService.isRegistrationOpen()

      expect(open).toBe(false)
    })

    it('isRegistrationOpen - ne compte que les comptes actifs (désactiver un compte libère une place)', async () => {
      process.env.MAX_USERS = '10'
      User.count.mockResolvedValue(3)

      await UserService.isRegistrationOpen()

      expect(User.count).toHaveBeenCalledWith({ where: { isActive: true } })
    })
  })

  describe('create', () => {
    it('should create a new user', async () => {
      delete process.env.MAX_USERS
      User.findOne.mockResolvedValue(null)
      User.create.mockResolvedValue({
        userId: 1,
        email: 'test@example.com',
        name: 'Test User'
      })

      UserOnboardingState.create.mockResolvedValue({
        userId: 1,
        tourSeen: false,
        checklist: {}
      })
      Invitation.findAll.mockResolvedValue([])

      const user = await UserService.create({
        email: 'test@example.com',
        name: 'Test User',
        password: 'securepassword'
      })

      expect(User.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } })
      expect(User.create).toHaveBeenCalled()
      expect(UserOnboardingState.create).toHaveBeenCalledWith({
        userId: 1,
        tourSeen: false,
        checklist: {
          todo_created: false,
          profile_completed: false,
          first_action: false
        }
      })
      expect(user).toEqual({ userId: 1, email: 'test@example.com', name: 'Test User' })
      expect(UserOnboardingState.create).toHaveBeenCalledWith({
        userId: 1,
        tourSeen: false,
        checklist: {
          todo_created: false,
          profile_completed: false,
          first_action: false
        }
      })
    })

    it('should throw an error if email is already used', async () => {
      delete process.env.MAX_USERS
      User.findOne.mockResolvedValue({ userId: 1, email: 'test@example.com' })

      await expect(
        UserService.create({
          email: 'test@example.com',
          name: 'Test User',
          password: 'securepassword'
        })
      ).rejects.toThrow('Email déjà utilisé')

      expect(User.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } })
    })

    it('create - MAX_USERS atteint - lève une erreur avant de vérifier l\'email', async () => {
      process.env.MAX_USERS = '5'
      User.count.mockResolvedValue(5)

      await expect(
        UserService.create({
          email: 'test@example.com',
          name: 'Test User',
          password: 'securepassword'
        })
      ).rejects.toThrow('Limite d\'utilisateurs atteinte')

      expect(User.findOne).not.toHaveBeenCalled()
      expect(User.create).not.toHaveBeenCalled()
    })
  })

  describe('update', () => {
    it('should update a user by ID', async () => {
      User.update.mockResolvedValue([1]) // Sequelize update returns an array with the number of affected rows
      User.findByPk.mockResolvedValue({
        userId: 1,
        name: 'Updated User'
      })

      const user = await UserService.update(1, { name: 'Updated User' })

      expect(User.update).toHaveBeenCalledWith({ name: 'Updated User' }, { where: { userId: 1 } })
      expect(user).toEqual({ userId: 1, name: 'Updated User', twoFactorRequired: false })
    })
  })

  describe('delete', () => {
    it('should delete a user by ID', async () => {
      User.destroy.mockResolvedValue(1) // Sequelize destroy returns the number of affected rows

      await UserService.delete(1)

      expect(User.destroy).toHaveBeenCalledWith({ where: { userId: 1 } })
    })
  })

  describe('setResetPasswordCode', () => {
    it('stocke le hash bcrypt en base et retourne le code brut à 6 chiffres', async () => {
      User.update.mockResolvedValue([1])

      const code = await UserService.setResetPasswordCode(1)

      expect(typeof code).toBe('string')
      expect(/^\d{6}$/.test(code)).toBe(true)

      const [fields] = User.update.mock.calls[0]
      expect(fields.resetPasswordCode).not.toBe(code) // le hash ≠ le code brut
      expect(fields.resetPasswordCode.startsWith('$2')).toBe(true) // hash bcrypt
      expect(fields.resetPasswordCodeExpiresAt).toBeInstanceOf(Date)
      expect(fields.resetPasswordCodeAttempts).toBe(0)
    })
  })

  describe('verifyResetPasswordCode', () => {
    const bcrypt = require('bcryptjs')
    const CODE = '123456'
    const future = () => new Date(Date.now() + 10 * 60 * 1000)

    it('retourne true si le code correspond et est non expiré, puis invalide le code', async () => {
      User.update.mockResolvedValue([1])
      User.findByPk.mockResolvedValue({
        resetPasswordCode: bcrypt.hashSync(CODE, 4),
        resetPasswordCodeExpiresAt: future(),
        resetPasswordCodeAttempts: 0
      })

      const result = await UserService.verifyResetPasswordCode(1, CODE)

      expect(result).toBe(true)
      // Usage unique : le code est effacé après un succès
      const [fields] = User.update.mock.calls[0]
      expect(fields.resetPasswordCode).toBeNull()
      expect(fields.resetPasswordCodeExpiresAt).toBeNull()
      expect(fields.resetPasswordCodeAttempts).toBe(0)
    })

    it('retourne false si le code ne correspond pas et incrémente le compteur d essais', async () => {
      User.update.mockResolvedValue([1])
      User.findByPk.mockResolvedValue({
        resetPasswordCode: bcrypt.hashSync(CODE, 4),
        resetPasswordCodeExpiresAt: future(),
        resetPasswordCodeAttempts: 0
      })

      const result = await UserService.verifyResetPasswordCode(1, '654321')

      expect(result).toBe(false)
      const [fields] = User.update.mock.calls[0]
      expect(fields.resetPasswordCodeAttempts).toBe(1)
      expect(fields.resetPasswordCode).toBeUndefined() // le code reste utilisable
    })

    it('retourne false et invalide le code au 5e essai infructueux', async () => {
      User.update.mockResolvedValue([1])
      User.findByPk.mockResolvedValue({
        resetPasswordCode: bcrypt.hashSync(CODE, 4),
        resetPasswordCodeExpiresAt: future(),
        resetPasswordCodeAttempts: 4
      })

      const result = await UserService.verifyResetPasswordCode(1, '654321')

      expect(result).toBe(false)
      const [fields] = User.update.mock.calls[0]
      expect(fields.resetPasswordCode).toBeNull()
      expect(fields.resetPasswordCodeAttempts).toBe(0)
    })

    it('retourne false si le code est expiré', async () => {
      User.update.mockResolvedValue([1])
      User.findByPk.mockResolvedValue({
        resetPasswordCode: bcrypt.hashSync(CODE, 4),
        resetPasswordCodeExpiresAt: new Date(Date.now() - 1000),
        resetPasswordCodeAttempts: 0
      })

      const result = await UserService.verifyResetPasswordCode(1, CODE)

      expect(result).toBe(false)
      const [fields] = User.update.mock.calls[0]
      expect(fields.resetPasswordCode).toBeNull()
    })

    it('retourne false si aucun code n est en attente', async () => {
      User.update.mockResolvedValue([1])
      User.findByPk.mockResolvedValue({
        resetPasswordCode: null,
        resetPasswordCodeExpiresAt: null,
        resetPasswordCodeAttempts: 0
      })

      const result = await UserService.verifyResetPasswordCode(1, CODE)

      expect(result).toBe(false)
    })
  })

  describe('setRole', () => {
    it('should set a role for a user', async () => {
      Role.findByPk.mockResolvedValue({ userId: 1, name: 'Admin' })
      User.update.mockResolvedValue([1])
      User.findByPk.mockResolvedValue({
        userId: 1,
        name: 'User 1',
        roleId: 1
      })

      const user = await UserService.setRole(1, 1)

      expect(Role.findByPk).toHaveBeenCalledWith(1)
      expect(User.update).toHaveBeenCalledWith({ roleId: 1 }, { where: { userId: 1 } })
      expect(user).toEqual({ userId: 1, name: 'User 1', roleId: 1, twoFactorRequired: true })
    })
  })

  // ── Double authentification par email ──────────────────────────────────────

  describe('setTwoFactorCode', () => {
    it('stocke un hash bcrypt (jamais le code en clair) valable 10 minutes et remet les essais à 0', async () => {
      User.findByPk.mockResolvedValue({ userId: 1, twoFactorCodeExpiresAt: null })
      User.update.mockResolvedValue([1])

      const code = await UserService.setTwoFactorCode(1)

      expect(code).toMatch(/^\d{6}$/)
      const [fields, opts] = User.update.mock.calls[0]
      expect(fields.twoFactorCode).not.toBe(code)
      expect(await bcrypt.compare(code, fields.twoFactorCode)).toBe(true)
      expect(fields.twoFactorCodeAttempts).toBe(0)
      const ttl = fields.twoFactorCodeExpiresAt.getTime() - Date.now()
      expect(ttl).toBeGreaterThan(9 * 60 * 1000)
      expect(ttl).toBeLessThanOrEqual(10 * 60 * 1000)
      expect(opts).toEqual({ where: { userId: 1 } })
    })

    it('retourne null sans rien écrire si un code a été émis il y a moins d\'une minute', async () => {
      // code émis il y a 5 s : il expire dans 10 min - 5 s
      User.findByPk.mockResolvedValue({ userId: 1, twoFactorCodeExpiresAt: new Date(Date.now() + 10 * 60 * 1000 - 5000) })

      const code = await UserService.setTwoFactorCode(1)

      expect(code).toBeNull()
      expect(User.update).not.toHaveBeenCalled()
    })

    it('émet un nouveau code si le précédent a plus d\'une minute', async () => {
      User.findByPk.mockResolvedValue({ userId: 1, twoFactorCodeExpiresAt: new Date(Date.now() + 5 * 60 * 1000) })
      User.update.mockResolvedValue([1])

      const code = await UserService.setTwoFactorCode(1)

      expect(code).toMatch(/^\d{6}$/)
    })
  })

  describe('verifyTwoFactorCode', () => {
    const CODE = '123456'
    const future = () => new Date(Date.now() + 5 * 60 * 1000)

    it('retourne true si le code est bon, puis l\'invalide (usage unique)', async () => {
      User.update.mockResolvedValue([1])
      User.findByPk.mockResolvedValue({
        twoFactorCode: bcrypt.hashSync(CODE, 4),
        twoFactorCodeExpiresAt: future(),
        twoFactorCodeAttempts: 0
      })

      expect(await UserService.verifyTwoFactorCode(1, CODE)).toBe(true)
      const [fields] = User.update.mock.calls[0]
      expect(fields.twoFactorCode).toBeNull()
      expect(fields.twoFactorCodeExpiresAt).toBeNull()
    })

    it('retourne false pour un mauvais code et incrémente les essais sans invalider le code', async () => {
      User.update.mockResolvedValue([1])
      User.findByPk.mockResolvedValue({
        twoFactorCode: bcrypt.hashSync(CODE, 4),
        twoFactorCodeExpiresAt: future(),
        twoFactorCodeAttempts: 1
      })

      expect(await UserService.verifyTwoFactorCode(1, '654321')).toBe(false)
      const [fields] = User.update.mock.calls[0]
      expect(fields.twoFactorCodeAttempts).toBe(2)
      expect(fields.twoFactorCode).toBeUndefined()
    })

    it('invalide le code au 5e essai infructueux', async () => {
      User.update.mockResolvedValue([1])
      User.findByPk.mockResolvedValue({
        twoFactorCode: bcrypt.hashSync(CODE, 4),
        twoFactorCodeExpiresAt: future(),
        twoFactorCodeAttempts: 4
      })

      expect(await UserService.verifyTwoFactorCode(1, '654321')).toBe(false)
      expect(User.update.mock.calls[0][0].twoFactorCode).toBeNull()
    })

    it('retourne false pour un code expiré', async () => {
      User.update.mockResolvedValue([1])
      User.findByPk.mockResolvedValue({
        twoFactorCode: bcrypt.hashSync(CODE, 4),
        twoFactorCodeExpiresAt: new Date(Date.now() - 1000),
        twoFactorCodeAttempts: 0
      })

      expect(await UserService.verifyTwoFactorCode(1, CODE)).toBe(false)
    })

    it('retourne false s\'il n\'y a aucun code en attente', async () => {
      User.update.mockResolvedValue([1])
      User.findByPk.mockResolvedValue({ twoFactorCode: null, twoFactorCodeExpiresAt: null, twoFactorCodeAttempts: 0 })

      expect(await UserService.verifyTwoFactorCode(1, CODE)).toBe(false)
    })

    it('retourne false si l\'utilisateur n\'existe pas', async () => {
      User.findByPk.mockResolvedValue(null)

      expect(await UserService.verifyTwoFactorCode(99, CODE)).toBe(false)
    })
  })

  describe('setTwoFactorEnabled', () => {
    it('activation - met le booléen à true sans toucher au code', async () => {
      User.update.mockResolvedValue([1])

      await UserService.setTwoFactorEnabled(1, true)

      expect(User.update).toHaveBeenCalledTimes(1)
      expect(User.update).toHaveBeenCalledWith({ twoFactorEnabled: true }, { where: { userId: 1 } })
    })

    it('désactivation - met le booléen à false et efface le code en attente', async () => {
      User.update.mockResolvedValue([1])

      await UserService.setTwoFactorEnabled(1, false)

      expect(User.update).toHaveBeenCalledWith({ twoFactorEnabled: false }, { where: { userId: 1 } })
      expect(User.update).toHaveBeenCalledWith(
        { twoFactorCode: null, twoFactorCodeExpiresAt: null, twoFactorCodeAttempts: 0 },
        { where: { userId: 1 } }
      )
    })
  })

  // ── Bcrypt — verifyPassword ────────────────────────────────────────────────

  describe('verifyPassword', () => {
    it('retourne true si le mot de passe en clair correspond au hash stocké', async () => {
      const plain = 'MonPassword1'
      const hash = await bcrypt.hash(plain, 10)
      User.findByPk.mockResolvedValue({ password: hash })

      const result = await UserService.verifyPassword(1, plain)

      expect(result).toBe(true)
      expect(User.findByPk).toHaveBeenCalledWith(1)
    })

    it('retourne false si le mot de passe ne correspond pas au hash', async () => {
      const hash = await bcrypt.hash('CorrectPassword1', 10)
      User.findByPk.mockResolvedValue({ password: hash })

      const result = await UserService.verifyPassword(1, 'WrongPassword1')

      expect(result).toBe(false)
    })
  })

  // ── Bcrypt — setPassword ───────────────────────────────────────────────────

  describe('setPassword', () => {
    it('lance une erreur si le mot de passe est absent (chaîne vide)', async () => {
      await expect(UserService.setPassword(1, '')).rejects.toThrow('Mot de passe manquant')
    })

    it('lance une erreur si le mot de passe est trop court (< 10 chars)', async () => {
      await expect(UserService.setPassword(1, 'Short1')).rejects.toThrow(
        'Le mot de passe doit contenir au moins 10 caractères'
      )
    })

    it('stocke un hash bcrypt et non le mot de passe en clair', async () => {
      User.update.mockResolvedValue([1])
      const plain = 'MonMotDePasse1'

      await UserService.setPassword(1, plain)

      const [fields, opts] = User.update.mock.calls[0]
      expect(fields.password).not.toBe(plain)
      expect(opts).toEqual({ where: { userId: 1 } })
      const isValid = await bcrypt.compare(plain, fields.password)
      expect(isValid).toBe(true)
    })
  })

  // ── Refresh token — hachage SHA-256 ────────────────────────────────────────

  describe('setRefreshToken', () => {
    it('stocke le hash SHA-256 du token (pas le token brut)', async () => {
      const crypto = require('crypto')
      User.update.mockResolvedValue([1])
      const rawToken = crypto.randomBytes(64).toString('hex')

      await UserService.setRefreshToken(1, rawToken, new Date(Date.now() + 86400000))

      const [fields] = User.update.mock.calls[0]
      expect(fields.refreshToken).not.toBe(rawToken)
      expect(fields.refreshToken).toHaveLength(64) // SHA-256 hex = 64 chars
      expect(/^[0-9a-f]+$/.test(fields.refreshToken)).toBe(true)
    })
  })

  describe('verifyRefreshToken', () => {
    it("retrouve l'utilisateur en hachant le token brut avant la requete DB", async () => {
      const crypto = require('crypto')
      const rawToken = crypto.randomBytes(64).toString('hex')
      const hash = crypto.createHash('sha256').update(rawToken).digest('hex')
      const future = new Date(Date.now() + 86400000)

      User.findOne.mockResolvedValue({ userId: 1, refreshTokenExpiresAt: future })

      const result = await UserService.verifyRefreshToken(rawToken)

      expect(User.findOne).toHaveBeenCalledWith({ where: { refreshToken: hash } })
      expect(result).not.toBeNull()
    })

    it('retourne null si le token est expiré', async () => {
      const crypto = require('crypto')
      const rawToken = crypto.randomBytes(64).toString('hex')
      const past = new Date(Date.now() - 1000)

      User.findOne.mockResolvedValue({ userId: 1, refreshTokenExpiresAt: past })

      const result = await UserService.verifyRefreshToken(rawToken)

      expect(result).toBeNull()
    })

    it('retourne null si token absent', async () => {
      const result = await UserService.verifyRefreshToken(null)
      expect(User.findOne).not.toHaveBeenCalled()
      expect(result).toBeNull()
    })

    it('retourne null si le compte est désactivé (isActive: false) même si le token est valide', async () => {
      const crypto = require('crypto')
      const rawToken = crypto.randomBytes(64).toString('hex')
      const future = new Date(Date.now() + 86400000)

      User.findOne.mockResolvedValue({ userId: 1, refreshTokenExpiresAt: future, isActive: false })

      const result = await UserService.verifyRefreshToken(rawToken)

      expect(result).toBeNull()
    })
  })

  // ── validEmailCode — expiration ────────────────────────────────────────────

  describe('setValidEmailCode', () => {
    it("stocke un code et une date d'expiration (30 min)", async () => {
      User.update.mockResolvedValue([1])

      await UserService.setValidEmailCode(1)

      const [fields] = User.update.mock.calls[0]
      expect(fields.validEmailCode).toBeDefined()
      expect(fields.validEmailCodeExpiresAt).toBeInstanceOf(Date)
      const diffMs = fields.validEmailCodeExpiresAt - Date.now()
      expect(diffMs).toBeGreaterThan(29 * 60 * 1000)
      expect(diffMs).toBeLessThanOrEqual(30 * 60 * 1000 + 100)
    })
  })

  describe('verifyValidEmailCode', () => {
    it('retourne true si le code est correct et non expiré', async () => {
      const future = new Date(Date.now() + 10 * 60 * 1000)
      const mockUser = {
        validEmailCode: '123456',
        validEmailCodeExpiresAt: future,
        save: jest.fn().mockResolvedValue()
      }
      User.findByPk.mockResolvedValue(mockUser)

      const result = await UserService.verifyValidEmailCode(1, '123456')

      expect(result).toBe(true)
      expect(mockUser.validEmailCode).toBeNull()
      expect(mockUser.validEmailCodeExpiresAt).toBeNull()
      expect(mockUser.save).toHaveBeenCalled()
    })

    it('retourne false si le code est incorrect', async () => {
      const future = new Date(Date.now() + 10 * 60 * 1000)
      const mockUser = {
        validEmailCode: '123456',
        validEmailCodeExpiresAt: future,
        save: jest.fn().mockResolvedValue()
      }
      User.findByPk.mockResolvedValue(mockUser)

      const result = await UserService.verifyValidEmailCode(1, '999999')

      expect(result).toBe(false)
    })

    it('retourne false si le code est expiré', async () => {
      const past = new Date(Date.now() - 1000)
      const mockUser = {
        validEmailCode: '123456',
        validEmailCodeExpiresAt: past,
        save: jest.fn().mockResolvedValue()
      }
      User.findByPk.mockResolvedValue(mockUser)

      const result = await UserService.verifyValidEmailCode(1, '123456')

      expect(result).toBe(false)
    })

    it("retourne false si pas de date d'expiration", async () => {
      const mockUser = {
        validEmailCode: '123456',
        validEmailCodeExpiresAt: null,
        save: jest.fn().mockResolvedValue()
      }
      User.findByPk.mockResolvedValue(mockUser)

      const result = await UserService.verifyValidEmailCode(1, '123456')

      expect(result).toBe(false)
    })
  })

  // ── Bcrypt — create (hachage au moment de la persistance) ─────────────────

  describe('create — hachage du mot de passe', () => {
    it('hache le mot de passe avant de le passer à User.create', async () => {
      const plain = 'SecurePass1'
      User.findOne.mockResolvedValue(null)
      User.create.mockImplementation((data) => ({
        ...data,
        userId: 1,
        dataValues: { ...data, userId: 1 },
      }))
      UserOnboardingState.create.mockResolvedValue({})
      Invitation.findAll.mockResolvedValue([])

      await UserService.create({ email: 'test@example.com', name: 'Test', password: plain })

      const [createArgs] = User.create.mock.calls[0]
      expect(createArgs.password).not.toBe(plain)
      const isHash = await bcrypt.compare(plain, createArgs.password)
      expect(isHash).toBe(true)
    })
  })

  // ── _processPendingEmailInvitations ─────────────────────────────────────────

  describe('create — invitation admin_etablissement en attente', () => {
    const baseUser = { email: 'gerant@example.com', name: 'Gérant', password: 'securepassword' }

    beforeEach(() => {
      User.findOne.mockResolvedValue(null)
      User.create.mockResolvedValue({ userId: 10, email: baseUser.email, name: baseUser.name })
      UserOnboardingState.create.mockResolvedValue({})
    })

    it('promeut le nouveau compte en transaction et révoque l\'ancien gérant', async () => {
      const etabUpdate = jest.fn().mockResolvedValue()
      const invUpdate = jest.fn().mockResolvedValue()
      Etablissement.findByPk.mockResolvedValue({ id: 3, adminId: 99, update: etabUpdate })
      Invitation.findAll.mockResolvedValue([
        { role: 'admin_etablissement', etablissementId: 3, update: invUpdate }
      ])

      await UserService.create(baseUser)

      // Transaction utilisée pour les 3 écritures liées
      expect(Etablissement.sequelize.transaction).toHaveBeenCalledTimes(1)
      // Ancien gérant (99) rétrogradé, nouveau (10) promu
      expect(User.update).toHaveBeenCalledWith(
        { roleId: 2 },
        expect.objectContaining({ where: { userId: 99 } })
      )
      expect(User.update).toHaveBeenCalledWith(
        { roleId: 4 },
        expect.objectContaining({ where: { userId: 10 } })
      )
      expect(etabUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ adminId: 10 }),
        expect.anything()
      )
      expect(invUpdate).toHaveBeenCalledWith({ status: 'accepted', targetUserId: 10 })
    })

    it('ne rétrograde personne si l\'établissement n\'avait pas encore de gérant', async () => {
      const etabUpdate = jest.fn().mockResolvedValue()
      const invUpdate = jest.fn().mockResolvedValue()
      Etablissement.findByPk.mockResolvedValue({ id: 3, adminId: null, update: etabUpdate })
      Invitation.findAll.mockResolvedValue([
        { role: 'admin_etablissement', etablissementId: 3, update: invUpdate }
      ])

      await UserService.create(baseUser)

      expect(User.update).not.toHaveBeenCalledWith(
        { roleId: 2 },
        expect.anything()
      )
      expect(User.update).toHaveBeenCalledWith(
        { roleId: 4 },
        expect.objectContaining({ where: { userId: 10 } })
      )
    })

    it('n\'écrit rien si l\'établissement de l\'invitation n\'existe plus', async () => {
      const invUpdate = jest.fn().mockResolvedValue()
      Etablissement.findByPk.mockResolvedValue(null)
      Invitation.findAll.mockResolvedValue([
        { role: 'admin_etablissement', etablissementId: 999, update: invUpdate }
      ])

      await UserService.create(baseUser)

      expect(Etablissement.sequelize.transaction).not.toHaveBeenCalled()
      expect(invUpdate).toHaveBeenCalledWith({ status: 'accepted', targetUserId: 10 })
    })
  })

  // ── setActive ──────────────────────────────────────────────────────────────

  describe('setActive', () => {
    it('active un compte et retourne l\'utilisateur mis à jour', async () => {
      User.findByPk.mockResolvedValueOnce({ userId: 5, roleId: 2, isActive: false })
      User.update.mockResolvedValue([1])
      User.findByPk.mockResolvedValueOnce({ dataValues: { userId: 5, isActive: true } })

      const result = await UserService.setActive(5, true, 1)

      expect(User.update).toHaveBeenCalledWith({ isActive: true }, { where: { userId: 5 } })
      expect(result).toBeDefined()
    })

    it('retourne null si l\'utilisateur cible est introuvable', async () => {
      User.findByPk.mockResolvedValueOnce(null)

      const result = await UserService.setActive(999, false, 1)

      expect(result).toBeNull()
      expect(User.update).not.toHaveBeenCalled()
    })

    it('retourne false si roleId=4 tente d\'agir sur un admin plateforme (roleId=1)', async () => {
      User.findByPk.mockResolvedValueOnce({ userId: 1, roleId: 1, isActive: true })

      const result = await UserService.setActive(1, false, 4)

      expect(result).toBe(false)
      expect(User.update).not.toHaveBeenCalled()
    })

    it('retourne false si roleId=1 tente de désactiver un autre admin plateforme (roleId=1)', async () => {
      User.findByPk.mockResolvedValueOnce({ userId: 2, roleId: 1, isActive: true })

      const result = await UserService.setActive(2, false, 1)

      expect(User.update).not.toHaveBeenCalled()
      expect(result).toBe(false)
    })

    it('révoque les tokens en cours (A07-M1) quand le compte est désactivé', async () => {
      const tokenBlacklist = require('../../helpers/tokenBlacklist')
      User.findByPk.mockResolvedValueOnce({ userId: 5, roleId: 2, isActive: true })
      User.update.mockResolvedValue([1])
      User.findByPk.mockResolvedValueOnce({ dataValues: { userId: 5, isActive: false } })

      await UserService.setActive(5, false, 1)

      expect(tokenBlacklist.revokeUserTokens).toHaveBeenCalledWith(5)
    })

    it('ne révoque rien quand le compte est (ré)activé', async () => {
      const tokenBlacklist = require('../../helpers/tokenBlacklist')
      User.findByPk.mockResolvedValueOnce({ userId: 5, roleId: 2, isActive: false })
      User.update.mockResolvedValue([1])
      User.findByPk.mockResolvedValueOnce({ dataValues: { userId: 5, isActive: true } })

      await UserService.setActive(5, true, 1)

      expect(tokenBlacklist.revokeUserTokens).not.toHaveBeenCalled()
    })
  })
})
