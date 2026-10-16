'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('MindMapTag', {
      idMindMap: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'MindMap',
          key: 'idMindMap'
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
    await queryInterface.dropTable('MindMapTag')
  }
}
