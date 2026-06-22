const { Queue } = require('bullmq')
const redisConfig = require('../config/redis.config')
const logger = require('../helpers/logger')

let reminderQueue = null

/**
 * Retourne la queue BullMQ (singleton, connexion lazy).
 *
 * @returns {Queue}
 */
function getReminderQueue() {
  if (!reminderQueue) {
    reminderQueue = new Queue('reminders', {
      connection: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 500,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 }
      }
    })

    reminderQueue.on('error', (err) => {
      logger.error('[reminder-queue] Erreur de connexion Redis :', err?.message || err)
    })
  }
  return reminderQueue
}

/**
 * Ferme la connexion à la queue (utile pour les tests et l'arrêt propre).
 */
async function closeReminderQueue() {
  if (reminderQueue) {
    await reminderQueue.close()
    reminderQueue = null
  }
}

module.exports = { getReminderQueue, closeReminderQueue }
