const KpiConsentService = require('../services/KpiConsent.service')
const logger = require('../helpers/logger')

exports.grantConsent = async (req, res) => {
  try {
    const { teacherId, classGroupId, subjectId = null } = req.body
    const result = await KpiConsentService.grantConsent(req.user.id, teacherId, classGroupId, subjectId)
    if (result === 'not_student') return res.status(403).json({ message: "Vous n'êtes pas étudiant dans ce groupe." })
    if (result === 'not_teacher') return res.status(404).json({ message: 'Enseignant introuvable dans ce groupe.' })
    res.status(201).json({ message: 'Consentement accordé.', data: result })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: "Erreur lors de l'accord du consentement." })
  }
}

exports.revokeConsent = async (req, res) => {
  try {
    const teacherId = Number(req.params.teacherId)
    const classGroupId = Number(req.params.classGroupId)
    const subjectId = req.query.subjectId ? Number(req.query.subjectId) : null
    const result = await KpiConsentService.revokeConsent(req.user.id, teacherId, classGroupId, subjectId)
    if (result === null) return res.status(404).json({ message: 'Consentement introuvable.' })
    res.status(200).json({ message: 'Consentement révoqué.' })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la révocation du consentement.' })
  }
}

exports.getMyConsents = async (req, res) => {
  try {
    const result = await KpiConsentService.getMyConsents(req.user.id)
    res.status(200).json({ message: 'Consentements récupérés.', data: result })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la récupération des consentements.' })
  }
}

exports.getStudentKpis = async (req, res) => {
  try {
    const studentId = Number(req.params.studentId)
    const classGroupId = Number(req.query.classGroupId)
    const result = await KpiConsentService.getStudentKpis(req.user.id, studentId, classGroupId)
    if (result === 'not_teacher') return res.status(403).json({ message: "Accès refusé. Vous n'êtes pas enseignant dans ce groupe." })
    if (result === 'no_consent') return res.status(403).json({ message: "L'étudiant n'a pas accordé l'accès à ses KPI." })
    res.status(200).json(result)
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: "Erreur lors de la récupération des KPI de l'étudiant." })
  }
}
