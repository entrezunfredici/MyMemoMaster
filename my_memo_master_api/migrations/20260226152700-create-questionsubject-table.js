'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('questionSubject', {
      idQuestion: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'Question',
          key: 'idQuestion'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      subjectId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'Subject',
          key: 'subjectId'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('questionSubject')
  }
}
