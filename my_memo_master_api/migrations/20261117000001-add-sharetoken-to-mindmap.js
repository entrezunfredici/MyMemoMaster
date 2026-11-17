'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    // Jeton de partage public : NULL = carte privée. Unique pour retrouver la carte à partir du lien.
    await queryInterface.addColumn('MindMap', 'shareToken', {
      type: Sequelize.STRING(64),
      allowNull: true,
      unique: true
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('MindMap', 'shareToken')
  }
}
