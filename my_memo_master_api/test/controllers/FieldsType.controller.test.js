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

jest.mock('../../services/FieldsType.service', () => ({
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
}));

process.env.AUTH_JWT_SECRET = 'test-secret';
process.env.VITE_FRONT_URL = 'http://localhost:5173';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../../app');
const fieldTypeService = require('../../services/FieldsType.service');

const BASE = '/api/v1';

const mockFieldType = { idType: 1, name: 'Texte', allowUnit: false };

describe('FieldsType Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── GET /fieldstypes ───────────────────────────────────────────────────────
  describe('GET /fieldstypes', () => {
    it('200 — retourne tous les types', async () => {
      fieldTypeService.findAll.mockResolvedValue([mockFieldType]);

      const res = await request(app).get(`${BASE}/fieldstypes`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it('200 — liste vide', async () => {
      fieldTypeService.findAll.mockResolvedValue([]);

      const res = await request(app).get(`${BASE}/fieldstypes`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('500 — le service échoue', async () => {
      fieldTypeService.findAll.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get(`${BASE}/fieldstypes`);

      expect(res.status).toBe(500);
    });
  });

  // ── GET /fieldstypes/:id ───────────────────────────────────────────────────
  describe('GET /fieldstypes/:id', () => {
    it('200 — retourne le type de champ', async () => {
      fieldTypeService.findOne.mockResolvedValue(mockFieldType);

      const res = await request(app).get(`${BASE}/fieldstypes/1`);

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Texte');
    });

    it('404 — type introuvable', async () => {
      fieldTypeService.findOne.mockResolvedValue(null);

      const res = await request(app).get(`${BASE}/fieldstypes/99`);

      expect(res.status).toBe(404);
    });

    it('500 — le service échoue', async () => {
      fieldTypeService.findOne.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get(`${BASE}/fieldstypes/1`);

      expect(res.status).toBe(500);
    });
  });

  // ── POST /fieldstypes ──────────────────────────────────────────────────────
  describe('POST /fieldstypes', () => {
    const validBody = { name: 'Nombre', allowUnit: true };

    it('201 — crée un type de champ', async () => {
      fieldTypeService.create.mockResolvedValue({ idType: 2, ...validBody });

      const res = await request(app)
        .post(`${BASE}/fieldstypes`)
        .send(validBody);

      expect(res.status).toBe(201);
      expect(fieldTypeService.create).toHaveBeenCalledTimes(1);
    });

    it('400 — name manquant', async () => {
      const res = await request(app)
        .post(`${BASE}/fieldstypes`)
        .send({ allowUnit: true });

      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it('400 — allowUnit manquant', async () => {
      const res = await request(app)
        .post(`${BASE}/fieldstypes`)
        .send({ name: 'Nombre' });

      expect(res.status).toBe(400);
    });

    it('400 — name trop court (< 2 chars)', async () => {
      const res = await request(app)
        .post(`${BASE}/fieldstypes`)
        .send({ name: 'N', allowUnit: false });

      expect(res.status).toBe(400);
    });

    it('400 — allowUnit n\'est pas un booléen', async () => {
      const res = await request(app)
        .post(`${BASE}/fieldstypes`)
        .send({ name: 'Nombre', allowUnit: 'oui' });

      expect(res.status).toBe(400);
    });

    it('500 — le service échoue', async () => {
      fieldTypeService.create.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .post(`${BASE}/fieldstypes`)
        .send(validBody);

      expect(res.status).toBe(500);
    });
  });

  // ── PUT /fieldstypes/:id ───────────────────────────────────────────────────
  describe('PUT /fieldstypes/:id', () => {
    it('200 — met à jour le type de champ', async () => {
      fieldTypeService.update.mockResolvedValue(true);

      const res = await request(app)
        .put(`${BASE}/fieldstypes/1`)
        .send({ name: 'Texte long' });

      expect(res.status).toBe(200);
    });

    it('404 — type introuvable', async () => {
      fieldTypeService.update.mockResolvedValue(null);

      const res = await request(app)
        .put(`${BASE}/fieldstypes/99`)
        .send({ name: 'Texte long' });

      expect(res.status).toBe(404);
    });

    it('400 — name trop court (si fourni)', async () => {
      const res = await request(app)
        .put(`${BASE}/fieldstypes/1`)
        .send({ name: 'X' });

      expect(res.status).toBe(400);
    });

    it('400 — allowUnit n\'est pas un booléen (si fourni)', async () => {
      const res = await request(app)
        .put(`${BASE}/fieldstypes/1`)
        .send({ allowUnit: 'maybe' });

      expect(res.status).toBe(400);
    });

    it('500 — le service échoue', async () => {
      fieldTypeService.update.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .put(`${BASE}/fieldstypes/1`)
        .send({ name: 'Texte long' });

      expect(res.status).toBe(500);
    });
  });
});
