const cron = require('node-cron')
const logger = require('../helpers/logger')

let kpiAlertCron = null

/**
 * Lance le cron quotidien d'alertes KPI.
 * S'exécute à 18h00 tous les jours.
 * Idempotent : un seul cron tourne par processus.
 */
function startKpiAlertCron() {
  if (kpiAlertCron) return

  kpiAlertCron = cron.schedule('0 18 * * *', async () => {
    logger.info('[kpi-alert-cron] Démarrage du digest quotidien')
    try {
      // Chargement différé pour éviter les problèmes de DB non initialisée
      const kpiAlertService = require('../services/KpiAlert.service')
      await kpiAlertService.runDailyDigest()
    } catch (err) {
      logger.error('[kpi-alert-cron] Erreur :', err?.message || err)
    }
  })

  logger.info('[kpi-alert-cron] Démarré — exécution quotidienne à 18h00')
}

function stopKpiAlertCron() {
  if (kpiAlertCron) {
    kpiAlertCron.stop()
    kpiAlertCron = null
  }
}

module.exports = { startKpiAlertCron, stopKpiAlertCron }
