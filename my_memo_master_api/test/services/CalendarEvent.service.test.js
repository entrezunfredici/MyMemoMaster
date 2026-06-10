const mockEventInstance = {
  id: 1,
  update: jest.fn(),
  destroy: jest.fn(),
};
const mockOccurrenceInstance = {
  id: 10,
  destroy: jest.fn(),
};

jest.mock('../../models/index', () => ({
  instance: { sync: jest.fn() },
  User: { findByPk: jest.fn() },
  CalendarEvent: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
  },
  EventOccurrence: {
    findByPk: jest.fn(),
    bulkCreate: jest.fn(),
    create: jest.fn(),
  },
  ClassGroupUsers: { findAll: jest.fn() },
}));

jest.mock('../../helpers/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));

const models = require('../../models/index');
const service = require('../../services/CalendarEvent.service');

describe('CalendarEvent Service', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── _generateOccurrences ──────────────────────────────────────────────────
  describe('_generateOccurrences', () => {
    it('monthly — génère une occurrence par mois', () => {
      const rule = {
        frequency: 'monthly',
        startDate: '2026-09-01',
        endDate: '2026-11-01',
        startTime: '08:00',
        endTime: '10:00',
      };

      const result = service._generateOccurrences(rule);

      expect(result).toHaveLength(3);
      expect(result[0].date).toBe('2026-09-01');
      expect(result[1].date).toBe('2026-10-01');
      expect(result[2].date).toBe('2026-11-01');
      expect(result[0].startTime).toBe('08:00');
    });

    it('weekly (monday) — génère tous les lundis entre deux dates', () => {
      const rule = {
        frequency: 'weekly',
        days: ['monday'],
        startDate: '2026-09-07', // lundi
        endDate: '2026-09-28',   // lundi
        startTime: '09:00',
        endTime: '11:00',
      };

      const result = service._generateOccurrences(rule);

      expect(result).toHaveLength(4);
      result.forEach((occ) => {
        const dayOfWeek = new Date(occ.date).getDay();
        expect(dayOfWeek).toBe(1); // monday
      });
    });

    it('biweekly — génère toutes les deux semaines uniquement', () => {
      const rule = {
        frequency: 'biweekly',
        days: ['wednesday'],
        startDate: '2026-09-02', // mercredi (semaine 0)
        endDate: '2026-09-30',
        startTime: '14:00',
        endTime: '16:00',
      };

      const result = service._generateOccurrences(rule);

      // Semaines 0, 2, 4... depuis startDate — 3 mercredis sur 4 semaines
      expect(result.length).toBeGreaterThan(0);
      // Vérifie que les intervalles entre occurrences sont bien de 2 semaines
      if (result.length >= 2) {
        const dayjs = require('dayjs');
        const diff = dayjs(result[1].date).diff(dayjs(result[0].date), 'day');
        expect(diff).toBe(14);
      }
    });

    it('weekly multi-jours — génère les occurrences pour plusieurs jours', () => {
      const rule = {
        frequency: 'weekly',
        days: ['monday', 'wednesday', 'friday'],
        startDate: '2026-09-07', // lundi
        endDate: '2026-09-13',   // dimanche
        startTime: '08:00',
        endTime: '09:00',
      };

      const result = service._generateOccurrences(rule);

      expect(result).toHaveLength(3); // lundi 7, mercredi 9, vendredi 11
    });

    it('retourne un tableau vide si startDate > endDate', () => {
      const rule = {
        frequency: 'weekly',
        days: ['monday'],
        startDate: '2026-12-01',
        endDate: '2026-09-01',
        startTime: '08:00',
        endTime: '10:00',
      };

      const result = service._generateOccurrences(rule);

      expect(result).toEqual([]);
    });
  });

  // ── _isAdmin ──────────────────────────────────────────────────────────────
  describe('_isAdmin', () => {
    it('retourne true si l\'utilisateur a roleId = 1', async () => {
      models.User.findByPk.mockResolvedValue({ roleId: 1 });

      const result = await service._isAdmin(1);

      expect(result).toBe(true);
    });

    it('retourne false si l\'utilisateur n\'est pas admin', async () => {
      models.User.findByPk.mockResolvedValue({ roleId: 2 });

      const result = await service._isAdmin(2);

      expect(result).toBe(false);
    });

    it('retourne false si l\'utilisateur est introuvable', async () => {
      models.User.findByPk.mockResolvedValue(null);

      const result = await service._isAdmin(99);

      expect(result).toBe(false);
    });
  });

  // ── findAll ───────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('admin — retourne tous les événements', async () => {
      models.User.findByPk.mockResolvedValue({ roleId: 1 });
      models.CalendarEvent.findAll.mockResolvedValue([mockEventInstance]);

      const result = await service.findAll(1);

      expect(models.CalendarEvent.findAll).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
    });

    it('non-admin avec groupes — retourne les événements de ses groupes', async () => {
      models.User.findByPk.mockResolvedValue({ roleId: 2 });
      models.ClassGroupUsers.findAll.mockResolvedValue([{ classGroupId: 5 }]);
      models.CalendarEvent.findAll.mockResolvedValue([mockEventInstance]);

      const result = await service.findAll(2);

      expect(models.ClassGroupUsers.findAll).toHaveBeenCalledWith({ where: { userId: 2 } });
      expect(result).toHaveLength(1);
    });

    it('non-admin sans groupes — retourne une liste vide sans appeler CalendarEvent.findAll', async () => {
      models.User.findByPk.mockResolvedValue({ roleId: 2 });
      models.ClassGroupUsers.findAll.mockResolvedValue([]);

      const result = await service.findAll(2);

      expect(models.CalendarEvent.findAll).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  // ── create ────────────────────────────────────────────────────────────────
  describe('create', () => {
    it('retourne false si non admin', async () => {
      models.User.findByPk.mockResolvedValue({ roleId: 2 });

      const result = await service.create(2, { name: 'Cours' });

      expect(result).toBe(false);
      expect(models.CalendarEvent.create).not.toHaveBeenCalled();
    });

    it('crée l\'événement avec des occurrences manuelles', async () => {
      models.User.findByPk.mockResolvedValue({ roleId: 1 });
      models.CalendarEvent.create.mockResolvedValue({ id: 1 });
      models.EventOccurrence.bulkCreate.mockResolvedValue([]);
      models.CalendarEvent.findByPk.mockResolvedValue({ id: 1, occurrences: [] });

      const data = {
        name: 'Cours',
        classGroupId: 1,
        recurrenceMode: 'manual',
        occurrences: [{ date: '2026-09-01', startTime: '08:00', endTime: '10:00' }],
      };

      await service.create(1, data);

      expect(models.CalendarEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Cours', createdBy: 1 })
      );
      expect(models.EventOccurrence.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ date: '2026-09-01', eventId: 1 }),
        ])
      );
    });

    it('crée l\'événement avec des occurrences auto (weekly)', async () => {
      models.User.findByPk.mockResolvedValue({ roleId: 1 });
      models.CalendarEvent.create.mockResolvedValue({ id: 2 });
      models.EventOccurrence.bulkCreate.mockResolvedValue([]);
      models.CalendarEvent.findByPk.mockResolvedValue({ id: 2, occurrences: [] });

      const data = {
        name: 'TD hebdo',
        classGroupId: 1,
        recurrenceMode: 'auto',
        recurrenceRule: {
          frequency: 'weekly',
          days: ['tuesday'],
          startDate: '2026-09-01',
          endDate: '2026-09-15',
          startTime: '10:00',
          endTime: '12:00',
        },
      };

      await service.create(1, data);

      expect(models.EventOccurrence.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ eventId: 2, startTime: '10:00' }),
        ])
      );
      // 2026-09-01 à 2026-09-15 : mardis sont le 1 et le 8 et le 15
      const bulkArg = models.EventOccurrence.bulkCreate.mock.calls[0][0];
      expect(bulkArg.length).toBe(3);
    });
  });

  // ── update ────────────────────────────────────────────────────────────────
  describe('update', () => {
    it('retourne false si non admin', async () => {
      models.User.findByPk.mockResolvedValue({ roleId: 2 });

      const result = await service.update(1, 2, { name: 'Nouveau nom' });

      expect(result).toBe(false);
    });

    it('retourne null si l\'événement est introuvable', async () => {
      models.User.findByPk.mockResolvedValue({ roleId: 1 });
      models.CalendarEvent.findByPk.mockResolvedValue(null);

      const result = await service.update(99, 1, { name: 'Nouveau nom' });

      expect(result).toBeNull();
    });

    it('met à jour seulement name/description/type', async () => {
      models.User.findByPk.mockResolvedValue({ roleId: 1 });
      const updated = { id: 1, occurrences: [] };
      mockEventInstance.update.mockResolvedValue(updated);
      models.CalendarEvent.findByPk
        .mockResolvedValueOnce(mockEventInstance) // premier appel dans update()
        .mockResolvedValueOnce({ id: 1, occurrences: [] }); // appel dans findOne()

      const result = await service.update(1, 1, { name: 'Modifié', type: 'examen' });

      expect(mockEventInstance.update).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Modifié', type: 'examen' })
      );
      expect(result).toBeTruthy();
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────
  describe('delete', () => {
    it('retourne false si non admin', async () => {
      models.User.findByPk.mockResolvedValue({ roleId: 2 });

      const result = await service.delete(1, 2);

      expect(result).toBe(false);
    });

    it('retourne null si l\'événement est introuvable', async () => {
      models.User.findByPk.mockResolvedValue({ roleId: 1 });
      models.CalendarEvent.findByPk.mockResolvedValue(null);

      const result = await service.delete(99, 1);

      expect(result).toBeNull();
    });

    it('supprime l\'événement', async () => {
      models.User.findByPk.mockResolvedValue({ roleId: 1 });
      mockEventInstance.destroy.mockResolvedValue();
      models.CalendarEvent.findByPk.mockResolvedValue(mockEventInstance);

      const result = await service.delete(1, 1);

      expect(mockEventInstance.destroy).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
    });
  });

  // ── addOccurrence ─────────────────────────────────────────────────────────
  describe('addOccurrence', () => {
    it('retourne false si non admin', async () => {
      models.User.findByPk.mockResolvedValue({ roleId: 2 });

      const result = await service.addOccurrence(1, 2, {});

      expect(result).toBe(false);
    });

    it('retourne null si l\'événement est introuvable', async () => {
      models.User.findByPk.mockResolvedValue({ roleId: 1 });
      models.CalendarEvent.findByPk.mockResolvedValue(null);

      const result = await service.addOccurrence(99, 1, {});

      expect(result).toBeNull();
    });

    it('crée l\'occurrence et la retourne', async () => {
      models.User.findByPk.mockResolvedValue({ roleId: 1 });
      models.CalendarEvent.findByPk.mockResolvedValue(mockEventInstance);
      models.EventOccurrence.create.mockResolvedValue(mockOccurrenceInstance);

      const result = await service.addOccurrence(1, 1, { date: '2026-10-01', startTime: '08:00', endTime: '10:00' });

      expect(models.EventOccurrence.create).toHaveBeenCalledWith(
        expect.objectContaining({ eventId: 1, date: '2026-10-01' })
      );
      expect(result).toEqual(mockOccurrenceInstance);
    });
  });

  // ── deleteOccurrence ──────────────────────────────────────────────────────
  describe('deleteOccurrence', () => {
    it('retourne false si non admin', async () => {
      models.User.findByPk.mockResolvedValue({ roleId: 2 });

      const result = await service.deleteOccurrence(10, 2);

      expect(result).toBe(false);
    });

    it('retourne null si l\'occurrence est introuvable', async () => {
      models.User.findByPk.mockResolvedValue({ roleId: 1 });
      models.EventOccurrence.findByPk.mockResolvedValue(null);

      const result = await service.deleteOccurrence(99, 1);

      expect(result).toBeNull();
    });

    it('supprime l\'occurrence', async () => {
      models.User.findByPk.mockResolvedValue({ roleId: 1 });
      mockOccurrenceInstance.destroy.mockResolvedValue();
      models.EventOccurrence.findByPk.mockResolvedValue(mockOccurrenceInstance);

      const result = await service.deleteOccurrence(10, 1);

      expect(mockOccurrenceInstance.destroy).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
    });
  });
});
