const express = require('express')
const onboardingState = require('../controllers/OnboardingState.controller.js')
const authMiddleware = require('../middlewares/Auth.middleware')
const validate = require('../middlewares/validate.middleware')
const onboardingStateValidators = require('../validators/OnboardingState.validators')

const router = express.Router()

router.get('/byUserId', authMiddleware, onboardingState.findByUserId)

router.put(
  '/:id',
  authMiddleware,
  onboardingStateValidators.update,
  validate,
  onboardingState.updateOnboarding
)

module.exports = (app) => {
  /**
   * @swagger
   * tags:
   *   - name: onboardingState
   *     description: Gestion de l'onboarding d'un user.
   */
  app.use('/onboardingState', router)
}
