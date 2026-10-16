'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Invitation', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      classGroupId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'ClassGroup', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      targetUserId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'User', key: 'userId' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      invitedByUserId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'User', key: 'userId' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      role: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'student'
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'pending'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    })

    await queryInterface.addIndex('Invitation', ['classGroupId'])
    await queryInterface.addIndex('Invitation', ['targetUserId'])
    await queryInterface.addIndex('Invitation', ['targetUserId', 'status'])
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Invitation')
  }
}
