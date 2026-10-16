const submissionService = require('../services/ClassGroupSubmission.service')
const logger = require('../helpers/logger')

exports.getStatus = async (req, res) => {
  try {
    const { id: groupId, sectionId } = req.params
    const result = await submissionService.getSubmissionStatus(Number(sectionId), Number(groupId), req.user.id)
    if (result === false) return res.status(403).json({ message: 'Accès refusé.' })
    if (result === null) return res.status(404).json({ message: 'Section de type rendu introuvable.' })
    return res.status(200).json({ message: 'Statut des rendus récupéré.', data: result })
  } catch (err) {
    logger.error(err?.message || err)
    return res.status(500).json({ message: 'Erreur lors de la récupération du statut.' })
  }
}

exports.findBySection = async (req, res) => {
  try {
    const { id: groupId, sectionId } = req.params
    const result = await submissionService.findBySection(Number(sectionId), Number(groupId), req.user.id)
    if (result === false) return res.status(403).json({ message: 'Accès refusé.' })
    return res.status(200).json({ message: 'Rendus récupérés.', data: result })
  } catch (err) {
    logger.error(err?.message || err)
    return res.status(500).json({ message: 'Erreur lors de la récupération des rendus.' })
  }
}

exports.upsert = async (req, res) => {
  try {
    const { id: groupId, sectionId } = req.params
    const result = await submissionService.upsert(Number(sectionId), Number(groupId), req.user.id, req.body)
    if (result === false) return res.status(403).json({ message: 'Accès refusé.' })
    if (result === null) return res.status(404).json({ message: 'Section de type rendu introuvable.' })
    return res.status(200).json({ message: 'Rendu soumis.', data: result })
  } catch (err) {
    logger.error(err?.message || err)
    return res.status(500).json({ message: 'Erreur lors de la soumission du rendu.' })
  }
}

exports.delete = async (req, res) => {
  try {
    const { id: groupId, sectionId, submissionId } = req.params
    const result = await submissionService.delete(Number(sectionId), Number(groupId), Number(submissionId), req.user.id)
    if (result === false) return res.status(403).json({ message: 'Accès refusé.' })
    if (result === null) return res.status(404).json({ message: 'Soumission introuvable.' })
    return res.status(200).json({ message: 'Soumission supprimée.' })
  } catch (err) {
    logger.error(err?.message || err)
    return res.status(500).json({ message: 'Erreur lors de la suppression de la soumission.' })
  }
}
