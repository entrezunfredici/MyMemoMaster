const reminderService = require('../services/Reminder.service')
const logger = require('../helpers/logger')

exports.findAll = async (req, res) => {
  try {
    const data = await reminderService.findAll(req.user.id)
    res.status(200).json({ message: 'Rappels récupérés avec succès.', data })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la récupération des rappels.' })
  }
}

exports.findOne = async (req, res) => {
  try {
    const data = await reminderService.findOne(parseInt(req.params.id), req.user.id)
    if (!data) return res.status(404).json({ message: 'Rappel introuvable.' })
    res.status(200).json({ message: 'Rappel récupéré avec succès.', data })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la récupération du rappel.' })
  }
}

exports.create = async (req, res) => {
  try {
    const data = await reminderService.create(req.user.id, req.body)
    res.status(201).json({ message: 'Rappel créé avec succès.', data })
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ message: error.message })
    if (error.status === 400) return res.status(400).json({ message: error.message })
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la création du rappel.' })
  }
}

exports.update = async (req, res) => {
  try {
    const data = await reminderService.update(parseInt(req.params.id), req.user.id, req.body)
    if (!data) return res.status(404).json({ message: 'Rappel introuvable.' })
    res.status(200).json({ message: 'Rappel mis à jour avec succès.', data })
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ message: error.message })
    if (error.status === 400) return res.status(400).json({ message: error.message })
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la mise à jour du rappel.' })
  }
}

exports.delete = async (req, res) => {
  try {
    const found = await reminderService.delete(parseInt(req.params.id), req.user.id)
    if (!found) return res.status(404).json({ message: 'Rappel introuvable.' })
    res.status(200).json({ message: 'Rappel supprimé avec succès.' })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la suppression du rappel.' })
  }
}
