const { DataTypes } = require('sequelize')

module.exports = (instance) => {
  const Deadline = instance.define(
    'Deadline',
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
      type: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'autre'
        // Valeurs attendues : 'ds' | 'devoir' | 'exposé' | 'autre'
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      occurrenceId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'EventOccurrence',
          key: 'id'
        },
        // CHOIX: RESTRICT plutôt que CASCADE
        // RAISON: supprimer une occurrence qui a des échéances serait une perte de données silencieuse
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      },
      dueDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      dueTime: {
        type: DataTypes.TIME,
        allowNull: true
      },
      testId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'Test',
          key: 'testId'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
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
      }
    },
    {
      tableName: 'Deadline',
      timestamps: false,
      indexes: [{ fields: ['occurrenceId'] }, { fields: ['createdBy'] }, { fields: ['dueDate'] }, { fields: ['testId'] }]
    }
  )

  Deadline.associate = (models) => {
    Deadline.belongsTo(models.EventOccurrence, {
      foreignKey: 'occurrenceId',
      as: 'occurrence'
    })

    Deadline.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    })

    Deadline.belongsTo(models.Test, {
      foreignKey: 'testId',
      as: 'test'
    })
  }

  return Deadline
}
