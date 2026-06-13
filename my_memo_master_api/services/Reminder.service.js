const dayjs = require('dayjs')
const { Reminder, Deadline, RevisionSession } = require('../models')
const { getReminderQueue } = require('../jobs/reminder.queue')

class ReminderService {
  /**
   * Retourne tous les rappels de l'utilisateur.
   *
   * @param {number} userId
   * @returns {Promise<Reminder[]>}
   */
  async findAll(userId) {
    return Reminder.findAll({
      where: { userId },
      order: [['reminderAt', 'ASC']]
    })
  }

  /**
   * Retourne un rappel si l'utilisateur en est propriétaire.
   *
   * @param {number} id
   * @param {number} userId
   * @returns {Promise<Reminder|null>}
   */
  async findOne(id, userId) {
    return Reminder.findOne({ where: { id, userId } })
  }

  /**
   * Crée un rappel et planifie le job BullMQ.
   *
   * @param {number} userId
   * @param {{ entityType: string, entityId: number, delayMinutes: number, message?: string }} data
   * @returns {Promise<Reminder>}
   * @throws {Error} Si l'entité est introuvable, non autorisée, ou si la date est passée
   */
  async create(userId, data) {
    const { entityType, entityId, delayMinutes, message } = data

    const entity = await this._resolveEntity(entityType, entityId, userId)
    if (!entity)
      throw Object.assign(new Error('Entité introuvable ou accès non autorisé.'), { status: 404 })

    const reminderAt = this._buildReminderAt(entity, entityType, delayMinutes)
    if (!reminderAt || reminderAt.isBefore(dayjs())) {
      throw Object.assign(new Error('La date de rappel est déjà passée.'), { status: 400 })
    }

    const reminder = await Reminder.create({
      userId,
      entityType,
      entityId,
      reminderAt: reminderAt.toDate(),
      delayMinutes,
      channel: 'email',
      status: 'pending',
      message: message || null
    })

    const jobId = await this._scheduleJob(reminder.id, reminderAt.toDate())
    await reminder.update({ jobId })

    return reminder
  }

  /**
   * Met à jour un rappel et replanifie le job BullMQ.
   *
   * @param {number} id
   * @param {number} userId
   * @param {{ delayMinutes?: number, message?: string }} data
   * @returns {Promise<Reminder|null>}
   */
  async update(id, userId, data) {
    const reminder = await this.findOne(id, userId)
    if (!reminder) return null
    if (reminder.status !== 'pending') {
      throw Object.assign(new Error('Seuls les rappels en attente peuvent être modifiés.'), {
        status: 400
      })
    }

    const newDelayMinutes =
      data.delayMinutes !== undefined ? data.delayMinutes : reminder.delayMinutes

    const entity = await this._resolveEntity(reminder.entityType, reminder.entityId, userId)
    if (!entity) throw Object.assign(new Error('Entité introuvable.'), { status: 404 })

    const reminderAt = this._buildReminderAt(entity, reminder.entityType, newDelayMinutes)
    if (!reminderAt || reminderAt.isBefore(dayjs())) {
      throw Object.assign(new Error('La date de rappel est déjà passée.'), { status: 400 })
    }

    // Annule l'ancien job avant d'en créer un nouveau
    if (reminder.jobId) await this._cancelJob(reminder.jobId)

    const jobId = await this._scheduleJob(reminder.id, reminderAt.toDate())

    await reminder.update({
      delayMinutes: newDelayMinutes,
      reminderAt: reminderAt.toDate(),
      jobId,
      message: data.message !== undefined ? data.message : reminder.message
    })

    return reminder
  }

  /**
   * Supprime un rappel et annule le job BullMQ associé.
   *
   * @param {number} id
   * @param {number} userId
   * @returns {Promise<boolean>} false si non trouvé
   */
  async delete(id, userId) {
    const reminder = await this.findOne(id, userId)
    if (!reminder) return false

    if (reminder.jobId) await this._cancelJob(reminder.jobId)
    await reminder.update({ status: 'cancelled' })
    await reminder.destroy()

    return true
  }

  // ──────────────────────────────────────────────────────────
  //  Méthodes privées
  // ──────────────────────────────────────────────────────────

  /**
   * Résout l'entité liée (Deadline ou RevisionSession) avec vérification propriétaire.
   *
   * @param {string} entityType
   * @param {number} entityId
   * @param {number} userId
   * @returns {Promise<object|null>}
   */
  async _resolveEntity(entityType, entityId, userId) {
    if (entityType === 'deadline') {
      return Deadline.findOne({ where: { id: entityId, createdBy: userId } })
    }
    if (entityType === 'revision_session') {
      return RevisionSession.findOne({ where: { id: entityId, userId } })
    }
    return null
  }

  /**
   * Calcule la date du rappel depuis la date de l'entité et le délai.
   *
   * @param {object} entity
   * @param {string} entityType
   * @param {number} delayMinutes
   * @returns {dayjs.Dayjs|null}
   */
  _buildReminderAt(entity, entityType, delayMinutes) {
    if (entityType === 'deadline') {
      const time = entity.dueTime || '08:00:00'
      return dayjs(`${entity.dueDate} ${time}`).subtract(delayMinutes, 'minute')
    }
    if (entityType === 'revision_session') {
      return dayjs(`${entity.date} ${entity.startTime}`).subtract(delayMinutes, 'minute')
    }
    return null
  }

  /**
   * Planifie un job BullMQ avec un délai calculé depuis maintenant.
   *
   * @param {number} reminderId
   * @param {Date} reminderAt
   * @returns {Promise<string>} jobId BullMQ
   */
  async _scheduleJob(reminderId, reminderAt) {
    const delay = Math.max(0, reminderAt.getTime() - Date.now())
    const queue = getReminderQueue()
    const job = await queue.add(
      'send-reminder',
      { reminderId },
      { delay, jobId: `reminder-${reminderId}` }
    )
    return job.id
  }

  /**
   * Annule un job BullMQ.
   *
   * @param {string} jobId
   */
  async _cancelJob(jobId) {
    try {
      const queue = getReminderQueue()
      const job = await queue.getJob(jobId)
      if (job) await job.remove()
    } catch {
      // Le job peut déjà être absent de la queue (déjà traité) — non bloquant
    }
  }
}

module.exports = new ReminderService()
