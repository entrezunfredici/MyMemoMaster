const express = require('express')

const router = express.Router()

router.post('/test', (req, res) => {
  res.json({ message: 'ça fonctionne' })
})

module.exports = (app) => {
  /**
   * @swagger
   * tags:
   *   - name: Users
   *     description: Gestion des utilisateurs
   */
  app.use('/student_kpi', router)
}
