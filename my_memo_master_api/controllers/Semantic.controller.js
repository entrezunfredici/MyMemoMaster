const semanticService = require('../services/Semantic.service')
const logger = require('../helpers/logger')

exports.gradeSemantic = async (req, res) => {
  try {
    const { correct_answers, student_answer } = req.body
    const result = await semanticService.gradeSemantic(correct_answers, student_answer)
    res.status(200).send(result)
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).send({ message: 'Erreur lors de la correction sémantique.' })
  }
}
