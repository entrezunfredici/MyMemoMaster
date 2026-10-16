'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ClassGroupSubmission', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      sectionId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'ClassGroupSection', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      classGroupId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'ClassGroup', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      studentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'User', key: 'userId' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      url: { type: Sequelize.TEXT, allowNull: true },
      fileKey: { type: Sequelize.STRING(500), allowNull: true },
      mimeType: { type: Sequelize.STRING(100), allowNull: true },
      originalName: { type: Sequelize.STRING(255), allowNull: true },
      fileSize: { type: Sequelize.INTEGER, allowNull: true },
      submittedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    })
    await queryInterface.addIndex('ClassGroupSubmission', ['sectionId'])
    await queryInterface.addIndex('ClassGroupSubmission', ['classGroupId'])
    await queryInterface.addIndex('ClassGroupSubmission', ['studentId'])
    await queryInterface.addIndex('ClassGroupSubmission', ['sectionId', 'studentId'], { unique: true, name: 'uq_submission_section_student' })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ClassGroupSubmission')
  }
}
