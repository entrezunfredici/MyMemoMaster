const { Unit } = require("../../models");
const UnitService = require("../../services/unit.service");

jest.mock("../../models", () => ({
  Unit: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
}));

describe("UnitService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should retrieve all units", async () => {
    const mockUnits = [
      { id: 1, name: "Meter", denomination: "m", physicalQuantityId: 1 },
      { id: 2, name: "Kilogram", denomination: "kg", physicalQuantityId: 2 },
    ];
    Unit.findAll.mockResolvedValue(mockUnits);

    const units = await UnitService.getAllUnits();

    expect(Unit.findAll).toHaveBeenCalledTimes(1);
    expect(units).toEqual(mockUnits);
  });

  test("should retrieve a unit by ID", async () => {
    const mockUnit = {
      id: 1,
      name: "Meter",
      denomination: "m",
      physicalQuantityId: 1,
    };
    Unit.findByPk.mockResolvedValue(mockUnit);

    const unit = await UnitService.getUnitById(1);

    expect(Unit.findByPk).toHaveBeenCalledWith(1);
    expect(unit).toEqual(mockUnit);
  });

  test("should return null when unit not found by ID", async () => {
    Unit.findByPk.mockResolvedValue(null);

    const unit = await UnitService.getUnitById(999);

    expect(Unit.findByPk).toHaveBeenCalledWith(999);
    expect(unit).toBeNull();
  });

  test("should create a new unit", async () => {
    const newUnit = {
      name: "Second",
      denomination: "s",
      physicalQuantityId: 3,
    };
    const mockCreatedUnit = { id: 3, ...newUnit };

    Unit.create.mockResolvedValue(mockCreatedUnit);

    const unit = await UnitService.addUnit(newUnit);

    expect(Unit.create).toHaveBeenCalledWith(newUnit);
    expect(unit).toEqual(mockCreatedUnit);
  });

  test("should update an existing unit", async () => {
    const mockUnit = {
      id: 1,
      name: "Meter",
      denomination: "m",
      physicalQuantityId: 1,
      update: jest.fn().mockImplementation((newData) => {
        Object.assign(mockUnit, newData);
        return mockUnit;
      }),
    };

    const updatedData = { name: "Kilometer", denomination: "km" };

    Unit.findByPk.mockResolvedValue(mockUnit);

    const updatedUnit = await UnitService.updateUnit(1, updatedData);

    expect(Unit.findByPk).toHaveBeenCalledWith(1);
    expect(mockUnit.update).toHaveBeenCalledWith(updatedData);
    expect(updatedUnit).toMatchObject({
      id: 1,
      name: "Kilometer",
      denomination: "km",
      physicalQuantityId: 1,
    });
  });

  test("should return null when updating a non-existing unit", async () => {
    Unit.findByPk.mockResolvedValue(null);

    const updatedUnit = await UnitService.updateUnit(999, {
      name: "Non-existent",
    });

    expect(Unit.findByPk).toHaveBeenCalledWith(999);
    expect(updatedUnit).toBeNull();
  });

  test("should delete a unit by ID", async () => {
    const mockUnit = { id: 1, destroy: jest.fn().mockResolvedValue(true) };

    Unit.findByPk.mockResolvedValue(mockUnit);

    const result = await UnitService.deleteUnit(1);

    expect(Unit.findByPk).toHaveBeenCalledWith(1);
    expect(mockUnit.destroy).toHaveBeenCalledTimes(1);
    expect(result).toBe(true);
  });

  test("should return false when deleting a non-existing unit", async () => {
    Unit.findByPk.mockResolvedValue(null);

    const result = await UnitService.deleteUnit(999);

    expect(Unit.findByPk).toHaveBeenCalledWith(999);
    expect(result).toBe(false);
  });
});
