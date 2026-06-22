'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('User', 'resetPasswordCode', {
      type: Sequelize.STRING(64),
      allowNull: true
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('User', 'resetPasswordCode', {
      type: Sequelize.INTEGER,
      allowNull: true
    })
  }
}
