const cron = require('node-cron')
const logger = require('../helpers/logger')

let streakReminderCron = null

// Toutes les heures, à la minute 30 : le service ne rappelle que les utilisateurs pour qui il est 18 h
// dans leur fuseau (voir REMINDER_LOCAL_HOUR) ; un seul rappel par utilisateur et par jour.
const SCHEDULE = '30 * * * *'

/**
 * Lance le cron des rappels de série menacée (passage horaire, un rappel par utilisateur et par jour).
 * Idempotent : un seul cron tourne par processus.
 */
function startStreakReminderCron() {
  if (streakReminderCron) return

  streakReminderCron = cron.schedule(SCHEDULE, async () => {
    logger.info('[streak-reminder-cron] Démarrage des rappels de série')
    try {
      // Chargement différé pour éviter les problèmes de DB non initialisée
      const streakReminderService = require('../services/StreakReminder.service')
      await streakReminderService.runDailyReminders()
    } catch (err) {
      logger.error('[streak-reminder-cron] Erreur :', err?.message || err)
    }
  })

  logger.info('[streak-reminder-cron] Démarré — passage horaire, rappel à 18 h locale de chaque utilisateur')
}

function stopStreakReminderCron() {
  if (streakReminderCron) {
    streakReminderCron.stop()
    streakReminderCron = null
  }
}

module.exports = { startStreakReminderCron, stopStreakReminderCron, SCHEDULE }
