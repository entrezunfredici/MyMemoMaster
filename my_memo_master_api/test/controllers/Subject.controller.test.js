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
const jwt = require('jsonwebtoken');
const app = require('../../app');
const subjectService = require('../../services/Subject.service');

const makeToken = (payload = { id: 1 }) =>
  jwt.sign(payload, 'test-secret', { expiresIn: '1d' });

describe('Subject Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── GET /api/v1/subjects ───────────────────────────────────────────────────
  describe('GET /api/v1/subjects', () => {
    it('200 — retourne tous les sujets', async () => {
      subjectService.findAll.mockResolvedValue([
        { subjectId: 1, name: 'Maths' },
        { subjectId: 2, name: 'Physique' },
      ]);

      const res = await request(app)
        .get('/api/v1/subjects')
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(subjectService.findAll).toHaveBeenCalledTimes(1);
    });

    it('200 — retourne une liste vide', async () => {
      subjectService.findAll.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/v1/subjects')
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('500 — le service échoue', async () => {
      subjectService.findAll.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .get('/api/v1/subjects')
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(500);
    });

    it('401 — pas de token', async () => {
      const res = await request(app).get('/api/v1/subjects');
      expect(res.status).toBe(401);
    });
  });

  // ── GET /api/v1/subjects/:id ───────────────────────────────────────────────
  describe('GET /api/v1/subjects/:id', () => {
    it('200 — retourne le sujet', async () => {
      subjectService.findOne.mockResolvedValue({ subjectId: 1, name: 'Maths' });

      const res = await request(app)
        .get('/api/v1/subjects/1')
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Maths');
    });

    it('404 — sujet introuvable', async () => {
      subjectService.findOne.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/subjects/99')
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(404);
    });

    it('500 — le service échoue', async () => {
      subjectService.findOne.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .get('/api/v1/subjects/1')
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(500);
    });
  });

  // ── POST /api/v1/subjects ──────────────────────────────────────────────────
  describe('POST /api/v1/subjects', () => {
    it('201 — crée un sujet', async () => {
      subjectService.create.mockResolvedValue({ subjectId: 1, name: 'Chimie' });

      const res = await request(app)
        .post('/api/v1/subjects')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'Chimie' });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Chimie');
    });

    it('500 — le service échoue', async () => {
      subjectService.create.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .post('/api/v1/subjects')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'Chimie' });

      expect(res.status).toBe(500);
    });
  });

  // ── PUT /api/v1/subjects/:id ───────────────────────────────────────────────
  describe('PUT /api/v1/subjects/:id', () => {
    it('200 — met à jour le sujet', async () => {
      subjectService.update.mockResolvedValue({ subjectId: 1, name: 'Maths avancées' });

      const res = await request(app)
        .put('/api/v1/subjects/1')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'Maths avancées' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Maths avancées');
    });

    it('404 — sujet introuvable', async () => {
      subjectService.update.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/v1/subjects/99')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'Maths avancées' });

      expect(res.status).toBe(404);
    });

    it('500 — le service échoue', async () => {
      subjectService.update.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .put('/api/v1/subjects/1')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'Maths avancées' });

      expect(res.status).toBe(500);
    });
  });

  // ── DELETE /api/v1/subjects/:id ────────────────────────────────────────────
  describe('DELETE /api/v1/subjects/:id', () => {
    it('200 — supprime le sujet', async () => {
      subjectService.delete.mockResolvedValue(true);

      const res = await request(app)
        .delete('/api/v1/subjects/1')
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(200);
    });

    it('404 — sujet introuvable', async () => {
      subjectService.delete.mockResolvedValue(null);

      const res = await request(app)
        .delete('/api/v1/subjects/99')
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(404);
    });

    it('500 — le service échoue', async () => {
      subjectService.delete.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .delete('/api/v1/subjects/1')
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(500);
    });
  });
});
