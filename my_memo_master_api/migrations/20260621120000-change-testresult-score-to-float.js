'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('TestResult', 'score', {
      type: Sequelize.FLOAT,
      allowNull: false
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('TestResult', 'score', {
      type: Sequelize.INTEGER,
      allowNull: false
    })
  }
}
