const { LeitnerReviewSession, LeitnerSystem } = require('../models/index')

class LeitnerReviewSessionService {
  /**
   * Journalise une session de révision Leitner réellement effectuée.
   *
   * @param {object} data - { userId, idSystem, cardsReviewed, durationSeconds }
   * @returns {LeitnerReviewSession}
   */
  async create(data) {
    const { userId, idSystem, cardsReviewed, durationSeconds } = data
    return await LeitnerReviewSession.create({ userId, idSystem, cardsReviewed, durationSeconds })
  }

  /**
   * Sessions de l'utilisateur, éventuellement filtrées par matière (via le
   * système Leitner rattaché) — même filtre que celui utilisé pour les KPI
   * personnels restreints aux matières consenties.
   *
   * @param {number} userId
   * @param {number[]} [subjectIds] - si fourni, restreint aux systèmes de ces matières
   * @returns {LeitnerReviewSession[]}
   */
  async findByUser(userId, subjectIds) {
    const include = [{
      model: LeitnerSystem,
      as: 'system',
      attributes: [],
      required: true,
      ...(subjectIds ? { where: { subjectId: subjectIds } } : {})
    }]
    return await LeitnerReviewSession.findAll({ where: { userId }, include })
  }
}

module.exports = new LeitnerReviewSessionService()
