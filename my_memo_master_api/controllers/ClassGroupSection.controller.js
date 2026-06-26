const ClassGroupSectionService = require('../services/ClassGroupSection.service')
const logger = require('../helpers/logger')

exports.findAll = async (req, res) => {
  try {
    const result = await ClassGroupSectionService.findAll(req.params.id, req.user.id)
    if (result === false) return res.status(403).json({ message: 'Accès refusé.' })
    res.status(200).json({ message: 'Sections récupérées.', data: result })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la récupération des sections.' })
  }
}

exports.create = async (req, res) => {
  try {
    const { title, type, description, dueDate } = req.body
    const result = await ClassGroupSectionService.create(req.params.id, req.user.id, { title, type, description, dueDate })
    if (result === false) return res.status(403).json({ message: 'Accès refusé. Seuls les enseignants et admins peuvent créer des sections.' })
    res.status(201).json({ message: 'Section créée.', data: result })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la création de la section.' })
  }
}

exports.update = async (req, res) => {
  try {
    const result = await ClassGroupSectionService.update(req.params.id, req.params.sectionId, req.user.id, req.body)
    if (result === false) return res.status(403).json({ message: 'Accès refusé.' })
    if (result === null) return res.status(404).json({ message: 'Section introuvable.' })
    res.status(200).json({ message: 'Section mise à jour.', data: result })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la mise à jour de la section.' })
  }
}

exports.delete = async (req, res) => {
  try {
    const result = await ClassGroupSectionService.delete(req.params.id, req.params.sectionId, req.user.id)
    if (result === false) return res.status(403).json({ message: 'Accès refusé.' })
    if (result === null) return res.status(404).json({ message: 'Section introuvable.' })
    res.status(200).json({ message: 'Section supprimée.' })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la suppression de la section.' })
  }
}
