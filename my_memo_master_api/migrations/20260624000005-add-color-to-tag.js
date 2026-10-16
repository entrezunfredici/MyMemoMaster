'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Tag', 'color', {
      type: Sequelize.STRING(7),
      allowNull: false,
      defaultValue: '#6366F1'
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Tag', 'color')
  }
}
