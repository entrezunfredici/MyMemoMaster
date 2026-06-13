const { DataTypes } = require('sequelize')

module.exports = (instance) => {
  const ClassGroupUsers = instance.define(
    'ClassGroupUsers',
    {
      classGroupId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'ClassGroup',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'User',
          key: 'userId'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      role: {
        type: DataTypes.STRING(20),
        allowNull: false
        // Valeurs attendues : 'teacher' | 'student'
      }
    },
    {
      tableName: 'ClassGroupUsers',
      timestamps: false
    }
  )

  ClassGroupUsers.associate = (models) => {
    ClassGroupUsers.belongsTo(models.ClassGroup, {
      foreignKey: 'classGroupId',
      as: 'classGroup'
    })

    ClassGroupUsers.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    })
  }

  return ClassGroupUsers
}
