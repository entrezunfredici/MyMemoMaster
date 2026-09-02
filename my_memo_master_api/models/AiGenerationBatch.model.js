const { DataTypes } = require('sequelize')

module.exports = (instance) => {
  const AiGenerationBatch = instance.define(
    'AiGenerationBatch',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'User', key: 'userId' }
      },
      idSystem: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'LeitnerSystem', key: 'idSystem' }
      },
      subjectContext: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      cardType: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: 'open'
      },
      outputLanguage: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: 'fr'
      },
      status: {
        // Valeurs : 'pending' | 'validated' | 'discarded'
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'pending'
      },
      warnings: {
        type: DataTypes.JSON,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      tableName: 'AiGenerationBatch',
      timestamps: false,
      indexes: [{ fields: ['userId'] }, { fields: ['idSystem'] }, { fields: ['status'] }]
    }
  )

  AiGenerationBatch.associate = (models) => {
    AiGenerationBatch.belongsTo(models.User, { foreignKey: 'userId', as: 'user' })
    AiGenerationBatch.belongsTo(models.LeitnerSystem, { foreignKey: 'idSystem', as: 'leitnerSystem' })
    AiGenerationBatch.hasMany(models.AiGeneratedCard, { foreignKey: 'idBatch', as: 'cards' })
  }

  return AiGenerationBatch
}
