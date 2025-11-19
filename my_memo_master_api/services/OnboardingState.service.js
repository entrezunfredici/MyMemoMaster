const { UserOnboardingState } = require('../models')


class OnboardingStateService {

  async getOnboardingByUserId(userId) {
    const onboardingState = await UserOnboardingState.findOne({
      where: { userId },
    });

    if (!onboardingState) {
      throw new Error("État d'onboarding introuvable.")
    }
    return {
      tour_seen: onboardingState.tourSeen,
      checklist: onboardingState.checklist
    };
  }

  async updateOnboarding(userId, data) {
    const onboarding = await UserOnboardingState.findOne({
      where: { userId }
    });

    if (!onboarding) {
      throw new Error("État d'onboarding introuvable");
    }

    if (data.tour_seen !== undefined) {
      onboarding.tourSeen = data.tour_seen;
    }

    if (data.checklist) {
      onboarding.checklist = {
        ...onboarding.checklist,
        ...data.checklist
      };
    }

    onboarding.updatedAt = new Date();
    await onboarding.save();

    return {
      tour_seen: onboarding.tourSeen,
      checklist: onboarding.checklist
    };
  }

}

module.exports = OnboardingStateService;