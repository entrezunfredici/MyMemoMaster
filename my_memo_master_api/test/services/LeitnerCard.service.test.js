const LeitnerCardService = require("../../services/LeitnerCard.service");
const { LeitnerCard, LeitnerBox, Response } = require("../../models");

jest.mock("../../models", () => ({
  LeitnerCard: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn(),
    update: jest.fn(),
  },
  LeitnerBox: {
    findOne: jest.fn(),
  },
  Question: {},
  Response: {
    findAll: jest.fn(),
  },
}));

jest.mock("../../services/Semantic.service", () => ({
  gradeSemantic: jest.fn(),
}));

const semanticService = require("../../services/Semantic.service");

describe("LeitnerCardService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should retrieve all cards by LeitnerBox ID", async () => {
    LeitnerCard.findAll.mockResolvedValue([{ idCard: 1, idBox: 2 }]);

    const result = await LeitnerCardService.getCardsByBoxId(2);

    expect(LeitnerCard.findAll).toHaveBeenCalledWith({
      where: { idBox: 2 },
      include: [expect.objectContaining({ as: "question" })],
    });
    expect(result).toEqual([{ idCard: 1, idBox: 2 }]);
  });

  test("should retrieve a Leitner card by ID", async () => {
    const mockCard = { idCard: 1, fifo: true };
    LeitnerCard.findByPk.mockResolvedValue(mockCard);

    const result = await LeitnerCardService.getCardById(1);

    expect(LeitnerCard.findByPk).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        include: expect.arrayContaining([
          expect.objectContaining({ as: "leitnerBox" }),
          expect.objectContaining({ as: "question" }),
        ]),
      })
    );
    expect(result).toEqual(mockCard);
  });

  test("should add a new Leitner card", async () => {
    const mockBox = { idBox: 1, level: 0 };
    const mockCard = { idCard: 1, fifo: true, idBox: 1 };
    LeitnerBox.findOne.mockResolvedValue(mockBox);
    LeitnerCard.create.mockResolvedValue(mockCard);

    const result = await LeitnerCardService.addCard(
      { idQuestion: 1 },
      { canAdd: true }
    );

    expect(LeitnerBox.findOne).toHaveBeenCalledWith({ where: { level: 1 } });
    expect(LeitnerCard.create).toHaveBeenCalledWith({
      idQuestion: 1,
      fifo: true,
      idBox: mockBox.idBox,
      next_review_at: null,
      last_review_at: null,
      review_count: 0,
      correct_count: 0,
      incorrect_count: 0,
    });
    expect(result).toEqual(mockCard);
  });

  test("should update an existing Leitner card", async () => {
    const mockCard = {
      idCard: 1,
      idQuestion: 10,
      update: jest.fn().mockResolvedValue(true),
    };

    LeitnerCard.findByPk.mockResolvedValue(mockCard);

    const updatedData = { idQuestion: 42 };
    const result = await LeitnerCardService.updateCard(1, updatedData, {
      canEdit: true,
    });

    expect(LeitnerCard.findByPk).toHaveBeenCalledWith(1);
    expect(mockCard.update).toHaveBeenCalledWith({ idQuestion: 42 });
    expect(result).toEqual(mockCard);
  });

  test("should correct a response using semantic grading", async () => {
    const mockCard = {
      idCard: 1,
      idBox: 1,
      idQuestion: 42,
      leitnerBox: { level: 1, idSystem: 10 },
      review_count: 0,
      correct_count: 0,
      incorrect_count: 0,
      update: jest.fn(),
    };
    const mockCorrectResponses = [{ content: "La bonne réponse" }];
    const mockBox = { idBox: 2, intervall: 1000 };
    const mockGradeResult = {
      is_correct: true,
      score: 0.92,
      explanation: "Correct (similarity=0.92).",
      decision_zone: "high",
    };

    LeitnerCard.findByPk.mockResolvedValue(mockCard);
    Response.findAll.mockResolvedValue(mockCorrectResponses);
    semanticService.gradeSemantic.mockResolvedValue(mockGradeResult);
    LeitnerBox.findOne.mockResolvedValue(mockBox);

    const result = await LeitnerCardService.correctResponse(1, "ma réponse");

    expect(LeitnerCard.findByPk).toHaveBeenCalledWith(1, expect.any(Object));
    expect(Response.findAll).toHaveBeenCalledWith({
      where: { idQuestion: 42, correction: true },
    });
    expect(semanticService.gradeSemantic).toHaveBeenCalledWith(
      ["La bonne réponse"],
      "ma réponse"
    );
    expect(LeitnerBox.findOne).toHaveBeenCalledWith({
      where: { level: 2, idSystem: 10 },
    });
    expect(mockCard.update).toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      correction: "La bonne réponse",
      score: 0.92,
      explanation: "Correct (similarity=0.92).",
      decision_zone: "high",
    });
  });

  test("should delete a Leitner card", async () => {
    const mockCard = { idCard: 1, destroy: jest.fn().mockResolvedValue(true) };

    LeitnerCard.findByPk.mockResolvedValue(mockCard);

    const result = await LeitnerCardService.deleteCard(1, { canDelete: true });

    expect(LeitnerCard.findByPk).toHaveBeenCalledWith(1);
    expect(mockCard.destroy).toHaveBeenCalled();
    expect(result).toBe(true);
  });
});
