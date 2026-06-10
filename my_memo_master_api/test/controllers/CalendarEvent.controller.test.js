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

jest.mock('../../services/CalendarEvent.service', () => ({
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  addOccurrence: jest.fn(),
  deleteOccurrence: jest.fn(),
}));

process.env.AUTH_JWT_SECRET = 'test-secret';
process.env.VITE_FRONT_URL = 'http://localhost:5173';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../app');
const calendarEventService = require('../../services/CalendarEvent.service');

const BASE = '/api/v1';
const makeToken = (payload = { id: 1 }) => jwt.sign(payload, 'test-secret', { expiresIn: '1d' });

const mockOccurrence = { id: 10, eventId: 1, date: '2026-09-01', startTime: '08:00', endTime: '10:00' };
const mockEvent = {
  id: 1,
  name: 'Cours de maths',
  type: 'cours',
  classGroupId: 1,
  recurrenceMode: 'manual',
  occurrences: [mockOccurrence],
};

const validManualBody = {
  name: 'Cours de maths',
  type: 'cours',
  classGroupId: 1,
  recurrenceMode: 'manual',
  occurrences: [{ date: '2026-09-01', startTime: '08:00', endTime: '10:00' }],
};

const validAutoBody = {
  name: 'TD hebdomadaire',
  type: 'cours',
  classGroupId: 1,
  recurrenceMode: 'auto',
  recurrenceRule: {
    frequency: 'weekly',
    days: ['monday'],
    startDate: '2026-09-01',
    endDate: '2026-12-15',
    startTime: '08:00',
    endTime: '10:00',
  },
};

