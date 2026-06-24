const { UserKpiAlertSettings } = require('../models')

const DEFAULTS = {
  enabled: true,
  inAppEnabled: true,
  emailEnabled: false,
  pushEnabled: false,
  streakAlertEnabled: true,
  disciplineAlertEnabled: true,
  scoreDropAlertEnabled: true,
  thresholdDiscipline: 40
}

const ALLOWED_FIELDS = [
  'enabled', 'inAppEnabled', 'emailEnabled', 'pushEnabled',
  'streakAlertEnabled', 'disciplineAlertEnabled', 'scoreDropAlertEnabled',
  'thresholdDiscipline'
]

class KpiAlertSettingsService {
  /**
   * Retourne les paramètres d'alertes d'un utilisateur.
   * Crée l'entrée avec les valeurs par défaut si elle n'existe pas encore.
   *
   * @param {number} userId
   * @returns {UserKpiAlertSettings}
   */
  async getOrCreate(userId) {
    const [settings] = await UserKpiAlertSettings.findOrCreate({
      where: { userId },
      defaults: { ...DEFAULTS, userId }
    })
    return settings
  }

  /**
   * Met à jour les paramètres d'alertes d'un utilisateur.
   * Seuls les champs de la whitelist sont appliqués.
   *
   * @param {number} userId
   * @param {object} data - champs à mettre à jour
   * @returns {UserKpiAlertSettings}
   */
  async update(userId, data) {
    const settings = await this.getOrCreate(userId)
    const updates = {}
    for (const key of ALLOWED_FIELDS) {
      if (data[key] !== undefined) updates[key] = data[key]
    }
    await settings.update(updates)
    return settings
  }
}

module.exports = new KpiAlertSettingsService()
