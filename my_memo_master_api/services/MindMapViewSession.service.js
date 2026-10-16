const { MindMapViewSession, Diagramme } = require('../models/index')

class MindMapViewSessionService {
  /**
   * Journalise une consultation de carte mentale réellement effectuée.
   *
   * @param {object} data - { userId, idMindMap, durationSeconds }
   * @returns {Promise<MindMapViewSession>}
   */
  async create(data) {
    const { userId, idMindMap, durationSeconds } = data
    return await MindMapViewSession.create({ userId, idMindMap, durationSeconds })
  }

  /**
   * Sessions de consultation de l'utilisateur, éventuellement filtrées par
   * matière (via la carte mentale consultée) — même filtre que celui utilisé
   * pour les KPI personnels restreints aux matières consenties.
   *
   * @param {number} userId
   * @param {number[]} [subjectIds] - si fourni, restreint aux cartes de ces matières
   * @returns {Promise<MindMapViewSession[]>}
   */
  async findByUser(userId, subjectIds) {
    const include = [{
      model: Diagramme,
      as: 'mindMap',
      attributes: [],
      required: true,
      ...(subjectIds ? { where: { subjectId: subjectIds } } : {})
    }]
    return await MindMapViewSession.findAll({ where: { userId }, include })
  }
}

module.exports = new MindMapViewSessionService()
