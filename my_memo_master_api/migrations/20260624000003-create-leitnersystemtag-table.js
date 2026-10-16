'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('LeitnerSystemTag', {
      idSystem: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'LeitnerSystem',
          key: 'idSystem'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      tagId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'Tag',
          key: 'tagId'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('LeitnerSystemTag')
  }
}
