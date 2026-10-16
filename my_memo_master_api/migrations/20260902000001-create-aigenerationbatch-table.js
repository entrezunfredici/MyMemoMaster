'use strict'

// Stockage des cartes générées par IA en attente de validation (C-01.07). Un "batch" = une
// exécution du pipeline (C-01.05, PDF/chunking/LLM) sur un système Leitner donné. Les cartes
// individuelles vivent dans AiGeneratedCard (voir migration suivante) — jamais dans
// Question/Response/LeitnerCard tant que l'utilisateur n'a pas validé (Écran de validation, hors
// périmètre de ce ticket ; voir diagrams/generation_ia_prompt_cartes.md §1 et §6).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('AiGenerationBatch', {
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
      subjectContext: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      cardType: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: 'open'
      },
      outputLanguage: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: 'fr'
      },
      status: {
        // Valeurs : 'pending' | 'validated' | 'discarded'
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'pending'
      },
      warnings: {
        type: Sequelize.JSON,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    })

    await queryInterface.addIndex('AiGenerationBatch', ['userId'], { name: 'idx_aigenerationbatch_userid' })
    await queryInterface.addIndex('AiGenerationBatch', ['idSystem'], { name: 'idx_aigenerationbatch_idsystem' })
    await queryInterface.addIndex('AiGenerationBatch', ['status'], { name: 'idx_aigenerationbatch_status' })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('AiGenerationBatch')
  }
}
