const express = require("express");
const ResponseController = require("../controllers/Response.controller.js");

const router = express.Router();

/**
 * @swagger
 * /responses:
 *   get:
 *     summary: Récupère toutes les réponses
 *     tags:
 *       - Responses
 *     responses:
 *       200:
 *         description: Liste de toutes les réponses
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   idResponse:
 *                     type: integer
 *                     example: 1
 *                   content:
 *                     type: string
 *                     example: "Réponse exemple"
 *                   correction:
 *                     type: boolean
 *                     example: false
 *                   idQuestion:
 *                     type: integer
 *                     example: 42
 *       500:
 *         description: Erreur interne du serveur
 */
router.get("/", ResponseController.findAll);

/**
 * @swagger
 * /responses/{id}:
 *   get:
 *     summary: Récupère une réponse par son ID
 *     tags:
 *       - Responses
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de la réponse
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Réponse correspondante à l'ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 idResponse:
 *                   type: integer
 *                   example: 1
 *                 content:
 *                   type: string
 *                   example: "Réponse exemple"
 *                 correction:
 *                   type: boolean
 *                   example: false
 *                 idQuestion:
 *                   type: integer
 *                   example: 42
 *       404:
 *         description: Réponse non trouvée
 *       500:
 *         description: Erreur interne du serveur
 */
router.get("/:id", ResponseController.findOne);

/**
 * @swagger
 * /responses/add:
 *   post:
 *     summary: Ajoute une nouvelle réponse
 *     tags:
 *       - Responses
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 example: "Réponse exemple"
 *               correction:
 *                 type: boolean
 *                 example: false
 *               idQuestion:
 *                 type: integer
 *                 example: 42
 *     responses:
 *       201:
 *         description: Réponse créée avec succès
 *       400:
 *         description: Requête invalide
 *       500:
 *         description: Erreur interne du serveur
 */
router.post("/add", ResponseController.create);

/**
 * @swagger
 * /responses/{id}:
 *   put:
 *     summary: Met à jour une réponse existante
 *     tags:
 *       - Responses
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de la réponse
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 example: "Nouvelle réponse exemple"
 *               correction:
 *                 type: boolean
 *                 example: true
 *               idQuestion:
 *                 type: integer
 *                 example: 42
 *     responses:
 *       200:
 *         description: Réponse mise à jour avec succès
 *       400:
 *         description: Requête invalide
 *       404:
 *         description: Réponse non trouvée
 *       500:
 *         description: Erreur interne du serveur
 */
router.put("/:id", ResponseController.update);

/**
 * @swagger
 * /responses/{id}:
 *   delete:
 *     summary: Supprime une réponse par son ID
 *     tags:
 *       - Responses
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de la réponse
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Réponse supprimée avec succès
 *       404:
 *         description: Réponse non trouvée
 *       500:
 *         description: Erreur interne du serveur
 */
router.delete("/:id", ResponseController.delete);

module.exports = (app) => {
    /**
     * @swagger
     * tags:
     *   - name: Responses
     *     description: Gestion des réponses
     */
    app.use("/responses", router);
};
