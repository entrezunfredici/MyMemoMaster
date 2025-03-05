const { MindMap } = require("../../models/index");
const MindMapService = require("../../services/MindMap.service");

jest.mock("../../models/index", () => ({
    MindMap: {
        findAll: jest.fn(),
        findByPk: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        destroy: jest.fn(),
    },
}));

describe("MindMapService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("should retrieve all mind maps", async () => {
        const mockMindMaps = [
            { idMindMap: 1, mmName: "MindMap 1", mindMapJson: "{}", idUser: 1 },
            { idMindMap: 2, mmName: "MindMap 2", mindMapJson: "{}", idUser: 2 },
        ];
        MindMap.findAll.mockResolvedValue(mockMindMaps);

        const mindMaps = await MindMapService.findAll();

        expect(MindMap.findAll).toHaveBeenCalledTimes(1);
        expect(mindMaps).toEqual(mockMindMaps);
    });

    test("should retrieve a mind map by ID", async () => {
        const mockMindMap = { idMindMap: 1, mmName: "MindMap 1", mindMapJson: "{}", idUser: 1 };
        MindMap.findByPk.mockResolvedValue(mockMindMap);

        const mindMap = await MindMapService.findOne(1);

        expect(MindMap.findByPk).toHaveBeenCalledWith(1);
        expect(mindMap).toEqual(mockMindMap);
    });

    test("should create a new mind map", async () => {
        const newMindMap = { mmName: "New MindMap", mindMapJson: "{}", idUser: 1 };
        const mockMindMap = { idMindMap: 1, ...newMindMap };
        MindMap.create.mockResolvedValue(mockMindMap);

        const mindMap = await MindMapService.create(newMindMap);

        expect(MindMap.create).toHaveBeenCalledWith(newMindMap);
        expect(mindMap).toEqual(mockMindMap);
    });

    test("should update an existing mind map", async () => {
        const mockMindMap = {
            idMindMap: 1,
            mmName: "Old MindMap",
            mindMapJson: "{}",
            idUser: 1,
            update: jest.fn().mockImplementation(function (newData) {
                Object.assign(this, newData);
                return this;
            }),
        };
        const updatedData = { mmName: "Updated MindMap", mindMapJson: "{}", idUser: 1 };

        MindMap.findByPk.mockResolvedValue(mockMindMap);

        const updatedMindMap = await MindMapService.update(1, updatedData);

        expect(MindMap.findByPk).toHaveBeenCalledWith(1);
        expect(mockMindMap.update).toHaveBeenCalledWith(updatedData);
        expect(updatedMindMap).toMatchObject({
            idMindMap: 1,
            mmName: "Updated MindMap",
            mindMapJson: "{}",
            idUser: 1,
        });
    });

    test("should throw an error when updating a non-existing mind map", async () => {
        MindMap.findByPk.mockResolvedValue(null);

        await expect(MindMapService.update(999, { mmName: "Non-existing MindMap" })).rejects.toThrow("MindMap not found");
        expect(MindMap.findByPk).toHaveBeenCalledWith(999);
    });

    test("should delete a mind map by ID", async () => {
        MindMap.findByPk.mockResolvedValue({
            destroy: jest.fn().mockResolvedValue(true),
        });

        const result = await MindMapService.delete(1);

        expect(MindMap.findByPk).toHaveBeenCalledWith(1);
        expect(result).toBe(true);
    });

    test("should throw an error when deleting a non-existing mind map", async () => {
        MindMap.findByPk.mockResolvedValue(null);

        await expect(MindMapService.delete(999)).rejects.toThrow("MindMap not found");
        expect(MindMap.findByPk).toHaveBeenCalledWith(999);
    });
});
