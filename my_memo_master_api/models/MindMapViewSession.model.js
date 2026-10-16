const { DataTypes } = require('sequelize')

module.exports = (instance) => {
  const MindMapViewSession = instance.define(
    'MindMapViewSession',
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
      idMindMap: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'MindMap', key: 'idMindMap' }
      },
      durationSeconds: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      viewedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      tableName: 'MindMapViewSession',
      timestamps: false,
      indexes: [
        { fields: ['userId'] },
        { fields: ['idMindMap'] }
      ]
    }
  )

  MindMapViewSession.associate = (models) => {
    MindMapViewSession.belongsTo(models.User, { foreignKey: 'userId', as: 'user' })
    MindMapViewSession.belongsTo(models.Diagramme, { foreignKey: 'idMindMap', as: 'mindMap' })
  }

  return MindMapViewSession
}
