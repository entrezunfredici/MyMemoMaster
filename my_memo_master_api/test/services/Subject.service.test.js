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

  test("should update an existing subject", async () => {
    const mockSubject = {
      id: 1,
      name: "Old Subject",
      update: jest.fn().mockImplementation(function (newData) {
        Object.assign(this, newData);
        return this;
      }),
    };
    const updatedData = { name: "Updated Subject" };
    Subject.findByPk.mockResolvedValue(mockSubject);
    const updatedSubject = await SubjectService.update(1, updatedData);
    expect(Subject.findByPk).toHaveBeenCalledWith(1);
    expect(mockSubject.update).toHaveBeenCalledWith(updatedData);
    expect(updatedSubject).toMatchObject({ id: 1, name: "Updated Subject" });
  });

  test("should return null when updating a non-existing subject", async () => {
    Subject.findByPk.mockResolvedValue(null);

    const updatedSubject = await SubjectService.update(999, { name: "Fail" });

    expect(Subject.findByPk).toHaveBeenCalledWith(999);
    expect(updatedSubject).toBeNull();
  });

  test("should delete a subject by ID", async () => {
    const mockSubject = { destroy: jest.fn() };

    Subject.findByPk.mockResolvedValue(mockSubject);

    const result = await SubjectService.delete(1);

    expect(Subject.findByPk).toHaveBeenCalledWith(1);
    expect(mockSubject.destroy).toHaveBeenCalledTimes(1);
    expect(result).toBe(true);
  });

  test("should return false when deleting a non-existing subject", async () => {
    Subject.findByPk.mockResolvedValue(null);

    const result = await SubjectService.delete(999);

    expect(Subject.findByPk).toHaveBeenCalledWith(999);
    expect(result).toBe(false);
  });
});
