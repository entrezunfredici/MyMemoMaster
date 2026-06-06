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

jest.mock('../../services/Tutorials.service', () => ({
  count: jest.fn(),
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
const tutorialsService = require('../../services/Tutorials.service');

const BASE = '/api/v1';

const mockTutorial = { tutorialId: 1, name: 'Intro à React', link: 'https://react.dev' };

describe('Tutorials Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── GET /tutorials ─────────────────────────────────────────────────────────
  describe('GET /tutorials', () => {
    it('200 — retourne la liste paginée', async () => {
      tutorialsService.count.mockResolvedValue(1);
      tutorialsService.findAll.mockResolvedValue([mockTutorial]);

      const res = await request(app).get(`${BASE}/tutorials`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination).toBeDefined();
    });

    it('200 — liste vide', async () => {
      tutorialsService.count.mockResolvedValue(0);
      tutorialsService.findAll.mockResolvedValue([]);

      const res = await request(app).get(`${BASE}/tutorials`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('200 — avec paramètre de recherche', async () => {
      tutorialsService.count.mockResolvedValue(1);
      tutorialsService.findAll.mockResolvedValue([mockTutorial]);

      const res = await request(app).get(`${BASE}/tutorials?search=React`);

      expect(res.status).toBe(200);
    });

    it('500 — le service échoue', async () => {
      tutorialsService.count.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get(`${BASE}/tutorials`);

      expect(res.status).toBe(500);
    });
  });

  // ── GET /tutorials/:id ─────────────────────────────────────────────────────
  describe('GET /tutorials/:id', () => {
    it('200 — retourne le tutoriel', async () => {
      tutorialsService.findOne.mockResolvedValue(mockTutorial);

      const res = await request(app).get(`${BASE}/tutorials/1`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.name).toBe('Intro à React');
    });

    it('404 — tutoriel introuvable', async () => {
      tutorialsService.findOne.mockResolvedValue(null);

      const res = await request(app).get(`${BASE}/tutorials/99`);

      expect(res.status).toBe(404);
      expect(res.body.status).toBe('error');
    });

    it('500 — le service échoue', async () => {
      tutorialsService.findOne.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get(`${BASE}/tutorials/1`);

      expect(res.status).toBe(500);
    });
  });

  // ── POST /tutorials ────────────────────────────────────────────────────────
  describe('POST /tutorials', () => {
    const validBody = { name: 'Intro à React', link: 'https://react.dev' };

    it('201 — crée un tutoriel', async () => {
      tutorialsService.create.mockResolvedValue(mockTutorial);

      const res = await request(app)
        .post(`${BASE}/tutorials`)
        .send(validBody);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(tutorialsService.create).toHaveBeenCalledTimes(1);
    });

    it('400 — name manquant', async () => {
      const res = await request(app)
        .post(`${BASE}/tutorials`)
        .send({ link: 'https://react.dev' });

      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it('400 — link manquant', async () => {
      const res = await request(app)
        .post(`${BASE}/tutorials`)
        .send({ name: 'Intro à React' });

      expect(res.status).toBe(400);
    });

    it('400 — link n\'est pas une URL valide', async () => {
      const res = await request(app)
        .post(`${BASE}/tutorials`)
        .send({ name: 'Intro à React', link: 'pas-une-url' });

      expect(res.status).toBe(400);
    });

    it('400 — revision_tips n\'est pas un booléen', async () => {
      const res = await request(app)
        .post(`${BASE}/tutorials`)
        .send({ ...validBody, revision_tips: 'maybe' });

      expect(res.status).toBe(400);
    });

    it('500 — le service échoue', async () => {
      tutorialsService.create.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .post(`${BASE}/tutorials`)
        .send(validBody);

      expect(res.status).toBe(500);
    });
  });

  // ── PUT /tutorials/:id ─────────────────────────────────────────────────────
  describe('PUT /tutorials/:id', () => {
    it('200 — met à jour le tutoriel', async () => {
      tutorialsService.update.mockResolvedValue({ ...mockTutorial, name: 'React avancé' });

      const res = await request(app)
        .put(`${BASE}/tutorials/1`)
        .send({ name: 'React avancé' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });

    it('404 — tutoriel introuvable', async () => {
      tutorialsService.update.mockResolvedValue(null);

      const res = await request(app)
        .put(`${BASE}/tutorials/99`)
        .send({ name: 'React avancé' });

      expect(res.status).toBe(404);
    });

    it('400 — link invalide (si fourni)', async () => {
      const res = await request(app)
        .put(`${BASE}/tutorials/1`)
        .send({ link: 'pas-une-url' });

      expect(res.status).toBe(400);
    });

    it('500 — le service échoue', async () => {
      tutorialsService.update.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .put(`${BASE}/tutorials/1`)
        .send({ name: 'React avancé' });

      expect(res.status).toBe(500);
    });
  });

  // ── DELETE /tutorials/:id ──────────────────────────────────────────────────
  describe('DELETE /tutorials/:id', () => {
    it('200 — supprime le tutoriel', async () => {
      tutorialsService.delete.mockResolvedValue(true);

      const res = await request(app).delete(`${BASE}/tutorials/1`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });

    it('404 — tutoriel introuvable', async () => {
      tutorialsService.delete.mockResolvedValue(null);

      const res = await request(app).delete(`${BASE}/tutorials/99`);

      expect(res.status).toBe(404);
    });

    it('500 — le service échoue', async () => {
      tutorialsService.delete.mockRejectedValue(new Error('DB error'));

      const res = await request(app).delete(`${BASE}/tutorials/1`);

      expect(res.status).toBe(500);
    });
  });
});
