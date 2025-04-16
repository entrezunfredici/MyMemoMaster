const express = require("express");
const diagramme = require("../controllers/Diagramme.controller.js");
const router = express.Router();

/**
 * @swagger
 * /diagramme/all:
 *   get:
 *     summary: Récupère tous les diagrammes
 *     tags:
 *       - diagramme
 *     responses:
 *       200:
 *         description: Liste de tous les diagrammes
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
 *                   mindMapsJson:
 *                     type: string
 *                     example: "json"
 *       500:
 *         description: Erreur interne du serveur
 */
router.get("/all", diagramme.findAll);

/**
 * @swagger
 * /diagramme/{id}:
 *   get:
 *     summary: Récupère un diagramme par son ID
 *     tags:
 *       - diagramme
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID du diagramme
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Diagramme correspondant à l'ID
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
 *                 mindMapsJson:
 *                   type: string
 *                   example: "json"
 *       404:
 *         description: Diagramme non trouvé
 *       500:
 *         description: Erreur interne du serveur
 */
router.get("/:id", diagramme.findOne);

/**
 * @swagger
 * /diagramme/add:
 *   post:
 *     summary: Ajoute un nouveau diagramme
 *     tags:
 *       - diagramme
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
 *               mindMapJson:
 *                 type: object
 *                 example: {"nodes": [5, 6, 7],"edges": [8, 9, 10]}
 *               userId:
 *                type: integer 
 *                example: 1
 *     responses:
 *       201:
 *         description: Diagramme créé avec succès
 *       400:
 *         description: Requête invalide
 *       500:
 *         description: Erreur interne du serveur
 */
router.post("/add", diagramme.create);

/**
 * @swagger
 * /diagramme/{id}:
 *   put:
 *     summary: Met à jour un diagramme existant
 *     tags:
 *       - diagramme
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID du diagramme à mettre à jour
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Updated Diagram Name"
 *               mindMapsJson:
 *                 type: string
 *                 example: "Updated JSON"
 *     responses:
 *       200:
 *         description: Diagramme mis à jour avec succès
 *       404:
 *         description: Diagramme non trouvé
 *       500:
 *         description: Erreur interne du serveur
 */
router.put("/:id", diagramme.update);

/**
 * @swagger
 * /diagramme/{id}:
 *   delete:
 *     summary: Supprime un diagramme par son ID
 *     tags:
 *       - diagramme
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID du diagramme à supprimer
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Diagramme supprimé avec succès
 *       404:
 *         description: Diagramme non trouvé
 *       500:
 *         description: Erreur interne du serveur
 */
router.delete("/:id", diagramme.delete);

module.exports = (app) => {
  /**
   * @swagger
   * tags:
   *   - name: diagramme
   *     description: Gestion des diagrammes
   */
  app.use("/diagramme", router);
};
