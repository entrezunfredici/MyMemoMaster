'use strict'

// Une carte proposée par IA au sein d'un AiGenerationBatch (voir migration précédente). Structure
// alignée sur le contrat de sortie du prompt (diagrams/generation_ia_prompt_cartes.md §4) :
// statement/type/answer/acceptedAnswers/options/sourceExcerpt. `status` porte le résultat de la
// relecture utilisateur (Écran de validation, hors périmètre) — ce ticket ne fait que la stocker.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('AiGeneratedCard', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      idBatch: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'AiGenerationBatch', key: 'id' },
        onDelete: 'CASCADE'
      },
      statement: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      type: {
        // Valeurs : 'open' | 'mcq'
        type: Sequelize.STRING(10),
        allowNull: false
      },
      answer: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      acceptedAnswers: {
        type: Sequelize.JSON,
        allowNull: true
      },
      options: {
        type: Sequelize.JSON,
        allowNull: true
      },
      sourceExcerpt: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      status: {
        // Valeurs : 'pending' | 'accepted' | 'edited' | 'rejected'
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'pending'
      }
    })

    await queryInterface.addIndex('AiGeneratedCard', ['idBatch'], { name: 'idx_aigeneratedcard_idbatch' })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('AiGeneratedCard')
  }
}
