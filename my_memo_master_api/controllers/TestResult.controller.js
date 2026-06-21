const testResultService = require('../services/TestResult.service')
const logger = require('../helpers/logger')

exports.findByTest = async (req, res) => {
  try {
    const data = await testResultService.findByTest(Number(req.params.testId), req.user.id)
    res.status(200).send(data)
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).send({ message: 'Erreur lors de la récupération des résultats.' })
  }
}

exports.findByUser = async (req, res) => {
  try {
    const data = await testResultService.findByUser(req.user.id)
    res.status(200).send(data)
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).send({ message: 'Erreur lors de la récupération de l\'historique.' })
  }
}

exports.create = async (req, res) => {
  try {
    const { testId, score, total } = req.body
    const data = await testResultService.create({ testId, userId: req.user.id, score, total })
    res.status(201).send(data)
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).send({ message: 'Erreur lors de l\'enregistrement du résultat.' })
  }
}
