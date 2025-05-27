const { FieldsType } = require("../../models/index");
const FieldTypeService = require("../../services/FieldsType.service");

jest.mock("../../models/index", () => ({
  FieldsType: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

describe("FieldTypeService", () => {
  // Le reste du test reste inchangé, mais remplacez toutes les occurrences de FieldType par FieldsType
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should retrieve all field types", async () => {
    const mockFieldTypes = [
      { idType: 1, name: "Text" },
      { idType: 2, name: "Number" },
    ];
    FieldsType.findAll.mockResolvedValue(mockFieldTypes);  // Changé de FieldType à FieldsType

    const fieldTypes = await FieldTypeService.findAll();

    expect(FieldsType.findAll).toHaveBeenCalledTimes(1);  // Changé de FieldType à FieldsType
    expect(fieldTypes).toEqual(mockFieldTypes);
  });

  test("should retrieve a field type by ID", async () => {
    const mockFieldType = { idType: 1, name: "Text" };
    FieldsType.findOne.mockResolvedValue(mockFieldType);

    const fieldType = await FieldTypeService.findOne(1);

    expect(FieldsType.findOne).toHaveBeenCalledWith({ where: { idType: 1 } });
    expect(fieldType).toEqual(mockFieldType);
  });

  test("should create a new field type", async () => {
    const newFieldType = { name: "Boolean" };
    const mockFieldType = { idType: 3, ...newFieldType };
    FieldsType.create.mockResolvedValue(mockFieldType);

    const fieldType = await FieldTypeService.create(newFieldType);

    expect(FieldsType.create).toHaveBeenCalledWith(newFieldType);
    expect(fieldType).toEqual(mockFieldType);
  });
});