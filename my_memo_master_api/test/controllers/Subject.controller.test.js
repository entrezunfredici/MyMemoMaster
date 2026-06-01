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

jest.mock('../../services/Subject.service', () => ({
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
const subjectService = require('../../services/Subject.service');

describe('Subject Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── GET /subjects/all ──────────────────────────────────────────────────────
  describe('GET /subjects/all', () => {
    it('200 — retourne tous les sujets', async () => {
      subjectService.findAll.mockResolvedValue([
        { subjectId: 1, name: 'Maths' },
        { subjectId: 2, name: 'Physique' },
      ]);

      const res = await request(app).get('/subjects/all');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(subjectService.findAll).toHaveBeenCalledTimes(1);
    });

    it('200 — retourne une liste vide', async () => {
      subjectService.findAll.mockResolvedValue([]);

      const res = await request(app).get('/subjects/all');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('500 — le service échoue', async () => {
      subjectService.findAll.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/subjects/all');

      expect(res.status).toBe(500);
    });
  });

  // ── GET /subjects/:id ──────────────────────────────────────────────────────
  describe('GET /subjects/:id', () => {
    it('200 — retourne le sujet', async () => {
      subjectService.findOne.mockResolvedValue({ subjectId: 1, name: 'Maths' });

      const res = await request(app).get('/subjects/1');

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Maths');
    });

    it('404 — sujet introuvable', async () => {
      subjectService.findOne.mockResolvedValue(null);

      const res = await request(app).get('/subjects/99');

      expect(res.status).toBe(404);
    });

    it('500 — le service échoue', async () => {
      subjectService.findOne.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/subjects/1');

      expect(res.status).toBe(500);
    });
  });

  // ── POST /subjects/add ─────────────────────────────────────────────────────
  describe('POST /subjects/add', () => {
    it('201 — crée un sujet', async () => {
      subjectService.create.mockResolvedValue({ subjectId: 1, name: 'Chimie' });

      const res = await request(app)
        .post('/subjects/add')
        .send({ name: 'Chimie' });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Chimie');
    });

    it('500 — le service échoue', async () => {
      subjectService.create.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .post('/subjects/add')
        .send({ name: 'Chimie' });

      expect(res.status).toBe(500);
    });
  });

  // ── PUT /subjects/:id ──────────────────────────────────────────────────────
  describe('PUT /subjects/:id', () => {
    it('200 — met à jour le sujet', async () => {
      subjectService.update.mockResolvedValue({ subjectId: 1, name: 'Maths avancées' });

      const res = await request(app)
        .put('/subjects/1')
        .send({ name: 'Maths avancées' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Maths avancées');
    });

    it('404 — sujet introuvable', async () => {
      subjectService.update.mockResolvedValue(null);

      const res = await request(app)
        .put('/subjects/99')
        .send({ name: 'Maths avancées' });

      expect(res.status).toBe(404);
    });

    it('500 — le service échoue', async () => {
      subjectService.update.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .put('/subjects/1')
        .send({ name: 'Maths avancées' });

      expect(res.status).toBe(500);
    });
  });

  // ── DELETE /subjects/:id ───────────────────────────────────────────────────
  describe('DELETE /subjects/:id', () => {
    it('200 — supprime le sujet', async () => {
      subjectService.delete.mockResolvedValue(true);

      const res = await request(app).delete('/subjects/1');

      expect(res.status).toBe(200);
    });

    it('404 — sujet introuvable', async () => {
      subjectService.delete.mockResolvedValue(null);

      const res = await request(app).delete('/subjects/99');

      expect(res.status).toBe(404);
    });

    it('500 — le service échoue', async () => {
      subjectService.delete.mockRejectedValue(new Error('DB error'));

      const res = await request(app).delete('/subjects/1');

      expect(res.status).toBe(500);
    });
  });
});
