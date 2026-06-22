const { Test, Subject, Question, TestResult } = require('../models/index')
const semanticService = require('./Semantic.service')

/**
 * @swagger
 * tags:
 *   name: Tests
 *   description: Gestion des tests
 */
class TestService {
  /**
   * @swagger
   * path:
   *   /service/tests:
   *     get:
   *       summary: Récupérer tous les tests
   *       description: Récupère la liste complète des tests.
   *       tags: [Tests]
   *       responses:
   *         200:
   *           description: Liste des tests
   *           content:
   *             application/json:
   *               schema:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: integer
   *                       example: 1
   *                     name:
   *                       type: string
   *                       example: "Test de connaissance"
   *                     subjectId:
   *                       type: integer
   *                       example: 1
   *         500:
   *           description: Erreur interne du serveur
   */
  async findAll() {
    return await Test.findAll({
      include: [{ model: Subject, as: 'subject', attributes: ['subjectId', 'name'] }]
    })
  }

  /**
   * @swagger
   * path:
   *   /service/tests/{id}:
   *     get:
   *       summary: Récupérer un test par ID
   *       description: Récupère un test spécifique en fonction de l'ID fourni.
   *       tags: [Tests]
   *       parameters:
   *         - in: path
   *           name: id
   *           required: true
   *           schema:
   *             type: integer
   *           description: ID du test à récupérer.
   *       responses:
   *         200:
   *           description: Détails du test
   *           content:
   *             application/json:
   *               schema:
   *                 type: object
   *                 properties:
   *                   id:
   *                     type: integer
   *                     example: 1
   *                   name:
   *                     type: string
   *                     example: "Test de connaissance"
   *                   subjectId:
   *                     type: integer
   *                     example: 1
   *         404:
   *           description: Test non trouvé
   *         500:
   *           description: Erreur interne du serveur
   */
  async findOne(id) {
    return await Test.findByPk(id, {
      include: [
        { model: Subject, as: 'subject', attributes: ['subjectId', 'name'] },
        { model: Question, as: 'question', attributes: ['idQuestion', 'statement', 'type', 'content', 'questionPosition'] }
      ],
      order: [[{ model: Question, as: 'question' }, 'questionPosition', 'ASC']]
    })
  }

  /**
   * @swagger
   * path:
   *   /service/tests:
   *     post:
   *       summary: Créer un nouveau test
   *       description: Crée un test avec les données fournies.
   *       tags: [Tests]
   *       requestBody:
   *         required: true
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 name:
   *                   type: string
   *                   example: "Test de connaissance"
   *                 subjectId:
   *                   type: integer
   *                   example: 1
   *       responses:
   *         201:
   *           description: Test créé avec succès
   *           content:
   *             application/json:
   *               schema:
   *                 type: object
   *                 properties:
   *                   id:
   *                     type: integer
   *                     example: 1
   *                   name:
   *                     type: string
   *                     example: "Test de connaissance"
   *                   subjectId:
   *                     type: integer
   *                     example: 1
   *         400:
   *           description: Requête invalide
   *         500:
   *           description: Erreur interne du serveur
   */
  async create(data) {
    return await Test.create(data)
  }

  /**
   * @swagger
   * path:
   *   /service/tests/{id}:
   *     put:
   *       summary: Mettre à jour un test existant
   *       description: Met à jour les informations d'un test existant en fonction de l'ID fourni.
   *       tags: [Tests]
   *       parameters:
   *         - in: path
   *           name: id
   *           required: true
   *           schema:
   *             type: integer
   *           description: ID du test à mettre à jour.
   *       requestBody:
   *         required: true
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 name:
   *                   type: string
   *                   example: "Test de mise à jour"
   *                 subjectId:
   *                   type: integer
   *                   example: 1
   *       responses:
   *         200:
   *           description: Test mis à jour avec succès
   *           content:
   *             application/json:
   *               schema:
   *                 type: object
   *                 properties:
   *                   id:
   *                     type: integer
   *                     example: 1
   *                   name:
   *                     type: string
   *                     example: "Test de mise à jour"
   *                   subjectId:
   *                     type: integer
   *                     example: 1
   *         400:
   *           description: Requête invalide
   *         404:
   *           description: Test non trouvé
   *         500:
   *           description: Erreur interne du serveur
   */
  async update(id, data) {
    const test = await Test.findByPk(id)
    if (!test) {
      throw new Error(' Test not found')
    }
    return await test.update(data)
  }

