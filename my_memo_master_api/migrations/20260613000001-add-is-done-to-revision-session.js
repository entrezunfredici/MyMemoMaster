'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    const existing = await queryInterface.describeTable('RevisionSession')
    if (!existing.isDone) {
      await queryInterface.addColumn('RevisionSession', 'isDone', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      })
    }
  },

  async down(queryInterface) {
    const existing = await queryInterface.describeTable('RevisionSession')
    if (existing.isDone) {
      await queryInterface.removeColumn('RevisionSession', 'isDone')
    }
  }
}
