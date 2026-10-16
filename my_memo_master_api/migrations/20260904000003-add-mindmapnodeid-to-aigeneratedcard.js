'use strict'

// Permet de lier une carte proposée par IA à un nœud de la carte mentale du système, au même titre
// qu'une carte créée manuellement (LeitnerCard.mindMapNodeId, migration 20260718000001) — choix fait
// à l'écran de révision (édition d'une carte proposée), reporté sur LeitnerCard.mindMapNodeId au
// moment de la promotion (AiGenerationBatch.service.js → LeitnerCard.service.js#addCard).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('AiGeneratedCard', 'mindMapNodeId', {
      type: Sequelize.STRING(64),
      allowNull: true,
      defaultValue: null
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('AiGeneratedCard', 'mindMapNodeId')
  }
}
