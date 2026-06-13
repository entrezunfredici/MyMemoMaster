const dayjs = require('dayjs')
const { RevisionSession } = require('../models/index')

class RevisionSessionService {
  /**
   * Liste toutes les séances de révision de l'utilisateur.
   *
   * @param {number} userId
   * @returns {Promise<RevisionSession[]>}
   */
  async findAll(userId) {
    return RevisionSession.findAll({
      where: { userId },
      order: [
        ['date', 'ASC'],
        ['startTime', 'ASC']
      ]
    })
  }

  /**
   * Retourne les séances planifiées pour aujourd'hui (todo list du jour).
   *
   * @param {number} userId
   * @returns {Promise<RevisionSession[]>}
   */
  async findToday(userId) {
    const today = dayjs().format('YYYY-MM-DD')
    return RevisionSession.findAll({
      where: { userId, date: today },
      order: [['startTime', 'ASC']]
    })
  }

  /**
   * Récupère une séance par ID. Retourne null si elle n'appartient pas à l'utilisateur.
   *
   * @param {number} id
   * @param {number} userId
   * @returns {Promise<RevisionSession|null>}
   */
  async findOne(id, userId) {
    return RevisionSession.findOne({ where: { id, userId } })
  }

  /**
   * Crée une séance de révision pour l'utilisateur.
   *
   * @param {number} userId
   * @param {object} data - { name, description, date, startTime, endTime }
   * @returns {Promise<RevisionSession>}
   */
  async create(userId, data) {
    return RevisionSession.create({ ...data, userId })
  }

  /**
   * Met à jour une séance. Retourne null si introuvable ou non propriétaire.
   *
   * @param {number} id
   * @param {number} userId
   * @param {object} data
   * @returns {Promise<RevisionSession|null>}
   */
  async update(id, userId, data) {
    const session = await RevisionSession.findOne({ where: { id, userId } })
    if (!session) return null
    await session.update(data)
    return session
  }

  /**
   * Supprime une séance. Retourne false si introuvable ou non propriétaire.
   *
   * @param {number} id
   * @param {number} userId
   * @returns {Promise<boolean>}
   */
  async delete(id, userId) {
    const session = await RevisionSession.findOne({ where: { id, userId } })
    if (!session) return false
    await session.destroy()
    return true
  }
}

module.exports = new RevisionSessionService()
