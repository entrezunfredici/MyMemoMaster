const { Diagramme, LeitnerSystem, Test, Subject, Tag, instance: sequelize } = require('../models/index')
const { Op } = require('sequelize')

const SUBJECT_INCLUDE = { model: Subject, as: 'subject', attributes: ['subjectId', 'name'] }
const TAG_INCLUDE = { model: Tag, as: 'tags', attributes: ['tagId', 'name', 'color'], through: { attributes: [] } }

class SearchService {
  /**
   * Recherche cross-contenu : MindMaps, systèmes Leitner et exercices.
   * Filtre par utilisateur (obligatoire), sujet (optionnel) et texte libre (optionnel).
   * Note : les exercices (Test) filtrés par userId requièrent la migration 20260625000003.
   *        Les exercices legacy (userId=null) ne remontent pas dans la recherche.
   * @param {number} userId
   * @param {{ subjectId?: number, q?: string }} options
   * @returns {{ mindMaps: object[], leitnerSystems: object[], tests: object[] }}
   */
  async searchAll(userId, { subjectId, q } = {}) {
    // Op.like est insensible à la casse sur SQLite (dev) mais sensible sur PostgreSQL (prod).
    // On utilise Op.iLike sur PostgreSQL pour garantir une recherche insensible à la casse.
    const likeOp = sequelize.getDialect() === 'postgres' ? Op.iLike : Op.like
    const likeFilter = (col) => q ? { [col]: { [likeOp]: `%${q}%` } } : {}
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
        where: { userId, ...subjectFilter, ...likeFilter('name') },
        attributes: ['testId', 'name', 'subjectId'],
        include: [SUBJECT_INCLUDE, TAG_INCLUDE]
      })
    ])

    return { mindMaps, leitnerSystems, tests }
  }
}

module.exports = new SearchService()
