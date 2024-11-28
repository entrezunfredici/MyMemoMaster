const { Subject } = require("../../models/index");
const SubjectService = require("../../services/Subject.service");

jest.mock("../../models/index", () => ({
  Subject: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
}));

describe("SubjectService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should retrieve all subjects", async () => {
    const mockSubjects = [
      { id: 1, name: "Math" },
      { id: 2, name: "Science" },
    ];
    Subject.findAll.mockResolvedValue(mockSubjects);

    const subjects = await SubjectService.findAll();

    expect(Subject.findAll).toHaveBeenCalledTimes(1);
    expect(subjects).toEqual(mockSubjects);
  });

  test("should retrieve a subject by ID", async () => {
    const mockSubject = { id: 1, name: "Math" };
    Subject.findByPk.mockResolvedValue(mockSubject);

    const subject = await SubjectService.findOne(1);

    expect(Subject.findByPk).toHaveBeenCalledWith(1);
    expect(subject).toEqual(mockSubject);
  });

  test("should create a new subject", async () => {
    const mockSubject = { id: 3, name: "History" };
    Subject.create.mockResolvedValue(mockSubject);

    const subject = await SubjectService.create({ name: "History" });

    expect(Subject.create).toHaveBeenCalledWith({ name: "History" });
    expect(subject).toEqual(mockSubject);
  });
});
