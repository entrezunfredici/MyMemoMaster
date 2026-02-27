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
});