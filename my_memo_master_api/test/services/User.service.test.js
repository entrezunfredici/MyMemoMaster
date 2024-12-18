const { User } = require("../../models/index");
const UserService = require("../../services/User.service");

jest.mock("../../models/index", () => ({
  User: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
}));

describe("UserService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should retrieve all users", async () => {
    const mockUsers = [
      {
        userId: 1,
        email: "j.doe@test.com",
        name: "John Doe",
        password: "password"
      },
    ];
    User.findAll.mockResolvedValue(mockUsers);

    const users = await UserService.findAll();

    expect(User.findAll).toHaveBeenCalledTimes(1);
    expect(users).toEqual(mockUsers);
  });

  test("should retrieve a user by ID", async () => {
    const mockUser = {
      userId: 1,
      email: "j.doe@test.com",
      name: "John Doe",
      password: "password"
    };
    User.findByPk.mockResolvedValue(mockUser);

    const user = await UserService.findOne(1);

    expect(User.findByPk).toHaveBeenCalledWith(1);
    expect(user).toEqual(mockUser);
  });

  test("should create a new user", async () => {
    const mockUser = {
      userId: 1,
      email: "j.doe@test.com",
      name: "John Doe",
      password: "password"
    };
    User.create.mockResolvedValue(mockUser);

    const user = await UserService.create({
      userId: 1,
      email: "j.doe@test.com",
      name: "John Doe",
      password: "password"
    });

    expect(User.create).toHaveBeenCalledWith({
      userId: 1,
      email: "j.doe@test.com",
      name: "John Doe",
      password: "password"
    });
    expect(user).toEqual(mockUser);
  });
});
