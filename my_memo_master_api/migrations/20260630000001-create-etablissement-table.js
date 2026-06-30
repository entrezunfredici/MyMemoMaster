'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Etablissement', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      code: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true
      },
      adminId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'User', key: 'userId' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    })

    await queryInterface.addIndex('Etablissement', ['adminId'], {
      name: 'idx_etablissement_adminid'
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Etablissement')
  }
}
