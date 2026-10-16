'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('LeitnerSystem', {
      idSystem: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      sujet: {
        type: Sequelize.JSON,
        allowNull: true
      },
      name: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      idUser: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'User',
          key: 'userId'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      idMindMap: {
        type: Sequelize.INTEGER,
        allowNull: true
      }
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('LeitnerSystem')
  }
}
