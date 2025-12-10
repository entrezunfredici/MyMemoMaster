const TutorialsController = require("../../controllers/Tutorials.controller");
const TutorialsService = require("../../services/Tutorials.service");

// Mock du service
jest.mock("../../services/Tutorials.service");

describe("Tutorials Controller", () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock de req et res
    req = {
      query: {},
      params: {},
      body: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Mock console.error pour éviter les logs pendant les tests
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe("findAll", () => {
    test("devrait retourner tous les tutoriels avec pagination", async () => {
      const mockResult = {
        data: [
          { id: 1, name: "Tutorial 1", link: "https://example.com/1" },
          { id: 2, name: "Tutorial 2", link: "https://example.com/2" },
        ],
        pagination: {
          total: 10,
          page: 1,
          perPage: 10,
          totalPages: 1,
        },
      };

      TutorialsService.findAll.mockResolvedValue(mockResult);

      req.query = { page: 1, perPage: 10 };

      await TutorialsController.findAll(req, res);

      expect(TutorialsService.findAll).toHaveBeenCalledWith({
        page: 1,
        perPage: 10,
        search: undefined,
        subjectId: undefined,
        revisionTips: undefined,
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        data: mockResult.data,
        pagination: mockResult.pagination,
      });
    });

    test("devrait gérer les filtres (search, subjectId, revisionTips)", async () => {
      const mockResult = { data: [], pagination: {} };
      TutorialsService.findAll.mockResolvedValue(mockResult);

      req.query = {
        search: "JavaScript",
        subjectId: 5,
        revisionTips: true,
      };

      await TutorialsController.findAll(req, res);

      expect(TutorialsService.findAll).toHaveBeenCalledWith({
        page: undefined,
        perPage: undefined,
        search: "JavaScript",
        subjectId: 5,
        revisionTips: true,
      });

      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("devrait gérer les erreurs et retourner 500", async () => {
      TutorialsService.findAll.mockRejectedValue(new Error("Database error"));

      await TutorialsController.findAll(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: "error",
        message: "Database error",
      });
    });
  });

  describe("findOne", () => {
    test("devrait retourner un tutoriel par ID", async () => {
      const mockTutorial = {
        id: 1,
        name: "Tutorial 1",
        link: "https://example.com/1",
      };

      TutorialsService.findOne.mockResolvedValue(mockTutorial);

      req.params.id = 1;

      await TutorialsController.findOne(req, res);

      expect(TutorialsService.findOne).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        data: mockTutorial,
      });
    });

    test("devrait retourner 404 si le tutoriel n'existe pas", async () => {
      TutorialsService.findOne.mockResolvedValue(null);

      req.params.id = 999;

      await TutorialsController.findOne(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: "error",
        message: "Tutoriel introuvable pour l'identifiant 999.",
      });
    });

    test("devrait gérer les erreurs et retourner 500", async () => {
      TutorialsService.findOne.mockRejectedValue(new Error("Database error"));

      req.params.id = 1;

      await TutorialsController.findOne(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: "error",
        message: "Erreur lors de la récupération du tutoriel avec l'identifiant 1.",
      });
    });
  });

  describe("create", () => {
    test("devrait créer un nouveau tutoriel", async () => {
      const newTutorialData = {
        name: "New Tutorial",
        link: "https://example.com/new",
        idSubject: 1,
        revision_tips: true,
      };

      const mockCreatedTutorial = { id: 10, ...newTutorialData };

      TutorialsService.create.mockResolvedValue(mockCreatedTutorial);

      req.body = newTutorialData;

      await TutorialsController.create(req, res);

      expect(TutorialsService.create).toHaveBeenCalledWith(newTutorialData);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        data: mockCreatedTutorial,
        message: "Tutoriel créé avec succès.",
      });
    });

    test("devrait retourner 400 si les champs obligatoires sont manquants", async () => {
      req.body = { name: "Test" }; // manque link et idSubject

      await TutorialsController.create(req, res);

      expect(TutorialsService.create).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: "error",
        message: "Les champs name, link et idSubject sont obligatoires.",
      });
    });

    test("devrait gérer les erreurs de validation Sequelize", async () => {
      const validationError = {
        name: "SequelizeValidationError",
        errors: [
          { path: "link", message: "Le lien doit être une URL valide" },
        ],
      };

      TutorialsService.create.mockRejectedValue(validationError);

      req.body = {
        name: "Test",
        link: "invalid-url",
        idSubject: 1,
      };

      await TutorialsController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: "error",
        message: "Erreur de validation",
        errors: [
          { field: "link", message: "Le lien doit être une URL valide" },
        ],
      });
    });

    test("devrait gérer les autres erreurs et retourner 500", async () => {
      TutorialsService.create.mockRejectedValue(new Error("Database error"));

      req.body = {
        name: "Test",
        link: "https://test.com",
        idSubject: 1,
      };

      await TutorialsController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: "error",
        message: "Database error",
      });
    });
  });

  describe("update", () => {
    test("devrait mettre à jour un tutoriel existant", async () => {
      const updateData = {
        name: "Updated Name",
        link: "https://updated.com",
      };

      const mockUpdatedTutorial = { id: 1, ...updateData };

      TutorialsService.update.mockResolvedValue(mockUpdatedTutorial);

      req.params.id = 1;
      req.body = updateData;

      await TutorialsController.update(req, res);

      expect(TutorialsService.update).toHaveBeenCalledWith(1, updateData);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        data: mockUpdatedTutorial,
        message: "Tutoriel mis à jour avec succès.",
      });
    });

    test("devrait retourner 404 si le tutoriel n'existe pas", async () => {
      TutorialsService.update.mockResolvedValue(null);

      req.params.id = 999;
      req.body = { name: "Test" };

      await TutorialsController.update(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: "error",
        message: "Tutoriel introuvable pour l'identifiant 999.",
      });
    });

    test("devrait gérer les erreurs de validation Sequelize", async () => {
      const validationError = {
        name: "SequelizeValidationError",
        errors: [
          { path: "name", message: "Le nom ne peut pas être vide" },
        ],
      };

      TutorialsService.update.mockRejectedValue(validationError);

      req.params.id = 1;
      req.body = { name: "" };

      await TutorialsController.update(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: "error",
        message: "Erreur de validation",
        errors: [
          { field: "name", message: "Le nom ne peut pas être vide" },
        ],
      });
    });

    test("devrait gérer les autres erreurs et retourner 500", async () => {
      TutorialsService.update.mockRejectedValue(new Error("Update failed"));

      req.params.id = 1;
      req.body = { name: "Test" };

      await TutorialsController.update(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: "error",
        message: "Update failed",
      });
    });
  });

  describe("delete", () => {
    test("devrait supprimer un tutoriel existant", async () => {
      TutorialsService.delete.mockResolvedValue(true);

      req.params.id = 1;

      await TutorialsController.delete(req, res);

      expect(TutorialsService.delete).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        message: "Tutoriel avec l'identifiant 1 a été supprimé avec succès.",
      });
    });

    test("devrait retourner 404 si le tutoriel n'existe pas", async () => {
      TutorialsService.delete.mockResolvedValue(false);

      req.params.id = 999;

      await TutorialsController.delete(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: "error",
        message: "Tutoriel introuvable pour l'identifiant 999.",
      });
    });

    test("devrait gérer les erreurs et retourner 500", async () => {
      TutorialsService.delete.mockRejectedValue(new Error("Delete failed"));

      req.params.id = 1;

      await TutorialsController.delete(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: "error",
        message: "Erreur lors de la suppression du tutoriel avec l'identifiant 1.",
      });
    });
  });
});
