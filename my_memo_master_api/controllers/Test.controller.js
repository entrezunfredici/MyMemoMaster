const testService = require('../services/Test.service.js')
const logger = require('../helpers/logger')

exports.findAll = async (req, res) => {
  try {
    const data = await testService.findAll(req.user.id)
    res.status(200).json(data)
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: "Une erreur s'est produite lors de la récupération des tests." })
  }
}

exports.findOne = async (req, res) => {
  try {
    const data = await testService.findOne(req.params.id, req.user.id)
    if (!data) {
      return res.status(404).json({ message: `Test introuvable pour l'identifiant ${req.params.id}.` })
    }
    res.status(200).json(data)
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: `Erreur lors de la récupération du test avec l'identifiant ${req.params.id}.` })
  }
}

exports.create = async (req, res) => {
  try {
    const { subjectId, name } = req.body
    const data = await testService.create({ subjectId, name, userId: req.user.id })
    res.status(201).json(data)
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: "Une erreur s'est produite lors de la création du test." })
  }
}

exports.update = async (req, res) => {
  try {
    const updated = await testService.update(req.params.id, req.body, req.user.id)
    res.status(200).json(updated)
  } catch (error) {
    if (error.code === 'NOT_FOUND') return res.status(404).json({ message: error.message })
    if (error.code === 'FORBIDDEN') return res.status(403).json({ message: error.message })
    logger.error(error?.message || error)
    res.status(500).json({ message: "Une erreur inattendue s'est produite lors de la modification du test." })
  }
}

exports.delete = async (req, res) => {
  try {
    await testService.delete(req.params.id, req.user.id)
    res.status(204).send()
  } catch (error) {
    if (error.code === 'NOT_FOUND') return res.status(404).json({ message: error.message })
    if (error.code === 'FORBIDDEN') return res.status(403).json({ message: error.message })
    logger.error(error?.message || error)
    res.status(500).json({ message: "Une erreur s'est produite lors de la suppression du test." })
  }
}

exports.submit = async (req, res) => {
  try {
    const { answers } = req.body
    const result = await testService.submitAnswers(Number(req.params.id), req.user.id, answers)
    if (!result) return res.status(404).json({ message: 'Exercice introuvable.' })
    res.status(200).json(result)
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: "Erreur lors de la correction de l'exercice." })
  }
}

exports.assignGroups = async (req, res) => {
  try {
    const data = await testService.assignGroups(Number(req.params.id), req.user.id, req.body.groupIds ?? [])
    res.status(200).json({ message: 'Groupes mis à jour avec succès.', data })
  } catch (error) {
    if (error.code === 'NOT_FOUND') return res.status(404).json({ message: error.message })
    if (error.code === 'FORBIDDEN') return res.status(403).json({ message: error.message })
    logger.error(error?.message || error)
    res.status(500).json({ message: "Erreur lors de l'assignation des groupes." })
  }
}
