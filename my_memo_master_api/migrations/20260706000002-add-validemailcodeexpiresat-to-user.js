'use strict'

// Colonne utilisée par User.service (setValidEmailCode / verifyValidEmailCode)
// depuis le correctif OWASP A04-H4 (M-00b.07b) mais jamais créée en migration :
// présente en dev/tests via sync(), absente en prod PostgreSQL (migrations seules).
module.exports = {
  async up(queryInterface, Sequelize) {
    const existing = await queryInterface.describeTable('User')
    if (!existing.validEmailCodeExpiresAt) {
      await queryInterface.addColumn('User', 'validEmailCodeExpiresAt', {
        type: Sequelize.DATE,
        allowNull: true
      })
    }
  },

  async down(queryInterface) {
    const existing = await queryInterface.describeTable('User')
    if (existing.validEmailCodeExpiresAt) {
      await queryInterface.removeColumn('User', 'validEmailCodeExpiresAt')
    }
  }
}
