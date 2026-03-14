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
    findByPk: jest.fn(),
    findOne: jest.fn(),
  },
  Response: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
  },
}));

describe("LeitnerCardService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
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

  test("should promote a card when the selected response is correct", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-03-14T12:00:00.000Z"));

    const mockCard = {
      idCard: 1,
      idBox: 1,
      idQuestion: 42,
      update: jest.fn().mockResolvedValue(true),
    };
    const mockResponse = {
      idResponse: 1,
      idQuestion: 42,
      content: "Bonne réponse",
      correction: false,
    };
    const mockCorrection = {
      idResponse: 1,
      idQuestion: 42,
      content: "Bonne réponse",
      correction: true,
    };
    const mockCurrentBox = {
      idBox: 1,
      level: 1,
      intervall: 60,
      idSystem: null,
    };
    const mockNextBox = {
      idBox: 2,
      level: 2,
      intervall: 120,
      idSystem: null,
    };

    LeitnerCard.findByPk.mockResolvedValue(mockCard);
    Response.findByPk.mockResolvedValue(mockResponse);
    Response.findOne.mockResolvedValue(mockCorrection);
    LeitnerBox.findByPk.mockResolvedValue(mockCurrentBox);
    LeitnerBox.findOne.mockResolvedValue(mockNextBox);

    const result = await LeitnerCardService.correctResponse(1, 1);

    expect(LeitnerCard.findByPk).toHaveBeenCalledWith(1);
    expect(Response.findByPk).toHaveBeenCalledWith(1);
    expect(LeitnerBox.findByPk).toHaveBeenCalledWith(1);
    expect(LeitnerBox.findOne).toHaveBeenCalledWith({
      where: { level: 2, idSystem: null },
    });
    expect(Response.findOne).toHaveBeenCalledWith({
      where: { idQuestion: 42, correction: true },
    });
    expect(mockCard.update).toHaveBeenCalledWith({
      idBox: 2,
      fifo: false,
      dateTimeFifo: new Date("2026-03-14T12:02:00.000Z"),
    });
    expect(result).toEqual({ success: true, correction: "Bonne réponse" });
  });

  test("should demote a card and return the expected correction when the response is wrong", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-03-14T12:00:00.000Z"));

    const mockCard = {
      idCard: 1,
      idBox: 2,
      idQuestion: 42,
      update: jest.fn().mockResolvedValue(true),
    };
    const mockResponse = {
      idResponse: 1,
      idQuestion: 42,
      content: "Mauvaise réponse",
      correction: false,
    };
    const mockCorrection = {
      idResponse: 2,
      idQuestion: 42,
      content: "Bonne réponse",
      correction: true,
    };
    const mockCurrentBox = {
      idBox: 2,
      level: 2,
      intervall: 120,
      idSystem: null,
    };
    const mockPreviousBox = {
      idBox: 1,
      level: 1,
      intervall: 60,
      idSystem: null,
    };

    LeitnerCard.findByPk.mockResolvedValue(mockCard);
    Response.findByPk.mockResolvedValue(mockResponse);
    Response.findOne.mockResolvedValue(mockCorrection);
    LeitnerBox.findByPk.mockResolvedValue(mockCurrentBox);
    LeitnerBox.findOne.mockResolvedValue(mockPreviousBox);

    const result = await LeitnerCardService.correctResponse(1, 1);

    expect(Response.findOne).toHaveBeenCalledWith({
      where: { idQuestion: 42, correction: true },
    });
    expect(LeitnerBox.findOne).toHaveBeenCalledWith({
      where: { level: 1, idSystem: null },
    });
    expect(mockCard.update).toHaveBeenCalledWith({
      idBox: 1,
      fifo: false,
      dateTimeFifo: new Date("2026-03-14T12:01:00.000Z"),
    });
    expect(result).toEqual({ success: false, correction: "Bonne réponse" });
  });

  test("should return null when the response does not belong to the card question", async () => {
    const mockCard = { idCard: 1, idBox: 1, idQuestion: 42, update: jest.fn() };
    const mockResponse = {
      idResponse: 1,
      idQuestion: 99,
      content: "Bonne réponse",
      correction: true,
    };

    LeitnerCard.findByPk.mockResolvedValue(mockCard);
    Response.findByPk.mockResolvedValue(mockResponse);

    const result = await LeitnerCardService.correctResponse(1, 1);

    expect(LeitnerBox.findByPk).not.toHaveBeenCalled();
    expect(mockCard.update).not.toHaveBeenCalled();
    expect(result).toBeNull();
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
