'use strict'

// BUG TROUVÉ EN CONDITIONS RÉELLES (2026-09-08, logs du conteneur API) : `POST /questions` échoue
// systématiquement en 500 dès qu'un `idTest` est fourni — "null value in column createdAt of
// relation testQuestions violates not-null constraint" — bloquant TOUTE création d'exercice avec
// au moins une question (manuelle ou générée par IA), pas seulement le flux IA.
//
// Cause : dérive de schéma entre la base réelle et le modèle. `models/TestQuestion.model.js`
// (commentaire déjà présent en tête de ce fichier) documente que la table de jointure
// `testQuestions` a été créée par un `sequelize.sync()` (mode dev, voir `[DB] Running Sequelize
// sync (dev/test mode)…` au démarrage de l'API) AVANT que ce modèle explicite (`timestamps: false`)
// n'existe — Sequelize avait alors ajouté `createdAt`/`updatedAt` (NOT NULL, sans défaut) de son
// propre chef. Le modèle a depuis été corrigé (`timestamps: false`), et la migration
// `20260226152800-create-testquestions-table.js` ne définit plus ces deux colonnes — mais sur une
// base où la table existait déjà avant l'ajout de cette migration, `db:migrate` la marque
// "déjà appliquée" sans jamais retirer les colonnes en trop : `question.addTest(test)`
// (`services/Question.service.js#create`) insère alors une ligne sans `createdAt`/`updatedAt`
// (conforme au modèle actuel), rejetée par la contrainte NOT NULL toujours présente en base.
//
// Corrige le schéma réel pour qu'il corresponde enfin au modèle/migration de création — idempotent
// (`describeTable`) pour ne rien casser sur une base où la dérive n'a jamais eu lieu (colonnes déjà
// absentes, ex. une base entièrement recréée depuis les migrations actuelles).

module.exports = {
  async up(queryInterface) {
    const table = await queryInterface.describeTable('testQuestions')
    if (table.createdAt) await queryInterface.removeColumn('testQuestions', 'createdAt')
    if (table.updatedAt) await queryInterface.removeColumn('testQuestions', 'updatedAt')
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('testQuestions')
    if (!table.createdAt) {
      await queryInterface.addColumn('testQuestions', 'createdAt', {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      })
    }
    if (!table.updatedAt) {
      await queryInterface.addColumn('testQuestions', 'updatedAt', {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      })
    }
  }
}
