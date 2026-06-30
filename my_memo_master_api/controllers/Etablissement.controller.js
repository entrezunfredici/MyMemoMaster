const EtablissementService = require('../services/Etablissement.service')
const logger = require('../helpers/logger')

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
