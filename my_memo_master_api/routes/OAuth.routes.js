const express = require('express')
const oauth = require('../controllers/OAuth.controller.js')
const validate = require('../middlewares/validate.middleware.js')
const oauthValidators = require('../validators/OAuth.validators.js')
const { authLimiter } = require('../middlewares/rateLimit.middleware.js')

const router = express.Router()

/**
 * @swagger
 * /users/oauth/providers:
 *   get:
 *     summary: Lister les fournisseurs de connexion OAuth activés (Google, GitHub, Microsoft)
 *     tags: [OAuth]
 *     security: []
 *     responses:
 *       200:
 *         description: Fournisseurs disponibles.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 providers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: google
 *                       label:
 *                         type: string
 *                         example: Google
 *       500:
 *         description: Erreur serveur.
 */
router.get('/providers', oauth.providers)

/**
 * @swagger
 * /users/oauth/{provider}/authorize-url:
 *   get:
 *     summary: Obtenir l'URL de redirection vers le fournisseur et le jeton state à conserver
 *     tags: [OAuth]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [google, github, microsoft]
 *     responses:
 *       200:
 *         description: URL d'autorisation et state.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                 state:
 *                   type: string
 *       400:
 *         description: Fournisseur inconnu.
 *       404:
 *         description: Fournisseur non configuré.
 *       500:
 *         description: Erreur serveur.
 */
router.get('/:provider/authorize-url', oauthValidators.authorizeUrl, validate, oauth.authorizeUrl)

/**
 * @swagger
 * /users/oauth/{provider}/login:
 *   post:
 *     summary: Terminer la connexion ou l'inscription OAuth avec le code reçu au retour du fournisseur
 *     description: Crée le compte s'il n'existe pas, le relie à un compte de même email vérifié, puis ouvre la session.
 *       Les administrateurs reçoivent un challengeToken (double authentification) au lieu d'une session.
 *     tags: [OAuth]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [google, github, microsoft]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *               state:
 *                 type: string
 *     responses:
 *       200:
 *         description: Connexion réussie (token et refreshToken) ou double authentification requise.
 *       400:
 *         description: Requête invalide, state expiré ou fournisseur sans email vérifié.
 *       401:
 *         description: Connexion refusée par le fournisseur.
 *       403:
 *         description: Compte désactivé ou inscriptions fermées.
 *       404:
 *         description: Fournisseur non configuré.
 *       409:
 *         description: Un compte existe déjà avec cet email (non relié automatiquement).
 *       502:
 *         description: Fournisseur injoignable.
 *       500:
 *         description: Erreur serveur.
 */
router.post('/:provider/login', authLimiter, oauthValidators.login, validate, oauth.login)

module.exports = (app) => {
  /**
   * @swagger
   * tags:
   *   - name: OAuth
   *     description: Connexion avec un fournisseur externe
   */
  app.use('/users/oauth', router)
}
