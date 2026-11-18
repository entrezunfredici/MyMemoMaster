const { Op } = require('sequelize')
const { Reminder } = require('../models/index')
const gamificationProfileService = require('./GamificationProfile.service')
const { dayBounds } = require('../helpers/badges/zone')
const logger = require('../helpers/logger')

// Valeur de `Reminder.entityType` (colonne de 20 caractères) : reconnue par la cloche de notifications du front
const ENTITY_TYPE = 'streak_reminder'

// Heure locale (de chaque utilisateur) à laquelle le rappel est envoyé : en fin de journée, assez tôt
// pour qu'une courte révision reste possible. Le cron passe toutes les heures et ne rappelle que les
// utilisateurs pour qui il est cette heure-là.
const REMINDER_LOCAL_HOUR = 18

class StreakReminderService {
  /**
   * Texte du rappel (français, au singulier ou au pluriel selon la série).
   *
   * @param {number} streak - nombre de jours de la série menacée
   * @returns {string}
   */
  buildMessage(streak) {
    return `Ta série de ${streak} jours est en danger : une courte révision aujourd'hui la maintient.`
  }

  /**
   * Crée un rappel dans la cloche pour chaque utilisateur dont la série est menacée.
   * Chaque utilisateur est rappelé à 18 h dans son fuseau (fuseau du serveur s'il n'en a pas envoyé).
   * Idempotent sur la journée de l'utilisateur : un seul rappel par jour, même si le cron est relancé.
   * Aucun e-mail : le réglage « rappel de série » ne promet qu'une notification dans l'application.
   *
   * @param {Date} [now]
   * @returns {Promise<{ created: number, skipped: number }>}
   */
  async runDailyReminders(now = new Date()) {
    const atRisk = await gamificationProfileService.findStreaksAtRisk(now, undefined, REMINDER_LOCAL_HOUR)
    let created = 0
    let skipped = 0

    for (const { userId, streak, zone } of atRisk) {
      try {
        const { start: startOfDay } = dayBounds(now, zone)
        const already = await Reminder.count({ where: { userId, entityType: ENTITY_TYPE, reminderAt: { [Op.gte]: startOfDay } } })
        if (already > 0) {
          skipped++
          continue
        }
        await Reminder.create({
          userId,
          entityType: ENTITY_TYPE,
          entityId: userId,
          reminderAt: now,
          delayMinutes: 0,
          channel: 'in_app',
          status: 'pending',
          message: this.buildMessage(streak)
        })
        created++
      } catch (err) {
        logger.error(`[streak-reminder] Erreur pour userId=${userId} : ${err?.message || err}`)
      }
    }

    logger.info(`[streak-reminder] Rappels de série terminés — créés: ${created}, ignorés: ${skipped}`)
    return { created, skipped }
  }
}

module.exports = new StreakReminderService()
module.exports.ENTITY_TYPE = ENTITY_TYPE
module.exports.REMINDER_LOCAL_HOUR = REMINDER_LOCAL_HOUR
