const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  const MindMap = sequelize.define(
    'MindMap',
    {
      idMindMap: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      mmName: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      mindMapJson: {
        type: DataTypes.JSON, // `TEXT` est plus approprié pour du JSON volumineux.
        allowNull: false
      },
      userId: {
        type: DataTypes.INTEGER,
        // CHOIX: SET NULL plutôt que CASCADE ou FK sans action explicite (bug corrigé)
        // RAISON: la carte mentale est un contenu réel créé par l'utilisateur (valeur patrimoniale,
        // pattern déjà retenu pour LeitnerSystem.idUser — voir DECISIONS.md 2026-09-02 C-01.07) :
        // elle devient orpheline mais reste consultable/récupérable plutôt que supprimée avec le
        // compte. Sans onDelete explicite, PostgreSQL applique NO ACTION et bloquait la suppression
        // de compte (500) dès qu'un utilisateur avait au moins une carte mentale enregistrée.
        allowNull: true,
        references: {
          model: 'User', // Nom de la table cible.
          key: 'userId' // Clé primaire dans la table cible.
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      subjectId: {
        type: DataTypes.INTEGER,
        allowNull: false, // Assurez-vous que cette clé étrangère ne peut pas être nulle.
        references: {
          model: 'Subject', // Nom de la table cible.
          key: 'subjectId' // Clé primaire dans la table cible.
        }
      }
    },
    {
      tableName: 'MindMap',
      timestamps: false,
      indexes: [{ fields: ['userId'] }, { fields: ['subjectId'] }]
    }
  )

  // Définir les associations
  MindMap.associate = (models) => {
    MindMap.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    })
    MindMap.belongsTo(models.Subject, {
      foreignKey: 'subjectId',
      as: 'subject'
    })
    MindMap.belongsToMany(models.Tag, {
      through: 'MindMapTag',
      foreignKey: 'idMindMap',
      otherKey: 'tagId',
      as: 'tags'
    })
  }

  return MindMap
}
