const { Question, Response } = require("../../models/index");
const ResponseService = require("../../services/Response.service");

jest.mock("../../models/index", () => ({
  Response: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
  Question: {
    findByPk: jest.fn(),
  },
}));

describe("ResponseService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // test("should retrieve all responses", async () => {
  //   const mockResponses = [
  //     { idResponse: 1, content: "Réponse 1", correction: true, idQuestion: 42 },
  //     { idResponse: 2, content: "Réponse 2", correction: false, idQuestion: 43 },
  //   ];
  //   Response.findAll.mockResolvedValue(mockResponses);

  //   const responses = await ResponseService.findAll();

  //   expect(Response.findAll).toHaveBeenCalledTimes(1);
  //   expect(responses).toEqual(mockResponses);
  // });



  test("should retrieve all responses by question ID", async () => {
    const idQuestion = 42;
    const mockResponses = [
      { idResponse: 1, content: "Réponse 1", correction: true, idQuestion: idQuestion },
      { idResponse: 2, content: "Réponse 2", correction: false, idQuestion: idQuestion },
    ];

    const expectedResponses = [
      { idResponse: 2, content: "Réponse 2", correction: false, idQuestion: idQuestion },
    ];

    Response.findAll.mockResolvedValue(expectedResponses);

    const responses = await ResponseService.getAllResponsesByQuestion(idQuestion);

    expect(Response.findAll).toHaveBeenCalledWith({ where: { idQuestion: idQuestion, correction: false } });
    expect(responses).toEqual(expectedResponses);
  });

  test("should retrieve the correction for a specific question", async () => {
    const idQuestion = 42;
    const mockResponse = {
      idResponse: 1,
      content: "Réponse correcte",
      correction: true,
      idQuestion: idQuestion,
    };
    Response.findOne.mockResolvedValue(mockResponse);

    const response = await ResponseService.getCorrectionByQuestion(idQuestion);

    expect(Response.findOne).toHaveBeenCalledWith({
      where: { idQuestion: idQuestion, correction: true },
    });
    expect(response).toEqual(mockResponse);
  });

  test("should retrieve a response by ID", async () => {
    const mockResponse = {
      idResponse: 1,
      content: "Réponse 1",
      correction: true,
      idQuestion: 42,
    };
    Response.findByPk.mockResolvedValue(mockResponse);

    const response = await ResponseService.findOne(1);

    expect(Response.findByPk).toHaveBeenCalledWith(1);
    expect(response).toEqual(mockResponse);
  });

  test("should create a new response", async () => {
    const newResponse = {
      content: "Nouvelle réponse",
      correction: false,
      idQuestion: 42,
    };
    const mockResponse = { idResponse: 3, ...newResponse };
    Question.findByPk.mockResolvedValue({ idQuestion: 1, statement: "Sample question" });
    Response.create.mockResolvedValue(mockResponse);

    const response = await ResponseService.create(newResponse);

    expect(Question.findByPk).toHaveBeenCalledWith(42);
    expect(Response.create).toHaveBeenCalledWith(newResponse);
    expect(response).toEqual(mockResponse);
  });

  test("should update an existing response", async () => {
    const mockResponse = {
      update: jest.fn().mockResolvedValue({
        idResponse: 1,
        content: "Réponse mise à jour",
        correction: true,
        idQuestion: 42,
      }),
    };
    Response.findByPk.mockResolvedValue(mockResponse);

    const updatedResponse = await ResponseService.update(1, {
      content: "Réponse mise à jour",
      correction: true,
    });

    expect(Response.findByPk).toHaveBeenCalledWith(1);
    expect(mockResponse.update).toHaveBeenCalledWith({
      content: "Réponse mise à jour",
      correction: true,
    });
    expect(updatedResponse).toEqual({
      idResponse: 1,
      content: "Réponse mise à jour",
      correction: true,
      idQuestion: 42,
    });
  });

  test("should delete a response by ID", async () => {
    const mockResponse = {
      destroy: jest.fn().mockResolvedValue(true),
    };
    Response.findByPk.mockResolvedValue(mockResponse);

    const result = await ResponseService.delete(1);

    expect(Response.findByPk).toHaveBeenCalledWith(1);
    expect(mockResponse.destroy).toHaveBeenCalled();
    expect(result).toBe(true);
  });
});
