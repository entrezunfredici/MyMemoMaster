const badgeService = require('../services/Badge.service')
const logger = require('../helpers/logger')

exports.findAll = async (req, res) => {
  try {
    const data = await badgeService.list(req.user.id)
    res.status(200).json(data)
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la récupération des badges.' })
  }
}

exports.findRecent = async (req, res) => {
  try {
    const data = await badgeService.findRecent(req.user.id)
    res.status(200).json(data)
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la récupération des nouveaux badges.' })
  }
}

exports.markSeen = async (req, res) => {
  try {
    const updated = await badgeService.markSeen(req.user.id, req.body.codes)
    res.status(200).json({ message: 'Badges marqués comme vus.', updated })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la mise à jour des badges.' })
  }
}

const SET_SUBJECTS_STATUS = { BADGE_NOT_FOUND: 404, BADGE_NOT_SCOPABLE: 400, SUBJECT_NOT_FOUND: 400 }

exports.setSubjects = async (req, res) => {
  try {
    const subjectIds = await badgeService.setSubjects(req.params.code, req.body.subjectIds)
    res.status(200).json({ message: 'Matières du badge mises à jour.', subjectIds })
  } catch (error) {
    const status = SET_SUBJECTS_STATUS[error?.code]
    if (status) return res.status(status).json({ message: error.message })
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la mise à jour des matières du badge.' })
  }
}

exports.summary = async (req, res) => {
  try {
    const data = await badgeService.summary(req.user.id)
    res.status(200).json(data)
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la récupération du résumé des badges.' })
  }
}
