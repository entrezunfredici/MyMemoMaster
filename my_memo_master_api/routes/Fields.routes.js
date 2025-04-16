const express = require("express");
const fieldController = require("../controllers/Fields.controller.js");

const router = express.Router();

/**
 * @swagger
 * /fields/all:
 *   get:
 *     summary: Récupère tous les champs
 *     tags:
 *       - Fields
 *     responses:
 *       200:
 *         description: Liste de tous les champs
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
 *                   fieldletter:
 *                     type: string
 *                     example: "A"
 *                   idType:
 *                     type: integer
 *                     example: 2
 *                   data:
 *                     type: string
 *                     example: "Exemple de données"
 *       500:
 *         description: Erreur interne du serveur
 */
router.get("/all", fieldController.findAll);

/**
 * @swagger
 * /fields/{id}:
 *   get:
 *     summary: Récupère un champ par son ID
 *     tags:
 *       - Fields
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID du champ
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Détails du champ
 *       404:
 *         description: Champ non trouvé
 *       500:
 *         description: Erreur interne du serveur
 */
router.get("/:id", fieldController.findOne);

/**
 * @swagger
 * /fields/add:
 *   post:
 *     summary: Ajoute un nouveau champ
 *     tags:
 *       - Fields
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fieldletter:
 *                 type: string
 *                 example: "B"
 *               idType:
 *                 type: integer
 *                 example: 3
 *               data:
 *                 type: object
 *                 example: {"value"="Données du champ"}
 *     responses:
 *       201:
 *         description: Champ créé avec succès
 *       400:
 *         description: Données invalides
 *       500:
 *         description: Erreur interne du serveur
 */
router.post("/add", fieldController.create);

/**
 * @swagger
 * /fields/{id}:
 *   put:
 *     summary: Modifie un champ existant
 *     tags:
 *       - Fields
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID du champ à modifier
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fieldletter:
 *                 type: string
 *                 example: "C"
 *               idType:
 *                 type: integer
 *                 example: 4
 *               data:
 *                 type: string
 *                 example: "Données mises à jour"
 *     responses:
 *       200:
 *         description: Champ mis à jour avec succès
 *       404:
 *         description: Champ non trouvé
 *       500:
 *         description: Erreur interne du serveur
 */
router.put("/:id", fieldController.update);

/**
 * @swagger
 * /fields/{id}:
 *   delete:
 *     summary: Supprime un champ
 *     tags:
 *       - Fields
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID du champ à supprimer
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Champ supprimé avec succès
 *       404:
 *         description: Champ non trouvé
 *       500:
 *         description: Erreur interne du serveur
 */
router.delete("/:id", fieldController.delete);

module.exports = (app) => {
  /**
   * @swagger
   * tags:
   *   name: Fields
   *   description: Gestion des champs
   */
  app.use("/fields", router);
};
