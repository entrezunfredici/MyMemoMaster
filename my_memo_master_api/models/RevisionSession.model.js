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
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'User',
          key: 'userId'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }
    },
    {
      tableName: 'RevisionSession',
      timestamps: false,
      indexes: [{ fields: ['userId'] }, { fields: ['date'] }]
    }
  )

  RevisionSession.associate = (models) => {
    RevisionSession.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    })
  }

  return RevisionSession
}
