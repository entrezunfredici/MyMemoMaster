'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('TestClassGroup', {
      testId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Test', key: 'testId' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      classGroupId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'ClassGroup', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }
    })

    await queryInterface.addConstraint('TestClassGroup', {
      fields: ['testId', 'classGroupId'],
      type: 'unique',
      name: 'uq_testclassgroup'
    })

    await queryInterface.addIndex('TestClassGroup', ['testId'], { name: 'idx_testclassgroup_testid' })
    await queryInterface.addIndex('TestClassGroup', ['classGroupId'], { name: 'idx_testclassgroup_groupid' })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('TestClassGroup')
  }
}
