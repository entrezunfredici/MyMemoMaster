const { FieldType } = require("../../models/index");
const FieldTypeService = require("../../services/fieldsType.service");

jest.mock("../../models/index", () => ({
  FieldType: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

describe("FieldTypeService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should retrieve all field types", async () => {
    const mockFieldTypes = [
      { idType: 1, name: "Text" },
      { idType: 2, name: "Number" },
    ];
    FieldType.findAll.mockResolvedValue(mockFieldTypes);

    const fieldTypes = await FieldTypeService.findAll();

    expect(FieldType.findAll).toHaveBeenCalledTimes(1);
    expect(fieldTypes).toEqual(mockFieldTypes);
  });

  test("should retrieve a field type by ID", async () => {
    const mockFieldType = { idType: 1, name: "Text" };
    FieldType.findOne.mockResolvedValue(mockFieldType);

    const fieldType = await FieldTypeService.findOne(1);

    expect(FieldType.findOne).toHaveBeenCalledWith({ where: { idType: 1 } });
    expect(fieldType).toEqual(mockFieldType);
  });

  test("should create a new field type", async () => {
    const newFieldType = { name: "Boolean" };
    const mockFieldType = { idType: 3, ...newFieldType };
    FieldType.create.mockResolvedValue(mockFieldType);

    const fieldType = await FieldTypeService.create(newFieldType);

    expect(FieldType.create).toHaveBeenCalledWith(newFieldType);
    expect(fieldType).toEqual(mockFieldType);
  });
});