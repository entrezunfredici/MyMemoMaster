'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Deadline', 'testId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'Test', key: 'testId' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    })

    await queryInterface.addIndex('Deadline', ['testId'], {
      name: 'deadline_testid_index'
    })
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('Deadline', 'deadline_testid_index')
    await queryInterface.removeColumn('Deadline', 'testId')
  }
}
