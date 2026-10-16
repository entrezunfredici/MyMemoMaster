'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('LeitnerBox', {
      idBox: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      level: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      intervall: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      color: {
        type: Sequelize.BIGINT,
        allowNull: false
      },
      idSystem: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'LeitnerSystem',
          key: 'idSystem'
        }
      }
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('LeitnerBox')
  }
}
