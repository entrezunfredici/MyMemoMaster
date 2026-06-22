const dayjs = require('dayjs')
const { CalendarEvent, EventOccurrence, ClassGroupUsers, User } = require('../models/index')

const DAY_MAP = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
}

class CalendarEventService {
  /**
   * Génère les occurrences d'un événement récurrent à partir d'une règle.
   * Retourne un tableau de { date, startTime, endTime }.
   *
   * @param {object} rule - { frequency, days, startDate, endDate, startTime, endTime }
   * @returns {{ date: string, startTime: string, endTime: string }[]}
   */
  _generateOccurrences(rule) {
    const { frequency, days, startDate, endDate, startTime, endTime } = rule
    const start = dayjs(startDate)
    const end = dayjs(endDate)
    const result = []

    if (frequency === 'monthly') {
      let cur = start
      while (!cur.isAfter(end)) {
        result.push({ date: cur.format('YYYY-MM-DD'), startTime, endTime })
        cur = cur.add(1, 'month')
      }
      return result
    }

    // weekly ou biweekly : itération jour par jour
    const targetDays = (days || [])
      .map((d) => DAY_MAP[d.toLowerCase()])
      .filter((d) => d !== undefined)
    // Pour biweekly : référence = début de semaine de startDate
    const refWeekStart = start.startOf('week')
    let cur = start

    while (!cur.isAfter(end)) {
      if (targetDays.includes(cur.day())) {
        if (frequency === 'weekly') {
          result.push({ date: cur.format('YYYY-MM-DD'), startTime, endTime })
        } else {
          // biweekly : inclure uniquement les semaines paires (0, 2, 4...) par rapport à refWeekStart
          const weekDiff = cur.startOf('week').diff(refWeekStart, 'week')
          if (weekDiff % 2 === 0) {
            result.push({ date: cur.format('YYYY-MM-DD'), startTime, endTime })
          }
        }
      }
      cur = cur.add(1, 'day')
    }

    return result
  }

  /**
   * Vérifie que l'utilisateur est admin (roleId = 1).
   *
   * @param {number} userId
   * @returns {Promise<boolean>}
   */
  async _isAdmin(userId) {
    const user = await User.findByPk(userId, { attributes: ['roleId'] })
    return [1, 4].includes(user?.roleId)
  }

  /**
   * Récupère les IDs des groupes auxquels appartient l'utilisateur.
   *
   * @param {number} userId
   * @returns {Promise<number[]>}
   */
  async _getUserGroupIds(userId) {
    const memberships = await ClassGroupUsers.findAll({ where: { userId } })
    return memberships.map((m) => m.classGroupId)
  }

  /**
   * Liste les événements visibles par l'utilisateur (ses groupes, ou tous si admin).
   *
   * @param {number} userId
   * @returns {Promise<CalendarEvent[]>}
   */
  async findAll(userId) {
    let groupIds
    if (await this._isAdmin(userId)) {
      // Admin : tous les événements
      return CalendarEvent.findAll({ include: [{ model: EventOccurrence, as: 'occurrences' }] })
    }
    groupIds = await this._getUserGroupIds(userId)
    if (groupIds.length === 0) return []
    return CalendarEvent.findAll({
      where: { classGroupId: groupIds },
      include: [{ model: EventOccurrence, as: 'occurrences' }]
    })
  }

  /**
   * Récupère un événement avec ses occurrences.
   *
   * @param {number} id
   * @returns {Promise<CalendarEvent|null>}
   */
  async findOne(id) {
    return CalendarEvent.findByPk(id, {
      include: [{ model: EventOccurrence, as: 'occurrences', order: [['date', 'ASC']] }]
    })
  }

  /**
   * Crée un événement et génère ses occurrences (auto) ou les insère (manual).
   * Réservé aux admins.
   *
   * @param {number} userId
   * @param {object} data - { name, description, type, classGroupId, recurrenceMode, recurrenceRule, occurrences }
   * @returns {Promise<CalendarEvent|false>} false si droits insuffisants
   */
  async create(userId, data) {
    if (!(await this._isAdmin(userId))) return false

    const { name, description, type, classGroupId, recurrenceMode, recurrenceRule, occurrences } =
      data
    const event = await CalendarEvent.create({
      name,
      description,
      type,
      classGroupId,
      createdBy: userId,
      recurrenceMode,
      recurrenceRule
    })

    const occurrencesToInsert =
      recurrenceMode === 'auto'
        ? this._generateOccurrences(recurrenceRule).map((o) => ({ ...o, eventId: event.id }))
        : (occurrences || []).map((o) => ({
            date: o.date,
            startTime: o.startTime,
            endTime: o.endTime,
            eventId: event.id
          }))

    if (occurrencesToInsert.length > 0) {
      await EventOccurrence.bulkCreate(occurrencesToInsert)
    }

    return this.findOne(event.id)
  }

  /**
   * Met à jour les métadonnées d'un événement (sans toucher aux occurrences). Réservé aux admins.
   *
   * @param {number} id
   * @param {number} userId
   * @param {object} data - { name, description, type }
   * @returns {Promise<CalendarEvent|null|false>}
   */
  async update(id, userId, data) {
    if (!(await this._isAdmin(userId))) return false
    const event = await CalendarEvent.findByPk(id)
    if (!event) return null
    await event.update({ name: data.name, description: data.description, type: data.type })
    return this.findOne(id)
  }

  /**
   * Supprime un événement et toutes ses occurrences (cascade). Réservé aux admins.
   *
   * @param {number} id
   * @param {number} userId
   * @returns {Promise<boolean|null|false>}
   */
  async delete(id, userId) {
    if (!(await this._isAdmin(userId))) return false
    const event = await CalendarEvent.findByPk(id)
    if (!event) return null
    await event.destroy()
    return true
  }

  /**
   * Ajoute une occurrence manuelle à un événement existant. Réservé aux admins.
   *
   * @param {number} eventId
   * @param {number} userId
   * @param {{ date: string, startTime: string, endTime: string }} data
   * @returns {Promise<EventOccurrence|null|false>}
   */
  async addOccurrence(eventId, userId, data) {
    if (!(await this._isAdmin(userId))) return false
    const event = await CalendarEvent.findByPk(eventId)
    if (!event) return null
    return EventOccurrence.create({ ...data, eventId })
  }

  /**
   * Supprime une occurrence. Bloqué si des Deadlines y sont rattachées (RESTRICT en DB).
   * Réservé aux admins.
   *
   * @param {number} occurrenceId
   * @param {number} userId
   * @returns {Promise<boolean|null|false>}
   * @throws {Error} si des Deadlines sont liées à cette occurrence
   */
  async deleteOccurrence(occurrenceId, userId) {
    if (!(await this._isAdmin(userId))) return false
    const occurrence = await EventOccurrence.findByPk(occurrenceId)
    if (!occurrence) return null
    await occurrence.destroy()
    return true
  }
}

module.exports = new CalendarEventService()