  /**
   * @swagger
   * path:
   *   /service/tests/{id}:
   *     delete:
   *       summary: Supprimer un test
   *       description: Supprime un test en fonction de l'ID fourni.
   *       tags: [Tests]
   *       parameters:
   *         - in: path
   *           name: id
   *           required: true
   *           schema:
   *             type: integer
   *           description: ID du test à supprimer.
   *       responses:
   *         200:
   *           description: Test supprimé avec succès
   *         404:
   *           description: Test non trouvé
   *         500:
   *           description: Erreur interne du serveur
   */
  async delete(id) {
    const test = await Test.findByPk(id)
    if (!test) {
      throw new Error('Test not found')
    }
    return await test.destroy()
  }

  /**
   * Évalue les réponses d'un utilisateur, sauvegarde le TestResult et retourne la correction.
   * @param {number} testId
   * @param {number} userId
   * @param {Array<{questionId: number, answer: *}>} answers
   * @returns {{ score, total, results, resultId }|null}
   */
  async submitAnswers(testId, userId, answers) {
    const test = await Test.findByPk(testId, {
      include: [{
        model: Question,
        as: 'question',
        attributes: ['idQuestion', 'type', 'content', 'questionPosition']
      }],
      order: [[{ model: Question, as: 'question' }, 'questionPosition', 'ASC']]
    })
    if (!test) return null

    const questions = test.question ?? []
    const results = await Promise.all(questions.map(async q => {
      const submission = answers.find(a => a.questionId === q.idQuestion)
      const { correct, explanation, semanticScore, points } = await this._checkAnswer(q, submission?.answer ?? null)
      return {
        questionId: q.idQuestion,
        correct,
        correctAnswer: this._formatCorrectAnswer(q),
        explanation,
        semanticScore,
        points
      }
    }))

    const score = parseFloat(results.reduce((acc, r) => acc + r.points, 0).toFixed(2))
    const testResult = await TestResult.create({ testId, userId, score, total: questions.length })
    return { score, total: questions.length, results, resultId: testResult.resultId }
  }

  async _checkAnswer(question, answer) {
    const content = question.content ?? {}
    switch (question.type) {
      case 'open': {
        const user = (answer ?? '').trim()
        if (!user) return { correct: false, explanation: null, semanticScore: null, points: 0 }
        const correctAnswer = (content.correct_answer ?? '').trim()
        if (!correctAnswer) return { correct: false, explanation: null, semanticScore: null, points: 0 }
        const result = await semanticService.gradeSemantic(correctAnswer, user)
        return { correct: result.is_correct, explanation: result.explanation, semanticScore: result.score, points: result.score }
      }
      case 'mcq': {
        if (answer === null || answer === undefined) return { correct: false, explanation: null, semanticScore: null, points: 0 }
        const idx = Number(answer)
        const opts = content.options ?? []
        const correct = !isNaN(idx) && opts[idx]?.correct === true
        return { correct, explanation: null, semanticScore: null, points: correct ? 1 : 0 }
      }
      case 'fill_blank': {
        const blanks = content.blanks ?? []
        const userBlanks = Array.isArray(answer) ? answer : []
        const correct = (
          blanks.length > 0 &&
          blanks.every((b, i) => (userBlanks[i] ?? '').trim().toLowerCase() === b.trim().toLowerCase())
        )
        return { correct, explanation: null, semanticScore: null, points: correct ? 1 : 0 }
      }
      case 'reorder': {
        const fragments = content.fragments ?? []
        const userOrder = Array.isArray(answer) ? answer : []
        const correct = (
          fragments.length > 0 &&
          fragments.length === userOrder.length &&
          fragments.every((f, i) => f === userOrder[i])
        )
        return { correct, explanation: null, semanticScore: null, points: correct ? 1 : 0 }
      }
      default:
        return { correct: false, explanation: null, semanticScore: null, points: 0 }
    }
  }

  _formatCorrectAnswer(question) {
    const content = question.content ?? {}
    switch (question.type) {
      case 'open': return content.correct_answer ?? '—'
      case 'mcq': {
        const correct = (content.options ?? []).find(o => o.correct)
        return correct?.text ?? '—'
      }
      case 'fill_blank': return (content.blanks ?? []).join(' / ')
      case 'reorder': return (content.fragments ?? []).join(' ')
      default: return '—'
    }
  }
}

module.exports = new TestService()
