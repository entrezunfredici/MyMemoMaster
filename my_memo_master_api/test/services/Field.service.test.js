const { Field } = require("../../models/Fields.model"); // Mock du modèle
const fieldService = require("../../services/Field.service"); // Service à tester

jest.mock("../../models", () => ({
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
}));

describe("Field Service", () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Réinitialise les mocks avant chaque test
  });

  // Test pour récupérer tous les champs
  test("getAllFields - should retrieve all fields", async () => {
    const mockFields = [
      { id: 1, fieldValue: "Value1", fieldChar: "A", fieldLetter: "X", valueSaved: true, idType: 2 },
      { id: 2, fieldValue: "Value2", fieldChar: "B", fieldLetter: "Y", valueSaved: false, idType: 3 },
    ];
    Field.findAll.mockResolvedValue(mockFields);

    const result = await fieldService.getAllFields();

    expect(Field.findAll).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockFields);
  });

  // Test pour récupérer un champ par ID
  test("getFieldById - should retrieve a field by ID", async () => {
    const mockField = { id: 1, fieldValue: "Value1", fieldChar: "A", fieldLetter: "X", valueSaved: true, idType: 2 };
    Field.findOne.mockResolvedValue(mockField);

    const result = await fieldService.getFieldById(1);

    expect(Field.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(result).toEqual(mockField);
  });

  // Test pour récupérer un champ non existant
  test("getFieldById - should throw an error if field is not found", async () => {
    Field.findOne.mockResolvedValue(null);

    await expect(fieldService.getFieldById(1)).rejects.toThrow("Champ non trouvé");
    expect(Field.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  // Test pour créer un nouveau champ
  test("createField - should create a new field", async () => {
    const mockField = {
      id: 3,
      fieldValue: "Value3",
      fieldChar: "C",
      fieldLetter: "Z",
      valueSaved: true,
      idType: 4,
    };
    Field.create.mockResolvedValue(mockField);

    const result = await fieldService.createField("Value3", "C", "Z", true, 4);

    expect(Field.create).toHaveBeenCalledWith({
      fieldValue: "Value3",
      fieldChar: "C",
      fieldLetter: "Z",
      valueSaved: true,
      idType: 4,
    });
    expect(result).toEqual(mockField);
  });

  // Test pour mettre à jour un champ
  test("updateField - should update a field", async () => {
    const mockField = {
      id: 1,
      fieldValue: "Value1",
      update: jest.fn().mockResolvedValue({ id: 1, fieldValue: "UpdatedValue" }),
    };
    Field.findOne.mockResolvedValue(mockField);

    const result = await fieldService.updateField(1, { fieldValue: "UpdatedValue" });

    expect(Field.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(mockField.update).toHaveBeenCalledWith({ fieldValue: "UpdatedValue" });
    expect(result).toEqual({ id: 1, fieldValue: "UpdatedValue" });
  });

  // Test pour mettre à jour un champ non existant
  test("updateField - should throw an error if field is not found", async () => {
    Field.findOne.mockResolvedValue(null);

    await expect(fieldService.updateField(1, { fieldValue: "UpdatedValue" })).rejects.toThrow("Champ non trouvé");
    expect(Field.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  // Test pour supprimer un champ
  test("deleteField - should delete a field", async () => {
    const mockField = {
      id: 1,
      destroy: jest.fn().mockResolvedValue(),
    };
    Field.findOne.mockResolvedValue(mockField);

    const result = await fieldService.deleteField(1);

    expect(Field.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(mockField.destroy).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ message: "Champ supprimé" });
  });

  // Test pour supprimer un champ non existant
  test("deleteField - should throw an error if field is not found", async () => {
    Field.findOne.mockResolvedValue(null);

    await expect(fieldService.deleteField(1)).rejects.toThrow("Champ non trouvé");
    expect(Field.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});
