const { DataTypes } = require('sequelize')

module.exports = (instance) => {
  const UserKpiAlertSettings = instance.define(
    'UserKpiAlertSettings',
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
        unique: true,
        references: { model: 'User', key: 'userId' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      enabled: { type: DataTypes.BOOLEAN, defaultValue: true, allowNull: false },
      inAppEnabled: { type: DataTypes.BOOLEAN, defaultValue: true, allowNull: false },
      emailEnabled: { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: false },
      pushEnabled: { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: false },
      streakAlertEnabled: { type: DataTypes.BOOLEAN, defaultValue: true, allowNull: false },
      disciplineAlertEnabled: { type: DataTypes.BOOLEAN, defaultValue: true, allowNull: false },
      scoreDropAlertEnabled: { type: DataTypes.BOOLEAN, defaultValue: true, allowNull: false },
      thresholdDiscipline: { type: DataTypes.INTEGER, defaultValue: 40, allowNull: false },
      lastDigestSentAt: { type: DataTypes.DATEONLY, allowNull: true }
    },
    {
      tableName: 'UserKpiAlertSettings',
      timestamps: false
    }
  )

  UserKpiAlertSettings.associate = (models) => {
    UserKpiAlertSettings.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    })
  }

  return UserKpiAlertSettings
}
