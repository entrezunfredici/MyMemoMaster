// tests/StudentKpi.service.test.js
const { StudentKpi } = require("../../models/index");
const StudentKpiService = require("../../services/StudentKpi.service");

jest.mock("../../models/index", () => ({
  StudentKpi: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
  LeitnerCard: {},
  LeitnerBox: {},
}));

describe("StudentKpiService", () => {
  beforeEach(() => jest.clearAllMocks());

  const makeRecord = (level, date = "2025-01-15") => ({
    createdAt: new Date(date),
    leitnerCard: { leitnerBox: { level } },
  });

  describe("compute", () => {
    test("calcule masteryAvg et distribution correctement", async () => {
      const mockRecords = [
        makeRecord(1, "2025-01-10"),
        makeRecord(3, "2025-01-10"),
        makeRecord(5, "2025-01-11"),
      ];
      StudentKpi.findAll.mockResolvedValue(mockRecords);

      const result = await StudentKpiService.compute(1, {});

      expect(result.sessionsCount).toBe(3);
      expect(result.masteryDistribution[1]).toBe(1);
      expect(result.masteryDistribution[3]).toBe(1);
      expect(result.masteryDistribution[5]).toBe(1);
      // scores: 0 + 50 + 100 = 150 / 3 = 50
      expect(result.masteryAvg).toBe(50);
      expect(result.timeseries).toHaveLength(2);
    });

    test("retourne des zéros si aucun enregistrement", async () => {
      StudentKpi.findAll.mockResolvedValue([]);

      const result = await StudentKpiService.compute(1, {});

      expect(result.sessionsCount).toBe(0);
      expect(result.masteryAvg).toBe(0);
      expect(result.timeseries).toHaveLength(0);
    });

    test("filtre par subjectId", async () => {
      StudentKpi.findAll.mockResolvedValue([makeRecord(2)]);

      await StudentKpiService.compute(1, { subjectId: 3 });

      const whereArg = StudentKpi.findAll.mock.calls[0][0].where;
      expect(whereArg.subjectId).toBe(3);
    });

    test("userId client ignoré — forcé depuis le service", async () => {
      StudentKpi.findAll.mockResolvedValue([]);

      await StudentKpiService.compute(42, { userId: 999 });

      const whereArg = StudentKpi.findAll.mock.calls[0][0].where;
      expect(whereArg.userId).toBe(42);
    });
  });

  describe("create", () => {
    test("force userId depuis le paramètre, ignore body.userId", async () => {
      const mockRecord = { studentKpiId: 1, leitnerCardId: 5, userId: 42 };
      StudentKpi.create.mockResolvedValue(mockRecord);

      const result = await StudentKpiService.create(42, {
        leitnerCardId: 5,
        userId: 999, // doit être ignoré
      });

      expect(StudentKpi.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 42 })
      );
      expect(result).toEqual(mockRecord);
    });
  });

  describe("findOne", () => {
    test("inclut userId dans le where (owner-only)", async () => {
      const mockRecord = { studentKpiId: 1, userId: 42 };
      StudentKpi.findOne.mockResolvedValue(mockRecord);

      await StudentKpiService.findOne(1, 42);

      expect(StudentKpi.findOne).toHaveBeenCalledWith({
        where: { studentKpiId: "1", userId: 42 },
      });
    });
  });

  describe("getAlerts", () => {
    test("INACTIVE si aucun enregistrement", async () => {
      StudentKpi.findOne.mockResolvedValue(null);
      StudentKpi.findAll.mockResolvedValue([]);

      const alerts = await StudentKpiService.getAlerts(1);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe("INACTIVE");
      expect(alerts[0].severity).toBe("warning");
    });

    test("INACTIVE si dernière session il y a plus de 3 jours", async () => {
      const old = new Date();
      old.setDate(old.getDate() - 5);
      StudentKpi.findOne.mockResolvedValue({ createdAt: old });
      StudentKpi.findAll.mockResolvedValue([]);

      const alerts = await StudentKpiService.getAlerts(1);

      expect(alerts.some((a) => a.type === "INACTIVE")).toBe(true);
    });

    test("aucune alerte INACTIVE si session récente", async () => {
      const recent = new Date();
      StudentKpi.findOne.mockResolvedValue({ createdAt: recent });
      StudentKpi.findAll.mockResolvedValue([]);

      const alerts = await StudentKpiService.getAlerts(1);

      expect(alerts.some((a) => a.type === "INACTIVE")).toBe(false);
    });

    test("LOW_MASTERY si masteryAvg < 25", async () => {
      const recent = new Date();
      StudentKpi.findOne.mockResolvedValue({ createdAt: recent });
      // Toutes les cartes en boîte 1 → score 0
      StudentKpi.findAll.mockResolvedValue([
        makeRecord(1),
        makeRecord(1),
      ]);

      const alerts = await StudentKpiService.getAlerts(1);

      expect(alerts.some((a) => a.type === "LOW_MASTERY")).toBe(true);
      expect(alerts.find((a) => a.type === "LOW_MASTERY").severity).toBe("danger");
    });

    test("aucune alerte si révisions récentes et bonne maîtrise", async () => {
      const recent = new Date();
      StudentKpi.findOne.mockResolvedValue({ createdAt: recent });
      // Cartes en boîte 5 → score 100
      StudentKpi.findAll.mockResolvedValue([
        makeRecord(5),
        makeRecord(4),
      ]);

      const alerts = await StudentKpiService.getAlerts(1);

      expect(alerts).toHaveLength(0);
    });

    test("filtre par subjectId si fourni", async () => {
      const recent = new Date();
      StudentKpi.findOne.mockResolvedValue({ createdAt: recent });
      StudentKpi.findAll.mockResolvedValue([]);

      await StudentKpiService.getAlerts(1, "3");

      const findOneWhere = StudentKpi.findOne.mock.calls[0][0].where;
      expect(findOneWhere.subjectId).toBe(3);
    });
  });
});