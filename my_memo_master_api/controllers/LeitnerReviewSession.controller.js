const leitnerReviewSessionService = require('../services/LeitnerReviewSession.service')
const logger = require('../helpers/logger')

exports.create = async (req, res) => {
  try {
    const { idSystem, cardsReviewed, durationSeconds } = req.body
    const session = await leitnerReviewSessionService.create({
      userId: req.user.id,
      idSystem,
      cardsReviewed,
      durationSeconds
    })
    res.status(201).json(session)
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: "Erreur lors de l'enregistrement de la session de révision." })
  }
}
