const badgeService = require('../services/Badge.service')
const logger = require('../helpers/logger')
const gamificationProfileService = require('../services/GamificationProfile.service')
const subjectLevelService = require('../services/SubjectLevel.service')
const dailyChallengeService = require('../services/DailyChallenge.service')

exports.findAll = async (req, res) => {
  try {
    const data = await badgeService.listWithSubjects(req.user.id)
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

const SET_PROFILE_STATUS = { TOO_MANY_SHOWCASE: 400, BADGE_NOT_EARNED: 400 }

exports.getProfile = async (req, res) => {
  try {
    res.status(200).json(await gamificationProfileService.getProfile(req.user.id))
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la récupération de la vitrine.' })
  }
}

exports.setProfile = async (req, res) => {
  try {
    const data = await gamificationProfileService.setProfile(req.user.id, req.body)
    res.status(200).json({ message: 'Vitrine et titre enregistrés.', ...data })
  } catch (error) {
    const status = SET_PROFILE_STATUS[error?.code]
    if (status) return res.status(status).json({ message: error.message })
    logger.error(error?.message || error)
    res.status(500).json({ message: "Erreur lors de l'enregistrement de la vitrine." })
  }
}

exports.activity = async (req, res) => {
  try {
    const data = await gamificationProfileService.getActivity(req.user.id, req.query.weeks)
    res.status(200).json(data)
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: "Erreur lors de la récupération du calendrier d'activité." })
  }
}

exports.dailyGoal = async (req, res) => {
  try {
    const data = await gamificationProfileService.getDailyGoal(req.user.id)
    res.status(200).json(data)
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: "Erreur lors de la récupération de l'objectif quotidien." })
  }
}

exports.sessionFeedback = async (req, res) => {
  try {
    res.status(200).json(await gamificationProfileService.getSessionFeedback(req.user.id))
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la récupération du bilan de la session.' })
  }
}

exports.dailyChallenge = async (req, res) => {
  try {
    res.status(200).json(await dailyChallengeService.get(req.user.id))
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la récupération du défi du jour.' })
  }
}

exports.subjectLevels = async (req, res) => {
  try {
    res.status(200).json(await subjectLevelService.list(req.user.id))
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la récupération des niveaux par matière.' })
  }
}

exports.getSettings = async (req, res) => {
  try {
    res.status(200).json(await gamificationProfileService.getSettings(req.user.id))
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la récupération des réglages.' })
  }
}

exports.updateSettings = async (req, res) => {
  try {
    const data = await gamificationProfileService.updateSettings(req.user.id, req.body)
    res.status(200).json({ message: 'Réglages enregistrés.', ...data })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: "Erreur lors de l'enregistrement des réglages." })
  }
}
