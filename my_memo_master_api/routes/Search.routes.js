const express = require('express')
const searchController = require('../controllers/Search.controller')
const authMiddleware = require('../middlewares/Auth.middleware')
const validate = require('../middlewares/validate.middleware')
const searchValidators = require('../validators/Search.validators')

const router = express.Router()

/**
 * @swagger
 * /search:
 *   get:
 *     summary: Recherche cross-contenu par sujet et/ou texte libre
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: subjectId
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *         description: Filtrer par ID de sujet
 *       - name: q
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         description: Texte libre recherché dans le nom du contenu
 *     responses:
 *       200:
 *         description: Résultats de recherche regroupés par type de contenu
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mindMaps:
 *                   type: array
 *                 leitnerSystems:
 *                   type: array
 *                 tests:
 *                   type: array
 *       400:
 *         description: Paramètres invalides
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur interne du serveur
 */
router.get('/', authMiddleware, searchValidators.searchAll, validate, searchController.searchAll)

module.exports = (app) => {
  app.use('/search', router)
}
