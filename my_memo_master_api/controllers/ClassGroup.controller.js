const ClassGroupService = require('../services/ClassGroup.service')
const logger = require('../helpers/logger')

exports.findAll = async (req, res) => {
  try {
    const groups = await ClassGroupService.findAll(req.user.id)
    res.status(200).json({ message: 'Groupes récupérés avec succès.', data: groups })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la récupération des groupes.' })
  }
}

exports.findOne = async (req, res) => {
  try {
    const group = await ClassGroupService.findOne(req.params.id)
    if (!group) return res.status(404).json({ message: 'Groupe introuvable.' })
    res.status(200).json({ message: 'Groupe récupéré avec succès.', data: group })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la récupération du groupe.' })
  }
}

exports.create = async (req, res) => {
  try {
    const { name, description, level, code, score } = req.body
    const result = await ClassGroupService.create(req.user.id, { name, description, level, code, score })
    if (result === false)
      return res
        .status(403)
        .json({ message: 'Accès refusé. Seuls les administrateurs peuvent créer des groupes.' })
    res.status(201).json({ message: 'Groupe créé avec succès.', data: result })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la création du groupe.' })
  }
}

exports.update = async (req, res) => {
  try {
    const result = await ClassGroupService.update(req.params.id, req.user.id, req.body)
    if (result === false)
      return res
        .status(403)
        .json({ message: 'Accès refusé. Seuls les administrateurs peuvent modifier des groupes.' })
    if (result === null) return res.status(404).json({ message: 'Groupe introuvable.' })
    res.status(200).json({ message: 'Groupe mis à jour avec succès.', data: result })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la mise à jour du groupe.' })
  }
}

exports.delete = async (req, res) => {
  try {
    const result = await ClassGroupService.delete(req.params.id, req.user.id)
    if (result === false)
      return res
        .status(403)
        .json({ message: 'Accès refusé. Seuls les administrateurs peuvent supprimer des groupes.' })
    if (result === null) return res.status(404).json({ message: 'Groupe introuvable.' })
    res.status(200).json({ message: 'Groupe supprimé avec succès.' })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la suppression du groupe.' })
  }
}

exports.addMember = async (req, res) => {
  try {
    const { userId, role } = req.body
    const result = await ClassGroupService.addMember(req.params.id, req.user.id, { userId, role })
    if (result === false)
      return res
        .status(403)
        .json({ message: 'Accès refusé. Seuls les administrateurs peuvent gérer les membres.' })
    if (result === null) return res.status(404).json({ message: 'Groupe introuvable.' })
    res.status(201).json({ message: 'Membre ajouté au groupe avec succès.', data: result })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: "Erreur lors de l'ajout du membre." })
  }
}

exports.getKpi = async (req, res) => {
  try {
    const result = await ClassGroupService.getKpi(req.params.id, req.user.id)
    if (result === false)
      return res.status(403).json({ message: 'Accès refusé. Seuls les admins et enseignants du groupe peuvent consulter les KPI.' })
    if (result === null)
      return res.status(404).json({ message: 'Groupe introuvable.' })
    res.status(200).json({ message: 'KPI récupérés avec succès.', data: result })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors du calcul des KPI.' })
  }
}

exports.getStudentAnalytics = async (req, res) => {
  try {
    const result = await ClassGroupService.getStudentAnalytics(req.params.id, req.user.id)
    if (result === false)
      return res.status(403).json({ message: 'Accès refusé. Seuls les admins et enseignants du groupe peuvent consulter l\'analyse pédagogique.' })
    if (result === null)
      return res.status(404).json({ message: 'Groupe introuvable.' })
    res.status(200).json({ message: 'Analyse pédagogique récupérée avec succès.', data: result })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors du calcul de l\'analyse pédagogique.' })
  }
}

exports.removeMember = async (req, res) => {
  try {
    const result = await ClassGroupService.removeMember(
      req.params.id,
      req.params.userId,
      req.user.id
    )
    if (result === false)
      return res
        .status(403)
        .json({ message: 'Accès refusé. Seuls les administrateurs peuvent gérer les membres.' })
    if (result === null)
      return res.status(404).json({ message: 'Membre introuvable dans ce groupe.' })
    res.status(200).json({ message: 'Membre retiré du groupe avec succès.' })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la suppression du membre.' })
  }
}
