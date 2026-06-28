const { DataTypes } = require('sequelize')

module.exports = (instance) => {
  const TestClassGroup = instance.define(
    'TestClassGroup',
    {
      testId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'Test', key: 'testId' },
        onDelete: 'CASCADE'
      },
      classGroupId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'ClassGroup', key: 'id' },
        onDelete: 'CASCADE'
      }
    },
    {
      tableName: 'TestClassGroup',
      timestamps: false,
      indexes: [
        { unique: true, fields: ['testId', 'classGroupId'], name: 'uq_testclassgroup' },
        { fields: ['testId'], name: 'idx_testclassgroup_testid' },
        { fields: ['classGroupId'], name: 'idx_testclassgroup_groupid' }
      ]
    }
  )

  return TestClassGroup
}
