const { Fields } = require("../../models/index");
const FieldsService = require("../../services/fields.service");

jest.mock("../../models/index", () => ({
  Fields: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
}));

describe("FieldsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should retrieve all fields", async () => {
    const mockFields = [
      { id: 1, name: "Field 1", type: "text" },
      { id: 2, name: "Field 2", type: "number" },
    ];
    Fields.findAll.mockResolvedValue(mockFields);

    const fields = await FieldsService.findAll();

    expect(Fields.findAll).toHaveBeenCalledTimes(1);
    expect(fields).toEqual(mockFields);
  });

  test("should retrieve a field by ID", async () => {
    const mockField = { id: 1, name: "Field 1", type: "text" };
    Fields.findOne.mockResolvedValue(mockField);

    const field = await FieldsService.findOne(1);

    expect(Fields.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(field).toEqual(mockField);
  });

  test("should create a new field", async () => {
    const newField = { name: "New Field", type: "boolean" };
    const mockField = { id: 3, ...newField };
    Fields.create.mockResolvedValue(mockField);

    const field = await FieldsService.create(newField);

    expect(Fields.create).toHaveBeenCalledWith(newField);
    expect(field).toEqual(mockField);
  });

  test("should update an existing field", async () => {
    Fields.update.mockResolvedValue([1]); // Sequelize retourne un tableau contenant le nombre de lignes affectées

    const updatedField = await FieldsService.update(1, { name: "Updated Field" });

    expect(Fields.update).toHaveBeenCalledWith({ name: "Updated Field" }, { where: { id: 1 } });
    expect(updatedField).toEqual([1]);
  });

  test("should delete a field by ID", async () => {
    Fields.destroy.mockResolvedValue(1);

    const result = await FieldsService.delete(1);

    expect(Fields.destroy).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(result).toBe(1);
  });
});
