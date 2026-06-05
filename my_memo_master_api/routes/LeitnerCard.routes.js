const express = require("express");
const router = express.Router();
const leitnerCardController = require("../controllers/LeitnerCard.controller");
const authMiddleware = require("../middlewares/Auth.middleware");
const validate = require("../middlewares/validate.middleware");
const leitnerCardValidators = require("../validators/LeitnerCard.validators");

/**
 * @swagger
 * /leitnercards/due/{systemId}:
 *   get:
 *     summary: Obtenir les cartes à réviser pour un système Leitner
 *     tags: [LeitnerCards]
 *     parameters:
 *       - in: path
 *         name: systemId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du système Leitner
 *     responses:
 *       200:
 *         description: Liste des cartes dont la date de révision est atteinte ou dépassée.
 *       500:
 *         description: Erreur serveur.
 */
router.get("/due/:systemId", authMiddleware, leitnerCardController.getDueCards);

/**
 * @swagger
 * /leitnercards/leitnerboxes/{leitnerboxid}:
 *   get:
 *     summary: Obtenir toutes les cartes liées à une boîte de Leitner
 *     tags: [LeitnerCards]
 */
router.get(
  "/leitnerboxes/:leitnerboxid",
  authMiddleware,
  leitnerCardController.getCardsByBoxId
);

/**
 * @swagger
 * /leitnercards/{id}:
 *   get:
 *     summary: Obtenir une carte de Leitner par ID
 *     tags: [LeitnerCards]
 */
router.get("/:id", authMiddleware, leitnerCardController.getCardById);

/**
 * @swagger
 * /leitnercards:
 *   post:
 *     summary: Ajouter une carte de Leitner
 *     tags: [LeitnerCards]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               idQuestion:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Flash card créée avec succès.
 *       500:
 *         description: Erreur serveur.
 */
router.post("/", authMiddleware, leitnerCardValidators.addCard, validate, leitnerCardController.addCard);

/**
 * @swagger
 * /leitnercards/{id}:
 *   put:
 *     summary: Modifier une carte de Leitner
 *     tags: [LeitnerCards]
 */
router.put("/:id", authMiddleware, leitnerCardValidators.updateCard, validate, leitnerCardController.updateCard);

/**
 * @swagger
 * /leitnercards/response:
 *   post:
 *     summary: Corriger une réponse par comparaison sémantique IA
 *     tags: [LeitnerCards]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cardId, studentAnswer]
 *             properties:
 *               cardId:
 *                 type: integer
 *                 example: 1
 *               studentAnswer:
 *                 type: string
 *                 example: "La photosynthèse est le processus par lequel les plantes produisent de l'énergie."
 *     responses:
 *       200:
 *         description: Résultat de la correction avec mise à jour Leitner.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 correction:
 *                   type: string
 *                 score:
 *                   type: number
 *                 explanation:
 *                   type: string
 *                 decision_zone:
 *                   type: string
 *                   enum: [high, grey_zone, low]
 *       404:
 *         description: Carte introuvable ou aucune réponse correcte définie.
 *       500:
 *         description: Erreur serveur.
 */
router.post("/response", authMiddleware, leitnerCardValidators.correctResponse, validate, leitnerCardController.correctResponse);

/**
 * @swagger
 * /leitnercards/{id}:
 *   delete:
 *     summary: Supprimer une carte de Leitner
 *     tags: [LeitnerCards]
 */
router.delete("/:id", authMiddleware, leitnerCardController.deleteCard);

module.exports = (app) => {
  /**
   * @swagger
   * tags:
   *   name: LeitnerCards
   *   description: Gestion des cartes de Leitner
   */
  app.use("/leitnercards", router);
};