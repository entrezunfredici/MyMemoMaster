const mistralGradingService = require('../services/MistralGrading.service')
const logger = require('../helpers/logger')

exports.gradeMistral = async (req, res) => {
  try {
    const { correct_answers, student_answer, question } = req.body
    const result = await mistralGradingService.grade(correct_answers, student_answer, question)
    res.status(200).send(result)
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).send({ message: 'Erreur lors de la correction par Mistral.' })
  }
}
