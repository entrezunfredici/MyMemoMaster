const db = require("../models");
const Todo = db.Todo;
const User = db.User;

/**
 * Service pour la gestion des todos
 * Logique métier simple : CRUD avec filtres déjà préparés
 */

class TodoService {
  /**
   * Créer une nouvelle tâche
   * @param {Object} data - { user_id, title, description?, deadline_utc?, status? }
   * @returns {Promise<Object>}
   */
  async create(data) {
    return await Todo.create({
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  /**
   * Lister les todos avec filtres et pagination
   * @param {Object} where - Clause WHERE déjà construite
   * @param {Array} order - Clause ORDER déjà construite
   * @param {number} offset - Offset pour pagination
   * @param {number} limit - Limite pour pagination
   * @returns {Promise<{count: number, rows: Array}>}
   */
  async findAll({ where, order, offset, limit }) {
    return await Todo.findAndCountAll({
      where,
      order,
      limit,
      offset,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstname", "lastname", "email"],
        },
      ],
    });
  }

  /**
   * Récupérer une tâche par ID et user_id
   * @param {string} id - ID de la tâche
   * @param {string} user_id - ID de l'utilisateur
   * @returns {Promise<Object|null>}
   */
  async findOne(id, user_id) {
    return await Todo.findOne({
      where: { id, user_id },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstname", "lastname", "email"],
        },
      ],
    });
  }

  /**
   * Mettre à jour une tâche
   * @param {string} id - ID de la tâche
   * @param {string} user_id - ID de l'utilisateur
   * @param {Object} newData - Nouvelles données
   * @returns {Promise<Object|null>}
   */
  async update(id, user_id, newData) {
    const todo = await Todo.findOne({ where: { id, user_id } });
    if (!todo) {
      return null;
    }
    await todo.update({
      ...newData,
      updated_at: new Date(),
    });
    return todo;
  }

  /**
   * Supprimer une tâche
   * @param {string} id - ID de la tâche
   * @param {string} user_id - ID de l'utilisateur
   * @returns {Promise<boolean>}
   */
  async delete(id, user_id) {
    const todo = await Todo.findOne({ where: { id, user_id } });
    if (!todo) {
      return false;
    }
    await todo.destroy();
    return true;
  }

  /**
   * Compter les todos avec filtres
   * @param {Object} where - Clause WHERE
   * @returns {Promise<number>}
   */
  async count(where) {
    return await Todo.count({ where });
  }
}

module.exports = new TodoService();

