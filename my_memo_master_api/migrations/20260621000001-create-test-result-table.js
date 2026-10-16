'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('TestResult', {
      resultId: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      testId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Test', key: 'testId' },
        onDelete: 'CASCADE'
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'User', key: 'userId' },
        onDelete: 'CASCADE'
      },
      score: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      total: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      completedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    })

    await queryInterface.addIndex('TestResult', ['testId'], { name: 'idx_testresult_testid' })
    await queryInterface.addIndex('TestResult', ['userId'], { name: 'idx_testresult_userid' })
    await queryInterface.addIndex('TestResult', ['testId', 'userId'], { name: 'idx_testresult_test_user' })
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('TestResult')
  }
}
