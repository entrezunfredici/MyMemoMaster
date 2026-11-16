const { DataTypes } = require('sequelize')

module.exports = (instance) => {
  const UserGamificationSettings = instance.define(
    'UserGamificationSettings',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'User', key: 'userId' },
        onDelete: 'CASCADE'
      },
      // Code du badge affiché comme titre (un badge obtenu) ; null = « Aucun titre »
      titleCode: { type: DataTypes.STRING(40), allowNull: true },
      // Codes des badges mis en vitrine (3 au maximum, tous obtenus)
      showcaseCodes: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
      // Objectifs quotidiens ; 0 = désactivé
      dailyGoalCards: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      dailyGoalExercises: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      // Opt-in : aucun rappel sans accord explicite
      streakReminderEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      badgesVisibleToTeachers: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      animationsEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      zenMode: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
    },
    { tableName: 'UserGamificationSettings', timestamps: false }
  )

  UserGamificationSettings.associate = (models) => {
    UserGamificationSettings.belongsTo(models.User, { foreignKey: 'userId', as: 'user' })
  }

  return UserGamificationSettings
}
