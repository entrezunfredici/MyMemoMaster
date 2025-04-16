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