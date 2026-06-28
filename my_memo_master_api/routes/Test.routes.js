const express = require('express')
const test = require('../controllers/Test.controller.js')
const deadline = require('../controllers/Deadline.controller')
const authMiddleware = require('../middlewares/Auth.middleware')
const validate = require('../middlewares/validate.middleware')
const testValidators = require('../validators/Test.validators')

const router = express.Router()

/**
 * @swagger
 * /tests:
 *   get:
 *     summary: Récupère les tests accessibles à l'utilisateur connecté (ses tests + tests des groupes dont il est membre)
 *     tags:
 *       - Tests
 *     responses:
 *       200:
 *         description: Liste des tests
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur interne du serveur
 */
router.get('/', authMiddleware, test.findAll)

/**
 * @swagger
 * /tests/{id}:
 *   get:
 *     summary: Récupère un test par son ID (si l'utilisateur y a accès)
 *     tags:
 *       - Tests
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Test correspondant à l'ID
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Test non trouvé ou accès refusé
 *       500:
 *         description: Erreur interne du serveur
 */
router.get('/:id', authMiddleware, test.findOne)

/**
 * @swagger
 * /tests:
 *   post:
 *     summary: Crée un nouvel exercice (lié au créateur, privé par défaut)
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
 *               subjectId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Test créé avec succès
 *       400:
 *         description: Requête invalide
 *       500:
 *         description: Erreur interne du serveur
 */
router.post('/', authMiddleware, testValidators.create, validate, test.create)

/**
 * @swagger
 * /tests/{id}:
 *   put:
 *     summary: Met à jour un test (propriétaire uniquement)
 *     tags:
 *       - Tests
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Test mis à jour avec succès
 *       403:
 *         description: Accès interdit
 *       404:
 *         description: Test non trouvé
 *       500:
 *         description: Erreur interne du serveur
 */
router.put('/:id', authMiddleware, testValidators.update, validate, test.update)

/**
 * @swagger
 * /tests/{id}:
 *   delete:
 *     summary: Supprime un test (propriétaire uniquement)
 *     tags:
 *       - Tests
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Test supprimé avec succès
 *       403:
 *         description: Accès interdit
 *       404:
 *         description: Test non trouvé
 *       500:
 *         description: Erreur interne du serveur
 */
router.delete('/:id', authMiddleware, test.delete)

router.post('/:id/submit', authMiddleware, testValidators.submit, validate, test.submit)

/**
 * @swagger
 * /tests/{id}/groups:
 *   post:
 *     summary: Assigne (ou désassigne) un test à des groupes classes — enseignant propriétaire uniquement
 *     tags: [Tests]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               groupIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Liste des IDs de groupes. Tableau vide = test redevient privé.
 *     responses:
 *       200:
 *         description: Groupes mis à jour avec succès.
 *       403:
 *         description: Accès interdit.
 *       404:
 *         description: Test non trouvé.
 *       500:
 *         description: Erreur serveur.
 */
router.post('/:id/groups', authMiddleware, testValidators.assignGroups, validate, test.assignGroups)

/**
 * @swagger
 * /tests/{id}/deadlines:
 *   get:
 *     summary: Lister les échéances liées à un exercice
 *     tags: [Tests]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Échéances récupérées avec succès.
 *       401:
 *         description: Non authentifié.
 *       500:
 *         description: Erreur serveur.
 */
router.get('/:id/deadlines', authMiddleware, deadline.findByTest)

module.exports = (app) => {
  /**
   * @swagger
   * tags:
   *   - name: Tests
   *     description: Gestion des tests
   */
  app.use('/tests', router)
}
