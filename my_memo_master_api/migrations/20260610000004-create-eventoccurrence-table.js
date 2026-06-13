'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('EventOccurrence', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      eventId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'CalendarEvent',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      startTime: {
        type: Sequelize.TIME,
        allowNull: false
      },
      endTime: {
        type: Sequelize.TIME,
        allowNull: false
      }
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('EventOccurrence')
  }
}
