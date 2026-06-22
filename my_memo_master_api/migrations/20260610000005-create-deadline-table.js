'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Deadline', {
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
      type: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'autre'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      occurrenceId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'EventOccurrence',
          key: 'id'
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      },
      dueDate: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      dueTime: {
        type: Sequelize.TIME,
        allowNull: true
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
      }
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Deadline')
  }
}
