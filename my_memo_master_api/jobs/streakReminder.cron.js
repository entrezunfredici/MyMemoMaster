const cron = require('node-cron')
const logger = require('../helpers/logger')

let streakReminderCron = null

/**
 * Lance le cron quotidien des rappels de série menacée.
 * S'exécute à 18h30 tous les jours (après le digest KPI de 18h00).
 * Idempotent : un seul cron tourne par processus.
 */
function startStreakReminderCron() {
  if (streakReminderCron) return

  streakReminderCron = cron.schedule('30 18 * * *', async () => {
    logger.info('[streak-reminder-cron] Démarrage des rappels de série')
    try {
      // Chargement différé pour éviter les problèmes de DB non initialisée
      const streakReminderService = require('../services/StreakReminder.service')
      await streakReminderService.runDailyReminders()
    } catch (err) {
      logger.error('[streak-reminder-cron] Erreur :', err?.message || err)
    }
  })

  logger.info('[streak-reminder-cron] Démarré — exécution quotidienne à 18h30')
}

function stopStreakReminderCron() {
  if (streakReminderCron) {
    streakReminderCron.stop()
    streakReminderCron = null
  }
}

module.exports = { startStreakReminderCron, stopStreakReminderCron }
