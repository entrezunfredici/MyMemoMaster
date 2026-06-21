const { Deadline, EventOccurrence, CalendarEvent, ClassGroupUsers, Test } = require('../models/index')

class DeadlineService {
  /**
   * Vérifie que l'utilisateur est enseignant dans le groupe de l'occurrence cible.
   *
   * @param {number} occurrenceId
   * @param {number} userId
   * @returns {Promise<boolean>}
   */
  async _isTeacherForOccurrence(occurrenceId, userId) {
    const occurrence = await EventOccurrence.findByPk(occurrenceId, {
      include: [{ model: CalendarEvent, as: 'calendarEvent', attributes: ['classGroupId'] }]
    })
    if (!occurrence) return false
    const membership = await ClassGroupUsers.findOne({
      where: { classGroupId: occurrence.calendarEvent.classGroupId, userId, role: 'teacher' }
    })
    return !!membership
  }

  /**
   * Récupère les IDs des groupes auxquels l'utilisateur appartient.
   *
   * @param {number} userId
   * @returns {Promise<number[]>}
   */
  async _getUserGroupIds(userId) {
    const memberships = await ClassGroupUsers.findAll({ where: { userId } })
    return memberships.map((m) => m.classGroupId)
  }

  /**
   * Liste les échéances visibles par l'utilisateur (groupes dont il est membre).
   *
   * @param {number} userId
   * @returns {Promise<Deadline[]>}
   */
  async findAll(userId) {
    const groupIds = await this._getUserGroupIds(userId)
    if (groupIds.length === 0) return []

    return Deadline.findAll({
      include: [
        {
          model: EventOccurrence,
          as: 'occurrence',
          required: true,
          include: [
            {
              model: CalendarEvent,
              as: 'calendarEvent',
              where: { classGroupId: groupIds },
              attributes: ['id', 'name', 'classGroupId']
            }
          ]
        },
        { model: Test, as: 'test', attributes: ['testId', 'name'], required: false }
      ],
      order: [['dueDate', 'ASC']]
    })
  }

  /**
   * Récupère une échéance par ID.
   *
   * @param {number} id
   * @returns {Promise<Deadline|null>}
   */
  async findOne(id) {
    return Deadline.findByPk(id, {
      include: [
        {
          model: EventOccurrence,
          as: 'occurrence',
          include: [{ model: CalendarEvent, as: 'calendarEvent' }]
        },
        { model: Test, as: 'test', attributes: ['testId', 'name'], required: false }
      ]
    })
  }

  /**
   * Liste les échéances liées à un exercice spécifique, filtrées par les groupes de l'utilisateur.
   *
   * @param {number} testId
   * @param {number} userId
   * @returns {Promise<Deadline[]>}
   */
  async findByTest(testId, userId) {
    const groupIds = await this._getUserGroupIds(userId)
    if (groupIds.length === 0) return []

    return Deadline.findAll({
      where: { testId },
      include: [
        {
          model: EventOccurrence,
          as: 'occurrence',
          required: true,
          include: [
            {
              model: CalendarEvent,
              as: 'calendarEvent',
              where: { classGroupId: groupIds },
              attributes: ['id', 'name', 'classGroupId']
            }
          ]
        },
        { model: Test, as: 'test', attributes: ['testId', 'name'], required: false }
      ],
      order: [['dueDate', 'ASC']]
    })
  }

  /**
   * Crée une échéance. L'utilisateur doit être enseignant dans le groupe de l'occurrence.
   *
   * @param {number} userId
   * @param {object} data - { name, type, description, occurrenceId, dueDate, dueTime }
   * @returns {Promise<Deadline|false>} false si droits insuffisants
   */
  async create(userId, data) {
    if (!(await this._isTeacherForOccurrence(data.occurrenceId, userId))) return false
    return Deadline.create({ ...data, createdBy: userId })
  }

  /**
   * Met à jour une échéance. Seul le créateur peut modifier.
   *
   * @param {number} id
   * @param {number} userId
   * @param {object} data
   * @returns {Promise<Deadline|null|false>} null si introuvable, false si non propriétaire
   */
  async update(id, userId, data) {
    const deadline = await Deadline.findByPk(id)
    if (!deadline) return null
    if (deadline.createdBy !== userId) return false
    await deadline.update({
      name: data.name,
      type: data.type,
      description: data.description,
      dueDate: data.dueDate,
      dueTime: data.dueTime
    })
    return this.findOne(id)
  }

  /**
   * Supprime une échéance. Seul le créateur peut supprimer.
   *
   * @param {number} id
   * @param {number} userId
   * @returns {Promise<boolean|null|false>}
   */
  async delete(id, userId) {
    const deadline = await Deadline.findByPk(id)
    if (!deadline) return null
    if (deadline.createdBy !== userId) return false
    await deadline.destroy()
    return true
  }
}

module.exports = new DeadlineService()
