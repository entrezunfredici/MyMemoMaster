const express = require("express");
const subject = require("../controllers/Subject.controller.js");

const router = express.Router();

/**
 * @swagger
 * /subjects/all:
 *   get:
 *     summary: Récupère tous les sujets
 *     tags:
 *       - Subjects
 *     responses:
 *       200:
 *         description: Liste de tous les sujets
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
 *                   mindMapId:
 *                     type: integer
 *                     example: 42
 *                   leitnerSystemId:
 *                     type: integer
 *                     example: 13
 *                   testId:
 *                     type: integer
 *                     example: 7
 *       500:
 *         description: Erreur interne du serveur
 */
router.get("/all", subject.findAll);

/**
 * @swagger
 * /subjects/{id}:
 *   get:
 *     summary: Récupère un sujet par son ID
 *     tags:
 *       - Subjects
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID du sujet
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sujet correspondant à l'ID
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
 *                 mindMapId:
 *                   type: integer
 *                   example: 42
 *                 leitnerSystemId:
 *                   type: integer
 *                   example: 13
 *                 testId:
 *                   type: integer
 *                   example: 7
 *       404:
 *         description: Sujet non trouvé
 *       500:
 *         description: Erreur interne du serveur
 */
router.get("/:id", subject.findOne);

/**
 * @swagger
 * /subjects/add:
 *   post:
 *     summary: Ajoute un nouveau sujet
 *     tags:
 *       - Subjects
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
 *               mindMapId:
 *                 type: integer
 *                 example: 42
 *               leitnerSystemId:
 *                 type: integer
 *                 example: 13
 *               testId:
 *                 type: integer
 *                 example: 7
 *     responses:
 *       201:
 *         description: Sujet créé avec succès
 *       400:
 *         description: Requête invalide
 *       500:
 *         description: Erreur interne du serveur
 */
router.post("/add", subject.create);

module.exports = (app) => {
    /**
     * @swagger
     * tags:
     *   - name: Subjects
     *     description: Gestion des sujets
     */
    app.use("/subjects", router);
};
