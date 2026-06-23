const DeadlineService = require('../services/Deadline.service')
const logger = require('../helpers/logger')

exports.findAll = async (req, res) => {
  try {
    const deadlines = await DeadlineService.findAll(req.user.id)
    res.status(200).json({ message: 'Échéances récupérées avec succès.', data: deadlines })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la récupération des échéances.' })
  }
}

exports.findOne = async (req, res) => {
  try {
    const deadline = await DeadlineService.findOne(req.params.id, req.user.id)
    if (!deadline) return res.status(404).json({ message: 'Échéance introuvable.' })
    res.status(200).json({ message: 'Échéance récupérée avec succès.', data: deadline })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: "Erreur lors de la récupération de l'échéance." })
  }
}

exports.create = async (req, res) => {
  try {
    const result = await DeadlineService.create(req.user.id, req.body)
    if (result === false)
      return res
        .status(403)
        .json({
          message: 'Accès refusé. Vous devez être enseignant dans le groupe associé à cette séance.'
        })
    res.status(201).json({ message: 'Échéance créée avec succès.', data: result })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: "Erreur lors de la création de l'échéance." })
  }
}

exports.update = async (req, res) => {
  try {
    const result = await DeadlineService.update(req.params.id, req.user.id, req.body)
    if (result === null) return res.status(404).json({ message: 'Échéance introuvable.' })
    if (result === false)
      return res
        .status(403)
        .json({ message: 'Accès refusé. Seul le créateur peut modifier cette échéance.' })
    res.status(200).json({ message: 'Échéance mise à jour avec succès.', data: result })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: "Erreur lors de la mise à jour de l'échéance." })
  }
}

exports.findByTest = async (req, res) => {
  try {
    const data = await DeadlineService.findByTest(Number(req.params.id), req.user.id)
    res.status(200).json({ message: 'Échéances récupérées avec succès.', data })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la récupération des échéances de cet exercice.' })
  }
}

exports.delete = async (req, res) => {
  try {
    const result = await DeadlineService.delete(req.params.id, req.user.id)
    if (result === null) return res.status(404).json({ message: 'Échéance introuvable.' })
    if (result === false)
      return res
        .status(403)
        .json({ message: 'Accès refusé. Seul le créateur peut supprimer cette échéance.' })
    res.status(200).json({ message: 'Échéance supprimée avec succès.' })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: "Erreur lors de la suppression de l'échéance." })
  }
}
