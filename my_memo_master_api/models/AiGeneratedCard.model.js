const { DataTypes } = require('sequelize')

module.exports = (instance) => {
  const AiGeneratedCard = instance.define(
    'AiGeneratedCard',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      idBatch: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'AiGenerationBatch', key: 'id' }
      },
      statement: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      type: {
        // Valeurs : 'open' | 'mcq'
        type: DataTypes.STRING(10),
        allowNull: false
      },
      answer: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      acceptedAnswers: {
        type: DataTypes.JSON,
        allowNull: true
      },
      options: {
        type: DataTypes.JSON,
        allowNull: true
      },
      sourceExcerpt: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      // Nœud de la carte mentale liée au système (id interne au JSON MindMap.mindMapJson) — même
      // rôle que LeitnerCard.mindMapNodeId, choisi à l'écran de révision avant promotion.
      mindMapNodeId: {
        type: DataTypes.STRING(64),
        allowNull: true,
        defaultValue: null
      },
      status: {
        // Valeurs : 'pending' | 'accepted' | 'edited' | 'rejected'
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'pending'
      }
    },
    {
      tableName: 'AiGeneratedCard',
      timestamps: false,
      indexes: [{ fields: ['idBatch'] }]
    }
  )

  AiGeneratedCard.associate = (models) => {
    AiGeneratedCard.belongsTo(models.AiGenerationBatch, { foreignKey: 'idBatch', as: 'batch' })
  }

  return AiGeneratedCard
}
