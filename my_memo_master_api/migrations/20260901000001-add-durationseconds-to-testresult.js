'use strict'

// Durée réelle (chronométrée côté front, du début du quiz à la validation) d'un
// passage d'exercice — alimente le KPI "Temps total de révision" (jusqu'ici
// toujours à 0, faute de mesure : seule la durée des créneaux planifiés dans
// RevisionSession était comptée, très rarement renseignée en pratique).
module.exports = {
  async up(queryInterface, Sequelize) {
    const existing = await queryInterface.describeTable('TestResult')
    if (!existing.durationSeconds) {
      await queryInterface.addColumn('TestResult', 'durationSeconds', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null
      })
    }
  },

  async down(queryInterface) {
    const existing = await queryInterface.describeTable('TestResult')
    if (existing.durationSeconds) {
      await queryInterface.removeColumn('TestResult', 'durationSeconds')
    }
  }
}
