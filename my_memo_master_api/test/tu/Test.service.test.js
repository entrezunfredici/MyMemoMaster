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
            { testId: 1, subjectId: 1, name: "Controle milieu semestre" },
            { testId: 2, subjectId: 1, name: "Controle finale" },
        ];
        Test.findAll.mockResolvedValue(mockTests);

        const tests = await TestService.findAll();

        expect(Test.findAll).toHaveBeenCalledTimes(1);
        expect(tests).toEqual(mockTests);
    });

    test("should retrieve a test by ID", async () => {
        const mockTest = { testId: 1, subjectId: 1, name: "Controle finale" };
        Test.findByPk.mockResolvedValue(mockTest);

        const test = await TestService.findOne(1);

        expect(Test.findByPk).toHaveBeenCalledWith(1);
        expect(test).toEqual(mockTest);
    });

    test("should create a new test", async () => {
        const mockTest = { testId: 3, subjectId: 1, name: "Controle m1" };
        Test.create.mockResolvedValue(mockTest);

        const test = await TestService.create({ subjectId: 1, name: "Controle m1" });

        expect(Test.create).toHaveBeenCalledWith({ subjectId: 1, name: "Controle m1" });
        expect(test).toEqual(mockTest);
    });

    test("should update a test", async () => {
        const mockTest = {
            testId: 1,
            subjectId: 1,
            name: "Controle finale",
            update: jest.fn().mockResolvedValue({ testId: 1, subjectId: 1, name: "Controle m1" }),
        };
        Test.findByPk.mockResolvedValue(mockTest);

        const updatedTest = await TestService.update(1, { name: "Controle m1" });

        expect(Test.findByPk).toHaveBeenCalledWith(1);
        expect(mockTest.update).toHaveBeenCalledWith({ name: "Controle m1" });
        expect(updatedTest).toEqual({ testId: 1, subjectId: 1, name: "Controle m1" });
    });

    test("should delete a test", async () => {
        const mockTest = {
            testId: 1,
            subjectId: 1,
            name: "Controle finale",
            destroy: jest.fn().mockResolvedValue(true),
        };
        Test.findByPk.mockResolvedValue(mockTest);

        const result = await TestService.delete(1);

        expect(Test.findByPk).toHaveBeenCalledWith(1);
        expect(mockTest.destroy).toHaveBeenCalled();
        expect(result).toBe(true);
    });
});
