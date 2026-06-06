const express = require('express');
const semantic = require('../controllers/Semantic.controller');
const validate = require('../middlewares/validate.middleware');
const gradingValidators = require('../validators/Grading.validators');

module.exports = function (app) {
  const router = express.Router();

  /**
   * @swagger
   * /grading/semantic:
   *   post:
   *     summary: Corriger automatiquement une réponse par similarité sémantique
   *     tags: [Grading]
   *     security: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - correct_answers
   *               - student_answer
   *             properties:
   *               correct_answers:
   *                 oneOf:
   *                   - type: string
   *                     example: "Mémoire vive temporaire qui stocke les programmes et données en cours d'exécution."
   *                   - type: array
   *                     items:
   *                       type: string
   *                     example:
   *                       - "Mémoire vive temporaire qui stocke les programmes et données."
   *                       - "RAM utilisée pour exécuter les programmes"
   *               student_answer:
   *                 type: string
   *                 example: "C'est la mémoire qui garde les programmes pendant qu'on les utilise."
   *     responses:
   *       200:
   *         description: Résultat de la correction sémantique
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 is_correct:
   *                   type: boolean
   *                 score:
   *                   type: number
   *                   format: float
   *                 strategy:
   *                   type: string
   *                 explanation:
   *                   type: string
   *                 decision_zone:
   *                   type: string
   *                   enum: [high, low, grey_zone]
   *       400:
   *         description: Champs manquants ou invalides
   *       500:
   *         description: Erreur serveur
   */
  router.post('/semantic', gradingValidators.gradeSemantic, validate, semantic.gradeSemantic);

  app.use('/grading', router);
};
