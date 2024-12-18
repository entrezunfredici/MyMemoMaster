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
  Response: {
    findByPk: jest.fn(),
  },
}));

describe("LeitnerCardService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should retrieve all cards by LeitnerBox ID", async () => {
    LeitnerCard.findAll.mockResolvedValue([{ idCard: 1, idBox: 2 }]);

    const result = await LeitnerCardService.getCardsByBoxId(2);

    expect(LeitnerCard.findAll).toHaveBeenCalledWith({ where: { idBox: 2 } });
    expect(result).toEqual([{ idCard: 1, idBox: 2 }]);
  });

  test("should retrieve a Leitner card by ID", async () => {
    const mockCard = { idCard: 1, fifo: true };
    LeitnerCard.findByPk.mockResolvedValue(mockCard);

    const result = await LeitnerCardService.getCardById(1);

    expect(LeitnerCard.findByPk).toHaveBeenCalledWith(1);
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

    expect(LeitnerBox.findOne).toHaveBeenCalledWith({ where: { level: 0 } });
    expect(LeitnerCard.create).toHaveBeenCalledWith({
      idQuestion: 1,
      fifo: true,
      idBox: mockBox.idBox,
    });
    expect(result).toEqual(mockCard);
  });

  test("should update an existing Leitner card", async () => {
    const mockCard = {
      idCard: 1,
      fifo: true,
      update: jest.fn().mockResolvedValue(true),
    };

    LeitnerCard.findByPk.mockResolvedValue(mockCard);

    const updatedData = { fifo: false };
    const result = await LeitnerCardService.updateCard(1, updatedData, {
      canEdit: true,
    });

    expect(LeitnerCard.findByPk).toHaveBeenCalledWith(1);
    expect(mockCard.update).toHaveBeenCalledWith(updatedData);
    expect(result).toEqual(mockCard);
  });

  test("should correct a response", async () => {
    const mockCard = { idCard: 1, idBox: 1, update: jest.fn() };
    const mockResponse = {
      idResponse: 1,
      content: "answer",
      correction: "answer",
    };
    const mockBox = { idBox: 2, intervall: 1000 };

    LeitnerCard.findByPk.mockResolvedValue(mockCard);
    Response.findByPk.mockResolvedValue(mockResponse);
    LeitnerBox.findOne.mockResolvedValue(mockBox);

    const result = await LeitnerCardService.correctResponse(1, 1, 5);

    expect(LeitnerCard.findByPk).toHaveBeenCalledWith(1);
    expect(Response.findByPk).toHaveBeenCalledWith(1);
    expect(LeitnerBox.findOne).toHaveBeenCalledWith({ where: { level: 2 } });
    expect(mockCard.update).toHaveBeenCalled();
    expect(result).toEqual({ success: true, correction: "answer" });
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
