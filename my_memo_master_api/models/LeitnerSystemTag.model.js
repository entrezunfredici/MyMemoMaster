const { DataTypes } = require('sequelize')

// CHOIX: modèle explicite (au lieu de through: 'LeitnerSystemTag' en simple chaîne)
// RAISON: même bug que TestQuestion.model.js — table de jointure implicite avec
// timestamps: true supposé par défaut, alors que la migration
// 20260624000003-create-leitnersystemtag-table.js n'a créé que idSystem/tagId.
module.exports = (instance) => {
  const LeitnerSystemTag = instance.define(
    'LeitnerSystemTag',
    {
      idSystem: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'LeitnerSystem', key: 'idSystem' },
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
      tableName: 'LeitnerSystemTag',
      timestamps: false
    }
  )

  return LeitnerSystemTag
}
