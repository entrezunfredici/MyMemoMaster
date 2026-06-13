'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Response', {
      idResponse: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      content: {
        type: Sequelize.STRING,
        allowNull: false
      },
      correction: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      idQuestion: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Question',
          key: 'idQuestion'
        }
      }
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Response')
  }
}
