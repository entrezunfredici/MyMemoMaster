const OnboardingStateService = require('../services/OnboardingState.service');
const logger = require('../helpers/logger');


exports.findByUserId = async (req, res) => {
  try {
    const user = await OnboardingStateService.getOnboardingByUserId(req.params.id);
    if (!user) {
      res.status(404).send({
        message: `Utilisateur introuvable: ${req.params.id}.`,
      });
    } else {
      res.status(200).send(user);
    }
  } catch (error) {
    logger.error(error?.message || error);
    res.status(500).send({
      message: `Erreur lors de la récupération de l'utilisateur: ${req.params.id}.`,
    });
  }
};


exports.updateOnboarding = async (req, res) => {
  try {
    const updated = await OnboardingStateService.updateOnboarding(req.user.userId, req.body);
    if (!updated) {
      res.status(404).send({
        message: `L'onboarding ne peut pas être changer: ${req.params.userId}.`,
      });
    } else {
      res.status(200).send(updated);
    }
  } catch (error) {
    logger.error(error?.message || error);
    res.status(500).send({
      message: `Erreur lors du changement de l'état de l'onboarding: ${req.params.userId}.`,
    });
  }
};
