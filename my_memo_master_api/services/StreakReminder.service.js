const dayjs = require('dayjs')
const { Op } = require('sequelize')
const { Reminder } = require('../models/index')
const gamificationProfileService = require('./GamificationProfile.service')
const logger = require('../helpers/logger')

// Valeur de `Reminder.entityType` (colonne de 20 caractères) : reconnue par la cloche de notifications du front
const ENTITY_TYPE = 'streak_reminder'

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
   * Idempotent sur la journée : un seul rappel par utilisateur et par jour, même si le cron est relancé.
   * Aucun e-mail : le réglage « rappel de série » ne promet qu'une notification dans l'application.
   *
   * @param {Date} [now]
   * @returns {Promise<{ created: number, skipped: number }>}
   */
  async runDailyReminders(now = new Date()) {
    const atRisk = await gamificationProfileService.findStreaksAtRisk(now)
    const startOfDay = dayjs(now).startOf('day').toDate()
    let created = 0
    let skipped = 0

    for (const { userId, streak } of atRisk) {
      try {
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
