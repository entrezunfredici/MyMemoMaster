const express = require("express");
const role = require("../controllers/Role.controller.js");

const router = express.Router();

/**
 * @swagger
 * /roles/all:
 *   get:
 *     summary: Récupère tous les rôles
 *     tags:
 *       - Roles
 *     responses:
 *       200:
 *         description: Liste de tous les rôles
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
 *       500:
 *         description: Erreur interne du serveur
 */
router.get("/all", role.findAll);

/**
 * @swagger
 * /roles/{id}:
 *   get:
 *     summary: Récupère un rôle par son ID
 *     tags:
 *       - Roles
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID du rôle
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Rôle correspondant à l'ID
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
 *         description: Rôle non trouvé
 *       500:
 *         description: Erreur interne du serveur
 */
router.get("/:id", role.findOne);

/**
 * @swagger
 * /roles/add:
 *   post:
 *     summary: Ajoute un nouveau rôle
 *     tags:
 *       - Roles
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
 *     responses:
 *       201:
 *         description: Rôle créé avec succès
 *       400:
 *         description: Requête invalide
 *       500:
 *         description: Erreur interne du serveur
 */
router.post("/add", role.create);

module.exports = (app) => {
    /**
     * @swagger
     * tags:
     *   - name: Roles
     *     description: Gestion des rôles
     */
    app.use("/roles", router);
};
