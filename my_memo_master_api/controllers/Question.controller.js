const QuestionService = require('../services/Question.service')
const logger = require('../helpers/logger')

exports.getAllQuestions = async (req, res) => {
  try {
    const questions = await QuestionService.getAllQuestions()
    res.status(200).json(questions)
  } catch (error) {
    logger.error(error?.message || error)
    res
      .status(500)
      .json({ message: "Une erreur s'est produite lors de la récupération des questions." })
  }
}

exports.getQuestionsByTest = async (req, res) => {
  try {
    const { testId } = req.params
    const questions = await QuestionService.getQuestionsByTest(testId)
    res.status(200).json(questions)
  } catch (error) {
    logger.error(error?.message || error)
    res
      .status(500)
      .json({ message: "Une erreur s'est produite lors de la récupération des questions du test." })
  }
}

exports.getQuestionByCard = async (req, res) => {
  try {
    const { cardId } = req.params
    const question = await QuestionService.getQuestionByCard(cardId)
    res.status(200).json(question)
  } catch (error) {
    logger.error(error?.message || error)
    res
      .status(500)
      .json({ message: "Une erreur s'est produite lors de la récupération de la question." })
  }
}

exports.findOne = async (req, res) => {
  try {
    const { id } = req.params
    const question = await QuestionService.findOne(id)
    if (!question) return res.status(404).json({ message: `Question introuvable pour l'identifiant ${id}.` })
    res.status(200).json(question)
  } catch (error) {
    logger.error(error?.message || error)
    res
      .status(500)
      .json({
        message: `Erreur lors de la récupération de la question avec l'identifiant ${req.params.id}.`
      })
  }
}

exports.getCorrectionByQuestion = async (req, res) => {
  try {
    const { id } = req.params
    const correction = await QuestionService.getCorrectionByQuestion(id)
    res.status(200).json(correction)
  } catch (error) {
    logger.error(error?.message || error)
    res
      .status(500)
      .json({ message: "Une erreur s'est produite lors de la récupération de la correction." })
  }
}

exports.create = async (req, res) => {
  try {
    const data = req.body
    const question = await QuestionService.create(data)
    res.status(201).json(question)
  } catch (error) {
    logger.error(error?.message || error)
    res
      .status(500)
      .json({ message: "Une erreur s'est produite lors de la création de la question." })
  }
}

exports.update = async (req, res) => {
  try {
    const { id } = req.params
    const data = req.body
    const question = await QuestionService.update(id, data)
    res.status(200).json(question)
  } catch (error) {
    if (error.code === 'NOT_FOUND') return res.status(404).json({ message: error.message })
    logger.error(error?.message || error)
    res
      .status(500)
      .json({ message: "Une erreur s'est produite lors de la mise à jour de la question." })
  }
}

exports.delete = async (req, res) => {
  try {
    const { id } = req.params
    await QuestionService.delete(id)
    res.status(204).send()
  } catch (error) {
    if (error.code === 'NOT_FOUND') return res.status(404).json({ message: error.message })
    logger.error(error?.message || error)
    res
      .status(500)
      .json({ message: "Une erreur s'est produite lors de la suppression de la question." })
  }
}
