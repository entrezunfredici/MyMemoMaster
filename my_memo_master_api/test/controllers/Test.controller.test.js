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

jest.mock('../../services/Test.service', () => ({
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}));

process.env.AUTH_JWT_SECRET = 'test-secret';
process.env.VITE_FRONT_URL = 'http://localhost:5173';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../../app');
const testService = require('../../services/Test.service');

const BASE = '/api/v1';

const mockTest = { testId: 1, name: 'Contrôle Maths', subjectId: 1 };

describe('Test Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── GET /tests ─────────────────────────────────────────────────────────────
  describe('GET /tests', () => {
    it('200 — retourne tous les tests', async () => {
      testService.findAll.mockResolvedValue([mockTest]);

      const res = await request(app).get(`${BASE}/tests`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(testService.findAll).toHaveBeenCalledTimes(1);
    });

    it('200 — retourne une liste vide', async () => {
      testService.findAll.mockResolvedValue([]);

      const res = await request(app).get(`${BASE}/tests`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('500 — le service échoue', async () => {
      testService.findAll.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get(`${BASE}/tests`);

      expect(res.status).toBe(500);
    });
  });

  // ── GET /tests/:id ─────────────────────────────────────────────────────────
  describe('GET /tests/:id', () => {
    it('200 — retourne le test', async () => {
      testService.findOne.mockResolvedValue(mockTest);

      const res = await request(app).get(`${BASE}/tests/1`);

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Contrôle Maths');
    });

    it('404 — test introuvable', async () => {
      testService.findOne.mockResolvedValue(null);

      const res = await request(app).get(`${BASE}/tests/99`);

      expect(res.status).toBe(404);
    });

    it('500 — le service échoue', async () => {
      testService.findOne.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get(`${BASE}/tests/1`);

      expect(res.status).toBe(500);
    });
  });

  // ── POST /tests ────────────────────────────────────────────────────────────
  describe('POST /tests', () => {
    it('201 — crée un test', async () => {
      testService.create.mockResolvedValue(mockTest);

      const res = await request(app)
        .post(`${BASE}/tests`)
        .send({ name: 'Contrôle Maths', subjectId: 1 });

      expect(res.status).toBe(201);
      expect(testService.create).toHaveBeenCalledTimes(1);
    });

    it('400 — name manquant', async () => {
      const res = await request(app)
        .post(`${BASE}/tests`)
        .send({ subjectId: 1 });

      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it('400 — subjectId manquant', async () => {
      const res = await request(app)
        .post(`${BASE}/tests`)
        .send({ name: 'Contrôle Maths' });

      expect(res.status).toBe(400);
    });

    it('400 — subjectId invalide (non entier)', async () => {
      const res = await request(app)
        .post(`${BASE}/tests`)
        .send({ name: 'Contrôle Maths', subjectId: 'abc' });

      expect(res.status).toBe(400);
    });

    it('400 — name trop court (< 2 chars)', async () => {
      const res = await request(app)
        .post(`${BASE}/tests`)
        .send({ name: 'A', subjectId: 1 });

      expect(res.status).toBe(400);
    });

    it('500 — le service échoue', async () => {
      testService.create.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .post(`${BASE}/tests`)
        .send({ name: 'Contrôle Maths', subjectId: 1 });

      expect(res.status).toBe(500);
    });
  });

  // ── PUT /tests/:id ─────────────────────────────────────────────────────────
  describe('PUT /tests/:id', () => {
    it('200 — met à jour le test', async () => {
      testService.update.mockResolvedValue({ ...mockTest, name: 'Contrôle Maths v2' });

      const res = await request(app)
        .put(`${BASE}/tests/1`)
        .send({ name: 'Contrôle Maths v2' });

      expect(res.status).toBe(200);
    });

    it('400 — subjectId invalide', async () => {
      const res = await request(app)
        .put(`${BASE}/tests/1`)
        .send({ subjectId: -1 });

      expect(res.status).toBe(400);
    });

    it('500 — le service échoue', async () => {
      testService.update.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .put(`${BASE}/tests/1`)
        .send({ name: 'Contrôle Maths v2' });

      expect(res.status).toBe(500);
    });
  });

  // ── DELETE /tests/:id ──────────────────────────────────────────────────────
  describe('DELETE /tests/:id', () => {
    it('204 — supprime le test', async () => {
      testService.delete.mockResolvedValue(true);

      const res = await request(app).delete(`${BASE}/tests/1`);

      expect(res.status).toBe(204);
    });

    it('500 — le service échoue', async () => {
      testService.delete.mockRejectedValue(new Error('DB error'));

      const res = await request(app).delete(`${BASE}/tests/1`);

      expect(res.status).toBe(500);
    });
  });
});
