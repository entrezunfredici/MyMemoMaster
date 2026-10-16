'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('ClassGroup', 'level', {
      type: Sequelize.STRING(50),
      allowNull: true,
      after: 'description'
    })
    await queryInterface.addColumn('ClassGroup', 'code', {
      type: Sequelize.STRING(50),
      allowNull: true,
      after: 'level'
    })
    await queryInterface.addColumn('ClassGroup', 'score', {
      type: Sequelize.FLOAT,
      allowNull: true,
      after: 'code'
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('ClassGroup', 'level')
    await queryInterface.removeColumn('ClassGroup', 'code')
    await queryInterface.removeColumn('ClassGroup', 'score')
  }
}
