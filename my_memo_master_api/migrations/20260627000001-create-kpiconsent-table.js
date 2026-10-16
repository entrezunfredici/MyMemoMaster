'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('KpiConsent', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      studentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'User', key: 'userId' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      teacherId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'User', key: 'userId' },
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
      subjectId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Subject', key: 'subjectId' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      grantedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    })

    // Unique par unité de consentement : (étudiant, enseignant, groupe, matière).
    // subjectId NULL = consentement global toutes matières.
    // Les SGBD traitent NULL comme distinct dans les indexes uniques —
    // l'idempotence pour les consentements globaux est gérée via findOrCreate.
    await queryInterface.addIndex('KpiConsent', {
      fields: ['studentId', 'teacherId', 'classGroupId', 'subjectId'],
      unique: true,
      name: 'kpiconsent_unique_consent_unit'
    })
    await queryInterface.addIndex('KpiConsent', ['teacherId'])
    await queryInterface.addIndex('KpiConsent', ['classGroupId'])
    await queryInterface.addIndex('KpiConsent', ['subjectId'])
  },

  async down(queryInterface) {
    await queryInterface.dropTable('KpiConsent')
  }
}
