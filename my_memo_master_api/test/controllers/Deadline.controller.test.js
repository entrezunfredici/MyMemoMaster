jest.mock('../../models/index', () => ({
  instance: { sync: jest.fn() },
  User: {}, Role: {}, Subject: {}, LeitnerSystem: {},
  LeitnerCard: {}, LeitnerBox: {}, LeitnerSystemsUsers: {},
  Unit: {}, Response: {}, Fields: {}, FieldsType: {},
  Diagramme: {}, Test: {}, Question: {}, Tutorials: {},
  UserOnboardingState: {},
  ClassGroup: {}, ClassGroupUsers: {}, CalendarEvent: {},
  EventOccurrence: {}, Deadline: {}, RevisionSession: {},
}));

jest.mock('../../jobs/fifo.cron', () => ({ startFifoCron: jest.fn() }));
jest.mock('../../helpers/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));

jest.mock('../../services/Deadline.service', () => ({
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
const deadlineService = require('../../services/Deadline.service');

const BASE = '/api/v1';
const makeToken = (payload = { id: 1 }) => jwt.sign(payload, 'test-secret', { expiresIn: '1d' });

const mockDeadline = {
  id: 1,
  name: 'DS de maths',
  type: 'ds',
  description: 'Chapitre 3',
  occurrenceId: 10,
  dueDate: '2026-09-15',
  dueTime: '08:00',
  createdBy: 1,
};

const validBody = {
  name: 'DS de maths',
  type: 'ds',
  occurrenceId: 10,
  dueDate: '2026-09-15',
};

describe('Deadline Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── GET /deadlines ────────────────────────────────────────────────────────
  describe('GET /deadlines', () => {
    it('200 — retourne les échéances accessibles', async () => {
      deadlineService.findAll.mockResolvedValue([mockDeadline]);

      const res = await request(app)
        .get(`${BASE}/deadlines`)
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('200 — liste vide', async () => {
      deadlineService.findAll.mockResolvedValue([]);

      const res = await request(app)
        .get(`${BASE}/deadlines`)
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('401 — pas de token', async () => {
      const res = await request(app).get(`${BASE}/deadlines`);
      expect(res.status).toBe(401);
    });

    it('500 — le service échoue', async () => {
      deadlineService.findAll.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .get(`${BASE}/deadlines`)
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(500);
    });
  });

  // ── GET /deadlines/:id ────────────────────────────────────────────────────
  describe('GET /deadlines/:id', () => {
    it('200 — retourne l\'échéance', async () => {
      deadlineService.findOne.mockResolvedValue(mockDeadline);

      const res = await request(app)
        .get(`${BASE}/deadlines/1`)
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('DS de maths');
    });

    it('404 — échéance introuvable', async () => {
      deadlineService.findOne.mockResolvedValue(null);

      const res = await request(app)
        .get(`${BASE}/deadlines/99`)
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(404);
    });

    it('500 — le service échoue', async () => {
      deadlineService.findOne.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .get(`${BASE}/deadlines/1`)
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(500);
    });
  });

  // ── POST /deadlines ───────────────────────────────────────────────────────
  describe('POST /deadlines', () => {
    it('201 — crée l\'échéance', async () => {
      deadlineService.create.mockResolvedValue(mockDeadline);

      const res = await request(app)
        .post(`${BASE}/deadlines`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send(validBody);

      expect(res.status).toBe(201);
      expect(deadlineService.create).toHaveBeenCalledTimes(1);
    });

    it('403 — droits insuffisants (non enseignant)', async () => {
      deadlineService.create.mockResolvedValue(false);

      const res = await request(app)
        .post(`${BASE}/deadlines`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send(validBody);

      expect(res.status).toBe(403);
    });

    it('400 — name manquant', async () => {
      const res = await request(app)
        .post(`${BASE}/deadlines`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ occurrenceId: 10, dueDate: '2026-09-15' });

      expect(res.status).toBe(400);
    });

    it('400 — occurrenceId manquant', async () => {
      const res = await request(app)
        .post(`${BASE}/deadlines`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'DS', dueDate: '2026-09-15' });

      expect(res.status).toBe(400);
    });

    it('400 — dueDate manquante', async () => {
      const res = await request(app)
        .post(`${BASE}/deadlines`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'DS', occurrenceId: 10 });

      expect(res.status).toBe(400);
    });

    it('401 — pas de token', async () => {
      const res = await request(app).post(`${BASE}/deadlines`).send(validBody);
      expect(res.status).toBe(401);
    });

    it('500 — le service échoue', async () => {
      deadlineService.create.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .post(`${BASE}/deadlines`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send(validBody);

      expect(res.status).toBe(500);
    });
  });

  // ── PUT /deadlines/:id ────────────────────────────────────────────────────
  describe('PUT /deadlines/:id', () => {
    it('200 — met à jour l\'échéance', async () => {
      deadlineService.update.mockResolvedValue({ ...mockDeadline, name: 'Contrôle continu' });

      const res = await request(app)
        .put(`${BASE}/deadlines/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'Contrôle continu' });

      expect(res.status).toBe(200);
    });

    it('403 — droits insuffisants (non propriétaire)', async () => {
      deadlineService.update.mockResolvedValue(false);

      const res = await request(app)
        .put(`${BASE}/deadlines/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'Contrôle continu' });

      expect(res.status).toBe(403);
    });

    it('404 — échéance introuvable', async () => {
      deadlineService.update.mockResolvedValue(null);

      const res = await request(app)
        .put(`${BASE}/deadlines/99`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'Contrôle continu' });

      expect(res.status).toBe(404);
    });

    it('500 — le service échoue', async () => {
      deadlineService.update.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .put(`${BASE}/deadlines/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'Contrôle continu' });

      expect(res.status).toBe(500);
    });
  });

  // ── DELETE /deadlines/:id ─────────────────────────────────────────────────
  describe('DELETE /deadlines/:id', () => {
    it('200 — supprime l\'échéance', async () => {
      deadlineService.delete.mockResolvedValue(true);

      const res = await request(app)
        .delete(`${BASE}/deadlines/1`)
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(200);
    });

    it('403 — droits insuffisants', async () => {
      deadlineService.delete.mockResolvedValue(false);

      const res = await request(app)
        .delete(`${BASE}/deadlines/1`)
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(403);
    });

    it('404 — échéance introuvable', async () => {
      deadlineService.delete.mockResolvedValue(null);

      const res = await request(app)
        .delete(`${BASE}/deadlines/99`)
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(404);
    });

    it('401 — pas de token', async () => {
      const res = await request(app).delete(`${BASE}/deadlines/1`);
      expect(res.status).toBe(401);
    });

    it('500 — le service échoue', async () => {
      deadlineService.delete.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .delete(`${BASE}/deadlines/1`)
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(500);
    });
  });
});
