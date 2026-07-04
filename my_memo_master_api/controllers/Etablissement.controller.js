const EtablissementService = require('../services/Etablissement.service')
const logger = require('../helpers/logger')

exports.findMine = async (req, res) => {
  try {
    const etab = await EtablissementService.findByAdmin(req.user.id)
    if (!etab) return res.status(404).json({ message: 'Aucun établissement associé à ce compte.' })
    res.status(200).json({ message: 'Établissement récupéré.', data: etab })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: "Erreur lors de la récupération de l'établissement." })
  }
}

exports.findAll = async (req, res) => {
  try {
    const data = await EtablissementService.findAll()
    res.status(200).json({ message: 'Établissements récupérés.', data })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la récupération des établissements.' })
  }
}

exports.findOne = async (req, res) => {
  try {
    const { roleId, id: requesterId } = req.user
    const requestedId = parseInt(req.params.id, 10)

    // roleId=4 (admin établissement) : limité à son propre établissement
    if (roleId === 4) {
      const etab = await EtablissementService.findByAdmin(requesterId)
      if (!etab) return res.status(404).json({ message: 'Établissement introuvable.' })
      if (etab.id !== requestedId) return res.status(403).json({ message: 'Accès refusé.' })
      return res.status(200).json({ message: 'Établissement récupéré.', data: etab })
    }

    const etab = await EtablissementService.findOne(requestedId)
    if (!etab) return res.status(404).json({ message: 'Établissement introuvable.' })
    res.status(200).json({ message: 'Établissement récupéré.', data: etab })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: "Erreur lors de la récupération de l'établissement." })
  }
}

exports.create = async (req, res) => {
  try {
    const { name, code, adminId } = req.body
    const etab = await EtablissementService.create({ name, code, adminId })
    res.status(201).json({ message: 'Établissement créé.', data: etab })
  } catch (error) {
    logger.error(error?.message || error)
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'Ce code établissement est déjà utilisé.' })
    }
    res.status(500).json({ message: "Erreur lors de la création de l'établissement." })
  }
}

exports.update = async (req, res) => {
  try {
    const etab = await EtablissementService.update(req.params.id, req.body)
    if (!etab) return res.status(404).json({ message: 'Établissement introuvable.' })
    res.status(200).json({ message: 'Établissement mis à jour.', data: etab })
  } catch (error) {
    logger.error(error?.message || error)
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'Ce code établissement est déjà utilisé.' })
    }
    res.status(500).json({ message: "Erreur lors de la mise à jour de l'établissement." })
  }
}

exports.destroy = async (req, res) => {
  try {
    const result = await EtablissementService.delete(req.params.id)
    if (!result) return res.status(404).json({ message: 'Établissement introuvable.' })
    res.status(200).json({ message: 'Établissement supprimé.' })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: "Erreur lors de la suppression de l'établissement." })
  }
}

exports.getAuditLogs = async (req, res) => {
  try {
    const { roleId, id: requesterId } = req.user
    const { action, entityType, entityId, limit } = req.query
    const result = await EtablissementService.getAuditLogs(
      req.params.id,
      requesterId,
      roleId,
      { action, entityType, entityId, limit }
    )
    if (result === null) return res.status(404).json({ message: 'Établissement introuvable.' })
    if (result === false) return res.status(403).json({ message: 'Accès refusé.' })
    res.status(200).json({ message: 'Journaux récupérés.', data: result })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la récupération des journaux.' })
  }
}

exports.getContent = async (req, res) => {
  try {
    const { roleId, id: requesterId } = req.user
    const result = await EtablissementService.getContent(req.params.id, requesterId, roleId)
    if (result === null) return res.status(404).json({ message: 'Établissement introuvable.' })
    if (result === false) return res.status(403).json({ message: 'Accès refusé.' })
    res.status(200).json({ message: 'Contenu récupéré.', data: result })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la récupération du contenu.' })
  }
}

exports.deleteContent = async (req, res) => {
  try {
    const { roleId, id: requesterId } = req.user
    const { contentType, contentId } = req.params
    const result = await EtablissementService.deleteContent(
      req.params.id,
      contentType,
      contentId,
      requesterId,
      roleId
    )
    if (result === null) return res.status(404).json({ message: 'Établissement introuvable.' })
    if (result === false) return res.status(403).json({ message: 'Accès refusé.' })
    if (result === 'not_found') return res.status(404).json({ message: 'Contenu introuvable ou hors établissement.' })
    res.status(200).json({ message: 'Contenu supprimé.' })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la suppression du contenu.' })
  }
}

exports.assignAdmin = async (req, res) => {
  try {
    const result = await EtablissementService.assignAdmin(req.params.id, req.body.email, req.user.id)
    if (result === null) return res.status(404).json({ message: 'Établissement introuvable.' })
    if (result === 'platform_admin') return res.status(409).json({ message: "Impossible d'assigner un administrateur plateforme comme gérant d'établissement." })
    if (result === 'already_admin') return res.status(409).json({ message: 'Cet utilisateur est déjà gestionnaire d\'un autre établissement.' })
    if (result.directlyAssigned) {
      return res.status(200).json({ message: 'Gérant assigné avec succès.', data: result })
    }
    return res.status(200).json({
      message: `Aucun compte trouvé pour ${result.email}. Un email d'invitation a été envoyé.`,
      data: result
    })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: "Erreur lors de l'assignation du gérant." })
  }
}

exports.getStats = async (req, res) => {
  try {
    const { roleId, id: requesterId } = req.user
    const result = await EtablissementService.getStats(req.params.id, requesterId, roleId)
    if (result === null) return res.status(404).json({ message: 'Établissement introuvable.' })
    if (result === false) return res.status(403).json({ message: 'Accès refusé.' })
    res.status(200).json({ message: 'Statistiques récupérées.', data: result })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: "Erreur lors de la récupération des statistiques." })
  }
}
