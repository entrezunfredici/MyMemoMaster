'use strict'

// Journal du coût réel de chaque génération IA réussie (C-01.06, Gestion quotas et budget IA) —
// une ligne par appel à POST /ai-generation-batches ayant abouti, agrégeant l'usage de tous les
// appels LLM/OCR sous-jacents (voir services/AiQuota.service.js). Pattern d'audit déjà établi par
// AuditLog.model.js dans ce projet : FK en SET NULL (le journal de coût a une valeur propre —
// savoir combien a été dépensé — indépendante du sort de l'utilisateur ou du batch d'origine).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('AiUsageLog', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'User', key: 'userId' },
        onDelete: 'SET NULL'
      },
      idBatch: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'AiGenerationBatch', key: 'id' },
        onDelete: 'SET NULL'
      },
      provider: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'mistral'
      },
      operation: {
        // Valeurs informatives : 'chat_completion' | 'ocr' | 'chat_completion+ocr'
        type: Sequelize.STRING(30),
        allowNull: false
      },
      model: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      promptTokens: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      completionTokens: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      pagesProcessed: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      estimatedCostUsd: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    })

    await queryInterface.addIndex('AiUsageLog', ['userId'], { name: 'idx_aiusagelog_userid' })
    await queryInterface.addIndex('AiUsageLog', ['createdAt'], { name: 'idx_aiusagelog_createdat' })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('AiUsageLog')
  }
}
