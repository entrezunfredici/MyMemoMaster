const { LeitnerReviewSession, LeitnerSystem } = require('../models/index')
const revisionSessionService = require('./RevisionSession.service')

class LeitnerReviewSessionService {
  /**
   * Journalise une session de révision Leitner réellement effectuée — complète
   * (dernière carte due atteinte) ou partielle (sortie anticipée). Une session
   * complète valide en plus automatiquement la séance planifiée du jour
   * correspondante, si elle existe (voir
   * RevisionSession.service.js#validateMatchingSessions) — pas une session
   * partielle, sur demande explicite de l'utilisateur (2026-09-04).
   *
   * @param {object} data - { userId, idSystem, cardsReviewed, durationSeconds, completed? }
   * @returns {Promise<LeitnerReviewSession>}
   */
  async create(data) {
    const { userId, idSystem, cardsReviewed, durationSeconds, completed = true } = data
    const session = await LeitnerReviewSession.create({ userId, idSystem, cardsReviewed, durationSeconds, completed })
    if (completed) {
      await revisionSessionService.validateMatchingSessions({ userId, idSystem })
    }
    return session
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
