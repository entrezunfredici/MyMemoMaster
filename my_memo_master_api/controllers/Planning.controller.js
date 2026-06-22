const planningService = require('../services/Planning.service')
const logger = require('../helpers/logger')

exports.getLoad = async (req, res) => {
  try {
    const days = req.query.days ? parseInt(req.query.days) : 14
    const data = await planningService.getLoad(req.user.id, days)
    res.status(200).send({ message: 'Charge de révision récupérée avec succès.', data })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).send({ message: 'Erreur lors du calcul de la charge de révision.' })
  }
}

exports.getPriorities = async (req, res) => {
  try {
    const data = await planningService.getPriorities(req.user.id)
    res.status(200).send({ message: 'Priorités récupérées avec succès.', data })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).send({ message: 'Erreur lors du calcul des priorités.' })
  }
}
