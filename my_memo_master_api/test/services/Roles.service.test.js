const { Role } = require("../../models/index");
const RoleService = require("../../services/Role.service");

jest.mock("../../models/index", () => ({
  Role: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
}));

describe("RoleService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should retrieve all roles", async () => {
    const mockRoles = [
      { id: 1, name: "Admin" },
      { id: 2, name: "Utilisateur" },
    ];
    Role.findAll.mockResolvedValue(mockRoles);

    const roles = await RoleService.findAll();

    expect(Role.findAll).toHaveBeenCalledTimes(1);
    expect(roles).toEqual(mockRoles);
  });

  test("should retrieve a role by ID", async () => {
    const mockRole = { id: 1, name: "Admin" };
    Role.findByPk.mockResolvedValue(mockRole);

    const role = await RoleService.findOne(1);

    expect(Role.findByPk).toHaveBeenCalledWith(1);
    expect(role).toEqual(mockRole);
  });

  test("should create a new role", async () => {
    const mockRole = { id: 3, name: "Utilisateur" };
    Role.create.mockResolvedValue(mockRole);

    const role = await RoleService.create({ name: "Utilisateur" });

    expect(Role.create).toHaveBeenCalledWith({ name: "Utilisateur" });
    expect(role).toEqual(mockRole);
  });
});
