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
        type: DataTypes.INTEGER,
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
