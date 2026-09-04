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
      // true = session menée jusqu'à la dernière carte due, false = sortie
      // anticipée (bouton "← Retour", journalisée depuis le 2026-09-04). Seule
      // une session à true valide automatiquement une séance planifiée
      // correspondante — voir RevisionSession.service.js#validateMatchingSessions.
      completed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
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
