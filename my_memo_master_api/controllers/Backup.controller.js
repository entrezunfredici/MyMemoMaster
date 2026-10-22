const BackupService = require('../services/Backup.service')
const logger = require('../helpers/logger')

exports.findAll = async (req, res) => {
  try {
    const [status, runs] = await Promise.all([BackupService.getStatus(), BackupService.findAll(req.query.limit)])
    res.status(200).json({ message: 'Sauvegardes récupérées.', data: { status, runs } })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la récupération des sauvegardes.' })
  }
}

exports.create = async (req, res) => {
  try {
    const run = await BackupService.startManual(req.user.id)
    res.status(201).json({ message: 'Sauvegarde lancée.', data: run })
  } catch (error) {
    if (error?.code === 'UNSUPPORTED' || error?.code === 'ALREADY_RUNNING') {
      return res.status(400).json({ message: error.message })
    }
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors du lancement de la sauvegarde.' })
  }
}
