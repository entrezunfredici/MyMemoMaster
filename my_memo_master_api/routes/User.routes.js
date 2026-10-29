const express = require('express')
const user = require('../controllers/User.controller.js')
const userData = require('../controllers/UserData.controller.js')
const authMiddleware = require('../middlewares/Auth.middleware.js')
const requireRole = require('../middlewares/requireRole.middleware')
const validate = require('../middlewares/validate.middleware.js')
const userValidators = require('../validators/User.validators.js')
const { authLimiter, registerLimiter, dataTransferLimiter } = require('../middlewares/rateLimit.middleware.js')

const router = express.Router()

// ── Routes publiques (pas d'authMiddleware) ────────────────────────────────

/**
 * @swagger
 * /users/register:
 *   post:
 *     summary: Inscrire un nouvel utilisateur
 *     tags: [Users]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "mathieu"
 *               password:
 *                 type: string
 *                 example: "mypassword123"
 *               email:
 *                 type: string
 *                 example: "mathieu@example.com"
 *     responses:
 *       201:
 *         description: Utilisateur inscrit avec succès.
 *       500:
 *         description: Erreur lors de l'inscription.
 */
router.post('/register', registerLimiter, userValidators.register, validate, user.register)

/**
 * @swagger
 * /users/registration-status:
 *   get:
 *     summary: Vérifier si les inscriptions sont encore ouvertes (limite MAX_USERS)
 *     tags: [Users]
 *     security: []
 *     responses:
 *       200:
 *         description: Statut des inscriptions.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 open:
 *                   type: boolean
 *       500:
 *         description: Erreur serveur.
 */
router.get('/registration-status', user.registrationStatus)

/**
 * @swagger
 * /users/login:
 *   post:
 *     summary: Connecter un utilisateur et obtenir un Token JWT
 *     tags: [Users]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "mathieu@example.com"
 *               password:
 *                 type: string
 *                 example: "mypassword123"
 *     responses:
 *       200:
 *         description: Connexion réussie, JWT généré.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *       401:
 *         description: Mot de passe incorrect.
 *       404:
 *         description: Utilisateur introuvable.
 *       500:
 *         description: Erreur serveur.
 */
router.post('/login', authLimiter, userValidators.login, validate, user.login)

/**
 * @swagger
 * /users/login/2fa:
 *   post:
 *     summary: Terminer la connexion avec le code reçu par email (double authentification)
 *     description: Le challengeToken est celui renvoyé par /users/login quand twoFactorRequired vaut true.
 *     tags: [Users]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               challengeToken:
 *                 type: string
 *               code:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Connexion réussie (token et refreshToken).
 *       401:
 *         description: Code invalide ou expiré, ou jeton de vérification expiré.
 *       403:
 *         description: Compte désactivé.
 *       500:
 *         description: Erreur serveur.
 */
router.post('/login/2fa', authLimiter, userValidators.verifyTwoFactor, validate, user.verifyTwoFactor)

/**
 * @swagger
 * /users/login/2fa/resend:
 *   post:
 *     summary: Renvoyer le code de double authentification par email
 *     tags: [Users]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               challengeToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Nouveau code envoyé.
 *       401:
 *         description: Jeton de vérification expiré.
 *       429:
 *         description: Un code a été envoyé il y a moins d'une minute.
 *       500:
 *         description: Erreur serveur.
 */
router.post('/login/2fa/resend', authLimiter, userValidators.resendTwoFactor, validate, user.resendTwoFactor)

/**
 * @swagger
 * /users/verify-email:
 *   post:
 *     summary: Vérifier l'email d'un utilisateur
 *     tags: [Users]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "mathieu@example.com"
 *               code:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       201:
 *         description: Email vérifié avec succès.
 *       401:
 *         description: Code invalide.
 *       404:
 *         description: Utilisateur introuvable.
 *       500:
 *         description: Erreur serveur.
 */
router.post('/verify-email', authLimiter, user.verifyEmail)

router.post(
  '/resend-verification',
  authLimiter,
  userValidators.resendVerification,
  validate,
  user.resendVerification
)

/**
 * @swagger
 * /users/forgot-password:
 *   post:
 *     summary: Envoyer un code de réinitialisation de mot de passe
 *     tags: [Users]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "mathieu@example.com"
 *     responses:
 *       200:
 *         description: Réponse générique (envoyé si l'email existe — anti-énumération).
 *       500:
 *         description: Erreur serveur.
 */
