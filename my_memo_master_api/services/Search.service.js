const { Diagramme, LeitnerSystem, Test, Subject, Tag } = require('../models/index')
const { Op } = require('sequelize')

const SUBJECT_INCLUDE = { model: Subject, as: 'subject', attributes: ['subjectId', 'name'] }
const TAG_INCLUDE = { model: Tag, as: 'tags', attributes: ['tagId', 'name', 'color'], through: { attributes: [] } }

class SearchService {
  /**
   * Recherche cross-contenu : MindMaps, systèmes Leitner et exercices.
   * Filtre par utilisateur (obligatoire), sujet (optionnel) et texte libre (optionnel).
   * @param {number} userId
   * @param {{ subjectId?: number, q?: string }} options
   * @returns {{ mindMaps: object[], leitnerSystems: object[], tests: object[] }}
   */
  async searchAll(userId, { subjectId, q } = {}) {
    const likeFilter = (col) => q ? { [col]: { [Op.like]: `%${q}%` } } : {}
    const subjectFilter = subjectId ? { subjectId } : {}

    const [mindMaps, leitnerSystems, tests] = await Promise.all([
      Diagramme.findAll({
        where: { userId, ...subjectFilter, ...likeFilter('mmName') },
        attributes: ['idMindMap', 'mmName', 'subjectId'],
        include: [SUBJECT_INCLUDE, TAG_INCLUDE]
      }),
      LeitnerSystem.findAll({
        where: { idUser: userId, ...subjectFilter, ...likeFilter('name') },
        attributes: ['idSystem', 'name', 'subjectId'],
        include: [SUBJECT_INCLUDE, TAG_INCLUDE]
      }),
      Test.findAll({
        where: { ...subjectFilter, ...likeFilter('name') },
        attributes: ['testId', 'name', 'subjectId'],
        include: [SUBJECT_INCLUDE, TAG_INCLUDE]
      })
    ])

    return { mindMaps, leitnerSystems, tests }
  }
}

module.exports = new SearchService()
