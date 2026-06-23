const dayjs = require('dayjs')
const { User, UserKpiAlertSettings, Reminder } = require('../models')
const kpiService = require('./Kpi.service')
const sendEmail = require('../helpers/sendEmail')
const logger = require('../helpers/logger')

class KpiAlertService {
  /**
   * Construit la liste des items d'alerte à inclure dans le digest.
   * Retourne un tableau vide si aucune condition n'est déclenchée.
   *
   * @param {object} kpis - résultat de KpiService.getMyKpis
   * @param {object} settings - instance UserKpiAlertSettings
   * @returns {Array<{icon:string, text:string, type:string}>}
   */
  buildDigestItems(kpis, settings) {
    const items = []

    if (settings.streakAlertEnabled && kpis.revision.streakDays > 0 && !kpis.revision.revivedToday) {
      const n = kpis.revision.streakDays
      items.push({
        icon: '🔥',
        text: `Ton streak de ${n} jour${n > 1 ? 's' : ''} est en danger ! Revise aujourd'hui pour ne pas le perdre.`,
        type: 'streak_risk'
      })
    }

    if (
      settings.disciplineAlertEnabled &&
      kpis.discipline.disciplineScore > 0 &&
      kpis.discipline.disciplineScore < settings.thresholdDiscipline
    ) {
      items.push({
        icon: '📉',
        text: `Ton score de discipline est à ${kpis.discipline.disciplineScore} %. Essaie de compléter les sessions que tu as planifiées.`,
        type: 'discipline_low'
      })
    }

    if (settings.scoreDropAlertEnabled && kpis.exercises.recentTrend <= -10) {
      items.push({
        icon: '📚',
        text: `Tes scores ont baissé de ${Math.abs(kpis.exercises.recentTrend)} points en moyenne. Peut-être revoir certaines notions ?`,
        type: 'score_drop'
      })
    }

    return items
  }

  /**
   * Lance le digest quotidien pour tous les utilisateurs éligibles.
   * Appelé par le cron kpiAlert à 18h.
   */
  async runDailyDigest() {
    const todayStr = dayjs().format('YYYY-MM-DD')

    const settingsList = await UserKpiAlertSettings.findAll({
      where: { enabled: true },
      include: [{ model: User, as: 'user', attributes: ['userId', 'name', 'email'] }]
    })

    let sent = 0
    let skipped = 0

    for (const settings of settingsList) {
      if (settings.lastDigestSentAt && String(settings.lastDigestSentAt) >= todayStr) {
        skipped++
        continue
      }

      try {
        await this._sendDigestForUser(settings)
        sent++
      } catch (err) {
        logger.error(`[kpi-alert] Erreur pour userId=${settings.userId} : ${err?.message || err}`)
      }
    }

    logger.info(`[kpi-alert] Digest quotidien terminé — envoyé: ${sent}, ignoré: ${skipped}`)
  }

  /**
   * @private
   */
  async _sendDigestForUser(settings) {
    const kpis = await kpiService.getMyKpis(settings.userId)
    const items = this.buildDigestItems(kpis, settings)

    // Mise à jour de la date même si aucun item (évite de re-vérifier demain pour rien)
    await settings.update({ lastDigestSentAt: dayjs().format('YYYY-MM-DD') })

    if (items.length === 0) return

    // In-app : crée un Reminder visible dans la cloche
    if (settings.inAppEnabled) {
      await Reminder.create({
        userId: settings.userId,
        entityType: 'kpi_digest',
        entityId: settings.userId,
        reminderAt: new Date(),
        delayMinutes: 0,
        channel: 'in_app',
        status: 'pending',
        message: JSON.stringify(items)
      })
    }

    // Email : envoi direct (pas via BullMQ — batch contrôlé quotidien)
    if (settings.emailEnabled && settings.user?.email) {
      const { subject, text } = this._buildEmailContent(settings.user.name, items)
      await sendEmail(subject, text, settings.user.email)
    }
  }

  /**
   * @private
   */
  _buildEmailContent(name, items) {
    const lines = items.map((item) => `${item.icon}  ${item.text}`)
    return {
      subject: '[MyMemoMaster] Ton bilan de progression du jour',
      text: [
        `Bonjour ${name || ''},`,
        '',
        'Voici ton bilan de progression du jour :',
        '',
        ...lines,
        '',
        'Bonne révision !',
        'MyMemoMaster'
      ].join('\n')
    }
  }
}

module.exports = new KpiAlertService()
