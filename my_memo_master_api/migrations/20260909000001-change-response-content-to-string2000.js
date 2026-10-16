'use strict'

// Correctif 500 en prod (même bug que Question.statement, migration 20260831000001) : POST
// /responses échouait pour toute réponse dépassant 255 caractères (colonne Response.content en
// VARCHAR(255), valeur par défaut Sequelize.STRING jamais précisée à la création de la table),
// alors que le validateur API (Response.validators.js) annonce une limite de 2000 caractères.
// Reproduit avec une réponse de carte générée par l'IA (~262 caractères).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('Response', 'content', {
      type: Sequelize.STRING(2000),
      allowNull: false
    })
  },

  async down(queryInterface, Sequelize) {
    // Pas de retour arrière automatique vers VARCHAR(255) : si des réponses > 255 caractères
    // existent déjà en base, le rollback échouerait silencieusement ou tronquerait des données
    // (même choix que 20260831000001). Le down() est donc un no-op assumé.
    await queryInterface.changeColumn('Response', 'content', {
      type: Sequelize.STRING(2000),
      allowNull: false
    })
  }
}
