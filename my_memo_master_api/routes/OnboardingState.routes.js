const express = require('express')
const onboardingState = require("../controllers/OnboardingState.controller.js");
const role = require('../controllers/Role.controller')
const router = express.Router();

router.get("/byUserId", onboardingState.findByUserId);

router.put("/:id", onboardingState.updateOnboarding);

module.exports = (app) => {
  /**
   * @swagger
   * tags:
   *   - name: onboardingState
   *     description: Gestion de l'onboarding d'un user.
   */
  app.use("/onboardingState", router);
};
