const  FieldTypeService  = require('../../services/FiedsType.service');
 const { FieldType } = require('../../models/index'); 
// Mock de Sequelize
jest.mock('../../models/index', () => ({
  FieldType: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
  },
}));

describe('FieldTypeService', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Réinitialise tous les mocks
  });

  test("devrait récupérer tous les types de champs", async () => {
    const mockFieldType = {
      id: 1,
      name: 'Texte',
      separation: ',',
      allowFloat: true,
      allowCharacters: true,
      allowUnit: false,
    };
    
    FieldType.findAll.mockResolvedValue(mockFieldType); // Simulation de la récupération des données
    const result = await FieldTypeService.findAll();
    
    expect(result).toEqual(mockFieldType);
    expect(FieldType.findAll).toHaveBeenCalled();
  });

  test("devrait lancer une erreur si la récupération échoue", async () => {
    FieldType.findAll.mockRejectedValue(new Error('Erreur lors de la récupération des types de champs')); // Simulation d'erreur
    await expect(FieldTypeService.findAll()).rejects.toThrow('Erreur lors de la récupération des types de champs');
  });

  test("devrait récupérer un type de champ par ID", async () => {
    const mockFieldType = {
      id: 1,
      name: 'Texte',
      separation: ',',
      allowFloat: true,
      allowCharacters: true,
      allowUnit: false,
    };
    
    FieldType.findByPk.mockResolvedValue(mockFieldType); // Simulation de la récupération par ID
    const result = await FieldTypeService.findOne(1);
    
    expect(result).toEqual(mockFieldType);
    expect(FieldType.findByPk).toHaveBeenCalledWith(1);
  });

  test("devrait lancer une erreur si le type de champ n'est pas trouvé", async () => {
    FieldType.findByPk.mockResolvedValue(null); // Simulation d'absence de résultat
    await expect(FieldTypeService.findOne(1)).rejects.toThrow('Erreur lors de la récupération du type de champ');
  });

  test("devrait créer un nouveau type de champ", async () => {
    const mockFieldType = {
      id: 1,
      name: 'Texte',
      separation: ',',
      allowFloat: true,
      allowCharacters: true,
      allowUnit: false,
    };

    FieldType.create.mockResolvedValue(mockFieldType); // Simulation de la création
    const result = await FieldTypeService.create(mockFieldType);
    
    expect(result).toEqual(mockFieldType);
    expect(FieldType.create).toHaveBeenCalledWith(mockFieldType);
  });

  test("devrait lancer une erreur si la création échoue", async () => {
    FieldType.create.mockRejectedValue(new Error('Erreur lors de la création du type de champ')); // Simulation d'erreur
    await expect(FieldTypeService.create({})).rejects.toThrow('Erreur lors de la création du type de champ');
  });

  test("devrait mettre à jour un type de champ par ID", async () => {
    const mockFieldType = {
      id: 1,
      name: 'Texte',
      separation: ',',
      allowFloat: true,
      allowCharacters: true,
      allowUnit: false,
    };
  

      // Crée une fonction mock pour la mise à jour
  const mockUpdate = jest.fn().mockResolvedValue([1]); // Renvoie un tableau avec 1 pour simuler une mise à jour réussie

  // Simulez la récupération d'un type de champ et ajoutez la méthode `update` à l'instance
  FieldType.findOne.mockResolvedValue({
    ...mockFieldType, 
    update: mockUpdate // Ajout de la méthode update à l'instance simulée
  });

  const result = await FieldTypeService.update(1, { name: 'Texte Modifié' });

  expect(result).toEqual([1]); // Vérifie que la mise à jour retourne [1]
  expect(mockUpdate).toHaveBeenCalledWith({ name: 'Texte Modifié' });
  });

  test("devrait lancer une erreur si le type de champ à mettre à jour n'est pas trouvé", async () => {
    FieldType.findOne.mockResolvedValue(null); // Simulation d'absence de type de champ
    await expect(FieldTypeService.update(1, { name: 'Texte Modifié' })).rejects.toThrow('Erreur lors de la mise à jour du type de champ');
  });

  test("devrait supprimer un type de champ par ID", async () => {
    const mockFieldType = {
      id: 1,
      name: 'Texte',
      separation: ',',
      allowFloat: true,
      allowCharacters: true,
      allowUnit: false,
    };
    const mockDestroy = jest.fn().mockResolvedValue(undefined);
    FieldType.findOne.mockResolvedValue({
        ...mockFieldType,
        destroy: mockDestroy // Mock de la méthode destroy sur l'instance renvoyée
      }); // Simulation de la récupération du type de champ
    //FieldType.prototype.destroy = jest.fn().mockResolvedValue(undefined); // Simulation de la suppression réussie

    const result = await FieldTypeService.delete(1);
    
    expect(result).toEqual({ message: "Type de champ supprimé avec succès" }); // Vérifie que le message est retourné
    expect(mockDestroy).toHaveBeenCalled(); // Vérifie que destroy a été appelé
  });

  test("devrait lancer une erreur si le type de champ à supprimer n'est pas trouvé", async () => {
    FieldType.findOne.mockResolvedValue(null); // Simulation d'absence de type de champ
    await expect(FieldTypeService.delete(1)).rejects.toThrow('Erreur lors de la suppression du type de champ');
  });
});



