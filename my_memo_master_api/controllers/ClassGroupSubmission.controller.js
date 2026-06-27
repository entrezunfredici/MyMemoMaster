const submissionService = require('../services/ClassGroupSubmission.service')

exports.findBySection = async (req, res) => {
  try {
    const { id: groupId, sectionId } = req.params
    const result = await submissionService.findBySection(Number(sectionId), Number(groupId), req.user.id)
    if (result === false) return res.status(403).send({ message: 'Accès refusé.' })
    return res.status(200).send({ data: result })
  } catch (_err) {
    return res.status(500).send({ message: 'Erreur serveur.' })
  }
}

exports.upsert = async (req, res) => {
  try {
    const { id: groupId, sectionId } = req.params
    const result = await submissionService.upsert(Number(sectionId), Number(groupId), req.user.id, req.body)
    if (result === false) return res.status(403).send({ message: 'Accès refusé.' })
    if (result === null) return res.status(404).send({ message: 'Section de type rendu introuvable.' })
    return res.status(200).send({ message: 'Rendu soumis.', data: result })
  } catch (_err) {
    return res.status(500).send({ message: 'Erreur serveur.' })
  }
}

exports.delete = async (req, res) => {
  try {
    const { id: groupId, sectionId, submissionId } = req.params
    const result = await submissionService.delete(Number(sectionId), Number(groupId), Number(submissionId), req.user.id)
    if (result === false) return res.status(403).send({ message: 'Accès refusé.' })
    if (result === null) return res.status(404).send({ message: 'Soumission introuvable.' })
    return res.status(200).send({ message: 'Soumission supprimée.' })
  } catch (_err) {
    return res.status(500).send({ message: 'Erreur serveur.' })
  }
}