describe('CalendarEvent Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── GET /calendar-events ──────────────────────────────────────────────────
  describe('GET /calendar-events', () => {
    it('200 — retourne la liste des évènements', async () => {
      calendarEventService.findAll.mockResolvedValue([mockEvent]);

      const res = await request(app)
        .get(`${BASE}/calendar-events`)
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('200 — liste vide', async () => {
      calendarEventService.findAll.mockResolvedValue([]);

      const res = await request(app)
        .get(`${BASE}/calendar-events`)
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('401 — pas de token', async () => {
      const res = await request(app).get(`${BASE}/calendar-events`);
      expect(res.status).toBe(401);
    });

    it('500 — le service échoue', async () => {
      calendarEventService.findAll.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .get(`${BASE}/calendar-events`)
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(500);
    });
  });

  // ── GET /calendar-events/:id ──────────────────────────────────────────────
  describe('GET /calendar-events/:id', () => {
    it('200 — retourne l\'évènement avec ses occurrences', async () => {
      calendarEventService.findOne.mockResolvedValue(mockEvent);

      const res = await request(app)
        .get(`${BASE}/calendar-events/1`)
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Cours de maths');
    });

    it('404 — évènement introuvable', async () => {
      calendarEventService.findOne.mockResolvedValue(null);

      const res = await request(app)
        .get(`${BASE}/calendar-events/99`)
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(404);
    });

    it('500 — le service échoue', async () => {
      calendarEventService.findOne.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .get(`${BASE}/calendar-events/1`)
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(500);
    });
  });

  // ── POST /calendar-events ─────────────────────────────────────────────────
  describe('POST /calendar-events', () => {
    it('201 — crée un évènement manuel', async () => {
      calendarEventService.create.mockResolvedValue(mockEvent);

      const res = await request(app)
        .post(`${BASE}/calendar-events`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send(validManualBody);

      expect(res.status).toBe(201);
      expect(calendarEventService.create).toHaveBeenCalledTimes(1);
    });

    it('201 — crée un évènement automatique', async () => {
      calendarEventService.create.mockResolvedValue({ ...mockEvent, recurrenceMode: 'auto' });

      const res = await request(app)
        .post(`${BASE}/calendar-events`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send(validAutoBody);

      expect(res.status).toBe(201);
    });

    it('403 — droits insuffisants (non admin)', async () => {
      calendarEventService.create.mockResolvedValue(false);

      const res = await request(app)
        .post(`${BASE}/calendar-events`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send(validManualBody);

      expect(res.status).toBe(403);
    });

    it('400 — name manquant', async () => {
      const res = await request(app)
        .post(`${BASE}/calendar-events`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ ...validManualBody, name: undefined });

      expect(res.status).toBe(400);
    });

    it('400 — classGroupId manquant', async () => {
      const res = await request(app)
        .post(`${BASE}/calendar-events`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'Cours', type: 'cours', recurrenceMode: 'manual', occurrences: [] });

      expect(res.status).toBe(400);
    });

    it('401 — pas de token', async () => {
      const res = await request(app).post(`${BASE}/calendar-events`).send(validManualBody);
      expect(res.status).toBe(401);
    });

    it('500 — le service échoue', async () => {
      calendarEventService.create.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .post(`${BASE}/calendar-events`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send(validManualBody);

      expect(res.status).toBe(500);
    });
  });

  // ── PUT /calendar-events/:id ──────────────────────────────────────────────
  describe('PUT /calendar-events/:id', () => {
    it('200 — met à jour nom/description/type', async () => {
      calendarEventService.update.mockResolvedValue({ ...mockEvent, name: 'Cours mis à jour' });

      const res = await request(app)
        .put(`${BASE}/calendar-events/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'Cours mis à jour' });

      expect(res.status).toBe(200);
    });

    it('403 — droits insuffisants', async () => {
      calendarEventService.update.mockResolvedValue(false);

      const res = await request(app)
        .put(`${BASE}/calendar-events/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'Cours mis à jour' });

      expect(res.status).toBe(403);
    });

    it('404 — évènement introuvable', async () => {
      calendarEventService.update.mockResolvedValue(null);

      const res = await request(app)
        .put(`${BASE}/calendar-events/99`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'Cours mis à jour' });

      expect(res.status).toBe(404);
    });

    it('500 — le service échoue', async () => {
      calendarEventService.update.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .put(`${BASE}/calendar-events/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'Cours mis à jour' });

      expect(res.status).toBe(500);
    });
  });

  // ── DELETE /calendar-events/:id ───────────────────────────────────────────
  describe('DELETE /calendar-events/:id', () => {
    it('200 — supprime l\'évènement', async () => {
      calendarEventService.delete.mockResolvedValue(true);

      const res = await request(app)
        .delete(`${BASE}/calendar-events/1`)
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(200);
    });

    it('403 — droits insuffisants', async () => {
      calendarEventService.delete.mockResolvedValue(false);

      const res = await request(app)
        .delete(`${BASE}/calendar-events/1`)
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(403);
    });

    it('404 — évènement introuvable', async () => {
      calendarEventService.delete.mockResolvedValue(null);

      const res = await request(app)
        .delete(`${BASE}/calendar-events/99`)
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(404);
    });

    it('401 — pas de token', async () => {
      const res = await request(app).delete(`${BASE}/calendar-events/1`);
      expect(res.status).toBe(401);
    });

    it('500 — le service échoue', async () => {
      calendarEventService.delete.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .delete(`${BASE}/calendar-events/1`)
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(500);
    });
  });

  // ── POST /calendar-events/:id/occurrences ─────────────────────────────────
  describe('POST /calendar-events/:id/occurrences', () => {
    const validOcc = { date: '2026-10-01', startTime: '08:00', endTime: '10:00' };

    it('201 — ajoute une occurrence', async () => {
      calendarEventService.addOccurrence.mockResolvedValue(mockOccurrence);

      const res = await request(app)
        .post(`${BASE}/calendar-events/1/occurrences`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send(validOcc);

      expect(res.status).toBe(201);
    });

    it('403 — droits insuffisants', async () => {
      calendarEventService.addOccurrence.mockResolvedValue(false);

      const res = await request(app)
        .post(`${BASE}/calendar-events/1/occurrences`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send(validOcc);

      expect(res.status).toBe(403);
    });

    it('404 — évènement introuvable', async () => {
      calendarEventService.addOccurrence.mockResolvedValue(null);

      const res = await request(app)
        .post(`${BASE}/calendar-events/1/occurrences`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send(validOcc);

      expect(res.status).toBe(404);
    });

    it('400 — date manquante', async () => {
      const res = await request(app)
        .post(`${BASE}/calendar-events/1/occurrences`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ startTime: '08:00', endTime: '10:00' });

      expect(res.status).toBe(400);
    });

    it('500 — le service échoue', async () => {
      calendarEventService.addOccurrence.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .post(`${BASE}/calendar-events/1/occurrences`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send(validOcc);

      expect(res.status).toBe(500);
    });
  });

  // ── DELETE /calendar-events/occurrences/:occurrenceId ────────────────────
  describe('DELETE /calendar-events/occurrences/:occurrenceId', () => {
    it('200 — supprime l\'occurrence', async () => {
      calendarEventService.deleteOccurrence.mockResolvedValue(true);

      const res = await request(app)
        .delete(`${BASE}/calendar-events/occurrences/10`)
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(200);
    });

    it('403 — droits insuffisants', async () => {
      calendarEventService.deleteOccurrence.mockResolvedValue(false);

      const res = await request(app)
        .delete(`${BASE}/calendar-events/occurrences/10`)
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(403);
    });

    it('404 — occurrence introuvable', async () => {
      calendarEventService.deleteOccurrence.mockResolvedValue(null);

      const res = await request(app)
        .delete(`${BASE}/calendar-events/occurrences/99`)
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(404);
    });

    it('409 — échéances rattachées à l\'occurrence (contrainte RESTRICT)', async () => {
      const fkError = new Error('FK constraint');
      fkError.name = 'SequelizeForeignKeyConstraintError';
      calendarEventService.deleteOccurrence.mockRejectedValue(fkError);

      const res = await request(app)
        .delete(`${BASE}/calendar-events/occurrences/10`)
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(409);
    });

    it('401 — pas de token', async () => {
      const res = await request(app).delete(`${BASE}/calendar-events/occurrences/10`);
      expect(res.status).toBe(401);
    });

    it('500 — le service échoue', async () => {
      calendarEventService.deleteOccurrence.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .delete(`${BASE}/calendar-events/occurrences/10`)
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(500);
    });
  });
});
