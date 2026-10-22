'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('BackupRun', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      trigger: {
        type: Sequelize.STRING(10),
        allowNull: false
      },
      status: {
        type: Sequelize.STRING(10),
        allowNull: false
      },
      slot: {
        type: Sequelize.STRING(30),
        allowNull: true,
        unique: true
      },
      triggeredBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'User', key: 'userId' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      startedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      finishedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      durationMs: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      sizeBytes: {
        type: Sequelize.BIGINT,
        allowNull: true
      },
      location: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      errorMessage: {
        type: Sequelize.TEXT,
        allowNull: true
      }
    })

    await queryInterface.addIndex('BackupRun', ['startedAt'], {
      name: 'idx_backuprun_startedat'
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('BackupRun')
  }
}
