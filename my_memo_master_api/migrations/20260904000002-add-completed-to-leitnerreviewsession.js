'use strict'

// Distingue une session Leitner menée à son terme d'une session partielle
// (utilisateur sorti via "← Retour" avant la dernière carte, journalisée depuis
// le 2026-09-04 — voir migration 20260901000002 pour la table elle-même).
// Sert à décider si la session doit aussi valider automatiquement une séance
// planifiée correspondante (RevisionSession.isDone) — seule une session menée
// à son terme le fait, voir services/RevisionSession.service.js#validateMatchingSessions.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('LeitnerReviewSession', 'completed', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('LeitnerReviewSession', 'completed')
  }
}
