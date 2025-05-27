const express = require("express");
const test = require("../controllers/Test.controller.js");

const router = express.Router();

/**
 * @swagger
 * /tests/all:
 *   get:
 *     summary: Récupère la liste complète des tests.
 *     tags:
 *       - Tests
 *     responses:
 *       201:
 *         description: Test créé avec succès
 *       400:
 *         description: Requête invalide
 *       500:
 *         description: Erreur interne du serveur
 *
 */
router.get("/all", test.findAll);

/**
 * @swagger
 * /Tests/{id}:
 *   get:
 *     summary: Récupère un test par son ID
 *     tags:
 *       - Tests
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID du Test
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Test correspondant à l'ID
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
 *                   example: "controle m1"
 *                 subjectId:
 *                   type: integer
 *                   example: 42
 *       404:
 *         description: test non trouvé
 *       500:
 *         description: Erreur interne du serveur
 */
router.get("/:id", test.findOne);

/**
 * @swagger
 * /tests/add:
 *   post:
 *     summary: Ajoute un nouveau test
 *     tags:
 *       - Tests
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Controle M1"
 *               subjectId:
 *                 type: integer
 *                 example: 42
 *     responses:
 *       201:
 *         description: Test créé avec succès
 *       400:
 *         description: Requête invalide
 *       500:
 *         description: Erreur interne du serveur
 *
 */
router.post("/add", test.create);

/**
 * @swagger
 * /tests/{id}:
 *   put:
 *     summary: Met à jour un test existant
 *     tags:
 *       - Tests
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID du Test à mettre à jour
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
 *                 example: "Controle M1 modifié"
 *               subjectId:
 *                 type: integer
 *                 example: 42
 *     responses:
 *       200:
 *         description: Test mis à jour avec succès
 *       400:
 *         description: Requête invalide
 *       404:
 *         description: Test non trouvé
 *       500:
 *         description: Erreur interne du serveur
 */
router.put("/:id", test.update);

/**
 * @swagger
 * /tests/{id}:
 *   delete:
 *     summary: Supprime un test par son ID
 *     tags:
 *       - Tests
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID du Test à supprimer
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Test supprimé avec succès
 *       404:
 *         description: Test non trouvé
 *       500:
 *         description: Erreur interne du serveur
 */
router.delete("/:id", test.delete);

module.exports = (app) => {
    /**
     * @swagger
     * tags:
     *   - name: Tests
     *     description: Gestion des tests
     */
    app.use("/tests", router);
};
