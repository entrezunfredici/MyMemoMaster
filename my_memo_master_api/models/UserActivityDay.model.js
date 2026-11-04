const { DataTypes } = require('sequelize')

module.exports = (instance) => {
  const UserActivityDay = instance.define(
    'UserActivityDay',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'User', key: 'userId' },
        onDelete: 'CASCADE'
      },
      // Jour calendaire (YYYY-MM-DD, fuseau du serveur) comportant au moins une pratique réelle
      date: { type: DataTypes.DATEONLY, allowNull: false }
    },
    {
      tableName: 'UserActivityDay',
      timestamps: false,
      indexes: [{ unique: true, fields: ['userId', 'date'], name: 'uq_useractivityday_user_date' }]
    }
  )

  UserActivityDay.associate = (models) => {
    UserActivityDay.belongsTo(models.User, { foreignKey: 'userId', as: 'user' })
  }

  return UserActivityDay
}
