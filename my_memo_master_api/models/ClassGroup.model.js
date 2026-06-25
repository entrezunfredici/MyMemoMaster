const { DataTypes } = require('sequelize')

module.exports = (instance) => {
  const ClassGroup = instance.define(
    'ClassGroup',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'User',
          key: 'userId'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      level: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      score: {
        type: DataTypes.FLOAT,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      tableName: 'ClassGroup',
      timestamps: false,
      indexes: [{ fields: ['createdBy'] }]
    }
  )

  ClassGroup.associate = (models) => {
    ClassGroup.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    })

    ClassGroup.hasMany(models.ClassGroupUsers, {
      foreignKey: 'classGroupId',
      as: 'members'
    })

    ClassGroup.hasMany(models.CalendarEvent, {
      foreignKey: 'classGroupId',
      as: 'calendarEvents'
    })
  }

  return ClassGroup
}
