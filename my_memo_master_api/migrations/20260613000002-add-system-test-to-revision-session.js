'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    const existing = await queryInterface.describeTable('RevisionSession')
    if (!existing.idSystem) {
      await queryInterface.addColumn('RevisionSession', 'idSystem', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'LeitnerSystem', key: 'idSystem' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      })
    }
    if (!existing.idTest) {
      await queryInterface.addColumn('RevisionSession', 'idTest', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Test', key: 'testId' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      })
    }
  },

  async down(queryInterface) {
    const existing = await queryInterface.describeTable('RevisionSession')
    if (existing.idSystem) await queryInterface.removeColumn('RevisionSession', 'idSystem')
    if (existing.idTest)   await queryInterface.removeColumn('RevisionSession', 'idTest')
  }
}
