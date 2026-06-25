'use strict'

// La table systemSubject était la junction M2M entre Subject et LeitnerSystem
// (belongsToMany via 'systemSubject'). L'association a été remplacée par une FK directe
// subjectId sur LeitnerSystem (hasMany/belongsTo). Cette table est maintenant orpheline.
module.exports = {
  async up(queryInterface) {
    await queryInterface.dropTable('systemSubject')
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.createTable('systemSubject', {
      subjectId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Subject', key: 'subjectId' },
        onDelete: 'CASCADE'
      },
      idSystem: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'LeitnerSystem', key: 'idSystem' },
        onDelete: 'CASCADE'
      },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    })
  }
}
