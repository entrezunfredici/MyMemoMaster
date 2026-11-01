const ContentReportService = require('../services/ContentReport.service')
const logger = require('../helpers/logger')

// Correspondance code d'erreur du service → statut HTTP et message (en français).
const ERRORS = {
  not_found: [404, 'Signalement ou contenu introuvable.'],
  forbidden: [403, "Vous ne pouvez pas signaler un contenu auquel vous n'avez pas accès."],
  own_content: [400, 'Vous ne pouvez pas signaler votre propre contenu.'],
  own_report: [403, 'Vous ne pouvez pas traiter un signalement visant votre propre contenu.'],
  duplicate: [409, 'Vous avez déjà un signalement en cours sur ce contenu.'],
  already_hidden: [409, 'Ce contenu est déjà masqué.'],
  conflict: [409, "Ce signalement ne peut pas recevoir cette action dans son état actuel."],
  author_gone: [409, "Le compte de l'auteur n'existe plus."],
  already_suspended: [409, "Le compte de l'auteur est déjà suspendu."],
  target_forbidden: [403, 'Vous ne pouvez pas suspendre ce compte.'],
  rate_limited: [429, 'Limite de signalements atteinte (10 par 24 h). Réessayez plus tard.']
}

const requesterOf = (req) => ({ id: req.user.id, roleId: req.user.roleId })

const reply = (res, result, successStatus, successMessage) => {
  if (result.error) {
    const [status, message] = ERRORS[result.error]
    return res.status(status).json({ message })
  }
  return res.status(successStatus).json({ message: successMessage, data: result.data })
}

exports.create = async (req, res) => {
  try {
    const result = await ContentReportService.create(req.user.id, req.body)
    return reply(res, result, 201, 'Signalement enregistré. Merci, il sera examiné par la modération.')
  } catch (error) {
    logger.error(error?.message || error)
    return res.status(500).json({ message: "Erreur lors de l'enregistrement du signalement." })
  }
}

exports.findAll = async (req, res) => {
  try {
    const data = await ContentReportService.findAll(requesterOf(req), req.query)
    return res.status(200).json({ message: 'File de traitement récupérée.', data })
  } catch (error) {
    logger.error(error?.message || error)
    return res.status(500).json({ message: 'Erreur lors de la récupération de la file de traitement.' })
  }
}

exports.findOne = async (req, res) => {
  try {
    const result = await ContentReportService.findOne(Number(req.params.id), requesterOf(req))
    return reply(res, result, 200, 'Signalement récupéré.')
  } catch (error) {
    logger.error(error?.message || error)
    return res.status(500).json({ message: 'Erreur lors de la récupération du signalement.' })
  }
}

exports.claim = async (req, res) => {
  try {
    const result = await ContentReportService.claim(Number(req.params.id), requesterOf(req))
    return reply(res, result, 200, 'Signalement pris en charge.')
  } catch (error) {
    logger.error(error?.message || error)
    return res.status(500).json({ message: 'Erreur lors de la prise en charge du signalement.' })
  }
}

exports.dismiss = async (req, res) => {
  try {
    const result = await ContentReportService.dismiss(Number(req.params.id), requesterOf(req), req.body.decisionNote)
    return reply(res, result, 200, 'Signalement rejeté.')
  } catch (error) {
    logger.error(error?.message || error)
    return res.status(500).json({ message: 'Erreur lors du rejet du signalement.' })
  }
}

exports.hide = async (req, res) => {
  try {
    const result = await ContentReportService.hide(Number(req.params.id), requesterOf(req), req.body.decisionNote)
    return reply(res, result, 200, 'Contenu masqué pour 30 jours au maximum.')
  } catch (error) {
    logger.error(error?.message || error)
    return res.status(500).json({ message: 'Erreur lors du masquage du contenu.' })
  }
}

exports.restore = async (req, res) => {
  try {
    const result = await ContentReportService.restore(Number(req.params.id), requesterOf(req))
    return reply(res, result, 200, 'Contenu rétabli.')
  } catch (error) {
    logger.error(error?.message || error)
    return res.status(500).json({ message: 'Erreur lors du rétablissement du contenu.' })
  }
}

exports.suspendAuthor = async (req, res) => {
  try {
    const result = await ContentReportService.suspendAuthor(Number(req.params.id), requesterOf(req), req.body.decisionNote)
    return reply(res, result, 200, "Compte de l'auteur suspendu.")
  } catch (error) {
    logger.error(error?.message || error)
    return res.status(500).json({ message: "Erreur lors de la suspension du compte de l'auteur." })
  }
}

exports.removeContent = async (req, res) => {
  try {
    const result = await ContentReportService.removeContent(Number(req.params.id), requesterOf(req), req.body.decisionNote)
    return reply(res, result, 200, 'Contenu supprimé définitivement.')
  } catch (error) {
    logger.error(error?.message || error)
    return res.status(500).json({ message: 'Erreur lors de la suppression du contenu.' })
  }
}
