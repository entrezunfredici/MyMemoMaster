'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('User', 'refreshToken', {
      type: Sequelize.STRING(128),
      allowNull: true,
      defaultValue: null
    })
    await queryInterface.addColumn('User', 'refreshTokenExpiresAt', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null
    })
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('User', 'refreshToken')
    await queryInterface.removeColumn('User', 'refreshTokenExpiresAt')
  }
}
