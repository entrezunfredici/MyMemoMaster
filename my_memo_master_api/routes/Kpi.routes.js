const express = require('express')
const router = express.Router()
const kpiController = require('../controllers/Kpi.controller')
const kpiAlertSettingsController = require('../controllers/KpiAlertSettings.controller')
const authMiddleware = require('../middlewares/Auth.middleware')
const validate = require('../middlewares/validate.middleware')
const kpiAlertSettingsValidators = require('../validators/KpiAlertSettings.validators')

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

  app.use('/kpi', router)
}
