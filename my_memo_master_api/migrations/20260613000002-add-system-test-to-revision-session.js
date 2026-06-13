'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('RevisionSession', 'idSystem', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'LeitnerSystem',
        key: 'idSystem'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    })
    await queryInterface.addColumn('RevisionSession', 'idTest', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Test',
        key: 'testId'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('RevisionSession', 'idSystem')
    await queryInterface.removeColumn('RevisionSession', 'idTest')
  }
}
