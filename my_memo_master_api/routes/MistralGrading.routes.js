const express = require('express')
const mistralGrading = require('../controllers/MistralGrading.controller')
const authMiddleware = require('../middlewares/Auth.middleware')
const validate = require('../middlewares/validate.middleware')
const gradingValidators = require('../validators/Grading.validators')

module.exports = function (app) {
  const router = express.Router()

  /**
   * @swagger
   * /grading/mistral:
   *   post:
   *     summary: Corriger une réponse par similarité sémantique, arbitrée par Mistral dans la zone intermédiaire
   *     description: >
   *       Calcule d'abord le score d'embedding (comme /grading/semantic). Mistral n'est appelé que si le
   *       score est entre 0,35 et 0,90 ; en cas d'indisponibilité, le verdict sémantique est renvoyé.
   *     tags: [Grading]
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
   *               question:
   *                 type: string
   *                 example: "Qu'est-ce qu'une transformation isochore ?"
   *               correct_answers:
   *                 oneOf:
   *                   - type: string
   *                   - type: array
   *                     items:
   *                       type: string
   *               student_answer:
   *                 type: string
   *                 example: "Une transformation où le volume reste identique"
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
   *                   format: float
   *                 strategy:
   *                   type: string
   *                   enum: [semantic, mistral]
   *                 explanation:
   *                   type: string
   *                 decision_zone:
   *                   type: string
   *                   enum: [high, low, inversion, llm]
   *       400:
   *         description: Champs manquants ou invalides
   *       401:
   *         description: Non authentifié
   *       500:
   *         description: Erreur serveur
   */
  router.post('/mistral', authMiddleware, gradingValidators.gradeMistral, validate, mistralGrading.gradeMistral)

  app.use('/grading', router)
}
