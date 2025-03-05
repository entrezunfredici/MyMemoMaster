jest.mock('../../models/index', () => ({
  User: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
  Role: {
    findByPk: jest.fn(),
  },
}));

const { User, Role } = require('../../models/index');
const UserService = require('../../services/User.service');

describe('UserService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all users without passwords', async () => {
      User.findAll.mockResolvedValue([
        { userId: 1, name: 'User 1', password: 'hashedpassword' },
        { id: 2, name: 'User 2' },
      ]);

      const users = await UserService.findAll();

      expect(User.findAll).toHaveBeenCalled();
      expect(users).toEqual([
        { userId: 1, name: 'User 1' },
        { id: 2, name: 'User 2' },
      ]);
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      User.findOne.mockResolvedValue({
        userId: 1, email: 'test@example.com', password: 'hashedpassword'
      });

      const user = await UserService.findByEmail('test@example.com');

      expect(User.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
      expect(user).toEqual({ userId: 1, email: 'test@example.com' });
    });

    it('should return null if no user is found', async () => {
      User.findOne.mockResolvedValue(null);

      const user = await UserService.findByEmail('nonexistent@example.com');

      expect(User.findOne).toHaveBeenCalledWith({ where: { email: 'nonexistent@example.com' } });
      expect(user).toBeNull();
    });
  });

  describe('findOne', () => {
    it('should return a user by ID', async () => {
      User.findByPk.mockResolvedValue({
        userId: 1, name: 'User 1', password: 'hashedpassword'
      });

      const user = await UserService.findOne(1);

      expect(User.findByPk).toHaveBeenCalledWith(1);
      expect(user).toEqual({ userId: 1, name: 'User 1' });
    });

    it('should return null if no user is found', async () => {
      User.findByPk.mockResolvedValue(null);

      const user = await UserService.findOne(99);

      expect(User.findByPk).toHaveBeenCalledWith(99);
      expect(user).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({
        userId: 1, email: 'test@example.com', name: 'Test User'
      });

      const user = await UserService.create({
        email: 'test@example.com',
        name: 'Test User',
        password: 'securepassword',
      });

      expect(User.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
      expect(User.create).toHaveBeenCalled();
      expect(user).toEqual({ userId: 1, email: 'test@example.com', name: 'Test User' });
    });

    it('should throw an error if email is already used', async () => {
      User.findOne.mockResolvedValue({ userId: 1, email: 'test@example.com' });

      await expect(
        UserService.create({
          email: 'test@example.com',
          name: 'Test User',
          password: 'securepassword',
        })
      ).rejects.toThrow('Email déjà utilisé');

      expect(User.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
    });
  });

  describe('update', () => {
    it('should update a user by ID', async () => {
      User.update.mockResolvedValue([1]); // Sequelize update returns an array with the number of affected rows
      User.findByPk.mockResolvedValue({
        userId: 1, name: 'Updated User'
      });

      const user = await UserService.update(1, { name: 'Updated User' });

      expect(User.update).toHaveBeenCalledWith({ name: 'Updated User' }, { where: { userId: 1 } });
      expect(user).toEqual({ userId: 1, name: 'Updated User' });
    });
  });

  describe('delete', () => {
    it('should delete a user by ID', async () => {
      User.destroy.mockResolvedValue(1); // Sequelize destroy returns the number of affected rows

      await UserService.delete(1);

      expect(User.destroy).toHaveBeenCalledWith({ where: { userId: 1 } });
    });
  });

  describe('setRole', () => {
    it('should set a role for a user', async () => {
      Role.findByPk.mockResolvedValue({ userId: 1, name: 'Admin' });
      User.update.mockResolvedValue([1]);
      User.findByPk.mockResolvedValue({
        userId: 1, name: 'User 1', roleId: 1
      });

      const user = await UserService.setRole(1, 1);

      expect(Role.findByPk).toHaveBeenCalledWith(1);
      expect(User.update).toHaveBeenCalledWith({ roleId: 1 }, { where: { userId: 1 } });
      expect(user).toEqual({ userId: 1, name: 'User 1', roleId: 1 });
    });
  });
});
