const { Test } = require("../../models/index");
const TestService = require("../../services/Test.service");

jest.mock("../../models/index", () => ({
    Test: {
      findAll: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      destroy: jest.fn(),
    },
  }));

describe("TestService", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
  
    test("should retrieve all tests", async () => {
      const mockTests = [
        { id: 1, subjectId: 1, name: "Controle milieu semestre" },
        { id: 2, subjectId: 1, name: "Controle finale" },
      ];
      Test.findAll.mockResolvedValue(mockTests);
  
      const tests = await TestService.findAll();
  
      expect(Test.findAll).toHaveBeenCalledTimes(1);
      expect(tests).toEqual(mockTests);
    });
  
    test("should retrieve a test by ID", async () => {
      const mockTest = { id: 1, subjectId: 1, name: "Controle finale" };
      Test.findByPk.mockResolvedValue(mockTest);
  
      const test = await TestService.findOne(1);
  
      expect(Test.findByPk).toHaveBeenCalledWith(1);
      expect(test).toEqual(mockTest);
    });
  
    test("should create a new test", async () => {
      const mockTest = { id: 3, subjectId: 1, name: "Controle m1" };
      Test.create.mockResolvedValue(mockTest);
  
      const test = await TestService.create({ subjectId: 1,name: "Controle m1" });
  
      expect(Test.create).toHaveBeenCalledWith({ subjectId: 1,name: "Controle m1" });
      expect(test).toEqual(mockTest);
    });

    test("should update a test", async () => {
        const mockTest = { id: 1, subjectId: 1, name: "Controle mis à jour" };
        Test.update.mockResolvedValue([1, [mockTest]]); // Update renvoie généralement un tableau [nombre de lignes modifiées, les objets mis à jour]

        const updatedTest = await TestService.update(1, { name: "Controle mis à jour" });

        expect(Test.update).toHaveBeenCalledWith({ name: "Controle mis à jour" }, { where: { id: 1 } });
        expect(updatedTest).toEqual(mockTest);
    });

    test("should delete a test", async () => {
        const mockTest = { id: 1, subjectId: 1, name: "Controle à supprimer" };
        Test.destroy.mockResolvedValue(1); 

        const deletedTest = await TestService.destroy(1);

        expect(Test.destroy).toHaveBeenCalledWith({ where: { id: 1 } });
        expect(deletedTest).toBe(true);
    });

});
  