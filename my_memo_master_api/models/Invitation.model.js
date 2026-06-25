const { DataTypes } = require('sequelize')

module.exports = (instance) => {
  const Invitation = instance.define(
    'Invitation',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      classGroupId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'ClassGroup', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      targetUserId: {
        type: DataTypes.INTEGER,
        allowNull: true, // null pour les invitations externes (utilisateur sans compte)
        references: { model: 'User', key: 'userId' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      targetEmail: {
        type: DataTypes.STRING(255),
        allowNull: true // renseigné pour les invitations par email (compte existant ou non)
      },
      invitedByUserId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'User', key: 'userId' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      role: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'student'
        // Valeurs : 'teacher' | 'student'
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'pending'
        // Valeurs : 'pending' | 'accepted' | 'declined'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      tableName: 'Invitation',
      timestamps: false,
      indexes: [
        { fields: ['classGroupId'] },
        { fields: ['targetUserId'] },
        { fields: ['targetUserId', 'status'] }
      ]
    }
  )

  Invitation.associate = (models) => {
    Invitation.belongsTo(models.ClassGroup, { foreignKey: 'classGroupId', as: 'classGroup' })
    Invitation.belongsTo(models.User, { foreignKey: 'targetUserId', as: 'targetUser' })
    Invitation.belongsTo(models.User, { foreignKey: 'invitedByUserId', as: 'invitedBy' })
  }

  return Invitation
}
