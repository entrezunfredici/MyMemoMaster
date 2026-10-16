jest.mock('../../models', () => ({
  UserOnboardingState: {
    findOne: jest.fn()
  }
}))

const { UserOnboardingState } = require('../../models')
const OnboardingStateService = require('../../services/OnboardingState.service')

describe('OnboardingStateService', () => {
  beforeEach(() => jest.clearAllMocks())

  // ── getOnboardingByUserId ────────────────────────────────────────────────

  describe('getOnboardingByUserId', () => {
    it("retourne l'état d'onboarding s'il existe", async () => {
      UserOnboardingState.findOne.mockResolvedValue({
        tourSeen: true,
        checklist: { todo_created: true }
      })

      const result = await OnboardingStateService.getOnboardingByUserId(1)

      expect(result).toEqual({ tour_seen: true, checklist: { todo_created: true } })
    })

    it('retourne null (pas de throw) quand aucune ligne — le controller traduit en 404', async () => {
      UserOnboardingState.findOne.mockResolvedValue(null)

      const result = await OnboardingStateService.getOnboardingByUserId(999)

      expect(result).toBeNull()
    })
  })

  // ── updateOnboarding ──────────────────────────────────────────────────────

  describe('updateOnboarding', () => {
    it('retourne null (pas de throw) quand aucune ligne — le controller traduit en 404', async () => {
      UserOnboardingState.findOne.mockResolvedValue(null)

      const result = await OnboardingStateService.updateOnboarding(999, { tour_seen: true })

      expect(result).toBeNull()
    })

    it("met à jour tour_seen et fusionne la checklist", async () => {
      const onboarding = {
        tourSeen: false,
        checklist: { todo_created: false, profile_completed: false },
        save: jest.fn().mockResolvedValue()
      }
      UserOnboardingState.findOne.mockResolvedValue(onboarding)

      const result = await OnboardingStateService.updateOnboarding(1, {
        tour_seen: true,
        checklist: { todo_created: true }
      })

      expect(onboarding.save).toHaveBeenCalled()
      expect(result).toEqual({
        tour_seen: true,
        checklist: { todo_created: true, profile_completed: false }
      })
    })
  })
})
