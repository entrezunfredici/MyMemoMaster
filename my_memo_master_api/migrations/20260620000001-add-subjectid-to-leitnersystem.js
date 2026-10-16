'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('LeitnerSystem', 'subjectId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'Subject', key: 'subjectId' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    })
    await queryInterface.addIndex('LeitnerSystem', ['subjectId'], {
      name: 'idx_leitnersystem_subjectid'
    })
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('LeitnerSystem', 'idx_leitnersystem_subjectid')
    await queryInterface.removeColumn('LeitnerSystem', 'subjectId')
  }
}
