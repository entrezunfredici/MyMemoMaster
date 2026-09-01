const { DataTypes } = require('sequelize')

// CHOIX: modèle explicite (au lieu de through: 'TestTag' en simple chaîne)
// RAISON: même bug que testQuestions (voir TestQuestion.model.js) — sans modèle
// enregistré, Sequelize suppose timestamps: true sur la table de jointure implicite,
// alors que la migration 20260624000004-create-testtag-table.js n'a créé que
// testId/tagId. test.setTags() plantait en prod (Postgres) dès qu'un tag était
// sélectionné à la création/édition d'un exercice.
module.exports = (instance) => {
  const TestTag = instance.define(
    'TestTag',
    {
      testId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'Test', key: 'testId' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      tagId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'Tag', key: 'tagId' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }
    },
    {
      tableName: 'TestTag',
      timestamps: false
    }
  )

  return TestTag
}
