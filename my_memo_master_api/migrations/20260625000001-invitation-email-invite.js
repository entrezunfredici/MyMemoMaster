'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    // changeColumn ne retire pas fiablement le NOT NULL sur une colonne avec FK en PostgreSQL
    // → on utilise du SQL brut pour la nullabilité
    await queryInterface.sequelize.query('ALTER TABLE "Invitation" ALTER COLUMN "targetUserId" DROP NOT NULL')
    await queryInterface.addColumn('Invitation', 'targetEmail', {
      type: Sequelize.STRING(255),
      allowNull: true
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Invitation', 'targetEmail')
    await queryInterface.sequelize.query('ALTER TABLE "Invitation" ALTER COLUMN "targetUserId" SET NOT NULL')
  }
}
