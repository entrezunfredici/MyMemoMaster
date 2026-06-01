jest.mock('../../models/index', () => ({
  instance: { sync: jest.fn() },
  sequelize: { transaction: jest.fn() },
  User: {}, Role: {}, Subject: {}, LeitnerSystem: {},
  LeitnerCard: {}, LeitnerBox: {}, LeitnerSystemsUsers: {},
  Unit: {}, Response: {}, Fields: {}, FieldsType: {},
  Diagramme: {}, Test: {}, Question: {}, Tutorials: {},
}));

jest.mock('../../jobs/fifo.cron', () => ({ startFifoCron: jest.fn() }));
jest.mock('../../helpers/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));
jest.mock('../../helpers/sendEmail', () => jest.fn());

jest.mock('../../services/User.service', () => ({
  findByEmail: jest.fn(),
  create: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  verifyPassword: jest.fn(),
  updateLoginDate: jest.fn(),
  setResetPasswordCode: jest.fn(),
  setPassword: jest.fn(),
  setRole: jest.fn(),
  deleteRole: jest.fn(),
  verifyValidEmailCode: jest.fn(),
  verifyResetPasswordCode: jest.fn(),
}));

jest.mock('../../services/Role.service', () => ({ findOne: jest.fn() }));

process.env.AUTH_JWT_SECRET = 'test-secret';
process.env.AUTH_JWT_EXPIRES_IN = '1d';
process.env.VITE_FRONT_URL = 'http://localhost:5173';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../app');
const userService = require('../../services/User.service');
const roleService = require('../../services/Role.service');
const sendEmail = require('../../helpers/sendEmail');

const makeToken = (payload = { id: 1, name: 'Test', email: 'test@example.com' }) =>
  jwt.sign(payload, 'test-secret', { expiresIn: '1d' });

describe('User Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── POST /users/register ───────────────────────────────────────────────────
  describe('POST /users/register', () => {
    it('201 — crée un utilisateur', async () => {
      userService.create.mockResolvedValue({ userId: 1, name: 'Bob', email: 'bob@example.com' });

      const res = await request(app)
        .post('/users/register')
        .send({ name: 'Bob', email: 'bob@example.com', password: 'Password123' });

      expect(res.status).toBe(201);
      expect(userService.create).toHaveBeenCalledTimes(1);
    });

    it('400 — email invalide', async () => {
      const res = await request(app)
        .post('/users/register')
        .send({ name: 'Bob', email: 'not-an-email', password: 'Password123' });

      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it('400 — mot de passe trop court', async () => {
      const res = await request(app)
        .post('/users/register')
        .send({ name: 'Bob', email: 'bob@example.com', password: 'short' });

      expect(res.status).toBe(400);
    });

    it('400 — mot de passe sans majuscule', async () => {
      const res = await request(app)
        .post('/users/register')
        .send({ name: 'Bob', email: 'bob@example.com', password: 'alllower123' });

      expect(res.status).toBe(400);
    });

    it('400 — nom trop court', async () => {
      const res = await request(app)
        .post('/users/register')
        .send({ name: 'B', email: 'bob@example.com', password: 'Password123' });

      expect(res.status).toBe(400);
    });

    it('500 — le service échoue', async () => {
      userService.create.mockRejectedValue(new Error('Email déjà utilisé'));

      const res = await request(app)
        .post('/users/register')
        .send({ name: 'Bob', email: 'bob@example.com', password: 'Password123' });

      expect(res.status).toBe(500);
    });
  });

  // ── POST /users/login ──────────────────────────────────────────────────────
  describe('POST /users/login', () => {
    it('200 — retourne un token JWT', async () => {
      const mockUser = { userId: 1, name: 'Bob', email: 'bob@example.com', role: 'user' };
      userService.findByEmail.mockResolvedValue(mockUser);
      userService.verifyPassword.mockResolvedValue(true);
      userService.updateLoginDate.mockResolvedValue();

      const res = await request(app)
        .post('/users/login')
        .send({ email: 'bob@example.com', password: 'Password123' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
    });

    it('404 — utilisateur introuvable', async () => {
      userService.findByEmail.mockResolvedValue(null);

      const res = await request(app)
        .post('/users/login')
        .send({ email: 'unknown@example.com', password: 'Password123' });

      expect(res.status).toBe(404);
    });

    it('401 — mauvais mot de passe', async () => {
      userService.findByEmail.mockResolvedValue({ userId: 1 });
      userService.verifyPassword.mockResolvedValue(false);

      const res = await request(app)
        .post('/users/login')
        .send({ email: 'bob@example.com', password: 'WrongPass1' });

      expect(res.status).toBe(401);
    });

    it('400 — mot de passe manquant', async () => {
      const res = await request(app)
        .post('/users/login')
        .send({ email: 'bob@example.com' });

      expect(res.status).toBe(400);
    });

    it('400 — email invalide', async () => {
      const res = await request(app)
        .post('/users/login')
        .send({ email: 'bad-email', password: 'Password123' });

      expect(res.status).toBe(400);
    });
  });

  // ── GET /users/:id ─────────────────────────────────────────────────────────
  describe('GET /users/:id', () => {
    it('200 — retourne l\'utilisateur', async () => {
      const mockUser = { userId: 1, name: 'Bob', email: 'bob@example.com', roleId: 1 };
      userService.findOne.mockResolvedValue(mockUser);
      roleService.findOne.mockResolvedValue({ roleId: 1, name: 'admin' });

      const res = await request(app)
        .get('/users/1')
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.userId).toBe(1);
    });

    it('401 — pas de token', async () => {
      const res = await request(app).get('/users/1');
      expect(res.status).toBe(401);
    });

    it('401 — token invalide', async () => {
      const res = await request(app)
        .get('/users/1')
        .set('Authorization', 'Bearer invalid.token.here');
      expect(res.status).toBe(401);
    });

    it('404 — utilisateur introuvable', async () => {
      userService.findOne.mockResolvedValue(null);

      const res = await request(app)
        .get('/users/99')
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(404);
    });
  });

  // ── POST /users/forgot-password ────────────────────────────────────────────
  describe('POST /users/forgot-password', () => {
    it('201 — envoie l\'email avec le code', async () => {
      userService.findByEmail.mockResolvedValue({ userId: 1, email: 'bob@example.com' });
      userService.setResetPasswordCode.mockResolvedValue('ABC123');
      sendEmail.mockResolvedValue();

      const res = await request(app)
        .post('/users/forgot-password')
        .send({ email: 'bob@example.com' });

      expect(res.status).toBe(201);
      expect(sendEmail).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('ABC123'),
        'bob@example.com'
      );
    });

    it('404 — utilisateur introuvable', async () => {
      userService.findByEmail.mockResolvedValue(null);

      const res = await request(app)
        .post('/users/forgot-password')
        .send({ email: 'unknown@example.com' });

      expect(res.status).toBe(404);
    });

    it('400 — email invalide', async () => {
      const res = await request(app)
        .post('/users/forgot-password')
        .send({ email: 'bad' });

      expect(res.status).toBe(400);
    });
  });

  // ── POST /users/reset-password ─────────────────────────────────────────────
  describe('POST /users/reset-password', () => {
    it('201 — réinitialise le mot de passe', async () => {
      userService.findByEmail.mockResolvedValue({ userId: 1 });
      userService.verifyResetPasswordCode.mockResolvedValue(true);
      userService.setPassword.mockResolvedValue();

      const res = await request(app)
        .post('/users/reset-password')
        .send({ email: 'bob@example.com', code: 'ABC123', newPassword: 'NewPass123' });

      expect(res.status).toBe(201);
    });

    it('401 — code invalide', async () => {
      userService.findByEmail.mockResolvedValue({ userId: 1 });
      userService.verifyResetPasswordCode.mockResolvedValue(false);

      const res = await request(app)
        .post('/users/reset-password')
        .send({ email: 'bob@example.com', code: 'WRONG', newPassword: 'NewPass123' });

      expect(res.status).toBe(401);
    });

    it('400 — code manquant', async () => {
      const res = await request(app)
        .post('/users/reset-password')
        .send({ email: 'bob@example.com', newPassword: 'NewPass123' });

      expect(res.status).toBe(400);
    });
  });

  // ── PUT /users/:id/change-password ─────────────────────────────────────────
  describe('PUT /users/:id/change-password', () => {
    it('200 — change le mot de passe', async () => {
      userService.findOne.mockResolvedValue({ userId: 1 });
      userService.verifyPassword.mockResolvedValue(true);
      userService.setPassword.mockResolvedValue();

      const res = await request(app)
        .put('/users/1/change-password')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ id: 1, oldPassword: 'OldPass123', newPassword: 'NewPass123' });

      expect(res.status).toBe(200);
    });

    it('401 — ancien mot de passe incorrect', async () => {
      userService.findOne.mockResolvedValue({ userId: 1 });
      userService.verifyPassword.mockResolvedValue(false);

      const res = await request(app)
        .put('/users/1/change-password')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ id: 1, oldPassword: 'WrongOld1', newPassword: 'NewPass123' });

      expect(res.status).toBe(401);
    });

    it('401 — pas de token', async () => {
      const res = await request(app)
        .put('/users/1/change-password')
        .send({ id: 1, oldPassword: 'OldPass123', newPassword: 'NewPass123' });

      expect(res.status).toBe(401);
    });

    it('400 — id invalide', async () => {
      const res = await request(app)
        .put('/users/1/change-password')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ id: 'not-an-int', oldPassword: 'OldPass123', newPassword: 'NewPass123' });

      expect(res.status).toBe(400);
    });
  });

  // ── DELETE /users/:id ──────────────────────────────────────────────────────
  describe('DELETE /users/:id', () => {
    it('200 — supprime l\'utilisateur', async () => {
      userService.delete.mockResolvedValue();

      const res = await request(app)
        .delete('/users/1')
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(200);
    });

    it('401 — pas de token', async () => {
      const res = await request(app).delete('/users/1');
      expect(res.status).toBe(401);
    });
  });
});
