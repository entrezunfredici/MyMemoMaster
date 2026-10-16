const express = require('express')
const router = express.Router()
const kpiController = require('../controllers/Kpi.controller')
const kpiAlertSettingsController = require('../controllers/KpiAlertSettings.controller')
const kpiConsentController = require('../controllers/KpiConsent.controller')
const authMiddleware = require('../middlewares/Auth.middleware')
const validate = require('../middlewares/validate.middleware')
const kpiAlertSettingsValidators = require('../validators/KpiAlertSettings.validators')
const kpiConsentValidators = require('../validators/KpiConsent.validators')

module.exports = (app) => {
  /**
   * @swagger
   * tags:
   *   - name: KPI
   *     description: Indicateurs de progression personnels de l'étudiant
   */

  /**
   * @swagger
   * /kpi/my:
   *   get:
   *     summary: Récupérer tous les KPI personnels de l'utilisateur connecté
   *     tags: [KPI]
   *     responses:
   *       200:
   *         description: KPI calculés avec succès
   *       401:
   *         description: Non authentifié
   *       500:
   *         description: Erreur serveur
   */
  router.get('/my', authMiddleware, kpiController.getMyKpis)

  /**
   * @swagger
   * /kpi/alert-settings:
   *   get:
   *     summary: Récupérer les préférences d'alertes KPI de l'utilisateur
   *     tags: [KPI]
   *     responses:
   *       200:
   *         description: Préférences récupérées (créées avec valeurs par défaut si absentes)
   *   put:
   *     summary: Mettre à jour les préférences d'alertes KPI
   *     tags: [KPI]
   *     responses:
   *       200:
   *         description: Préférences mises à jour
   *       400:
   *         description: Données invalides
   */
  router.get('/alert-settings', authMiddleware, kpiAlertSettingsController.getSettings)
  router.put('/alert-settings', authMiddleware, kpiAlertSettingsValidators.update, validate, kpiAlertSettingsController.updateSettings)

  /**
   * @swagger
   * /kpi/consent:
   *   post:
   *     summary: Accorder l'accès à ses KPI à un enseignant
   *     tags: [KPI]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [teacherId, classGroupId]
   *             properties:
   *               teacherId:
   *                 type: integer
   *               classGroupId:
   *                 type: integer
   *     responses:
   *       201:
   *         description: Consentement accordé
   *       403:
   *         description: L'utilisateur n'est pas étudiant dans ce groupe
   *       404:
   *         description: Enseignant introuvable dans ce groupe
   * /kpi/consent/my:
   *   get:
   *     summary: Lister les consentements accordés par l'étudiant connecté
   *     tags: [KPI]
   *     responses:
   *       200:
   *         description: Liste des consentements
   * /kpi/consent/{teacherId}/{classGroupId}:
   *   delete:
   *     summary: Révoquer un consentement accordé à un enseignant
   *     tags: [KPI]
   *     parameters:
   *       - in: path
   *         name: teacherId
   *         required: true
   *         schema:
   *           type: integer
   *       - in: path
   *         name: classGroupId
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Consentement révoqué
   *       404:
   *         description: Consentement introuvable
   * /kpi/student/{studentId}:
   *   get:
   *     summary: Consulter les KPI d'un étudiant (enseignant, avec consentement)
   *     tags: [KPI]
   *     parameters:
   *       - in: path
   *         name: studentId
   *         required: true
   *         schema:
   *           type: integer
   *       - in: query
   *         name: classGroupId
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: KPI de l'étudiant
   *       403:
   *         description: Accès refusé (pas enseignant ou pas de consentement)
   */
  router.get('/consent/my', authMiddleware, kpiConsentController.getMyConsents)
  router.post('/consent', authMiddleware, kpiConsentValidators.grantConsent, validate, kpiConsentController.grantConsent)
  router.delete('/consent/:teacherId/:classGroupId', authMiddleware, kpiConsentController.revokeConsent)
  router.get('/student/:studentId', authMiddleware, kpiConsentValidators.getStudentKpis, validate, kpiConsentController.getStudentKpis)

  app.use('/kpi', router)
}
