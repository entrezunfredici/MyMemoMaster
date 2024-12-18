const express = require("express");
const router = express.Router();
const leitnerCardController = require("../controllers/LeitnerCard.controller");

/**
 * @swagger
 * /leitnercards/leitnerboxes/{leitnerboxid}:
 *   get:
 *     summary: Obtenir toutes les cartes liées à une boîte de Leitner
 *     tags: [LeitnerCards]
 */
router.get(
  "/leitnercards/leitnerboxes/:leitnerboxid",
  leitnerCardController.getCardsByBoxId
);

/**
 * @swagger
 * /leitnercards/{id}:
 *   get:
 *     summary: Obtenir une carte de Leitner par ID
 *     tags: [LeitnerCards]
 */
router.get("/leitnercards/:id", leitnerCardController.getCardById);

/**
 * @swagger
 * /leitnercards/add:
 *   post:
 *     summary: Ajouter une carte de Leitner
 *     tags: [LeitnerCards]
 */
router.post("/leitnercards/add", leitnerCardController.addCard);

/**
 * @swagger
 * /leitnercards/edit/{id}:
 *   post:
 *     summary: Modifier une carte de Leitner
 *     tags: [LeitnerCards]
 */
router.post("/leitnercards/edit/:id", leitnerCardController.updateCard);

/**
 * @swagger
 * /leitnercards/response:
 *   post:
 *     summary: Corriger une réponse
 *     tags: [LeitnerCards]
 */
router.post("/leitnercards/response", leitnerCardController.correctResponse);

/**
 * @swagger
 * /leitnercards/{id}:
 *   delete:
 *     summary: Supprimer une carte de Leitner
 *     tags: [LeitnerCards]
 */
router.delete("/leitnercards/:id", leitnerCardController.deleteCard);

module.exports = (app) => {
  /**
   * @swagger
   * tags:
   *   - name: Leitner Cards
   *     description: Gestion des cartes de Leitner
   */
  app.use("/leitnercards", router);
};
