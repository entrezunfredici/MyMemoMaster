const { Subject } = require("../models/index");
const { Op } = require("sequelize");

/**
 * @swagger
 * tags:
 *   name: SubjectService
 *   description: Gestion des sujets via le service
 */
class SubjectService {
  /**
   * @swagger
   * /service/subjects/all:
   *   get:
   *     summary: Récupérer tous les sujets
   *     tags: [SubjectService]
   *     responses:
   *       200:
   *         description: Liste de tous les sujets récupérée avec succès.
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 properties:
   *                   id:
   *                     type: integer
   *                     example: 1
   *                   name:
   *                     type: string
   *                     example: "Math"
   */
  async findAll() {
    return await Subject.findAll();
  }

  /**
   * @swagger
   * /service/subjects/{id}:
   *   get:
   *     summary: Récupérer un sujet par ID
   *     tags: [SubjectService]
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *           example: 1
   *         description: ID unique du sujet.
   *     responses:
   *       200:
   *         description: Sujet trouvé avec succès.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 id:
   *                   type: integer
   *                   example: 1
   *                 name:
   *                   type: string
   *                   example: "Math"
   *       404:
   *         description: Sujet introuvable.
   */
  async findOne(id) {
    return await Subject.findByPk(id);
  }

  /**
   * @swagger
   * /service/subjects/add:
   *   post:
   *     summary: Créer un nouveau sujet
   *     tags: [SubjectService]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *                 example: "Math"
   *               mindMapId:
   *                 type: integer
   *                 example: 42
   *               leitnerSystemId:
   *                 type: integer
   *                 example: 13
   *               testId:
   *                 type: integer
   *                 example: 7
   *     responses:
   *       201:
   *         description: Sujet créé avec succès.
   *       400:
   *         description: Requête invalide.
   */
  async create(data) {
    return await Subject.create(data);
  }
}

module.exports = new SubjectService();
