const express = require("express");
const ResponseController = require("../controllers/Response.controller.js");

const router = express.Router();

/**
 * @swagger
 * /responses/all/{questionId}:
 *   get:
 *     summary: Récupère toutes les réponses d'une question
 *     tags:
 *       - Responses
 *     parameters:
 *       - name: questionId
 *         in: path
 *         required: true
 *         description: ID de la question
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Liste de toutes les réponses liées à la question
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
 *       404:
 *         description: Question introuvable
 *       500:
 *         description: Erreur interne du serveur
 */
router.get("/all/:questionId", ResponseController.findAllByQuestion);

/**
 * @swagger
 * /responses/correction/{questionId}:
 *   get:
 *     summary: Récupère la correction d'une question
 *     tags:
 *       - Responses
 *     parameters:
 *       - name: questionId
 *         in: path
 *         required: true
 *         description: ID de la question
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: La correction de la question
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
 *                   example: "Correction exemple"
 *                 correction:
 *                   type: boolean
 *                   example: true
 *                 idQuestion:
 *                   type: integer
 *                   example: 42
 *       404:
 *         description: Aucune correction trouvée
 *       500:
 *         description: Erreur interne du serveur
 */
router.get("/correction/:questionId", ResponseController.findCorrectionByQuestion);

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
 *               questionId:
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
 * /responses/edit/{id}:
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
 *               questionId:
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
router.put("/edit/:id", ResponseController.update);

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
 *       204:
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
