const roleService = require("../services/Role.service.js");

/**
 * @swagger
 * /roles/all:
 *   get:
 *     summary: Récupérer tous les rôles
 *     tags: [Roles]
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
 *                     example: "Admin"
 *       500:
 *         description: Erreur interne du serveur.
 */
exports.findAll = async (req, res) => {
    try {
        const data = await roleService.findAll();
        res.status(200).send(data);
    } catch (error) {
        res.status(500).send({
            message:
                error.message ||
                "Une erreur s'est produite lors de la récupération des rôles.",
        });
    }
};

/**
 * @swagger
 * /roles/{id}:
 *   get:
 *     summary: Récupérer un rôle par ID
 *     tags: [Roles]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Identifiant du rôle
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Rôle récupéré avec succès.
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
 *                   example: "Admin"
 *       404:
 *         description: Rôle non trouvé.
 *       500:
 *         description: Erreur interne du serveur.
 */
exports.findOne = async (req, res) => {
    try {
        const data = await roleService.findOne(req.params.id);
        if (!data) {
            res.status(404).send({
                message: `Rôle introuvable pour l'identifiant ${req.params.id}.`,
            });
        } else {
            res.status(200).send(data);
        }
    } catch (error) {
        res.status(500).send({
            message: `Erreur lors de la récupération du rôle avec l'identifiant ${req.params.id}.`,
        });
    }
};

/**
 * @swagger
 * /roles/add:
 *   post:
 *     summary: Ajouter un nouveau rôle
 *     tags: [Roles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Admin"
 *     responses:
 *       201:
 *         description: Rôle créé avec succès.
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
 *                   example: "Admin"
 *       500:
 *         description: Erreur interne du serveur.
 */
exports.create = async (req, res) => {
    try {
        const { name } = req.body;
        const data = await roleService.create({ name });
        res.status(201).send(data);
    } catch (error) {
        res.status(500).send({
            message: "Une erreur s'est produite lors de la création du rôle.",
        });
    }
};
