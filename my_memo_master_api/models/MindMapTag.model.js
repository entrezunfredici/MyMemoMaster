const { DataTypes } = require('sequelize')

// CHOIX: modèle explicite (au lieu de through: 'MindMapTag' en simple chaîne)
// RAISON: même bug que TestQuestion.model.js — table de jointure implicite avec
// timestamps: true supposé par défaut, alors que la migration
// 20260624000002-create-mindmaptag-table.js n'a créé que idMindMap/tagId.
module.exports = (instance) => {
  const MindMapTag = instance.define(
    'MindMapTag',
    {
      idMindMap: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'MindMap', key: 'idMindMap' },
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
      tableName: 'MindMapTag',
      timestamps: false
    }
  )

  return MindMapTag
}
