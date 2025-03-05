const express = require("express");
const fieldTypeController = require("../controllers/FieldsType.controller.js");

const router = express.Router();
/**
 * @swagger
 * /fieldstypes/all:
 *   get:
 *     summary: Récupère tous les types de champs
 *     tags:
 *       - FieldsType
 *     responses:
 *       200:
 *         description: Liste de tous les types de champs
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
 *                     example: "Texte"
 *                   allowunit:
 *                     type: boolean
 *                     example: true
 *       500:
 *         description: Erreur interne du serveur
 */
router.get("/all", fieldTypeController.findAll);

/**
 * @swagger
 * /fieldstypes/{id}:
 *   get:
 *     summary: Récupère un type de champ par son ID
 *     tags:
 *       - FieldsType
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID du type de champ
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Détails du type de champ
 *       404:
 *         description: Type de champ non trouvé
 *       500:
 *         description: Erreur interne du serveur
 */
router.get("/:id", fieldTypeController.findOne);

/**
 * @swagger
 * /fieldstypes/add:
 *   post:
 *     summary: Ajoute un nouveau type de champ
 *     tags:
 *       - FieldsType
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Nombre"
 *               allowunit:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       201:
 *         description: Type de champ créé avec succès
 *       400:
 *         description: Données invalides
 *       500:
 *         description: Erreur interne du serveur
 */
router.post("/add", fieldTypeController.create);

module.exports = (app) => {
  /**
   * @swagger
   * tags:
   *   name: FieldsType
   *   description: Gestion des types de champs
   */
  app.use("/fieldstypes", router);
};
