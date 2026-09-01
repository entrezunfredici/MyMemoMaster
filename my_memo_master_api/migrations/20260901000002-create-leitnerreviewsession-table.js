'use strict'

// Journal d'une session de révision Leitner réellement effectuée (durée
// chronométrée côté front, du montage de FlashcardsSessionPage.vue à la dernière
// carte). Alimente le même KPI "Temps total de révision" que TestResult.durationSeconds
// côté exercices — voir 20260901000001. Table de journal pur (pas d'entité
// métier), pas de FK vers RevisionSession : une session Leitner réelle n'a
// aucune raison d'être liée à un créneau planifié à l'avance.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('LeitnerReviewSession', {
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
      idSystem: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'LeitnerSystem', key: 'idSystem' },
        onDelete: 'CASCADE'
      },
      cardsReviewed: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      durationSeconds: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      completedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    })

    await queryInterface.addIndex('LeitnerReviewSession', ['userId'], { name: 'idx_leitnerreviewsession_userid' })
    await queryInterface.addIndex('LeitnerReviewSession', ['idSystem'], { name: 'idx_leitnerreviewsession_idsystem' })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('LeitnerReviewSession')
  }
}
