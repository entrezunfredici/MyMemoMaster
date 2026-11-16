'use strict'

// C-06 — titre, vitrine et réglages de gamification (diagrams/profil_gamifie_ui.md §4 et §8).
// Une ligne par utilisateur, créée à la première écriture ; l'absence de ligne vaut « valeurs par défaut ».
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('UserGamificationSettings', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'User', key: 'userId' },
        onDelete: 'CASCADE'
      },
      titleCode: { type: Sequelize.STRING(40), allowNull: true },
      showcaseCodes: { type: Sequelize.JSON, allowNull: false, defaultValue: [] },
      dailyGoalCards: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      dailyGoalExercises: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      streakReminderEnabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      badgesVisibleToTeachers: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      animationsEnabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      zenMode: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false }
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('UserGamificationSettings')
  }
}
