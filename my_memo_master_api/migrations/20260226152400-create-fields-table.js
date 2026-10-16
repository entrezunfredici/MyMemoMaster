'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Fields', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      fieldletter: {
        type: Sequelize.STRING(5),
        allowNull: false
      },
      data: {
        type: Sequelize.JSON,
        allowNull: true
      },
      idUnit: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'units',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      idType: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'FieldsType',
          key: 'idType'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      }
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Fields')
  }
}
