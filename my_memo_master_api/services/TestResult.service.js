const { TestResult, Test, Subject } = require('../models/index')

class TestResultService {
  /**
   * Récupère tous les résultats d'un test pour l'utilisateur connecté.
   *
   * @param {number} testId - ID du test
   * @param {number} userId - ID de l'utilisateur
   * @returns {TestResult[]}
   */
  async findByTest(testId, userId) {
    return await TestResult.findAll({
      where: { testId, userId },
      order: [['completedAt', 'DESC']]
    })
  }

  /**
   * Récupère l'historique complet des résultats de l'utilisateur connecté.
   *
   * @param {number} userId - ID de l'utilisateur
   * @returns {TestResult[]}
   */
  async findByUser(userId) {
    return await TestResult.findAll({
      where: { userId },
      include: [
        {
          model: Test,
          as: 'test',
          attributes: ['testId', 'name', 'subjectId'],
          include: [{ model: Subject, as: 'subject', attributes: ['subjectId', 'name'] }]
        }
      ],
      order: [['completedAt', 'DESC']]
    })
  }

  /**
   * Enregistre le résultat d'un exercice complété.
   *
   * @param {object} data - { testId, userId, score, total }
   * @returns {TestResult}
   */
  async create(data) {
    const { testId, userId, score, total } = data
    return await TestResult.create({ testId, userId, score, total })
  }
}

module.exports = new TestResultService()
