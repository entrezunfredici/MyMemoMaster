'use strict'

// Correctif 500 en prod : POST /questions échouait pour tout énoncé dépassant
// 255 caractères (colonne Question.statement en VARCHAR(255), valeur par défaut
// Sequelize.STRING jamais précisée à la création de la table, aucun validateur
// API ne bornait la longueur). Un énoncé d'exercice n'a pas de raison d'être
// aussi court — alignement sur Question.content, déjà en TEXT.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('Question', 'statement', {
      type: Sequelize.TEXT,
      allowNull: false
    })
  },

  async down(queryInterface, Sequelize) {
    // Pas de retour arrière automatique vers VARCHAR(255) : si des énoncés > 255
    // caractères existent déjà en base, le rollback échouerait silencieusement
    // ou tronquerait des données. Le down() est donc un no-op assumé.
    await queryInterface.changeColumn('Question', 'statement', {
      type: Sequelize.TEXT,
      allowNull: false
    })
  }
}
