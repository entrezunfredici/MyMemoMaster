const { Tutorials } = require("../../models/index");

const TutorialsService = require("../../services/Tutorials.service");
const { Op } = require("sequelize");


jest.mock("../../models/index", () => ({
  Tutorials: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    count: jest.fn(),
  },
}));

describe("TutorialsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should retrieve all tutorials", async () => {
    const mockTutorials = [
      { id: 1, name: "Tutorial 1" },
      { id: 2, name: "Tutorial 2" },
    ];
    Tutorials.findAll.mockResolvedValue(mockTutorials);

    const tutorials = await TutorialsService.findAll({ where: {}, offset: 0, limit: 10 });

    expect(Tutorials.findAll).toHaveBeenCalledTimes(1);
    expect(tutorials).toEqual(mockTutorials);
  });

  test("should retrieve a tutorial by ID", async () => {
    const mockTutorial = { id: 1, name: "Tutorial 1" };
    Tutorials.findByPk.mockResolvedValue(mockTutorial);

    const tutorial = await TutorialsService.findOne(1);

    expect(Tutorials.findByPk).toHaveBeenCalledWith(1);
    expect(tutorial).toEqual(mockTutorial);
  });

  test("should create a new tutorial", async () => {
    const newTutorial = { name: "New Tutorial" };
    const mockTutorial = { id: 3, ...newTutorial };
    Tutorials.create.mockResolvedValue(mockTutorial);

    const tutorial = await TutorialsService.create(newTutorial);

    expect(Tutorials.create).toHaveBeenCalledWith(newTutorial);
    expect(tutorial).toEqual(mockTutorial);
  });

  test("should update an existing tutorial", async () => {
    const mockTutorial = { id: 1, name: "Tutorial 1" };
    Tutorials.findByPk.mockResolvedValue(mockTutorial);
    mockTutorial.update = jest.fn().mockResolvedValue(mockTutorial);

    const updatedTutorial = await TutorialsService.update(1, { name: "Updated Tutorial" });

    expect(Tutorials.findByPk).toHaveBeenCalledWith(1);
    expect(mockTutorial.update).toHaveBeenCalledWith({ name: "Updated Tutorial" });
    expect(updatedTutorial).toEqual(mockTutorial);
  });

  test("should delete a tutorial by ID", async () => {
    const mockTutorial = { id: 1, name: "Tutorial 1" };
    Tutorials.findByPk.mockResolvedValue(mockTutorial);
    mockTutorial.destroy = jest.fn().mockResolvedValue(true);

    const result = await TutorialsService.delete(1);

    expect(Tutorials.findByPk).toHaveBeenCalledWith(1);
    expect(mockTutorial.destroy).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  test("should count tutorials based on criteria", async () => {
    const mockCount = 5;
    Tutorials.count.mockResolvedValue(mockCount);

    const result = await TutorialsService.count({ search: "Tutorial", subjectId: 1, revisionTips: true });

    expect(Tutorials.count).toHaveBeenCalledWith({
      where: {
        [Op.or]: [
          { name: { [Op.like]: `%Tutorial%` } },
        ],
        subjectId: 1,
        revisionTips: true,
      },
    });
    expect(result).toEqual(mockCount);
  });
});
