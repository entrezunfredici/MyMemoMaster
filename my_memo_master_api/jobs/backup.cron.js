const cron = require('node-cron')
const logger = require('../helpers/logger')

let backupCron = null

/**
 * Lance la sauvegarde quotidienne de la base (BACKUP_HOUR, UTC, défaut 03h00).
 * Sans effet hors PostgreSQL ou si BACKUP_ENABLED=false. Idempotent : un seul cron par processus.
 * Plusieurs pods planifient la même tâche : l'unicité du créneau en base (BackupService.runScheduled)
 * garantit qu'un seul exécute le dump.
 */
function startBackupCron() {
  // Chargement différé pour éviter les problèmes de DB non initialisée
  const backupService = require('../services/Backup.service')
  if (backupCron || !backupService.isScheduleEnabled()) return

  const hour = backupService.getScheduleHourUtc()
  backupCron = cron.schedule(
    `0 ${hour} * * *`,
    async () => {
      logger.info('[backup-cron] Démarrage de la sauvegarde planifiée')
      try {
        await backupService.runScheduled()
      } catch (err) {
        logger.error(`[backup-cron] Erreur : ${err?.message || err}`)
      }
    },
    { timezone: 'UTC' }
  )

  logger.info(`[backup-cron] Démarré — sauvegarde quotidienne à ${hour}h00 UTC`)
}

function stopBackupCron() {
  if (backupCron) {
    backupCron.stop()
    backupCron = null
  }
}

module.exports = { startBackupCron, stopBackupCron }
