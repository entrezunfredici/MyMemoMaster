const mindMapViewSessionService = require('../services/MindMapViewSession.service')
const logger = require('../helpers/logger')

exports.create = async (req, res) => {
  try {
    const { idMindMap, durationSeconds } = req.body
    const session = await mindMapViewSessionService.create({
      userId: req.user.id,
      idMindMap,
      durationSeconds
    })
    res.status(201).json(session)
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: "Erreur lors de l'enregistrement de la consultation de carte mentale." })
  }
}
