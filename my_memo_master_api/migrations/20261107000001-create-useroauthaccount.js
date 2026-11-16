'use strict'

// Connexion OAuth (Google, GitHub, Microsoft) : une ligne par identité externe liée à un compte.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('UserOAuthAccount', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'User', key: 'userId' },
        onDelete: 'CASCADE'
      },
      provider: { type: Sequelize.STRING(20), allowNull: false },
      providerUserId: { type: Sequelize.STRING(191), allowNull: false },
      email: { type: Sequelize.STRING, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    })
    await queryInterface.addIndex('UserOAuthAccount', ['provider', 'providerUserId'], {
      name: 'uq_useroauthaccount_provider_id',
      unique: true
    })
    await queryInterface.addIndex('UserOAuthAccount', ['userId'], { name: 'idx_useroauthaccount_user' })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('UserOAuthAccount')
  }
}
