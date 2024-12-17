const { Role } = require("../models/index");
const { Op } = require("sequelize");

/**
 * @swagger
 * tags:
 *   name: RoleService
 *   description: Gestion des rôles via le service
 */
class RoleService {
    /**
     * @swagger
     * /service/roles/all:
     *   get:
     *     summary: Récupérer tous les rôles
     *     tags: [RoleService]
     *     responses:
     *       200:
     *         description: Liste de tous les rôles récupérée avec succès.
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
        return await Role.findAll();
    }

    /**
     * @swagger
     * /service/roles/{id}:
     *   get:
     *     summary: Récupérer un rôle par ID
     *     tags: [RoleService]
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema:
     *           type: integer
     *           example: 1
     *         description: ID unique du rôle.
     *     responses:
     *       200:
     *         description: Rôle trouvé avec succès.
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
     *         description: Rôle introuvable.
     */
    async findOne(id) {
        return await Role.findByPk(id);
    }

    /**
     * @swagger
     * /service/roles/add:
     *   post:
     *     summary: Créer un nouveau rôle
     *     tags: [RoleService]
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
     *         description: Rôle créé avec succès.
     *       400:
     *         description: Requête invalide.
     */
    async create(data) {
        return await Role.create(data);
    }
}

module.exports = new RoleService();
