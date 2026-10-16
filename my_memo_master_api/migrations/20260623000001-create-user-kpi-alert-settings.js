'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('UserKpiAlertSettings', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'User', key: 'userId' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      enabled: { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false },
      inAppEnabled: { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false },
      emailEnabled: { type: Sequelize.BOOLEAN, defaultValue: false, allowNull: false },
      pushEnabled: { type: Sequelize.BOOLEAN, defaultValue: false, allowNull: false },
      streakAlertEnabled: { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false },
      disciplineAlertEnabled: { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false },
      scoreDropAlertEnabled: { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false },
      thresholdDiscipline: { type: Sequelize.INTEGER, defaultValue: 40, allowNull: false },
      lastDigestSentAt: { type: Sequelize.DATEONLY, allowNull: true }
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('UserKpiAlertSettings')
  }
}
