const { DataTypes } = require('sequelize')

module.exports = (instance) => {
  const AuditLog = instance.define(
    'AuditLog',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      actorId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'User',
          key: 'userId'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      action: {
        type: DataTypes.STRING(50),
        allowNull: false
        // USER_INVITED | USER_ACCOUNT_ACTIVATED | USER_ACCOUNT_DEACTIVATED
        // USER_ROLE_CHANGED | GROUP_CREATED | GROUP_MEMBER_ADDED
        // GROUP_MEMBER_REMOVED | LOGIN_SUCCESS | LOGIN_FAILED
      },
      entityType: {
        type: DataTypes.STRING(30),
        allowNull: false
        // 'User' | 'ClassGroup' | 'Etablissement' | 'Invitation'
      },
      entityId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      metadata: {
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
      tableName: 'AuditLog',
      timestamps: false,
      indexes: [
        { fields: ['actorId'] },
        { fields: ['entityType', 'entityId'] },
        { fields: ['createdAt'] }
      ]
    }
  )

  AuditLog.associate = (models) => {
    AuditLog.belongsTo(models.User, { foreignKey: 'actorId', as: 'actor' })
  }

  return AuditLog
}
