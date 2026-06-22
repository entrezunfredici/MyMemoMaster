'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Reminder', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'User', key: 'userId' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      entityType: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      entityId: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      reminderAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      delayMinutes: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      channel: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'email'
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'pending'
      },
      jobId: {
        type: Sequelize.STRING,
        allowNull: true
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: true
      }
    })

    await queryInterface.addIndex('Reminder', ['userId'], { name: 'idx_reminder_userId' })
    await queryInterface.addIndex('Reminder', ['entityType', 'entityId'], {
      name: 'idx_reminder_entity'
    })
    await queryInterface.addIndex('Reminder', ['reminderAt'], { name: 'idx_reminder_reminderAt' })
    await queryInterface.addIndex('Reminder', ['status'], { name: 'idx_reminder_status' })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Reminder')
  }
}
