const express = require('express')
const classGroup = require('../controllers/ClassGroup.controller')
const invitation = require('../controllers/Invitation.controller')
const authMiddleware = require('../middlewares/Auth.middleware')
const validate = require('../middlewares/validate.middleware')
const classGroupValidators = require('../validators/ClassGroup.validators')
const invitationValidators = require('../validators/Invitation.validators')

const router = express.Router()

/**
 * @swagger
 * /class-groups:
 *   get:
 *     summary: Lister les groupes classes visibles
 *     tags: [ClassGroup]
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès.
 *       401:
 *         description: Non authentifié.
 *       500:
 *         description: Erreur serveur.
 */
router.get('/', authMiddleware, classGroup.findAll)

/**
 * @swagger
 * /class-groups/{id}:
 *   get:
 *     summary: Récupérer un groupe classe avec ses membres
 *     tags: [ClassGroup]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Groupe récupéré avec succès.
 *       404:
 *         description: Groupe introuvable.
 *       500:
 *         description: Erreur serveur.
 */
router.get('/:id', authMiddleware, classGroup.findOne)

/**
 * @swagger
 * /class-groups:
 *   post:
 *     summary: Créer un groupe classe (admin uniquement)
 *     tags: [ClassGroup]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Groupe créé avec succès.
 *       400:
 *         description: Données invalides.
 *       403:
 *         description: Accès refusé.
 *       500:
 *         description: Erreur serveur.
 */
router.post('/', authMiddleware, classGroupValidators.create, validate, classGroup.create)

/**
 * @swagger
 * /class-groups/{id}:
 *   put:
 *     summary: Mettre à jour un groupe classe (admin uniquement)
 *     tags: [ClassGroup]
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Groupe mis à jour avec succès.
 *       403:
 *         description: Accès refusé.
 *       404:
 *         description: Groupe introuvable.
 *       500:
 *         description: Erreur serveur.
 */
router.put('/:id', authMiddleware, classGroupValidators.update, validate, classGroup.update)

/**
 * @swagger
 * /class-groups/{id}:
 *   delete:
 *     summary: Supprimer un groupe classe (admin uniquement)
 *     tags: [ClassGroup]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Groupe supprimé avec succès.
 *       403:
 *         description: Accès refusé.
 *       404:
 *         description: Groupe introuvable.
 *       500:
 *         description: Erreur serveur.
 */
router.delete('/:id', authMiddleware, classGroup.delete)

/**
 * @swagger
 * /class-groups/{id}/members:
 *   post:
 *     summary: Ajouter un membre à un groupe (admin uniquement)
 *     tags: [ClassGroup]
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
 *             required: [userId, role]
 *             properties:
 *               userId:
 *                 type: integer
 *               role:
 *                 type: string
 *                 enum: [teacher, student]
 *     responses:
 *       201:
 *         description: Membre ajouté avec succès.
 *       400:
 *         description: Données invalides.
 *       403:
 *         description: Accès refusé.
 *       404:
 *         description: Groupe introuvable.
 *       500:
 *         description: Erreur serveur.
 */
router.post(
  '/:id/members',
  authMiddleware,
  classGroupValidators.addMember,
  validate,
  classGroup.addMember
)

/**
 * @swagger
 * /class-groups/{id}/members/{userId}:
 *   delete:
 *     summary: Retirer un membre d'un groupe (admin uniquement)
 *     tags: [ClassGroup]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Membre retiré avec succès.
 *       403:
 *         description: Accès refusé.
 *       404:
 *         description: Membre introuvable.
 *       500:
 *         description: Erreur serveur.
 */
router.delete('/:id/members/:userId', authMiddleware, classGroup.removeMember)

/**
 * @swagger
 * /class-groups/{id}/kpi:
 *   get:
 *     summary: Indicateurs clés du groupe (admin et enseignants)
 *     tags: [ClassGroup]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: KPI calculés.
 *       403:
 *         description: Accès refusé.
 *       404:
 *         description: Groupe introuvable.
 */
router.get('/:id/kpi', authMiddleware, classGroup.getKpi)

/**
 * @swagger
 * /class-groups/{id}/kpi/students:
 *   get:
 *     summary: Analyse pédagogique détaillée par étudiant (admin et enseignants)
 *     tags: [ClassGroup]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Analyse récupérée (activeStudentsCount, atRiskCount, scoreWeeklyTrend, students[]).
 *       403:
 *         description: Accès refusé.
 *       404:
 *         description: Groupe introuvable.
 *       500:
 *         description: Erreur serveur.
 */
router.get('/:id/kpi/students', authMiddleware, classGroup.getStudentAnalytics)

/**
 * @swagger
 * /class-groups/{id}/invitations:
 *   post:
 *     summary: Inviter un utilisateur dans le groupe
 *     tags: [ClassGroup]
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
 *             required: [targetUserId, role]
 *             properties:
 *               targetUserId:
 *                 type: integer
 *               role:
 *                 type: string
 *                 enum: [teacher, student]
 *     responses:
 *       201:
 *         description: Invitation envoyée.
 *       403:
 *         description: Accès refusé.
 *       404:
 *         description: Groupe introuvable.
 */
router.post(
  '/:id/invitations',
  authMiddleware,
  invitationValidators.create,
  validate,
  invitation.invite
)

/**
 * @swagger
 * /class-groups/{id}/invitations:
 *   get:
 *     summary: Lister les invitations d'un groupe
 *     tags: [ClassGroup]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Liste des invitations.
 *       403:
 *         description: Accès refusé.
 */
router.get('/:id/invitations', authMiddleware, invitation.findByGroup)

module.exports = (app) => {
  /**
   * @swagger
   * tags:
   *   name: ClassGroup
   *   description: Gestion des groupes classes
   */
  app.use('/class-groups', router)
}
