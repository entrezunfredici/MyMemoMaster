'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('Invitation', 'targetUserId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'User', key: 'userId' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    })
    await queryInterface.addColumn('Invitation', 'targetEmail', {
      type: Sequelize.STRING(255),
      allowNull: true
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Invitation', 'targetEmail')
    await queryInterface.changeColumn('Invitation', 'targetUserId', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'User', key: 'userId' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    })
  }
}
