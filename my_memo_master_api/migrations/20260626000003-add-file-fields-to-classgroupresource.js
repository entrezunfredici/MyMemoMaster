'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('ClassGroupResource', 'fileKey', {
      type: Sequelize.STRING(500),
      allowNull: true
    })
    await queryInterface.addColumn('ClassGroupResource', 'mimeType', {
      type: Sequelize.STRING(100),
      allowNull: true
    })
    await queryInterface.addColumn('ClassGroupResource', 'originalName', {
      type: Sequelize.STRING(255),
      allowNull: true
    })
    await queryInterface.addColumn('ClassGroupResource', 'fileSize', {
      type: Sequelize.INTEGER,
      allowNull: true
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('ClassGroupResource', 'fileKey')
    await queryInterface.removeColumn('ClassGroupResource', 'mimeType')
    await queryInterface.removeColumn('ClassGroupResource', 'originalName')
    await queryInterface.removeColumn('ClassGroupResource', 'fileSize')
  }
}
