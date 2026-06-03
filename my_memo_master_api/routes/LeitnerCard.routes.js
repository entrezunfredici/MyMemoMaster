const express = require("express");
const router = express.Router();
const leitnerCardController = require("../controllers/LeitnerCard.controller");

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
router.get("/due/:systemId", leitnerCardController.getDueCards);

/**
 * @swagger
 * /leitnercards/leitnerboxes/{leitnerboxid}:
 *   get:
 *     summary: Obtenir toutes les cartes liées à une boîte de Leitner
 *     tags: [LeitnerCards]
 */
router.get(
  "/leitnerboxes/:leitnerboxid",
  leitnerCardController.getCardsByBoxId
);

/**
 * @swagger
 * /leitnercards/{id}:
 *   get:
 *     summary: Obtenir une carte de Leitner par ID
 *     tags: [LeitnerCards]
 */
router.get("/:id", leitnerCardController.getCardById);

/**
 * @swagger
 * /leitnercards/add:
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
router.post("/add", leitnerCardController.addCard);

/**
 * @swagger
 * /leitnercards/{id}:
 *   put:
 *     summary: Modifier une carte de Leitner
 *     tags: [LeitnerCards]
 */
router.put("/:id", leitnerCardController.updateCard);

/**
 * @swagger
 * /leitnercards/response:
 *   post:
 *     summary: Corriger une réponse
 *     tags: [LeitnerCards]
 */
router.post("/response", leitnerCardController.correctResponse);

/**
 * @swagger
 * /leitnercards/{id}:
 *   delete:
 *     summary: Supprimer une carte de Leitner
 *     tags: [LeitnerCards]
 */
router.delete("/:id", leitnerCardController.deleteCard);

module.exports = (app) => {
  /**
   * @swagger
   * tags:
   *   name: LeitnerCards
   *   description: Gestion des cartes de Leitner
   */
  app.use("/leitnercards", router);
};