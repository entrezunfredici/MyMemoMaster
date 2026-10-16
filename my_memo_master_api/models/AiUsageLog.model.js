const { DataTypes } = require('sequelize')

module.exports = (instance) => {
  const AiUsageLog = instance.define(
    'AiUsageLog',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'User', key: 'userId' }
      },
      idBatch: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'AiGenerationBatch', key: 'id' }
      },
      provider: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'mistral'
      },
      operation: {
        // Valeurs informatives : 'chat_completion' | 'ocr' | 'chat_completion+ocr'
        type: DataTypes.STRING(30),
        allowNull: false
      },
      model: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      promptTokens: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      completionTokens: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      pagesProcessed: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      estimatedCostUsd: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      tableName: 'AiUsageLog',
      timestamps: false,
      indexes: [{ fields: ['userId'] }, { fields: ['createdAt'] }]
    }
  )

  AiUsageLog.associate = (models) => {
    AiUsageLog.belongsTo(models.User, { foreignKey: 'userId', as: 'user' })
    AiUsageLog.belongsTo(models.AiGenerationBatch, { foreignKey: 'idBatch', as: 'batch' })
  }

  return AiUsageLog
}
