'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    const existing = await queryInterface.describeTable('User')
    if (!existing.resetPasswordCodeExpiresAt) {
      await queryInterface.addColumn('User', 'resetPasswordCodeExpiresAt', {
        type: Sequelize.DATE,
        allowNull: true
      })
    }
  },

  async down(queryInterface) {
    const existing = await queryInterface.describeTable('User')
    if (existing.resetPasswordCodeExpiresAt) {
      await queryInterface.removeColumn('User', 'resetPasswordCodeExpiresAt')
    }
  }
}
