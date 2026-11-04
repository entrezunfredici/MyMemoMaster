const dayjs = require('dayjs')
const { Op, UniqueConstraintError } = require('sequelize')
const { UserActivityDay, TestResult, LeitnerReviewSession, MindMapViewSession } = require('../models/index')

// Durée minimale d'une consultation de carte mentale pour compter comme pratique
// (diagrams/gamification_badges.md §5) : en dessous, l'ouverture est accidentelle.
const MIN_MINDMAP_VIEW_SECONDS = 60

const toDay = (date) => dayjs(date).format('YYYY-MM-DD')

class UserActivityDayService {
  /**
   * Enregistre un jour d'activité (idempotent : un seul enregistrement par jour et par utilisateur).
   *
   * @param {number} userId
   * @param {Date|string} [at] - instant de la pratique (défaut : maintenant)
   * @returns {Promise<boolean>} true si le jour vient d'être créé
   */
  async record(userId, at = new Date()) {
    // CHOIX: create + capture de l'erreur d'unicité plutôt que findOrCreate
    // RAISON: findOrCreate ouvre une transaction ; deux appels concurrents la font échouer sur SQLite (dev/tests).
    try {
      await UserActivityDay.create({ userId, date: toDay(at) })
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
    const days = new Set([
      ...results.map((r) => toDay(r.completedAt)),
      ...leitner.map((r) => toDay(r.completedAt)),
      ...views.map((r) => toDay(r.viewedAt))
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
