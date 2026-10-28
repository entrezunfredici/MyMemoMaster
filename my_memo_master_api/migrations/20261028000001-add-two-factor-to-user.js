'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Activée par défaut : le DEFAULT s'applique aussi aux comptes existants (ajout de colonne NOT NULL).
    // Chaque utilisateur peut la désactiver depuis son profil (sauf les administrateurs).
    await queryInterface.addColumn('User', 'twoFactorEnabled', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    })
    await queryInterface.addColumn('User', 'twoFactorCode', {
      type: Sequelize.STRING(64),
      allowNull: true
    })
    await queryInterface.addColumn('User', 'twoFactorCodeExpiresAt', {
      type: Sequelize.DATE,
      allowNull: true
    })
    await queryInterface.addColumn('User', 'twoFactorCodeAttempts', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    })
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('User', 'twoFactorCodeAttempts')
    await queryInterface.removeColumn('User', 'twoFactorCodeExpiresAt')
    await queryInterface.removeColumn('User', 'twoFactorCode')
    await queryInterface.removeColumn('User', 'twoFactorEnabled')
  }
}
