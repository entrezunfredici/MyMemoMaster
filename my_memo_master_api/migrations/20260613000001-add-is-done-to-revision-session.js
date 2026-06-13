'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('RevisionSession', 'isDone', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('RevisionSession', 'isDone')
  }
}
