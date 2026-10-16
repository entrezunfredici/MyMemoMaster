const OnboardingStateService = require('../services/OnboardingState.service')
const logger = require('../helpers/logger')

exports.findByUserId = async (req, res) => {
  try {
    const user = await OnboardingStateService.getOnboardingByUserId(req.user.id)
    if (!user) {
      res.status(404).send({
        message: "État d'onboarding introuvable."
      })
    } else {
      res.status(200).send(user)
    }
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).send({
      message: "Erreur lors de la récupération de l'état d'onboarding."
    })
  }
}

exports.updateOnboarding = async (req, res) => {
  try {
    const updated = await OnboardingStateService.updateOnboarding(req.user.id, req.body)
    if (!updated) {
      res.status(404).send({
        message: "État d'onboarding introuvable."
      })
    } else {
      res.status(200).send(updated)
    }
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).send({
      message: "Erreur lors de la mise à jour de l'état d'onboarding."
    })
  }
}
