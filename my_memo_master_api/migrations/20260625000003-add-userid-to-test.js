'use strict'

// Correction fuite de données : les exercices (Test) n'avaient pas de colonne userId,
// ce qui les rendait globaux. Ce champ est nullable pour la compatibilité ascendante
// avec les enregistrements existants (userId=null = exercice legacy global).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Test', 'userId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'User', key: 'userId' },
      onDelete: 'SET NULL'
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Test', 'userId')
  }
}
