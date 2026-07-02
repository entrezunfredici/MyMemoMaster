jest.mock('../../services/AuditLog.service', () => ({
  log: jest.fn().mockResolvedValue({})
}))

jest.mock('../../models/index', () => ({
  User: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
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
  }
}))

const { User, Role, UserOnboardingState, Invitation } = require('../../models/index')
const bcrypt = require('bcryptjs')
const UserService = require('../../services/User.service')

describe('UserService', () => {
  afterEach(() => {
    jest.clearAllMocks()
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
      expect(user).toEqual({ userId: 1, name: 'User 1' })
    })

    it('should return null if no user is found', async () => {
      User.findByPk.mockResolvedValue(null)

      const user = await UserService.findOne(99)

      expect(User.findByPk).toHaveBeenCalledWith(99)
      expect(user).toBeNull()
    })
  })

  describe('create', () => {
    it('should create a new user', async () => {
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
      expect(user).toEqual({ userId: 1, name: 'Updated User' })
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
    it('stocke le hash SHA-256 en base et retourne le token brut', async () => {
      User.update.mockResolvedValue([1])

      const token = await UserService.setResetPasswordCode(1)

      expect(typeof token).toBe('string')
      expect(token).toHaveLength(64)
      expect(/^[0-9a-f]+$/.test(token)).toBe(true)

      const [fields] = User.update.mock.calls[0]
      expect(fields.resetPasswordCode).not.toBe(token) // le hash ≠ le token brut
      expect(fields.resetPasswordCode).toHaveLength(64)
      expect(fields.resetPasswordCodeExpiresAt).toBeInstanceOf(Date)
    })
  })

  describe('verifyResetPasswordCode', () => {
    it('retourne true si le hash correspond et le token est non expiré', async () => {
      const crypto = require('crypto')
      const token = crypto.randomBytes(32).toString('hex')
      const hash = crypto.createHash('sha256').update(token).digest('hex')
      const future = new Date(Date.now() + 10 * 60 * 1000)

      const mockUser = {
        resetPasswordCode: hash,
        resetPasswordCodeExpiresAt: future,
        save: jest.fn().mockResolvedValue()
      }
      User.findByPk.mockResolvedValue(mockUser)

      const result = await UserService.verifyResetPasswordCode(1, token)

      expect(result).toBe(true)
      expect(mockUser.resetPasswordCode).toBeNull()
      expect(mockUser.resetPasswordCodeExpiresAt).toBeNull()
      expect(mockUser.save).toHaveBeenCalled()
    })

    it('retourne false si le token ne correspond pas', async () => {
      const crypto = require('crypto')
      const correctToken = crypto.randomBytes(32).toString('hex')
      const hash = crypto.createHash('sha256').update(correctToken).digest('hex')
      const future = new Date(Date.now() + 10 * 60 * 1000)

      const mockUser = {
        resetPasswordCode: hash,
        resetPasswordCodeExpiresAt: future,
        save: jest.fn().mockResolvedValue()
      }
      User.findByPk.mockResolvedValue(mockUser)

      const wrongToken = crypto.randomBytes(32).toString('hex')
      const result = await UserService.verifyResetPasswordCode(1, wrongToken)

      expect(result).toBe(false)
    })

    it('retourne false si le token est expiré', async () => {
      const crypto = require('crypto')
      const token = crypto.randomBytes(32).toString('hex')
      const hash = crypto.createHash('sha256').update(token).digest('hex')
      const past = new Date(Date.now() - 1000)

      const mockUser = {
        resetPasswordCode: hash,
        resetPasswordCodeExpiresAt: past,
        save: jest.fn().mockResolvedValue()
      }
      User.findByPk.mockResolvedValue(mockUser)

      const result = await UserService.verifyResetPasswordCode(1, token)

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
      expect(user).toEqual({ userId: 1, name: 'User 1', roleId: 1 })
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

    it('roleId=1 peut désactiver un admin plateforme', async () => {
      User.findByPk.mockResolvedValueOnce({ userId: 2, roleId: 1, isActive: true })
      User.update.mockResolvedValue([1])
      User.findByPk.mockResolvedValueOnce({ dataValues: { userId: 2, isActive: false } })

      const result = await UserService.setActive(2, false, 1)

      expect(User.update).toHaveBeenCalledWith({ isActive: false }, { where: { userId: 2 } })
      expect(result).toBeDefined()
    })
  })
})
