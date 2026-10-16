const { DataTypes } = require('sequelize')

module.exports = (instance) => {
  const Test = instance.define(
    'Test',
    {
      testId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
      },
      subjectId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Subject',
          key: 'subjectId'
        }
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'User',
          key: 'userId'
        }
      },
      name: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      tableName: 'Test',
      updatedAt: 'updatedAt',
      createdAt: 'createdAt',
      timestamps: true,
      indexes: [{ fields: ['subjectId'] }]
    }
  )

  Test.associate = (models) => {
    Test.belongsToMany(models.Question, {
      through: 'testQuestions',
      foreignKey: 'idTest',
      otherKey: 'idQuestion',
      as: 'question'
    })

    Test.belongsTo(models.Subject, {
      foreignKey: 'subjectId',
      as: 'subject'
    })

    Test.hasMany(models.Deadline, {
      foreignKey: 'testId',
      as: 'deadlines'
    })

    Test.belongsToMany(models.Tag, {
      through: 'TestTag',
      foreignKey: 'testId',
      otherKey: 'tagId',
      as: 'tags'
    })

    Test.belongsToMany(models.ClassGroup, {
      through: 'TestClassGroup',
      foreignKey: 'testId',
      otherKey: 'classGroupId',
      as: 'classGroups'
    })
  }

  return Test
}
