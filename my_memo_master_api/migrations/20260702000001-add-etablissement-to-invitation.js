'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect()

    // Rendre classGroupId nullable (nécessaire pour les invitations gérant établissement)
    if (dialect !== 'sqlite') {
      await queryInterface.sequelize.query('ALTER TABLE "Invitation" ALTER COLUMN "classGroupId" DROP NOT NULL')
    }

    // Ajouter etablissementId (nullable, FK vers Etablissement)
    await queryInterface.addColumn('Invitation', 'etablissementId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'Etablissement', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    })

    // Étendre le rôle pour accueillir 'admin_etablissement' (20 chars → 25)
    if (dialect !== 'sqlite') {
      await queryInterface.sequelize.query('ALTER TABLE "Invitation" ALTER COLUMN "role" TYPE VARCHAR(25)')
    }
  },

  async down(queryInterface) {
    const dialect = queryInterface.sequelize.getDialect()

    await queryInterface.removeColumn('Invitation', 'etablissementId')

    if (dialect !== 'sqlite') {
      await queryInterface.sequelize.query('ALTER TABLE "Invitation" ALTER COLUMN "classGroupId" SET NOT NULL')
      await queryInterface.sequelize.query('ALTER TABLE "Invitation" ALTER COLUMN "role" TYPE VARCHAR(20)')
    }
  }
}
