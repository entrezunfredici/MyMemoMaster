const { LeitnerBox } = require("../../models/index");
const LeitnerBoxService = require("../../services/LeitnerBox.service");

jest.mock("../../models/index", () => ({
  LeitnerBox: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
}));

describe("LeitnerBoxService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should retrieve all Leitner boxes", async () => {
    const mockBoxes = [
      { idBox: 1, level: 1, intervall: 5, color: 12345 },
      { idBox: 2, level: 2, intervall: 10, color: 67890 },
    ];
    LeitnerBox.findAll.mockResolvedValue(mockBoxes);

    const boxes = await LeitnerBoxService.findAll();

    expect(LeitnerBox.findAll).toHaveBeenCalledTimes(1);
    expect(boxes).toEqual(mockBoxes);
  });

  test("should retrieve a Leitner box by ID", async () => {
    const mockBox = { idBox: 1, level: 1, intervall: 5, color: 12345 };
    LeitnerBox.findByPk.mockResolvedValue(mockBox);

    const box = await LeitnerBoxService.findOne(1);

    expect(LeitnerBox.findByPk).toHaveBeenCalledWith(1);
    expect(box).toEqual(mockBox);
  });

  test("should create a new Leitner box", async () => {
    const newBox = { level: 1, intervall: 5, color: 12345 };
    const mockBox = { idBox: 1, ...newBox };
    LeitnerBox.create.mockResolvedValue(mockBox);

    const box = await LeitnerBoxService.create(newBox);

    expect(LeitnerBox.create).toHaveBeenCalledWith(newBox);
    expect(box).toEqual(mockBox);
  });

  test("should update an existing Leitner box", async () => {
    const mockBox = {
      idBox: 1,
      level: 1,
      intervall: 5,
      color: 12345,
      update: jest.fn().mockImplementation(function (newData) {
        Object.assign(this, newData);
        return this;
      }),
    };

    const updatedData = { level: 2, intervall: 10, color: 67890 };

    LeitnerBox.findByPk.mockResolvedValue(mockBox);

    const updatedBox = await LeitnerBoxService.update(1, updatedData);

    expect(LeitnerBox.findByPk).toHaveBeenCalledWith(1);

    expect(mockBox.update).toHaveBeenCalledWith(updatedData);

    expect(updatedBox).toMatchObject({
      idBox: 1,
      level: 2,
      intervall: 10,
      color: 67890,
    });
  });

  test("should return null when updating a non-existing Leitner box", async () => {
    LeitnerBox.findByPk.mockResolvedValue(null);

    const updatedBox = await LeitnerBoxService.update(999, { level: 3 });

    expect(LeitnerBox.findByPk).toHaveBeenCalledWith(999);
    expect(updatedBox).toBeNull();
  });

  test("should delete a Leitner box by ID", async () => {
    LeitnerBox.findByPk.mockResolvedValue({
      destroy: jest.fn().mockResolvedValue(true),
    });

    const result = await LeitnerBoxService.delete(1);

    expect(LeitnerBox.findByPk).toHaveBeenCalledWith(1);
    expect(result).toBe(true);
  });

  test("should return false when deleting a non-existing Leitner box", async () => {
    LeitnerBox.findByPk.mockResolvedValue(null);

    const result = await LeitnerBoxService.delete(999);

    expect(LeitnerBox.findByPk).toHaveBeenCalledWith(999);
    expect(result).toBe(false);
  });
});
