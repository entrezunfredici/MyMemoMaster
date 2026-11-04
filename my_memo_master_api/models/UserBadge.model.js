const { DataTypes } = require('sequelize')

module.exports = (instance) => {
  const UserBadge = instance.define(
    'UserBadge',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'User', key: 'userId' },
        onDelete: 'CASCADE'
      },
      // Code stable du catalogue (helpers/badges/catalog.js) — jamais renommé
      badgeCode: { type: DataTypes.STRING(40), allowNull: false },
      earnedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      // null = animation/notification d'obtention pas encore vue
      seenAt: { type: DataTypes.DATE, allowNull: true },
      // Valeur ayant déclenché l'obtention (ex. { value: 7 }), pour audit
      context: { type: DataTypes.JSON, allowNull: true }
    },
    {
      tableName: 'UserBadge',
      timestamps: false,
      indexes: [
        { unique: true, fields: ['userId', 'badgeCode'], name: 'uq_userbadge_user_code' },
        { fields: ['userId', 'seenAt'], name: 'idx_userbadge_user_seen' }
      ]
    }
  )

  UserBadge.associate = (models) => {
    UserBadge.belongsTo(models.User, { foreignKey: 'userId', as: 'user' })
  }

  return UserBadge
}
