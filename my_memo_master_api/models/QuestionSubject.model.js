const { DataTypes } = require('sequelize')

// CHOIX: modèle explicite (au lieu de through: 'questionSubject' en simple chaîne)
// RAISON: même bug que TestQuestion.model.js — table de jointure implicite avec
// timestamps: true supposé par défaut, alors que la migration
// 20260226152700-create-questionsubject-table.js n'a créé que idQuestion/subjectId.
module.exports = (instance) => {
  const QuestionSubject = instance.define(
    'questionSubject',
    {
      idQuestion: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'Question', key: 'idQuestion' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      subjectId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'Subject', key: 'subjectId' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }
    },
    {
      tableName: 'questionSubject',
      timestamps: false
    }
  )

  return QuestionSubject
}