router.post(
  '/forgot-password',
  authLimiter,
  userValidators.forgotPassword,
  validate,
  user.forgotPassword
)

/**
 * @swagger
 * /users/reset-password:
 *   post:
 *     summary: Réinitialiser le mot de passe
 *     tags: [Users]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "mathieu@example.com"
 *               code:
 *                 type: string
 *                 example: "123456"
 *               newPassword:
 *                 type: string
 *                 example: "newpassword123"
 *     responses:
 *       201:
 *         description: Mot de passe réinitialisé avec succès.
 *       401:
 *         description: Code invalide (ou email inconnu — anti-énumération).
 *       500:
 *         description: Erreur serveur.
 */
router.post(
  '/reset-password',
  authLimiter,
  userValidators.resetPassword,
  validate,
  user.resetPassword
)

/**
 * @swagger
 * /users/refresh-token:
 *   post:
 *     summary: Renouveler l'access token via le refresh token
 *     tags: [Users]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: "abc123..."
 *     responses:
 *       200:
 *         description: Nouveaux tokens générés.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       401:
 *         description: Token de rafraîchissement invalide ou expiré.
 *       500:
 *         description: Erreur serveur.
 */
router.post('/refresh-token', authLimiter, userValidators.refreshToken, validate, user.refreshToken)

/**
 * @swagger
 * /users/logout:
 *   post:
 *     summary: Déconnecter l'utilisateur et révoquer le refresh token
 *     tags: [Users]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: "abc123..."
 *     responses:
 *       200:
 *         description: Déconnexion réussie.
 *       500:
 *         description: Erreur serveur.
 */
router.post('/logout', userValidators.refreshToken, validate, user.logout)

// ── Routes protégées (authMiddleware requis) ───────────────────────────────

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Rechercher des comptes (administrateur plateforme)
 *     description: Liste paginée, sans mot de passe ni jeton. Réservée au rôle 1.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Texte cherché dans le nom ou l'e-mail
 *       - in: query
 *         name: roleId
 *         schema:
 *           type: integer
 *         description: Filtrer par rôle
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *     responses:
 *       200:
 *         description: "Comptes récupérés ({ users, total, page, limit })."
 *       401:
 *         description: Non authentifié ou compte désactivé.
 *       403:
 *         description: Accès refusé.
 *       500:
 *         description: Erreur serveur.
 */
router.get('/', authMiddleware, requireRole(1), user.search)

/**
 * @swagger
 * /users/two-factor:
 *   put:
 *     summary: Activer ou désactiver la double authentification par email
 *     description: Confirmation par mot de passe. La désactivation est refusée aux administrateurs (rôles 1 et 4).
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Réglage enregistré.
 *       401:
 *         description: Mot de passe incorrect.
 *       403:
 *         description: Double authentification obligatoire pour ce rôle.
 *       500:
 *         description: Erreur serveur.
 */
// Déclarée avant PUT /:id, sinon « two-factor » serait pris pour un identifiant
router.put('/two-factor', authMiddleware, userValidators.setTwoFactor, validate, user.setTwoFactor)

/**
 * @swagger
 * /users/me/export:
 *   get:
 *     summary: Exporter toutes mes données (JSON)
 *     description: Profil, systèmes Leitner (boîtes, cartes, réponses), cartes mentales, exercices et activité. Aucun secret n'est inclus.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Fichier JSON à télécharger.
 *       404:
 *         description: Utilisateur introuvable.
 *       429:
 *         description: Trop d'exports demandés.
 *       500:
 *         description: Erreur serveur.
 */
// Déclarées avant GET /:id, sinon « me » serait pris pour un identifiant
router.get('/me/export', authMiddleware, dataTransferLimiter, userData.exportMyData)

/**
 * @swagger
 * /users/me/import:
 *   post:
 *     summary: Importer un export MyMemoMaster
 *     description: Fusionne les systèmes Leitner et cartes mentales du fichier avec ceux de mon compte (identique = inchangé, éléments manquants = ajoutés, inconnu = créé). Rien n'est écrasé ni supprimé ; le profil n'est jamais modifié.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               format:
 *                 type: string
 *                 example: mymemomaster-export
 *               version:
 *                 type: integer
 *                 example: 1
 *               leitnerSystems:
 *                 type: array
 *                 items:
 *                   type: object
 *               mindMaps:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Import terminé (bilan des éléments créés, fusionnés, inchangés et ignorés).
 *       400:
 *         description: Fichier invalide.
 *       429:
 *         description: Trop d'imports demandés.
 *       500:
 *         description: Erreur serveur.
 */
