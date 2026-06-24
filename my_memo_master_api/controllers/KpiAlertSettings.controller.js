const kpiAlertSettingsService = require('../services/KpiAlertSettings.service')
const logger = require('../helpers/logger')

exports.getSettings = async (req, res) => {
  try {
    const settings = await kpiAlertSettingsService.getOrCreate(req.user.id)
    res.status(200).json(settings)
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la récupération des préférences d\'alertes.' })
  }
}

exports.updateSettings = async (req, res) => {
  try {
    const settings = await kpiAlertSettingsService.update(req.user.id, req.body)
    res.status(200).json(settings)
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la mise à jour des préférences d\'alertes.' })
  }
}
