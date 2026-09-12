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
      // CHOIX: TEXT plutôt que STRING (VARCHAR(255) implicite) — RAISON: un énoncé
      // d'exercice n'a pas de raison d'être plafonné à 255 caractères ; c'était un
      // défaut Sequelize non voulu (migration 20260831000001), aligné sur `content`.
      statement: {
        type: DataTypes.TEXT,
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
      },
      // Image/schéma rattaché à la question (upload manuel ou repris par l'IA depuis un PDF source —
      // voir migration 20260912000001-add-image-fields-to-question.js). `imageKey` est la clé S3
      // (nécessaire pour la suppression de l'objet, voir Question.service.js#removeImage), `imageUrl`
      // le lien exploitable directement par le front.
      imageUrl: {
        type: DataTypes.STRING(500),
        allowNull: true,
        defaultValue: null
      },
      imageKey: {
        type: DataTypes.STRING(500),
        allowNull: true,
        defaultValue: null
      },
      imageMimeType: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: null
      },
      imageOriginalName: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: null
      },
      imageSize: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null
      },
      // 'manual' | 'ai' | null (aucune image) — voir DECISIONS.md 2026-09-12.
      imageSource: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: null
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
