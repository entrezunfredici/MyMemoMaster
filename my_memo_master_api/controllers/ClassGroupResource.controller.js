const ClassGroupResourceService = require('../services/ClassGroupResource.service')
const logger = require('../helpers/logger')

exports.findAll = async (req, res) => {
  try {
    const result = await ClassGroupResourceService.findAll(req.params.id, req.user.id)
    if (result === false) return res.status(403).json({ message: 'Accès refusé.' })
    res.status(200).json({ message: 'Ressources récupérées.', data: result })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la récupération des ressources.' })
  }
}

exports.create = async (req, res) => {
  try {
    const { title, type, description, url } = req.body
    const result = await ClassGroupResourceService.create(req.params.id, req.user.id, { title, type, description, url })
    if (result === false) return res.status(403).json({ message: 'Accès refusé. Seuls les enseignants et admins peuvent partager des ressources.' })
    res.status(201).json({ message: 'Ressource partagée.', data: result })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors du partage de la ressource.' })
  }
}

exports.update = async (req, res) => {
  try {
    const result = await ClassGroupResourceService.update(req.params.id, req.params.resourceId, req.user.id, req.body)
    if (result === false) return res.status(403).json({ message: 'Accès refusé.' })
    if (result === null) return res.status(404).json({ message: 'Ressource introuvable.' })
    res.status(200).json({ message: 'Ressource mise à jour.', data: result })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la mise à jour de la ressource.' })
  }
}

exports.delete = async (req, res) => {
  try {
    const result = await ClassGroupResourceService.delete(req.params.id, req.params.resourceId, req.user.id)
    if (result === false) return res.status(403).json({ message: 'Accès refusé.' })
    if (result === null) return res.status(404).json({ message: 'Ressource introuvable.' })
    res.status(200).json({ message: 'Ressource supprimée.' })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la suppression de la ressource.' })
  }
}
