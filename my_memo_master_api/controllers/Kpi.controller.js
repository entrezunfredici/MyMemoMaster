const kpiService = require('../services/Kpi.service')
const logger = require('../helpers/logger')

exports.getMyKpis = async (req, res) => {
  try {
    const data = await kpiService.getMyKpis(req.user.id)
    res.status(200).json(data)
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors du calcul des indicateurs de progression.' })
  }
}
