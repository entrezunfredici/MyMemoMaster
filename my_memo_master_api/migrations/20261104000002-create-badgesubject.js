'use strict'

// C-06 — liaison many-to-many entre les badges du catalogue (en code, identifiés par leur
// `badgeCode` stable) et les matières. Un badge sans ligne ici est global ; un badge lié à une ou
// plusieurs matières ne compte que l'activité de ces matières et n'est visible d'un enseignant
// que si l'étudiant a consenti à l'une d'elles (diagrams/gamification_badges.md §19).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('BadgeSubject', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      badgeCode: { type: Sequelize.STRING(40), allowNull: false },
      subjectId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Subject', key: 'subjectId' },
        onDelete: 'CASCADE'
      }
    })
    await queryInterface.addIndex('BadgeSubject', ['badgeCode', 'subjectId'], {
      name: 'uq_badgesubject_code_subject',
      unique: true
    })
    await queryInterface.addIndex('BadgeSubject', ['subjectId'], { name: 'idx_badgesubject_subject' })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('BadgeSubject')
  }
}
