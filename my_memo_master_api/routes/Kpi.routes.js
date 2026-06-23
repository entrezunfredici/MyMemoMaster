const express = require('express')
const router = express.Router()
const kpiController = require('../controllers/Kpi.controller')
const authMiddleware = require('../middlewares/Auth.middleware')

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

  app.use('/kpi', router)
}
