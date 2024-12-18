const { LeitnerSystem } = require("../../models/index");
const LeitnerSystemService = require("../../services/LeitnerSystem.service");

jest.mock("../../models/index", () => ({
  LeitnerSystem: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
}));

describe("LeitnerSystemService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should retrieve all Leitner systems", async () => {
    const mockLeitnerSystems = [
      { idSystem: 1, name: "Système Leitner Mathématiques", idUser: 1 },
      { idSystem: 2, name: "Système Leitner Physique", idUser: 2 },
    ];
    LeitnerSystem.findAll.mockResolvedValue(mockLeitnerSystems);

    const systems = await LeitnerSystemService.findAll();

    expect(LeitnerSystem.findAll).toHaveBeenCalledTimes(1);
    expect(systems).toEqual(mockLeitnerSystems);
  });

  test("should retrieve a Leitner system by ID", async () => {
    const mockLeitnerSystem = {
      idSystem: 1,
      name: "Système Leitner Mathématiques",
    };
    LeitnerSystem.findByPk.mockResolvedValue(mockLeitnerSystem);

    const system = await LeitnerSystemService.findOne(1);

    expect(LeitnerSystem.findByPk).toHaveBeenCalledWith(1);
    expect(system).toEqual(mockLeitnerSystem);
  });

  test("should retrieve Leitner systems by subject ID", async () => {
    const mockLeitnerSystems = [
      { idSystem: 1, name: "Système Leitner Mathématiques", idMindMap: 10 },
    ];
    LeitnerSystem.findAll.mockResolvedValue(mockLeitnerSystems);

    const systems = await LeitnerSystemService.findBySubject(10);

    expect(LeitnerSystem.findAll).toHaveBeenCalledWith({
      where: { idMindMap: 10 },
    });
    expect(systems).toEqual(mockLeitnerSystems);
  });

  test("should create a new Leitner system", async () => {
    const mockLeitnerSystem = {
      idSystem: 3,
      name: "Système Leitner Chimie",
      idUser: 3,
      idMindMap: null,
    };
    LeitnerSystem.create.mockResolvedValue(mockLeitnerSystem);

    const system = await LeitnerSystemService.create({
      name: "Système Leitner Chimie",
      idUser: 3,
      idMindMap: null,
    });

    expect(LeitnerSystem.create).toHaveBeenCalledWith({
      name: "Système Leitner Chimie",
      idUser: 3,
      idMindMap: null,
    });
    expect(system).toEqual(mockLeitnerSystem);
  });

  test("should update a Leitner system if the user has the right", async () => {
    const mockLeitnerSystem = { idSystem: 1, idUser: 2, update: jest.fn() };
    LeitnerSystem.findByPk.mockResolvedValue(mockLeitnerSystem);

    const result = await LeitnerSystemService.update({
      idSystem: 1,
      idUser: 2,
      name: "Système mis à jour",
    });

    expect(LeitnerSystem.findByPk).toHaveBeenCalledWith(1);
    expect(mockLeitnerSystem.update).toHaveBeenCalledWith({
      name: "Système mis à jour",
    });
    expect(result).toBe(true);
  });

  test("should not update a Leitner system if the user has no rights", async () => {
    const mockLeitnerSystem = { idSystem: 1, idUser: 3, update: jest.fn() };
    LeitnerSystem.findByPk.mockResolvedValue(mockLeitnerSystem);

    const result = await LeitnerSystemService.update({
      idSystem: 1,
      idUser: 2,
      name: "Système mis à jour",
    });

    expect(LeitnerSystem.findByPk).toHaveBeenCalledWith(1);
    expect(mockLeitnerSystem.update).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  test("should delete a Leitner system if the user has rights", async () => {
    const mockLeitnerSystem = { idSystem: 1, idUser: 2, destroy: jest.fn() };
    LeitnerSystem.findByPk.mockResolvedValue(mockLeitnerSystem);

    const result = await LeitnerSystemService.delete(1, 2);

    expect(LeitnerSystem.findByPk).toHaveBeenCalledWith(1);
    expect(mockLeitnerSystem.destroy).toHaveBeenCalledTimes(1);
    expect(result).toBe(true);
  });

  test("should not delete a Leitner system if the user has no rights", async () => {
    const mockLeitnerSystem = { idSystem: 1, idUser: 3, destroy: jest.fn() };
    LeitnerSystem.findByPk.mockResolvedValue(mockLeitnerSystem);

    const result = await LeitnerSystemService.delete(1, 2);

    expect(LeitnerSystem.findByPk).toHaveBeenCalledWith(1);
    expect(mockLeitnerSystem.destroy).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });
});
