'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('FieldsType', {
      idType: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      allowUnit: {
        type: Sequelize.BOOLEAN,
        allowNull: true
      }
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('FieldsType')
  }
}
