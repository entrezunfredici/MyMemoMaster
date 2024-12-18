const { Response } = require("../../models/index");
const ResponseService = require("../../services/Response.service");

jest.mock("../../models/index", () => ({
  Response: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
}));

describe("ResponseService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should retrieve all responses", async () => {
    const mockResponses = [
      { idResponse: 1, content: "Réponse 1", correction: true, idQuestion: 42 },
      { idResponse: 2, content: "Réponse 2", correction: false, idQuestion: 43 },
    ];
    Response.findAll.mockResolvedValue(mockResponses);

    const responses = await ResponseService.findAll();

    expect(Response.findAll).toHaveBeenCalledTimes(1);
    expect(responses).toEqual(mockResponses);
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
    Response.create.mockResolvedValue(mockResponse);

    const response = await ResponseService.create(newResponse);

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