const dayjs = require('dayjs')
const { RevisionSession, LeitnerSystem, Test } = require('../models/index')

const include = [
  { model: LeitnerSystem, as: 'leitnerSystem', attributes: ['idSystem', 'name'] },
  { model: Test, as: 'test', attributes: ['testId', 'name'] }
]

class RevisionSessionService {
  /**
   * Liste toutes les séances de révision de l'utilisateur, triées par date et heure.
   *
   * @param {number} userId
   * @returns {Promise<RevisionSession[]>}
   */
  async findAll(userId) {
    return RevisionSession.findAll({
      where: { userId },
      include,
      order: [
        ['date', 'ASC'],
        ['startTime', 'ASC']
      ]
    })
  }

  /**
   * Retourne les séances du jour courant.
   *
   * @param {number} userId
   * @returns {Promise<RevisionSession[]>}
   */
  async findToday(userId) {
    const today = dayjs().format('YYYY-MM-DD')
    return RevisionSession.findAll({
      where: { userId, date: today },
      include,
      order: [['startTime', 'ASC']]
    })
  }

  /**
   * Récupère une séance par ID en vérifiant le propriétaire.
   *
   * @param {number} id
   * @param {number} userId
   * @returns {Promise<RevisionSession|null>}
   */
  async findOne(id, userId) {
    return RevisionSession.findOne({ where: { id, userId }, include })
  }

  /**
   * Crée une nouvelle séance de révision pour l'utilisateur.
   *
   * @param {number} userId
   * @param {object} data - { name, description, date, startTime, endTime, idSystem?, idTest? }
   * @returns {Promise<RevisionSession>}
   */
  async create(userId, data) {
    return RevisionSession.create({ ...data, userId })
  }

  /**
   * Met à jour une séance. Seul le propriétaire peut modifier.
   *
   * @param {number} id
   * @param {number} userId
   * @param {object} data
   * @returns {Promise<RevisionSession|null>} null si introuvable ou non propriétaire
   */
  async update(id, userId, data) {
    const session = await RevisionSession.findOne({ where: { id, userId } })
    if (!session) return null
    await session.update(data)
    return session.reload({ include })
  }

  /**
   * Bascule l'état terminé/non-terminé d'une séance.
   *
   * @param {number} id
   * @param {number} userId
   * @param {boolean} isDone
   * @returns {Promise<RevisionSession|null>} null si introuvable ou non propriétaire
   */
  async markDone(id, userId, isDone) {
    const session = await RevisionSession.findOne({ where: { id, userId } })
    if (!session) return null
    await session.update({ isDone })
    return session.reload({ include })
  }

  /**
   * Supprime une séance. Seul le propriétaire peut supprimer.
   *
   * @param {number} id
   * @param {number} userId
   * @returns {Promise<boolean>} false si introuvable ou non propriétaire
   */
  async delete(id, userId) {
    const session = await RevisionSession.findOne({ where: { id, userId } })
    if (!session) return false
    await session.destroy()
    return true
  }
}

module.exports = new RevisionSessionService()
