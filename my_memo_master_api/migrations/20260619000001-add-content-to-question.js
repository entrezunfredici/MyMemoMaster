'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Question', 'content', {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: null
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Question', 'content')
  }
}
