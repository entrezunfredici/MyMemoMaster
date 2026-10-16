'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('CalendarEvent', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(150),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      type: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'cours'
      },
      classGroupId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'ClassGroup',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'User',
          key: 'userId'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      recurrenceMode: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: 'manual'
      },
      recurrenceRule: {
        type: Sequelize.JSON,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('CalendarEvent')
  }
}
