const { Question, Test, LeitnerCard, Response } = require("../../models/index");
const QuestionService = require("../../services/Question.service");

jest.mock("../../models/index", () => ({
  Question: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
  Test: {
    findAll: jest.fn(),
  },
  LeitnerCard: {
    findOne: jest.fn(),
  },
  Response: {
    findOne: jest.fn(),
  },
}));

describe("QuestionService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should retrieve all questions", async () => {
    const mockQuestions = [
      { idQuestion: 1, statement: "Question 1", questionPosition: 1, type: "Type 1" },
      { idQuestion: 2, statement: "Question 2", questionPosition: 2, type: "Type 2" },
    ];
    Question.findAll.mockResolvedValue(mockQuestions);

    const questions = await QuestionService.getAllQuestions();

    expect(Question.findAll).toHaveBeenCalledTimes(1);
    expect(questions).toEqual(mockQuestions);
  });

  test("should retrieve questions by test ID", async () => {
    const testId = 1;
    const mockQuestions = [
      { idQuestion: 1, statement: "Question 1", questionPosition: 1, type: "Type 1" },
      { idQuestion: 2, statement: "Question 2", questionPosition: 2, type: "Type 2" },
    ];
    Question.findAll.mockResolvedValue(mockQuestions);

    const questions = await QuestionService.getQuestionsByTest(testId);

    expect(Question.findAll).toHaveBeenCalledWith({
      include: [{ model: Test, where: { idTest: testId } }],
    });
    expect(questions).toEqual(mockQuestions);
  });

  test("should retrieve question by card ID", async () => {
    const cardId = 1;
    const mockQuestion = { idQuestion: 1, statement: "Question 1", questionPosition: 1, type: "Type 1" };
    Question.findOne.mockResolvedValue(mockQuestion);

    const question = await QuestionService.getQuestionByCard(cardId);

    expect(Question.findOne).toHaveBeenCalledWith({
      include: [{ model: LeitnerCard, where: { idCard: cardId } }],
    });
    expect(question).toEqual(mockQuestion);
  });

  test("should retrieve a question by ID", async () => {
    const mockQuestion = { idQuestion: 1, statement: "Question 1", questionPosition: 1, type: "Type 1" };
    Question.findByPk.mockResolvedValue(mockQuestion);

    const question = await QuestionService.findOne(1);

    expect(Question.findByPk).toHaveBeenCalledWith(1);
    expect(question).toEqual(mockQuestion);
  });

  test("should retrieve the correction for a specific question", async () => {
    const idQuestion = 1;
    const mockResponse = { idResponse: 1, content: "Correction", correction: true, idQuestion: idQuestion };
    Response.findOne.mockResolvedValue(mockResponse);

    const correction = await QuestionService.getCorrectionByQuestion(idQuestion);

    expect(Response.findOne).toHaveBeenCalledWith({
      where: { idQuestion: idQuestion, correction: true },
    });
    expect(correction).toEqual(mockResponse);
  });

  test("should create a new question", async () => {
    const newQuestion = { statement: "New Question", questionPosition: 1, type: "Type 1", idTest: 1, idCard: 1 };
    const mockQuestion = { idQuestion: 3, ...newQuestion };
    Question.create.mockResolvedValue(mockQuestion);

    const question = await QuestionService.create(newQuestion);

    expect(Question.create).toHaveBeenCalledWith(newQuestion);
    expect(question).toEqual(mockQuestion);
  });

  test("should update an existing question", async () => {
    const mockQuestion = {
      update: jest.fn().mockResolvedValue({
        idQuestion: 1,
        statement: "Updated Question",
        questionPosition: 1,
        type: "Type 1",
      }),
    };
    Question.findByPk.mockResolvedValue(mockQuestion);

    const updatedQuestion = await QuestionService.update(1, {
      statement: "Updated Question",
      questionPosition: 1,
      type: "Type 1",
    });

    expect(Question.findByPk).toHaveBeenCalledWith(1);
    expect(mockQuestion.update).toHaveBeenCalledWith({
      statement: "Updated Question",
      questionPosition: 1,
      type: "Type 1",
    });
    expect(updatedQuestion).toEqual({
      idQuestion: 1,
      statement: "Updated Question",
      questionPosition: 1,
      type: "Type 1",
    });
  });

  test("should delete a question by ID", async () => {
    const mockQuestion = {
      destroy: jest.fn().mockResolvedValue(true),
    };
    Question.findByPk.mockResolvedValue(mockQuestion);

    const result = await QuestionService.delete(1);

    expect(Question.findByPk).toHaveBeenCalledWith(1);
    expect(mockQuestion.destroy).toHaveBeenCalled();
    expect(result).toBe(true);
  });
});