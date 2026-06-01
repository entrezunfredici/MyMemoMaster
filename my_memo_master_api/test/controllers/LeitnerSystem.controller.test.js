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

jest.mock('../../services/LeitnerSystem.service', () => ({
  findAll: jest.fn(),
  findBySubject: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  shareSystem: jest.fn(),
}));

process.env.AUTH_JWT_SECRET = 'test-secret';
process.env.VITE_FRONT_URL = 'http://localhost:5173';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../../app');
const leitnerSystemService = require('../../services/LeitnerSystem.service');

const mockSystem = { idSystem: 1, name: 'Leitner Maths', idUser: 1 };

describe('LeitnerSystem Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── GET /leitnersystems/all ────────────────────────────────────────────────
  describe('GET /leitnersystems/all', () => {
    it('200 — retourne tous les systèmes', async () => {
      leitnerSystemService.findAll.mockResolvedValue([mockSystem]);

      const res = await request(app).get('/leitnersystems/all');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it('500 — le service échoue', async () => {
      leitnerSystemService.findAll.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/leitnersystems/all');

      expect(res.status).toBe(500);
    });
  });

  // ── GET /leitnersystems/bySubjects/:subjectid ──────────────────────────────
  describe('GET /leitnersystems/bySubjects/:subjectid', () => {
    it('200 — retourne les systèmes du sujet', async () => {
      leitnerSystemService.findBySubject.mockResolvedValue([mockSystem]);

      const res = await request(app).get('/leitnersystems/bySubjects/1');

      expect(res.status).toBe(200);
      expect(leitnerSystemService.findBySubject).toHaveBeenCalledWith('1');
    });

    it('404 — aucun système pour ce sujet', async () => {
      leitnerSystemService.findBySubject.mockResolvedValue([]);

      const res = await request(app).get('/leitnersystems/bySubjects/99');

      expect(res.status).toBe(404);
    });

    it('500 — le service échoue', async () => {
      leitnerSystemService.findBySubject.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/leitnersystems/bySubjects/1');

      expect(res.status).toBe(500);
    });
  });

  // ── GET /leitnersystems/:id ────────────────────────────────────────────────
  describe('GET /leitnersystems/:id', () => {
    it('200 — retourne le système', async () => {
      leitnerSystemService.findOne.mockResolvedValue(mockSystem);

      const res = await request(app).get('/leitnersystems/1');

      expect(res.status).toBe(200);
      expect(res.body.idSystem).toBe(1);
    });

    it('404 — système introuvable', async () => {
      leitnerSystemService.findOne.mockResolvedValue(null);

      const res = await request(app).get('/leitnersystems/99');

      expect(res.status).toBe(404);
    });
  });

  // ── POST /leitnersystems/add ───────────────────────────────────────────────
  describe('POST /leitnersystems/add', () => {
    it('201 — crée un système', async () => {
      leitnerSystemService.create.mockResolvedValue(mockSystem);

      const res = await request(app)
        .post('/leitnersystems/add')
        .send({ name: 'Leitner Maths', idUser: 1 });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Leitner Maths');
    });

    it('400 — champs obligatoires manquants (name)', async () => {
      const res = await request(app)
        .post('/leitnersystems/add')
        .send({ idUser: 1 });

      expect(res.status).toBe(400);
    });

    it('400 — champs obligatoires manquants (idUser)', async () => {
      const res = await request(app)
        .post('/leitnersystems/add')
        .send({ name: 'Leitner Maths' });

      expect(res.status).toBe(400);
    });

    it('500 — le service échoue', async () => {
      leitnerSystemService.create.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .post('/leitnersystems/add')
        .send({ name: 'Leitner Maths', idUser: 1 });

      expect(res.status).toBe(500);
    });
  });

  // ── PUT /leitnersystems/:id ────────────────────────────────────────────────
  describe('PUT /leitnersystems/:id', () => {
    it('200 — met à jour le système', async () => {
      leitnerSystemService.update.mockResolvedValue(true);

      const res = await request(app)
        .put('/leitnersystems/1')
        .send({ name: 'Leitner Maths v2', idUser: 1 });

      expect(res.status).toBe(200);
    });

    it('404 — système introuvable', async () => {
      leitnerSystemService.update.mockResolvedValue(null);

      const res = await request(app)
        .put('/leitnersystems/99')
        .send({ name: 'Leitner Maths v2', idUser: 1 });

      expect(res.status).toBe(404);
    });
  });

  // ── POST /leitnersystems/share ─────────────────────────────────────────────
  describe('POST /leitnersystems/share', () => {
    it('200 — partage le système', async () => {
      leitnerSystemService.shareSystem.mockResolvedValue({ success: true });

      const res = await request(app)
        .post('/leitnersystems/share')
        .send({ idUserOwner: 1, idUserShared: 2, idSystem: 1, writeRight: true });

      expect(res.status).toBe(200);
    });

    it('403 — partage refusé par le service', async () => {
      leitnerSystemService.shareSystem.mockRejectedValue(new Error('Permission refusée'));

      const res = await request(app)
        .post('/leitnersystems/share')
        .send({ idUserOwner: 1, idUserShared: 2, idSystem: 1 });

      expect(res.status).toBe(403);
    });
  });

  // ── DELETE /leitnersystems/:id ─────────────────────────────────────────────
  describe('DELETE /leitnersystems/:id', () => {
    it('200 — supprime le système', async () => {
      leitnerSystemService.delete.mockResolvedValue(true);

      const res = await request(app)
        .delete('/leitnersystems/1')
        .send({ idUser: 1 });

      expect(res.status).toBe(200);
    });

    it('403 — suppression refusée (propriétaire différent)', async () => {
      leitnerSystemService.delete.mockResolvedValue(null);

      const res = await request(app)
        .delete('/leitnersystems/1')
        .send({ idUser: 2 });

      expect(res.status).toBe(403);
    });

    it('500 — le service échoue', async () => {
      leitnerSystemService.delete.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .delete('/leitnersystems/1')
        .send({ idUser: 1 });

      expect(res.status).toBe(500);
    });
  });
});
