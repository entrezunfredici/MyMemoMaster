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
   *       Mistral juge toute réponse qui n'est pas une correspondance exacte (réponse vide, formule
   *       identique : aucun appel). Si le plafond de corrections est atteint ou si Mistral est
   *       indisponible, le verdict sémantique (MiniLM) est renvoyé avec `degraded: true`.
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
   *                   description: Note de la grille Mistral (0, 0.2, 0.4, 0.6, 0.8, 1 ; is_correct si >= 0.8) ; similarité 0-1 en mode dégradé
   *                 strategy:
   *                   type: string
   *                   enum: [semantic, mistral]
   *                 explanation:
   *                   type: string
   *                 decision_zone:
   *                   type: string
   *                   enum: [high, low, inversion, llm]
   *                 degraded:
   *                   type: boolean
   *                   description: Présent à true quand la correction est en mode dégradé
   *                 degraded_message:
   *                   type: string
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
