const InvitationService = require('../services/Invitation.service')
const logger = require('../helpers/logger')

exports.invite = async (req, res) => {
  try {
    const { targetUserId, role } = req.body
    const result = await InvitationService.invite(req.params.id, req.user.id, { targetUserId, role })
    if (result === false)
      return res.status(403).json({ message: 'Accès refusé. Seuls les admins et enseignants du groupe peuvent inviter.' })
    if (result === null)
      return res.status(404).json({ message: 'Groupe introuvable.' })
    res.status(201).json({ message: 'Invitation envoyée avec succès.', data: result })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: "Erreur lors de l'envoi de l'invitation." })
  }
}

exports.findByGroup = async (req, res) => {
  try {
    const result = await InvitationService.findByGroup(req.params.id, req.user.id)
    if (result === false)
      return res.status(403).json({ message: 'Accès refusé.' })
    res.status(200).json({ message: 'Invitations récupérées.', data: result })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la récupération des invitations.' })
  }
}

exports.findMine = async (req, res) => {
  try {
    const invitations = await InvitationService.findMine(req.user.id)
    res.status(200).json({ message: 'Invitations récupérées.', data: invitations })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la récupération des invitations.' })
  }
}

exports.respond = async (req, res) => {
  try {
    const { status } = req.body
    const result = await InvitationService.respond(req.params.id, req.user.id, status)
    if (result === null)
      return res.status(404).json({ message: 'Invitation introuvable ou déjà traitée.' })
    if (result === false)
      return res.status(403).json({ message: "Accès refusé. Vous n'êtes pas la cible de cette invitation." })
    res.status(200).json({ message: 'Invitation mise à jour.', data: result })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: "Erreur lors de la réponse à l'invitation." })
  }
}