router.post('/me/import', authMiddleware, dataTransferLimiter, userValidators.importData, validate, userData.importMyData)

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Récupérer un utilisateur par son ID
 *     tags: [Users]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de l'utilisateur à récupérer
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Détails de l'utilisateur.
 *       404:
 *         description: Utilisateur non trouvé.
 *       500:
 *         description: Erreur serveur.
 */
router.get('/:id', authMiddleware, user.findOne)

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Mettre à jour un utilisateur
 *     tags:
 *       - Users
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de l'utilisateur
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "updated_name"
 *               email:
 *                 type: string
 *                 example: "updated_email@example.com"
 *     responses:
 *       200:
 *         description: Utilisateur mis à jour avec succès.
 *       404:
 *         description: Utilisateur non trouvé.
 *       500:
 *         description: Erreur serveur.
 */
router.put('/:id', authMiddleware, userValidators.update, validate, user.update)

/**
 * @swagger
 * /users/{id}/change-password:
 *   put:
 *     summary: Modifier le mot de passe d'un utilisateur
 *     tags: [Users]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de l'utilisateur
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 example: "oldpassword123"
 *               newPassword:
 *                 type: string
 *                 example: "newpassword123"
 *     responses:
 *       200:
 *         description: Mot de passe modifié avec succès.
 *       401:
 *         description: Ancien mot de passe incorrect.
 *       404:
 *         description: Utilisateur non trouvé.
 *       500:
 *         description: Erreur serveur.
 */
router.put(
  '/:id/change-password',
  authMiddleware,
  userValidators.changePassword,
  validate,
  user.changePassword
)

/**
 * @swagger
 * /users/{id}/role:
 *   post:
 *     summary: Ajouter un rôle à un utilisateur
 *     tags: [Users]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de l'utilisateur
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               roleId:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       200:
 *         description: Rôle ajouté avec succès.
 *       500:
 *         description: Erreur lors de l'ajout du rôle.
 */
router.post('/:id/role', authMiddleware, requireRole(1), user.addRole)

/**
 * @swagger
 * /users/{id}/role:
 *   put:
 *     summary: Mettre à jour le rôle d'un utilisateur
 *     tags: [Users]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de l'utilisateur
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               roleId:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       200:
 *         description: Rôle mis à jour avec succès.
 *       500:
 *         description: Erreur lors de la mise à jour du rôle.
 */
router.put('/:id/role', authMiddleware, requireRole(1), user.updateRole)

/**
 * @swagger
 * /users/{id}/role:
 *   delete:
 *     summary: Supprimer un rôle d'un utilisateur
 *     tags: [Users]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de l'utilisateur
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               roleId:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       200:
 *         description: Rôle supprimé avec succès.
 *       500:
 *         description: Erreur lors de la suppression du rôle.
 */
router.delete('/:id/role', authMiddleware, requireRole(1), user.removeRole)

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Supprimer un utilisateur
 *     tags: [Users]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de l'utilisateur à supprimer
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Utilisateur supprimé avec succès.
 *       403:
 *         description: Opération non autorisée.
 *       500:
 *         description: Erreur lors de la suppression.
 */
/**
 * @swagger
 * /users/{id}/activate:
 *   patch:
 *     summary: Activer le compte d'un utilisateur
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Compte activé.
 *       403:
 *         description: Accès refusé.
 *       404:
 *         description: Utilisateur introuvable.
 */
router.patch('/:id/activate', authMiddleware, requireRole(1, 4), user.activate)

/**
 * @swagger
 * /users/{id}/deactivate:
 *   patch:
 *     summary: Désactiver le compte d'un utilisateur
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Compte désactivé.
 *       403:
 *         description: Accès refusé.
 *       404:
 *         description: Utilisateur introuvable.
 */
router.patch('/:id/deactivate', authMiddleware, requireRole(1, 4), user.deactivate)

router.delete('/:id', authMiddleware, user.delete)

module.exports = (app) => {
  /**
   * @swagger
   * tags:
   *   - name: Users
   *     description: Gestion des utilisateurs
   */
  app.use('/users', router)
}
