const { UserKpiAlertSettings } = require('../models')
const logger = require('../helpers/logger')

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

exports.getSettings = async (req, res) => {
  try {
    const [settings] = await UserKpiAlertSettings.findOrCreate({
      where: { userId: req.user.id },
      defaults: { ...DEFAULTS, userId: req.user.id }
    })
    res.status(200).json(settings)
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la récupération des préférences d\'alertes.' })
  }
}

exports.updateSettings = async (req, res) => {
  try {
    const [settings] = await UserKpiAlertSettings.findOrCreate({
      where: { userId: req.user.id },
      defaults: { ...DEFAULTS, userId: req.user.id }
    })

    const allowed = [
      'enabled', 'inAppEnabled', 'emailEnabled', 'pushEnabled',
      'streakAlertEnabled', 'disciplineAlertEnabled', 'scoreDropAlertEnabled',
      'thresholdDiscipline'
    ]
    const updates = {}
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key]
    }

    await settings.update(updates)
    res.status(200).json(settings)
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la mise à jour des préférences d\'alertes.' })
  }
}
