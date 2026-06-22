const gradingService = require('../services/Grading.service')
const logger = require('../helpers/logger')

exports.gradeDateAnswer = async (req, res) => {
  try {
    const { correct_answer, student_answer } = req.body
    const result = gradingService.gradeDateAnswer(correct_answer, student_answer)
    res.status(200).send(result)
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).send({ message: 'Erreur lors de la correction automatique.' })
  }
}
