const { DataTypes } = require('sequelize')

module.exports = (instance) => {
  const Question = instance.define(
    'Question',
    {
      idQuestion: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      questionPosition: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      statement: {
        type: DataTypes.STRING,
        allowNull: false
      },
      type: {
        type: DataTypes.STRING(20),
        allowNull: false
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null,
        get() {
          const raw = this.getDataValue('content')
          if (raw === null || raw === undefined) return null
          if (typeof raw === 'string') {
            try { return JSON.parse(raw) } catch { return null }
          }
          return raw
        },
        set(value) {
          this.setDataValue('content', value != null ? JSON.stringify(value) : null)
        }
      }
    },
    {
      tableName: 'Question',
      timestamps: false
    }
  )

  Question.associate = (models) => {
    Question.belongsToMany(models.Subject, {
      through: 'questionSubject',
      foreignKey: 'idQuestion',
      otherKey: 'subjectId',
      as: 'subject'
    })

    Question.belongsToMany(models.Test, {
      through: 'testQuestions',
      foreignKey: 'idQuestion',
      otherKey: 'idTest',
      as: 'test'
    })

    Question.hasOne(models.Response, {
      through: 'questionResponse',
      foreignKey: 'idQuestion',
      otherKey: 'idResponse',
      as: 'response'
    })

    Question.hasOne(models.LeitnerCard, {
      through: 'cardQuestion',
      foreignKey: 'idQuestion',
      otherKey: 'idCard',
      as: 'leitnerCard'
    })
  }

  return Question
}
