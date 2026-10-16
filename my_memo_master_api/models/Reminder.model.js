const { DataTypes } = require('sequelize')

module.exports = (instance) => {
  const Reminder = instance.define(
    'Reminder',
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
        references: {
          model: 'User',
          key: 'userId'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      entityType: {
        type: DataTypes.STRING(20),
        allowNull: false
        // Valeurs attendues : 'deadline' | 'revision_session'
      },
      entityId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      reminderAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      delayMinutes: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      channel: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'email'
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'pending'
        // Valeurs : 'pending' | 'sent' | 'cancelled' | 'failed'
      },
      jobId: {
        type: DataTypes.STRING,
        allowNull: true
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: true
      }
    },
    {
      tableName: 'Reminder',
      timestamps: false,
      indexes: [
        { fields: ['userId'] },
        { fields: ['entityType', 'entityId'] },
        { fields: ['reminderAt'] },
        { fields: ['status'] }
      ]
    }
  )

  Reminder.associate = (models) => {
    Reminder.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    })
  }

  return Reminder
}
