const { DataTypes } = require('sequelize')

module.exports = (instance) => {
  const TestResult = instance.define(
    'TestResult',
    {
      resultId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      testId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'Test', key: 'testId' }
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'User', key: 'userId' }
      },
      score: {
        type: DataTypes.FLOAT,
        allowNull: false
      },
      total: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      // Durée réelle du passage (secondes), chronométrée côté front — optionnelle
      // (les résultats existants avant ce champ, ou saisis via une source qui ne
      // la fournit pas, restent valides avec durationSeconds à null).
      durationSeconds: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null
      }
    },
    {
      tableName: 'TestResult',
      timestamps: false,
      indexes: [
        { fields: ['testId'] },
        { fields: ['userId'] },
        { fields: ['testId', 'userId'] }
      ]
    }
  )

  TestResult.associate = (models) => {
    TestResult.belongsTo(models.Test, { foreignKey: 'testId', as: 'test' })
    TestResult.belongsTo(models.User, { foreignKey: 'userId', as: 'user' })
  }

  return TestResult
}
