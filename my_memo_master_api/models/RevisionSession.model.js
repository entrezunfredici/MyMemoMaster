const { DataTypes } = require('sequelize')

module.exports = (instance) => {
  const RevisionSession = instance.define(
    'RevisionSession',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING(150),
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      startTime: {
        type: DataTypes.TIME,
        allowNull: false
      },
      endTime: {
        type: DataTypes.TIME,
        allowNull: false
      },
      isDone: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'User',
          key: 'userId'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      idSystem: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'LeitnerSystem',
          key: 'idSystem'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      idTest: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'Test',
          key: 'testId'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      }
    },
    {
      tableName: 'RevisionSession',
      timestamps: false,
      indexes: [
        { fields: ['userId'] },
        { fields: ['date'] },
        { fields: ['isDone'] },
        { fields: ['idSystem'] },
        { fields: ['idTest'] }
      ]
    }
  )

  RevisionSession.associate = (models) => {
    RevisionSession.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    })
    RevisionSession.belongsTo(models.LeitnerSystem, {
      foreignKey: 'idSystem',
      as: 'leitnerSystem'
    })
    RevisionSession.belongsTo(models.Test, {
      foreignKey: 'idTest',
      as: 'test'
    })
  }

  return RevisionSession
}
