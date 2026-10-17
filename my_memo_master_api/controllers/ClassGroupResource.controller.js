const ClassGroupResourceService = require('../services/ClassGroupResource.service')
const logger = require('../helpers/logger')
const { isUserUploadKey } = require('../helpers/storageKeys')

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
    // BUG CORRIGÉ: seuls title/type/description/url étaient retenus, les champs du fichier téléversé (fileKey,
    // mimeType, originalName, fileSize) — pourtant validés — étaient jetés : toute ressource sortait avec des
    // champs de fichier à null, donc sans bouton « Ouvrir » côté interface.
    const { title, type, description, url, fileKey, mimeType, originalName, fileSize } = req.body
    // La clé vient du client : elle doit désigner un fichier que CET utilisateur a téléversé, pas celui d'autrui.
    if (fileKey && !isUserUploadKey(fileKey, req.user.id)) {
      return res.status(400).json({ message: 'Fichier invalide : il doit avoir été téléversé par vous.' })
    }
    const result = await ClassGroupResourceService.create(req.params.id, req.user.id, {
      title, type, description, url, fileKey, mimeType, originalName, fileSize
    })
    if (result === false) return res.status(403).json({ message: 'Accès refusé. Seuls les enseignants et admins peuvent partager des ressources.' })
    res.status(201).json({ message: 'Ressource partagée.', data: result })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors du partage de la ressource.' })
  }
}

exports.update = async (req, res) => {
  try {
    if (req.body.fileKey && !isUserUploadKey(req.body.fileKey, req.user.id)) {
      return res.status(400).json({ message: 'Fichier invalide : il doit avoir été téléversé par vous.' })
    }
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
