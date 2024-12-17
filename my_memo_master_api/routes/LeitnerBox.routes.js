const express = require("express");
const leitnerBox = require("../controllers/LeitnerBox.controller.js");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: LeitnerBoxes
 *   description: Gestion des boîtes de Leitner
 */

/**
 * @swagger
 * /leitnerboxes/all:
 *   get:
 *     summary: Obtenir toutes les boîtes de Leitner
 *     tags: [LeitnerBoxes]
 *     responses:
 *       200:
 *         description: Liste de toutes les boîtes récupérée avec succès.
 *       500:
 *         description: Erreur serveur.
 */
router.get("/all", leitnerBox.findAll);

/**
 * @swagger
 * /leitnerboxes/{id}:
 *   get:
 *     summary: Obtenir une boîte de Leitner par ID
 *     tags: [LeitnerBoxes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la boîte
 *     responses:
 *       200:
 *         description: Boîte récupérée avec succès.
 *       404:
 *         description: Boîte non trouvée.
 *       500:
 *         description: Erreur serveur.
 */
router.get("/:id", leitnerBox.findOne);

/**
 * @swagger
 * /leitnerboxes/add:
 *   post:
 *     summary: Ajouter une nouvelle boîte de Leitner
 *     tags: [LeitnerBoxes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               level:
 *                 type: integer
 *                 example: 2
 *               intervall:
 *                 type: integer
 *                 example: 5
 *               color:
 *                 type: integer
 *                 example: 16777215
 *               idSystem:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Boîte créée avec succès.
 *       500:
 *         description: Erreur serveur.
 */
router.post("/add", leitnerBox.create);

/**
 * @swagger
 * /leitnerboxes/edit:
 *   post:
 *     summary: Modifier une boîte de Leitner existante
 *     tags: [LeitnerBoxes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               idBox:
 *                 type: integer
 *                 example: 1
 *               level:
 *                 type: integer
 *                 example: 3
 *               intervall:
 *                 type: integer
 *                 example: 7
 *               color:
 *                 type: integer
 *                 example: 255
 *     responses:
 *       200:
 *         description: Boîte mise à jour avec succès.
 *       404:
 *         description: Boîte non trouvée.
 *       500:
 *         description: Erreur serveur.
 */
router.post("/edit", leitnerBox.update);

/**
 * @swagger
 * /leitnerboxes/{id}:
 *   delete:
 *     summary: Supprimer une boîte de Leitner par ID
 *     tags: [LeitnerBoxes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la boîte
 *     responses:
 *       200:
 *         description: Boîte supprimée avec succès.
 *       404:
 *         description: Boîte non trouvée.
 *       500:
 *         description: Erreur serveur.
 */
router.delete("/:id", leitnerBox.delete);

module.exports = (app) => {
  app.use("/leitnerboxes", router);
};
