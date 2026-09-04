'use strict'

// Journal d'une consultation de carte mentale réellement effectuée (durée
// chronométrée côté front, de l'ouverture d'une carte existante — via
// MindmapsEditorView.vue — à la sortie). Alimente le même KPI "Temps total de
// révision" que TestResult.durationSeconds (exercices) et LeitnerReviewSession
// (Leitner) — voir 20260901000001 et 20260901000002. Table de journal pur, pas
// de FK vers RevisionSession, même raisonnement que LeitnerReviewSession.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('MindMapViewSession', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'User', key: 'userId' },
        onDelete: 'CASCADE'
      },
      idMindMap: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'MindMap', key: 'idMindMap' },
        onDelete: 'CASCADE'
      },
      durationSeconds: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      viewedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    })

    await queryInterface.addIndex('MindMapViewSession', ['userId'], { name: 'idx_mindmapviewsession_userid' })
    await queryInterface.addIndex('MindMapViewSession', ['idMindMap'], { name: 'idx_mindmapviewsession_idmindmap' })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('MindMapViewSession')
  }
}
