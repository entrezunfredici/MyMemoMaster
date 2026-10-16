const searchService = require('../services/Search.service')
const logger = require('../helpers/logger')

exports.searchAll = async (req, res) => {
  try {
    const userId = req.user.id
    const subjectId = req.query.subjectId ? Number(req.query.subjectId) : null
    const q = req.query.q?.trim() || null
    const results = await searchService.searchAll(userId, { subjectId, q })
    res.status(200).json(results)
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: "Une erreur s'est produite lors de la recherche." })
  }
}
