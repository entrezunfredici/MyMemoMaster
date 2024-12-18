const FieldService = require('../../services/Field.service');
const { Field } = require('../../models/index');

// Mock de Sequelize
jest.mock('../../models/index', () => ({
  Field: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
  },
}));

describe('FieldService', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Réinitialise tous les mocks
  });

  test("devrait récupérer tous les champs", async () => {
    const mockFields = [
      {
        id: 1,
        fieldValue: "Exemple",
        fieldChar: "A",
        fieldLetter: "A",
        valueSaved: true,
        idType: 1,
      },
    ];

    Field.findAll.mockResolvedValue(mockFields); // Simulation de la récupération des données
    const result = await FieldService.findAll();

    expect(result).toEqual(mockFields);
    expect(Field.findAll).toHaveBeenCalled();
  });

  test("devrait lancer une erreur si la récupération de tous les champs échoue", async () => {
    Field.findAll.mockRejectedValue(new Error('Erreur lors de la récupération des champs')); // Simulation d'erreur
    await expect(FieldService.findAll()).rejects.toThrow('Erreur lors de la récupération des champs');
  });

  test("devrait récupérer un champ par ID", async () => {
    const mockField = {
      id: 1,
      fieldValue: "Exemple",
      fieldChar: "A",
      fieldLetter: "A",
      valueSaved: true,
      idType: 1,
    };

    Field.findByPk.mockResolvedValue(mockField); // Simulation de la récupération par ID
    const result = await FieldService.findOne(1);

    expect(result).toEqual(mockField);
    expect(Field.findByPk).toHaveBeenCalledWith(1);
  });

  test("devrait lancer une erreur si le champ n'est pas trouvé", async () => {
    Field.findByPk.mockResolvedValue(null); // Simulation d'absence de résultat
    await expect(FieldService.findOne(1)).rejects.toThrow('Erreur lors de la récupération du champ');
  });

  test("devrait créer un nouveau champ", async () => {
    const mockField = {
      id: 1,
      fieldValue: "Exemple Value",
      fieldChar: "A",
      fieldLetter: "A",
      valueSaved: true,
      idType: 1,
    };

    Field.create.mockResolvedValue(mockField); // Simulation de la création
    const result = await FieldService.create(mockField);

    expect(result).toEqual(mockField);
    expect(Field.create).toHaveBeenCalledWith(mockField);
  });

  test("devrait lancer une erreur si la création échoue", async () => {
    Field.create.mockRejectedValue(new Error('Erreur lors de la création du champ')); // Simulation d'erreur
    await expect(FieldService.create({})).rejects.toThrow('Erreur lors de la création du champ');
  });

  test("devrait mettre à jour un champ par ID", async () => {
    const mockField = {
      id: 1,
      fieldValue: "Exemple Value",
      fieldChar: "A",
      fieldLetter: "A",
      valueSaved: true,
      idType: 1,
    };

    // Mock de la méthode `update`
    const mockUpdate = jest.fn().mockResolvedValue([1]); // Renvoie [1] pour indiquer une mise à jour réussie

    // Ajout de la méthode `update` sur l'instance simulée
    Field.findOne.mockResolvedValue({
      ...mockField,
      update: mockUpdate,
    });

    const result = await FieldService.update(1, { fieldValue: "Updated Value" });

    expect(result).toEqual([1]); // Vérifie que la mise à jour retourne [1]
    expect(mockUpdate).toHaveBeenCalledWith({ fieldValue: "Updated Value" });
  });

  test("devrait lancer une erreur si le champ à mettre à jour n'est pas trouvé", async () => {
    Field.findOne.mockResolvedValue(null); // Simulation d'absence de champ
    await expect(FieldService.update(1, { fieldValue: "Updated Value" })).rejects.toThrow('Erreur lors de la mise à jour du champ');
  });

  test("devrait supprimer un champ par ID", async () => {
    const mockField = {
      id: 1,
      fieldValue: "Exemple Value",
      fieldChar: "A",
      fieldLetter: "A",
      valueSaved: true,
      idType: 1,
    };

    const mockDestroy = jest.fn().mockResolvedValue(undefined);
    Field.findOne.mockResolvedValue({
      ...mockField,
      destroy: mockDestroy, // Ajout du mock de `destroy`
    });

    const result = await FieldService.delete(1);

    expect(result).toEqual({ message: "Champ supprimé avec succès" });
    expect(mockDestroy).toHaveBeenCalled(); // Vérifie que destroy a été appelé
  });

  test("devrait lancer une erreur si le champ à supprimer n'est pas trouvé", async () => {
    Field.findOne.mockResolvedValue(null); // Simulation d'absence de champ
    await expect(FieldService.delete(1)).rejects.toThrow('Erreur lors de la suppression du champ');
  });


  
});
