const authMiddleware = require('../middlewares/Auth.middleware')
const validate = require('../middlewares/validate.middleware')
const testResultValidators = require('../validators/TestResult.validators')
const testResult = require('../controllers/TestResult.controller')

module.exports = (router) => {
  /**
   * @swagger
   * tags:
   *   name: TestResults
   *   description: Historique des résultats d'exercices
   */

  /**
   * @swagger
   * /test-results:
   *   get:
   *     summary: Historique complet des résultats de l'utilisateur connecté
   *     tags: [TestResults]
   *     responses:
   *       200:
   *         description: Liste des résultats
   *       401:
   *         description: Non authentifié
   *       500:
   *         description: Erreur serveur
   */
  router.get('/test-results', authMiddleware, testResult.findByUser)

  /**
   * @swagger
   * /test-results/test/{testId}:
   *   get:
   *     summary: Résultats d'un exercice précis pour l'utilisateur connecté
   *     tags: [TestResults]
   *     parameters:
   *       - name: testId
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Liste des résultats pour cet exercice
   *       401:
   *         description: Non authentifié
   *       500:
   *         description: Erreur serveur
   */
  router.get('/test-results/test/:testId', authMiddleware, testResult.findByTest)

  /**
   * @swagger
   * /test-results:
   *   post:
   *     summary: Enregistrer le résultat d'un exercice complété
   *     tags: [TestResults]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [testId, score, total]
   *             properties:
   *               testId:
   *                 type: integer
   *               score:
   *                 type: integer
   *               total:
   *                 type: integer
   *     responses:
   *       201:
   *         description: Résultat enregistré
   *       400:
   *         description: Données invalides
   *       401:
   *         description: Non authentifié
   *       500:
   *         description: Erreur serveur
   */
  router.post('/test-results', authMiddleware, testResultValidators.create, validate, testResult.create)
}
