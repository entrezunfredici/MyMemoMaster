const cron = require('node-cron')
const logger = require('../helpers/logger')

let moderationCron = null

/**
 * Lance la tâche quotidienne de modération (04h00 UTC) :
 * - supprime les contenus masqués depuis plus de 30 jours ;
 * - supprime les dossiers clos depuis plus d'un an (CONTENT_REPORT_RETENTION_DAYS).
 * Désactivable avec CONTENT_MODERATION_CRON_ENABLED=false. Idempotent : un seul cron par processus.
 * Plusieurs pods exécutent la même tâche : les opérations sont idempotentes (un contenu déjà supprimé
 * est ignoré), au pire une entrée d'audit en double.
 */
function startContentModerationCron() {
  if (moderationCron || process.env.CONTENT_MODERATION_CRON_ENABLED === 'false') return

  moderationCron = cron.schedule(
    '0 4 * * *',
    async () => {
      try {
        // Chargement différé pour éviter les problèmes de DB non initialisée
        const service = require('../services/ContentReport.service')
        const purged = await service.purgeExpired()
        const old = await service.purgeOldReports()
        logger.info(
          `[moderation-cron] ${purged.purged} contenu(s) masqué(s) supprimé(s) (${purged.failed} échec(s)), ` +
            `${old.reports} dossier(s) et ${old.auditLogs} entrée(s) d'audit expiré(s) supprimé(s)`
        )
      } catch (err) {
        logger.error(`[moderation-cron] Erreur : ${err?.message || err}`)
      }
    },
    { timezone: 'UTC' }
  )

  logger.info('[moderation-cron] Démarré — exécution quotidienne à 04h00 UTC')
}

function stopContentModerationCron() {
  if (moderationCron) {
    moderationCron.stop()
    moderationCron = null
  }
}

module.exports = { startContentModerationCron, stopContentModerationCron }
