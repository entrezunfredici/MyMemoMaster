'use strict'

// Lien facultatif entre une carte Leitner et un nœud précis de la carte mentale
// rattachée au système (LeitnerSystem.idMindMap). Les nœuds vivent dans le JSON
// MindMap.mindMapJson : leurs identifiants sont des chaînes, d'où un STRING et
// pas de contrainte FK (référence intra-JSON, tolérante à la suppression du nœud).
module.exports = {
  async up(queryInterface, Sequelize) {
    const existing = await queryInterface.describeTable('LeitnerCard')
    if (!existing.mindMapNodeId) {
      await queryInterface.addColumn('LeitnerCard', 'mindMapNodeId', {
        type: Sequelize.STRING(64),
        allowNull: true,
        defaultValue: null
      })
    }
  },

  async down(queryInterface) {
    const existing = await queryInterface.describeTable('LeitnerCard')
    if (existing.mindMapNodeId) {
      await queryInterface.removeColumn('LeitnerCard', 'mindMapNodeId')
    }
  }
}
