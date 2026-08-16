const { UserOnboardingState } = require('../models')

class OnboardingStateService {
  async getOnboardingByUserId(userId) {
    const onboardingState = await UserOnboardingState.findOne({
      where: { userId }
    })

    // Pas de ligne (ex. compte legacy créé avant l'ajout de l'onboarding) : le controller
    // traduit `null` en 404, à distinguer d'une vraie erreur serveur (500).
    if (!onboardingState) return null

    return {
      tour_seen: onboardingState.tourSeen,
      checklist: onboardingState.checklist
    }
  }

  async updateOnboarding(userId, data) {
    const onboarding = await UserOnboardingState.findOne({
      where: { userId }
    })

    if (!onboarding) return null

    if (data.tour_seen !== undefined) {
      onboarding.tourSeen = data.tour_seen
    }

    if (data.checklist) {
      onboarding.checklist = {
        ...onboarding.checklist,
        ...data.checklist
      }
    }

    onboarding.updatedAt = new Date()
    await onboarding.save()

    return {
      tour_seen: onboarding.tourSeen,
      checklist: onboarding.checklist
    }
  }
}

module.exports = new OnboardingStateService()
