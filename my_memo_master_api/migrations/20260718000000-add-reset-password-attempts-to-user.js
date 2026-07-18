'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('User', 'resetPasswordCodeAttempts', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    })
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('User', 'resetPasswordCodeAttempts')
  }
}
