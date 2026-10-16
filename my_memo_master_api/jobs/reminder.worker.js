const { Worker } = require('bullmq')
const redisConfig = require('../config/redis.config')
const logger = require('../helpers/logger')
const sendEmail = require('../helpers/sendEmail')

let reminderWorker = null

/**
 * Construit le sujet et le corps du mail selon le type d'entité.
 *
 * @param {object} reminder - Instance Reminder avec données incluses
 * @returns {{ subject: string, text: string }}
 */
function buildEmailContent(reminder) {
  const customMsg = reminder.message ? `\n\n${reminder.message}` : ''

  if (reminder.entityType === 'deadline') {
    const deadline = reminder.deadlineEntity
    const name = deadline?.name || 'une échéance'
    const dueDate = deadline?.dueDate || ''
    const dueTime = deadline?.dueTime ? ` à ${deadline.dueTime}` : ''
    return {
      subject: `[MyMemoMaster] Rappel : ${name}`,
      text: `Bonjour ${reminder.user?.name || ''},\n\nVous avez une échéance à venir : "${name}" prévue le ${dueDate}${dueTime}.${customMsg}\n\nMyMemoMaster`
    }
  }

  if (reminder.entityType === 'revision_session') {
    const session = reminder.sessionEntity
    const name = session?.name || 'une séance de révision'
    const date = session?.date || ''
    const start = session?.startTime ? ` à ${session.startTime}` : ''
    return {
      subject: `[MyMemoMaster] Rappel : ${name}`,
      text: `Bonjour ${reminder.user?.name || ''},\n\nVous avez une séance de révision : "${name}" prévue le ${date}${start}.${customMsg}\n\nMyMemoMaster`
    }
  }

  return {
    subject: '[MyMemoMaster] Rappel',
    text: `Bonjour ${reminder.user?.name || ''},\n\nVous avez un rappel programmé.${customMsg}\n\nMyMemoMaster`
  }
}

/**
 * Démarre le worker BullMQ qui traite les jobs de rappel.
 * Idempotent : un seul worker tourne par processus.
 */
function startReminderWorker() {
  if (reminderWorker) return

  // Chargement différé pour éviter les problèmes de DB non initialisée au démarrage
  const { Reminder, User, Deadline, RevisionSession } = require('../models')

  reminderWorker = new Worker(
    'reminders',
    async (job) => {
      const { reminderId } = job.data

      const reminder = await Reminder.findByPk(reminderId, {
        include: [{ model: User, as: 'user', attributes: ['name', 'email'] }]
      })

      if (!reminder) {
        logger.warn(`[reminder-worker] Job ${job.id} : rappel ${reminderId} introuvable — ignoré`)
        return
      }

      if (reminder.status !== 'pending') {
        logger.info(
          `[reminder-worker] Job ${job.id} : rappel ${reminderId} déjà traité (${reminder.status}) — ignoré`
        )
        return
      }

      // Chargement de l'entité liée
      if (reminder.entityType === 'deadline') {
        reminder.deadlineEntity = await Deadline.findByPk(reminder.entityId)
      } else if (reminder.entityType === 'revision_session') {
        reminder.sessionEntity = await RevisionSession.findByPk(reminder.entityId)
      }

      const { subject, text } = buildEmailContent(reminder)
      await sendEmail(subject, text, reminder.user.email)

      await reminder.update({ status: 'sent' })
      logger.info(`[reminder-worker] Rappel ${reminderId} envoyé à ${reminder.user.email}`)
    },
    {
      connection: redisConfig,
      concurrency: 5
    }
  )

  reminderWorker.on('completed', (job) => {
    logger.info(`[reminder-worker] Job ${job.id} terminé`)
  })

  reminderWorker.on('failed', async (job, err) => {
    logger.error(`[reminder-worker] Job ${job?.id} échoué :`, err?.message || err)
    if (job?.data?.reminderId) {
      try {
        const { Reminder } = require('../models')
        await Reminder.update({ status: 'failed' }, { where: { id: job.data.reminderId } })
      } catch (updateErr) {
        logger.error(
          '[reminder-worker] Impossible de marquer le rappel comme échoué :',
          updateErr?.message
        )
      }
    }
  })

  reminderWorker.on('error', (err) => {
    logger.error('[reminder-worker] Erreur Redis :', err?.message || err)
  })

  logger.info('[reminder-worker] Démarré')
}

/**
 * Ferme le worker (tests et arrêt propre).
 */
async function closeReminderWorker() {
  if (reminderWorker) {
    await reminderWorker.close()
    reminderWorker = null
  }
}

module.exports = { startReminderWorker, closeReminderWorker }
