const db = require("../../models/index");
const TodoService = require("../../services/Todo.service");

jest.mock("../../models/index", () => ({
  Todo: {
    findAndCountAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
  User: {},
}));

describe("Service des Tâches (Todo)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("create: doit créer une nouvelle tâche", async () => {
    const payload = {
      user_id: "user-uuid",
      title: "Ma tâche",
      description: "Desc",
      deadline_utc: new Date("2025-12-31T00:00:00Z"),
      status: "pending",
    };

    const created = { id: "todo-uuid", ...payload };
    db.Todo.create.mockResolvedValue(created);

    const todo = await TodoService.create(payload);

    expect(db.Todo.create).toHaveBeenCalledTimes(1);
    expect(db.Todo.create).toHaveBeenCalledWith(expect.objectContaining({
      user_id: payload.user_id,
      title: payload.title,
      description: payload.description,
      deadline_utc: payload.deadline_utc,
      status: "pending",
      created_at: expect.any(Date),
      updated_at: expect.any(Date),
    }));
    expect(todo).toEqual(created);
  });

  test("findAll: doit lister les tâches avec filtres et pagination", async () => {
    const where = { user_id: "user-uuid", status: { $in: ["pending", "in_progress"] } };
    const order = [["deadline_utc", "ASC"], ["created_at", "DESC"]];
    const offset = 0;
    const limit = 20;

    const rows = [{ id: "t1" }, { id: "t2" }];
    db.Todo.findAndCountAll.mockResolvedValue({ count: rows.length, rows });

    const result = await TodoService.findAll({ where, order, offset, limit });

    expect(db.Todo.findAndCountAll).toHaveBeenCalledTimes(1);
    expect(db.Todo.findAndCountAll).toHaveBeenCalledWith({
      where,
      order,
      limit,
      offset,
      include: [
        {
          model: db.User,
          as: "user",
          attributes: ["id", "firstname", "lastname", "email"],
        },
      ],
    });
    expect(result.rows).toEqual(rows);
    expect(result.count).toBe(rows.length);
  });

  test("findOne: doit récupérer une tâche par id et user_id", async () => {
    const mockTodo = { id: "todo-uuid", user_id: "user-uuid" };
    db.Todo.findOne.mockResolvedValue(mockTodo);

    const todo = await TodoService.findOne("todo-uuid", "user-uuid");

    expect(db.Todo.findOne).toHaveBeenCalledWith({
      where: { id: "todo-uuid", user_id: "user-uuid" },
      include: [
        {
          model: db.User,
          as: "user",
          attributes: ["id", "firstname", "lastname", "email"],
        },
      ],
    });
    expect(todo).toEqual(mockTodo);
  });

  test("update: doit mettre à jour une tâche et la retourner", async () => {
    const existing = { id: "todo-uuid", user_id: "user-uuid", update: jest.fn().mockResolvedValue() };
    db.Todo.findOne.mockResolvedValue(existing);

    const newData = { title: "Nouveau titre" };
    const updated = await TodoService.update("todo-uuid", "user-uuid", newData);

    expect(db.Todo.findOne).toHaveBeenCalledWith({ where: { id: "todo-uuid", user_id: "user-uuid" } });
    expect(existing.update).toHaveBeenCalledWith(expect.objectContaining({
      title: "Nouveau titre",
      updated_at: expect.any(Date),
    }));
    expect(updated).toBe(existing);
  });

  test("update: doit retourner null si la tâche est introuvable", async () => {
    db.Todo.findOne.mockResolvedValue(null);
    const updated = await TodoService.update("todo-uuid", "user-uuid", { title: "x" });
    expect(updated).toBeNull();
  });

  test("delete: doit supprimer une tâche et retourner true", async () => {
    const existing = { id: "todo-uuid", user_id: "user-uuid", destroy: jest.fn().mockResolvedValue() };
    db.Todo.findOne.mockResolvedValue(existing);

    const deleted = await TodoService.delete("todo-uuid", "user-uuid");

    expect(db.Todo.findOne).toHaveBeenCalledWith({ where: { id: "todo-uuid", user_id: "user-uuid" } });
    expect(existing.destroy).toHaveBeenCalledTimes(1);
    expect(deleted).toBe(true);
  });

  test("delete: doit retourner false si la tâche est introuvable", async () => {
    db.Todo.findOne.mockResolvedValue(null);
    const deleted = await TodoService.delete("todo-uuid", "user-uuid");
    expect(deleted).toBe(false);
  });

  test("count: doit compter avec la clause where", async () => {
    db.Todo.count.mockResolvedValue(42);
    const total = await TodoService.count({ user_id: "user-uuid" });
    expect(db.Todo.count).toHaveBeenCalledWith({ where: { user_id: "user-uuid" } });
    expect(total).toBe(42);
  });
});
