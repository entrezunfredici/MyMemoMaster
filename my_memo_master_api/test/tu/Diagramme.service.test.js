const { Diagramme } = require("../../models/index");
const DiagrammeService = require("../../services/Diagramme.service");

jest.mock("../../models/index", () => ({
    Diagramme: {
        findAll: jest.fn(),
        findByPk: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        destroy: jest.fn(),
    },
}));

describe("DiagrammeService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("should retrieve all mind maps", async () => {
        const mockDiagrammes = [
            { idDiagramme: 1, mmName: "Diagramme 1", DiagrammeJson: "{}", idUser: 1 },
            { idDiagramme: 2, mmName: "Diagramme 2", DiagrammeJson: "{}", idUser: 2 },
        ];
        Diagramme.findAll.mockResolvedValue(mockDiagrammes);

        const diagrammes = await DiagrammeService.findAll();

        expect(Diagramme.findAll).toHaveBeenCalledTimes(1);
        expect(diagrammes).toEqual(mockDiagrammes);
    });

    test("should retrieve a mind map by ID", async () => {
        const mockDiagramme = { idDiagramme: 1, mmName: "Diagramme 1", DiagrammeJson: "{}", idUser: 1 };
        Diagramme.findByPk.mockResolvedValue(mockDiagramme);

        const diagramme = await DiagrammeService.findOne(1);

        expect(Diagramme.findByPk).toHaveBeenCalledWith(1);
        expect(diagramme).toEqual(mockDiagramme);
    });

    test("should create a new mind map", async () => {
        const newDiagramme = { mmName: "New Diagramme", DiagrammeJson: "{}", idUser: 1 };
        const mockDiagramme = { idDiagramme: 1, ...newDiagramme };
        Diagramme.create.mockResolvedValue(mockDiagramme);

        const createdDiagramme = await DiagrammeService.create(newDiagramme);

        expect(Diagramme.create).toHaveBeenCalledWith(newDiagramme);
        expect(createdDiagramme).toEqual(mockDiagramme);
    });

    test("should update an existing mind map", async () => {
        const mockDiagramme = {
            idDiagramme: 1,
            mmName: "Old Diagramme",
            DiagrammeJson: "{}",
            idUser: 1,
            update: jest.fn().mockImplementation(function (newData) {
                Object.assign(this, newData);
                return this;
            }),
        };
        const updatedData = { mmName: "Updated Diagramme", DiagrammeJson: "{}", idUser: 1 };

        Diagramme.findByPk.mockResolvedValue(mockDiagramme);

        const updatedDiagramme = await DiagrammeService.update(1, updatedData);

        expect(Diagramme.findByPk).toHaveBeenCalledWith(1);
        expect(mockDiagramme.update).toHaveBeenCalledWith(updatedData);
        expect(updatedDiagramme).toMatchObject({
            idDiagramme: 1,
            mmName: "Updated Diagramme",
            DiagrammeJson: "{}",
            idUser: 1,
        });
    });

    test("should throw an error when updating a non-existing mind map", async () => {
        Diagramme.findByPk.mockResolvedValue(null);

        await expect(DiagrammeService.update(999, { mmName: "Non-existing Diagramme" })).rejects.toThrow("Diagramme not found");
        expect(Diagramme.findByPk).toHaveBeenCalledWith(999);
    });

    test("should delete a mind map by ID", async () => {
        Diagramme.findByPk.mockResolvedValue({
            destroy: jest.fn().mockResolvedValue(true),
        });

        const result = await DiagrammeService.delete(1);

        expect(Diagramme.findByPk).toHaveBeenCalledWith(1);
        expect(result).toBe(true);
    });

    test("should throw an error when deleting a non-existing mind map", async () => {
        Diagramme.findByPk.mockResolvedValue(null);

        await expect(DiagrammeService.delete(999)).rejects.toThrow("Diagramme not found");
        expect(Diagramme.findByPk).toHaveBeenCalledWith(999);
    });
});
