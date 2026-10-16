const { DataTypes } = require('sequelize')

// CHOIX: modèle explicite (au lieu de through: 'cardSystems' en simple chaîne)
// RAISON: même bug que TestQuestion.model.js — table de jointure implicite avec
// timestamps: true supposé par défaut, alors que la migration
// 20260226152900-create-cardsystems-table.js n'a créé que idCard/idSystem.
module.exports = (instance) => {
  const CardSystem = instance.define(
    'cardSystems',
    {
      idCard: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'LeitnerCard', key: 'idCard' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      idSystem: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'LeitnerSystem', key: 'idSystem' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }
    },
    {
      tableName: 'cardSystems',
      timestamps: false
    }
  )

  return CardSystem
}
