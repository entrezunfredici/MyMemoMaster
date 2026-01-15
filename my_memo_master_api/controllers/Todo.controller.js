const TodoService = require("../services/Todo.service");
const { Op } = require("sequelize");

/**
 * Helper: Calcule les bornes temporelles selon la période
 */
const calculatePeriodBounds = (period, ref = new Date()) => {
  const refDate = new Date(ref);
  let from, to;

  switch (period) {
    case "day": {
      from = new Date(
        Date.UTC(
          refDate.getUTCFullYear(),
          refDate.getUTCMonth(),
          refDate.getUTCDate(),
          0,
          0,
          0,
          0
        )
      );
      to = new Date(from);
      to.setUTCDate(to.getUTCDate() + 1);
      break;
    }

    case "week": {
      // ISO week: lundi 00:00 UTC
      const dayOfWeek = refDate.getUTCDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      from = new Date(
        Date.UTC(
          refDate.getUTCFullYear(),
          refDate.getUTCMonth(),
          refDate.getUTCDate() + diffToMonday,
          0,
          0,
          0,
          0
        )
      );
      to = new Date(from);
      to.setUTCDate(to.getUTCDate() + 7);
      break;
    }

    case "month": {
      from = new Date(
        Date.UTC(refDate.getUTCFullYear(), refDate.getUTCMonth(), 1, 0, 0, 0, 0)
      );
      to = new Date(
        Date.UTC(refDate.getUTCFullYear(), refDate.getUTCMonth() + 1, 1, 0, 0, 0, 0)
      );
      break;
    }

    default: {
      // Défaut: semaine courante
      const dow = refDate.getUTCDay();
      const diffMon = dow === 0 ? -6 : 1 - dow;
      from = new Date(
        Date.UTC(
          refDate.getUTCFullYear(),
          refDate.getUTCMonth(),
          refDate.getUTCDate() + diffMon,
          0,
          0,
          0,
          0
        )
      );
      to = new Date(from);
      to.setUTCDate(to.getUTCDate() + 7);
    }
  }

  return { from, to };
};

/**
 * POST /todos - Créer une tâche
 */
exports.create = async (req, res) => {
  try {
    const { title, description, deadline } = req.body;
    const user_id = req.user?.id; // Depuis le JWT (middleware Auth)

    // Validation
    if (!title || !title.trim()) {
      return res.status(400).json({
        code: "VALIDATION_ERROR",
        details: [{ field: "title", message: "Le titre est obligatoire" }],
      });
    }

    const todoData = {
      user_id,
      title: title.trim(),
      description: description || null,
      deadline_utc: deadline ? new Date(deadline) : null,
      status: "pending",
    };

    const todo = await TodoService.create(todoData);

    res.status(201).json({
      status: "success",
      data: todo,
    });
  } catch (error) {
    console.error("Erreur create todo:", error);
    res.status(500).json({
      code: "INTERNAL_ERROR",
      message: error.message,
    });
  }
};

/**
 * GET /todos - Lister les tâches avec filtres
 */
exports.findAll = async (req, res) => {
  try {
    const {
      period,
      ref,
      status = "pending,in_progress",
      q,
      sort = "deadline_asc",
      page = 1,
      page_size = 20,
    } = req.query;

    const user_id = req.user?.id; // Depuis le JWT

    // Construction du WHERE
    const where = { user_id };

    // Filtres de période temporelle
    if (period) {
      const refDate = ref ? new Date(ref) : new Date();
      const { from, to } = calculatePeriodBounds(period, refDate);

      where.deadline_utc = {
        [Op.gte]: from,
        [Op.lt]: to,
        [Op.ne]: null, // Exclure les tâches sans deadline
      };
    }

    // Filtre par statut
    if (status) {
      const statuses = status.split(",").map((s) => s.trim());
      where.status = { [Op.in]: statuses };
    }

    // Recherche textuelle (titre/description)
    if (q && q.trim()) {
      where[Op.or] = [
        { title: { [Op.like]: `%${q.trim()}%` } },
        { description: { [Op.like]: `%${q.trim()}%` } },
      ];
    }

    // Tri
    let order = [];
    switch (sort) {
      case "deadline_asc":
        order = [
          ["deadline_utc", "ASC"],
          ["created_at", "DESC"],
        ];
        break;
      case "deadline_desc":
        order = [
          ["deadline_utc", "DESC"],
          ["created_at", "DESC"],
        ];
        break;
      case "status_asc":
        order = [
          ["status", "ASC"],
          ["deadline_utc", "ASC"],
        ];
        break;
      case "created_desc":
        order = [["created_at", "DESC"]];
        break;
      default:
        order = [
          ["deadline_utc", "ASC"],
          ["created_at", "DESC"],
        ];
    }

    // Pagination
    const limit = Math.min(Math.max(parseInt(page_size, 10), 1), 100);
    const offset = (Math.max(parseInt(page, 10), 1) - 1) * limit;

    // Appel service
    const { count, rows } = await TodoService.findAll({
      where,
      order,
      offset,
      limit,
    });

    res.status(200).json({
      status: "success",
      data: {
        items: rows,
        page: parseInt(page, 10),
        page_size: limit,
        total: count,
      },
    });
  } catch (error) {
    console.error("Erreur findAll todos:", error);
    res.status(500).json({
      code: "INTERNAL_ERROR",
      message: error.message,
    });
  }
};

/**
 * GET /todos/:id - Récupérer une tâche
 */
exports.findOne = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user?.id;

    const todo = await TodoService.findOne(id, user_id);

    if (!todo) {
      return res.status(404).json({
        code: "NOT_FOUND",
        message: `Tâche introuvable pour l'identifiant ${id}`,
      });
    }

    res.status(200).json({
      status: "success",
      data: todo,
    });
  } catch (error) {
    console.error("Erreur findOne todo:", error);
    res.status(500).json({
      code: "INTERNAL_ERROR",
      message: error.message,
    });
  }
};

/**
 * PUT /todos/:id - Mettre à jour une tâche
 */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user?.id;
    const { title, description, deadline, status } = req.body;

    // Validation
    const errors = [];
    if (title !== undefined && !title.trim()) {
      errors.push({ field: "title", message: "Le titre ne peut pas être vide" });
    }
    if (status !== undefined && !["pending", "in_progress", "done"].includes(status)) {
      errors.push({ field: "status", message: "Statut invalide" });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        code: "VALIDATION_ERROR",
        details: errors,
      });
    }

    // Préparer les données
    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description || null;
    if (deadline !== undefined)
      updateData.deadline_utc = deadline ? new Date(deadline) : null;
    if (status !== undefined) updateData.status = status;

    const updatedTodo = await TodoService.update(id, user_id, updateData);

    if (!updatedTodo) {
      return res.status(404).json({
        code: "NOT_FOUND",
        message: `Tâche introuvable pour l'identifiant ${id}`,
      });
    }

    res.status(200).json({
      status: "success",
      data: updatedTodo,
    });
  } catch (error) {
    console.error("Erreur update todo:", error);
    res.status(500).json({
      code: "INTERNAL_ERROR",
      message: error.message,
    });
  }
};

/**
 * DELETE /todos/:id - Supprimer une tâche
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user?.id;

    const deleted = await TodoService.delete(id, user_id);

    if (!deleted) {
      return res.status(404).json({
        code: "NOT_FOUND",
        message: `Tâche introuvable pour l'identifiant ${id}`,
      });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Erreur delete todo:", error);
    res.status(500).json({
      code: "INTERNAL_ERROR",
      message: error.message,
    });
  }
};
