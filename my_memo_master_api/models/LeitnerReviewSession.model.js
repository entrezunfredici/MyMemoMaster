const { DataTypes } = require('sequelize')

module.exports = (instance) => {
  const LeitnerReviewSession = instance.define(
    'LeitnerReviewSession',
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
      cardsReviewed: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      durationSeconds: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      tableName: 'LeitnerReviewSession',
      timestamps: false,
      indexes: [
        { fields: ['userId'] },
        { fields: ['idSystem'] }
      ]
    }
  )

  LeitnerReviewSession.associate = (models) => {
    LeitnerReviewSession.belongsTo(models.User, { foreignKey: 'userId', as: 'user' })
    LeitnerReviewSession.belongsTo(models.LeitnerSystem, { foreignKey: 'idSystem', as: 'system' })
  }

  return LeitnerReviewSession
}
