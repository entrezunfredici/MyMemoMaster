const express = require('express');
const grading = require('../controllers/Grading.controller');

module.exports = function (app) {
  const router = express.Router();

  /**
   * @swagger
   * /grading/date:
   *   post:
   *     summary: Corriger automatiquement une réponse de type date
   *     tags: [Grading]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - correct_answer
   *               - student_answer
   *             properties:
   *               correct_answer:
   *                 type: string
   *                 example: "1939"
   *               student_answer:
   *                 type: string
   *                 example: "1er septembre 1939"
   *     responses:
   *       200:
   *         description: Résultat de la correction
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 is_correct:
   *                   type: boolean
   *                 score:
   *                   type: number
   *                 strategy:
   *                   type: string
   *                 explanation:
   *                   type: string
   *       400:
   *         description: Champs manquants ou invalides
   *       500:
   *         description: Erreur serveur
   */
  router.post('/date', grading.gradeDateAnswer);

  app.use('/grading', router);
};
