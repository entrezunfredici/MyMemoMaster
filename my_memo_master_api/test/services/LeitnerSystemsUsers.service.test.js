const { LeitnerSystemsUsers } = require("../../models");
const LeitnerSystemsUsersService = require("../../services/LeitnerSystemsUsers.service");

jest.mock("../../models", () => ({
  LeitnerSystemsUsers: {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
}));

describe("LeitnerSystemsUsers Service", () => {
  const mockData = {
    idUser: 1,
    idSystem: 1,
    writeRight: true,
    shareRight: false,
    shareWithWriteRightRight: false,
    shareWithAllRights: true,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Test CREATE
  it("should create a new LeitnerSystemsUsers entry", async () => {
    LeitnerSystemsUsers.create.mockResolvedValue(mockData);

    const result = await LeitnerSystemsUsersService.create(mockData);

    expect(LeitnerSystemsUsers.create).toHaveBeenCalledWith(mockData);
    expect(result).toEqual(mockData);
  });

  // Test FIND ALL
  it("should retrieve all LeitnerSystemsUsers entries", async () => {
    const mockEntries = [mockData, { ...mockData, idSystem: 2 }];
    LeitnerSystemsUsers.findAll.mockResolvedValue(mockEntries);

    const result = await LeitnerSystemsUsersService.findAll();

    expect(LeitnerSystemsUsers.findAll).toHaveBeenCalled();
    expect(result).toEqual(mockEntries);
  });

  // Test FIND ONE
  it("should retrieve a specific LeitnerSystemsUsers entry", async () => {
    LeitnerSystemsUsers.findOne.mockResolvedValue(mockData);

    const result = await LeitnerSystemsUsersService.findOne(1, 1);

    expect(LeitnerSystemsUsers.findOne).toHaveBeenCalledWith({
      where: { idUser: 1, idSystem: 1 },
    });
    expect(result).toEqual(mockData);
  });

  // Test UPDATE
  it("should update a LeitnerSystemsUsers entry", async () => {
    LeitnerSystemsUsers.update.mockResolvedValue([1]);

    const updatedData = { writeRight: false };
    const result = await LeitnerSystemsUsersService.update(1, 1, updatedData);

    expect(LeitnerSystemsUsers.update).toHaveBeenCalledWith(updatedData, {
      where: { idUser: 1, idSystem: 1 },
    });
    expect(result).toEqual([1]);
  });

  // Test DELETE
  it("should delete a LeitnerSystemsUsers entry", async () => {
    LeitnerSystemsUsers.destroy.mockResolvedValue(1);

    const result = await LeitnerSystemsUsersService.delete(1, 1);

    expect(LeitnerSystemsUsers.destroy).toHaveBeenCalledWith({
      where: { idUser: 1, idSystem: 1 },
    });
    expect(result).toBe(1);
  });
});
