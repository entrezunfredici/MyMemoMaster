const { DataTypes } = require('sequelize')

module.exports = (instance) => {
  const Response = instance.define(
    'Response',
    {
      idResponse: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      // CHOIX: STRING(2000) plutôt que STRING (VARCHAR(255) implicite) — RAISON: même bug que
      // Question.statement (migration 20260831000001) : le validateur API (Response.validators.js)
      // autorise jusqu'à 2000 caractères, mais la colonne retombait sur le défaut Sequelize de 255,
      // jamais précisé à la création de la table — POST /responses échouait (500) pour toute réponse
      // dépassant 255 caractères (constaté avec une réponse générée par l'IA, ~262 caractères).
      // STRING(2000) plutôt que TEXT (choix de Question.statement) : ce champ a une borne documentée
      // et volontaire côté validateur, contrairement à `statement` qui n'en avait aucune — la colonne
      // reflète donc exactement le contrat déjà annoncé par l'API plutôt que de le rendre illusoire.
      content: {
        type: DataTypes.STRING(2000),
        allowNull: false
      },
      correction: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      idQuestion: {
        type: DataTypes.INTEGER,
        allowNull: false
      }
    },
    {
      tableName: 'Response',
      timestamps: false,
      indexes: [{ fields: ['idQuestion'] }]
    }
  )

  Response.associate = (models) => {
    Response.belongsTo(models.Question, {
      foreignKey: 'idQuestion',
      as: 'question'
    })
  }

  return Response
}
