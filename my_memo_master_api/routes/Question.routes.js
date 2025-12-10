const express = require("express");
const QuestionController = require("../controllers/Question.controller.js");

const router = express.Router();

/**
 * @swagger
 * /questions/all:
 *   get:
 *     summary: Récupère toutes les questions
 *     tags:
 *       - Questions
 *     responses:
 *       200:
 *         description: Liste de toutes les questions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   idQuestion:
 *                     type: integer
 *                     example: 1
 *                   questionPosition:
 *                     type: integer
 *                     example: 1
 *                   statement:
 *                     type: string
 *                     example: "Énoncé de la question"
 *                   type:
 *                     type: string
 *                     example: "Type de la question"
 *       500:
 *         description: Erreur interne du serveur
 */
router.get("/all", QuestionController.getAllQuestions);

/**
 * @swagger
 * /questions/tests/{testId}:
 *   get:
 *     summary: Récupère les questions d'un test
 *     tags:
 *       - Questions
 *     parameters:
 *       - name: testId
 *         in: path
 *         required: true
 *         description: ID du test
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Liste des questions liées au test
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   idQuestion:
 *                     type: integer
 *                     example: 1
 *                   questionPosition:
 *                     type: integer
 *                     example: 1
 *                   statement:
 *                     type: string
 *                     example: "Énoncé de la question"
 *                   type:
 *                     type: string
 *                     example: "Type de la question"
 *       404:
 *         description: Test introuvable
 *       500:
 *         description: Erreur interne du serveur
 */
router.get("/tests/:testId", QuestionController.getQuestionsByTest);

/**
 * @swagger
 * /questions/card/{cardId}:
 *   get:
 *     summary: Récupère la question d'une carte de Leitner
 *     tags:
 *       - Questions
 *     parameters:
 *       - name: cardId
 *         in: path
 *         required: true
 *         description: ID de la carte de Leitner
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Question liée à la carte de Leitner
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 idQuestion:
 *                   type: integer
 *                   example: 1
 *                 questionPosition:
 *                   type: integer
 *                   example: 1
 *                 statement:
 *                   type: string
 *                   example: "Énoncé de la question"
 *                 type:
 *                   type: string
 *                   example: "Type de la question"
 *       404:
 *         description: Carte de Leitner introuvable
 *       500:
 *         description: Erreur interne du serveur
 */
router.get("/card/:cardId", QuestionController.getQuestionByCard);

/**
 * @swagger
 * /questions/{id}:
 *   get:
 *     summary: Récupère une question par son ID
 *     tags:
 *       - Questions
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de la question
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Question correspondante à l'ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 idQuestion:
 *                   type: integer
 *                   example: 1
 *                 questionPosition:
 *                   type: integer
 *                   example: 1
 *                 statement:
 *                   type: string
 *                   example: "Énoncé de la question"
 *                 type:
 *                   type: string
 *                   example: "Type de la question"
 *       404:
 *         description: Question non trouvée
 *       500:
 *         description: Erreur interne du serveur
 */
router.get("/:id", QuestionController.findOne);

/**
 * @swagger
 * /questions/correction/{id}:
 *   get:
 *     summary: Récupère la correction d'une question
 *     tags:
 *       - Questions
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de la question
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: La correction de la question
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 idResponse:
 *                   type: integer
 *                   example: 1
 *                 content:
 *                   type: string
 *                   example: "Correction exemple"
 *                 correction:
 *                   type: boolean
 *                   example: true
 *                 idQuestion:
 *                   type: integer
 *                   example: 42
 *       404:
 *         description: Aucune correction trouvée
 *       500:
 *         description: Erreur interne du serveur
 */
router.get("/correction/:id", QuestionController.getCorrectionByQuestion);

/**
 * @swagger
 * /questions/add:
 *   post:
 *     summary: Ajoute une nouvelle question
 *     tags:
 *       - Questions
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               statement:
 *                 type: string
 *                 example: "Énoncé de la question"
 *               questionPosition:
 *                 type: integer
 *                 example: 1
 *               type:
 *                 type: string
 *                 example: "Type de la question"
 *               idTest:
 *                 type: integer
 *                 example: 1
 *               idCard:
 *                 type: integer
 *                 example: 1
 *               idSystem:
 *                 type: integer
 *                 example: 1
 *               name:
 *                 type: string
 *                 example: "Question 1"
 *     responses:
 *       201:
 *         description: Question créée avec succès
 *       400:
 *         description: Requête invalide
 *       500:
 *         description: Erreur interne du serveur
 */
router.post("/add", QuestionController.create);

/**
 * @swagger
 * /questions/edit/{id}:
 *   put:
 *     summary: Met à jour une question existante
 *     tags:
 *       - Questions
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de la question
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               statement:
 *                 type: string
 *                 example: "Nouvel énoncé de la question"
 *               questionPosition:
 *                 type: integer
 *                 example: 1
 *               type:
 *                 type: string
 *                 example: "Type de la question"
 *               idTest:
 *                 type: integer
 *                 example: 1
 *               idCard:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Question mise à jour avec succès
 *       400:
 *         description: Requête invalide
 *       404:
 *         description: Question non trouvée
 *       500:
 *         description: Erreur interne du serveur
 */
router.put("/edit/:id", QuestionController.update);

/**
 * @swagger
 * /questions/{id}:
 *   delete:
 *     summary: Supprime une question par son ID
 *     tags:
 *       - Questions
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de la question
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Question supprimée avec succès
 *       404:
 *         description: Question non trouvée
 *       500:
 *         description: Erreur interne du serveur
 */
router.delete("/:id", QuestionController.delete);

module.exports = (app) => {
  /**
   * @swagger
   * tags:
   *   - name: Questions
   *     description: Gestion des questions
   */
  app.use("/questions", router);
};