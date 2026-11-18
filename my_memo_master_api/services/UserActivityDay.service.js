const { Op, UniqueConstraintError } = require('sequelize')
const { UserActivityDay, UserGamificationSettings, TestResult, LeitnerReviewSession, MindMapViewSession } = require('../models/index')
const { dayString, isValidZone } = require('../helpers/badges/zone')

// Durée minimale d'une consultation de carte mentale pour compter comme pratique
// (diagrams/gamification_badges.md §5) : en dessous, l'ouverture est accidentelle.
const MIN_MINDMAP_VIEW_SECONDS = 60

class UserActivityDayService {
  /**
   * Fuseau IANA de l'utilisateur (réglage de gamification), ou null pour le fuseau du serveur.
   *
   * @param {number} userId
   * @returns {Promise<string|null>}
   */
  async getZone(userId) {
    const row = await UserGamificationSettings.findOne({ where: { userId }, attributes: ['timezone'], raw: true })
    return isValidZone(row?.timezone) ? row.timezone : null
  }

  /**
   * Enregistre un jour d'activité (idempotent : un seul enregistrement par jour et par utilisateur).
   * Le jour est celui de l'utilisateur, dans son fuseau.
   *
   * @param {number} userId
   * @param {Date|string} [at] - instant de la pratique (défaut : maintenant)
   * @param {string|null} [zone] - fuseau déjà connu ; lu en base s'il est omis
   * @returns {Promise<boolean>} true si le jour vient d'être créé
   */
  async record(userId, at = new Date(), zone) {
    const day = dayString(at, zone === undefined ? await this.getZone(userId) : zone)
    // CHOIX: create + capture de l'erreur d'unicité plutôt que findOrCreate
    // RAISON: findOrCreate ouvre une transaction ; deux appels concurrents la font échouer sur SQLite (dev/tests).
    try {
      await UserActivityDay.create({ userId, date: day })
      return true
    } catch (error) {
      if (error instanceof UniqueConstraintError) return false
      throw error
    }
  }

  /**
   * Jours d'activité de l'utilisateur.
   *
   * @param {number} userId
   * @returns {Promise<string[]>} dates YYYY-MM-DD
   */
  async findDates(userId) {
    const rows = await UserActivityDay.findAll({ where: { userId }, attributes: ['date'], raw: true })
    return rows.map((row) => row.date)
  }

  /**
   * Reconstruit les jours d'activité depuis la pratique réelle déjà journalisée
   * (exercices soumis, sessions Leitner, consultations de cartes mentales ≥ 60 s).
   * Idempotent. Les créneaux planifiés cochés à la main sont volontairement ignorés.
   *
   * @param {number} userId
   * @returns {Promise<number>} nombre de jours ajoutés
   */
  async rebuildFromHistory(userId) {
    const [results, leitner, views] = await Promise.all([
      TestResult.findAll({ where: { userId }, attributes: ['completedAt'], raw: true }),
      LeitnerReviewSession.findAll({ where: { userId }, attributes: ['completedAt'], raw: true }),
      MindMapViewSession.findAll({
        where: { userId, durationSeconds: { [Op.gte]: MIN_MINDMAP_VIEW_SECONDS } },
        attributes: ['viewedAt'],
        raw: true
      })
    ])
    const zone = await this.getZone(userId)
    const days = new Set([
      ...results.map((r) => dayString(r.completedAt, zone)),
      ...leitner.map((r) => dayString(r.completedAt, zone)),
      ...views.map((r) => dayString(r.viewedAt, zone))
    ])
    const existing = new Set(await this.findDates(userId))
    const missing = [...days].filter((day) => !existing.has(day))
    if (missing.length > 0) {
      await UserActivityDay.bulkCreate(missing.map((date) => ({ userId, date })), { ignoreDuplicates: true })
    }
    return missing.length
  }
}

module.exports = new UserActivityDayService()
module.exports.MIN_MINDMAP_VIEW_SECONDS = MIN_MINDMAP_VIEW_SECONDS
