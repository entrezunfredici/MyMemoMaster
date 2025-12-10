const TutorialsService = require("../../services/Tutorials.service");
const db = require("../../models");

// Mock des modèles
jest.mock("../../models", () => ({
  Tutorials: {
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
  Subject: {
    findByPk: jest.fn(),
  },
}));

const { Tutorials, Subject } = db;

describe("TutorialsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    test("devrait récupérer tous les tutoriels avec pagination par défaut", async () => {
      const mockData = {
        count: 15,
        rows: [
          { id: 1, name: "Tutorial 1", link: "https://example.com/1", revision_tips: true, idSubject: 1 },
          { id: 2, name: "Tutorial 2", link: "https://example.com/2", revision_tips: false, idSubject: 2 },
        ],
      };
      Tutorials.findAndCountAll.mockResolvedValue(mockData);

      const result = await TutorialsService.findAll();

      expect(Tutorials.findAndCountAll).toHaveBeenCalledWith({
        where: {},
        limit: 10,
        offset: 0,
        include: [
          {
            model: Subject,
            as: "subject",
            attributes: ["subjectId", "name"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      expect(result.data).toEqual(mockData.rows);
      expect(result.pagination).toEqual({
        total: 15,
        page: 1,
        perPage: 10,
        totalPages: 2,
      });
    });

    test("devrait filtrer par recherche (search)", async () => {
      const mockData = { count: 1, rows: [{ id: 1, name: "JavaScript Tutorial" }] };
      Tutorials.findAndCountAll.mockResolvedValue(mockData);

      await TutorialsService.findAll({ search: "JavaScript" });

      expect(Tutorials.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: expect.objectContaining({ [Symbol.for("iLike")]: "%JavaScript%" }),
          }),
        })
      );
    });

    test("devrait filtrer par subjectId", async () => {
      const mockData = { count: 3, rows: [] };
      Tutorials.findAndCountAll.mockResolvedValue(mockData);

      await TutorialsService.findAll({ subjectId: 5 });

      expect(Tutorials.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { idSubject: 5 },
        })
      );
    });

    test("devrait filtrer par revision_tips", async () => {
      const mockData = { count: 2, rows: [] };
      Tutorials.findAndCountAll.mockResolvedValue(mockData);

      await TutorialsService.findAll({ revisionTips: true });

      expect(Tutorials.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { revision_tips: true },
        })
      );
    });

    test("devrait gérer la pagination personnalisée", async () => {
      const mockData = { count: 50, rows: [] };
      Tutorials.findAndCountAll.mockResolvedValue(mockData);

      const result = await TutorialsService.findAll({ page: 3, perPage: 20 });

      expect(Tutorials.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 20,
          offset: 40, // (page 3 - 1) * 20
        })
      );

      expect(result.pagination).toEqual({
        total: 50,
        page: 3,
        perPage: 20,
        totalPages: 3,
      });
    });
  });

  describe("findOne", () => {
    test("devrait récupérer un tutoriel par ID avec relation Subject", async () => {
      const mockTutorial = {
        id: 1,
        name: "Tutorial 1",
        link: "https://example.com/1",
        subject: { subjectId: 1, name: "Math" },
      };
      Tutorials.findByPk.mockResolvedValue(mockTutorial);

      const result = await TutorialsService.findOne(1);

      expect(Tutorials.findByPk).toHaveBeenCalledWith(1, {
        include: [
          {
            model: Subject,
            as: "subject",
            attributes: ["subjectId", "name"],
          },
        ],
      });
      expect(result).toEqual(mockTutorial);
    });

    test("devrait retourner null si le tutoriel n'existe pas", async () => {
      Tutorials.findByPk.mockResolvedValue(null);

      const result = await TutorialsService.findOne(999);

      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    test("devrait créer un nouveau tutoriel avec succès", async () => {
      const newTutorialData = {
        name: "New Tutorial",
        link: "https://example.com/new",
        idSubject: 1,
        revision_tips: true,
      };

      const mockSubject = { subjectId: 1, name: "Math" };
      Subject.findByPk.mockResolvedValue(mockSubject);

      const mockCreatedTutorial = { id: 10, ...newTutorialData };
      Tutorials.create.mockResolvedValue(mockCreatedTutorial);

      const result = await TutorialsService.create(newTutorialData);

      expect(Subject.findByPk).toHaveBeenCalledWith(1);
      expect(Tutorials.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: newTutorialData.name,
          link: newTutorialData.link,
          idSubject: newTutorialData.idSubject,
          revision_tips: newTutorialData.revision_tips,
        })
      );
      expect(result).toEqual(mockCreatedTutorial);
    });

    test("devrait lever une erreur si les champs obligatoires sont manquants", async () => {
      await expect(TutorialsService.create({ name: "Test" })).rejects.toThrow(
        "Les champs name, link et idSubject sont obligatoires"
      );
    });

    test("devrait lever une erreur si le sujet n'existe pas", async () => {
      Subject.findByPk.mockResolvedValue(null);

      await expect(
        TutorialsService.create({
          name: "Test",
          link: "https://test.com",
          idSubject: 999,
        })
      ).rejects.toThrow("Le sujet avec l'ID 999 n'existe pas");
    });
  });

  describe("update", () => {
    test("devrait mettre à jour un tutoriel existant", async () => {
      const mockTutorial = {
        id: 1,
        name: "Old Name",
        link: "https://old.com",
        update: jest.fn().mockResolvedValue(true),
      };
      Tutorials.findByPk.mockResolvedValue(mockTutorial);

      const updateData = { name: "New Name", link: "https://new.com" };
      const result = await TutorialsService.update(1, updateData);

      expect(Tutorials.findByPk).toHaveBeenCalledWith(1);
      expect(mockTutorial.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "New Name",
          link: "https://new.com",
        })
      );
    });

    test("devrait retourner null si le tutoriel n'existe pas", async () => {
      Tutorials.findByPk.mockResolvedValue(null);

      const result = await TutorialsService.update(999, { name: "Test" });

      expect(result).toBeNull();
    });

    test("devrait vérifier l'existence du sujet si idSubject est modifié", async () => {
      const mockTutorial = {
        id: 1,
        update: jest.fn().mockResolvedValue(true),
      };
      const mockSubject = { subjectId: 5, name: "Physics" };

      Tutorials.findByPk.mockResolvedValue(mockTutorial);
      Subject.findByPk.mockResolvedValue(mockSubject);

      await TutorialsService.update(1, { idSubject: 5 });

      expect(Subject.findByPk).toHaveBeenCalledWith(5);
    });

    test("devrait lever une erreur si le nouveau sujet n'existe pas", async () => {
      const mockTutorial = { id: 1, update: jest.fn() };
      Tutorials.findByPk.mockResolvedValue(mockTutorial);
      Subject.findByPk.mockResolvedValue(null);

      await expect(TutorialsService.update(1, { idSubject: 999 })).rejects.toThrow(
        "Le sujet avec l'ID 999 n'existe pas"
      );
    });
  });

  describe("delete", () => {
    test("devrait supprimer un tutoriel existant", async () => {
      const mockTutorial = {
        id: 1,
        destroy: jest.fn().mockResolvedValue(true),
      };
      Tutorials.findByPk.mockResolvedValue(mockTutorial);

      const result = await TutorialsService.delete(1);

      expect(Tutorials.findByPk).toHaveBeenCalledWith(1);
      expect(mockTutorial.destroy).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    test("devrait retourner false si le tutoriel n'existe pas", async () => {
      Tutorials.findByPk.mockResolvedValue(null);

      const result = await TutorialsService.delete(999);

      expect(result).toBe(false);
    });
  });
});

