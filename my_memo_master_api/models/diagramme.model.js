const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const MindMap = sequelize.define(
    "MindMap",
    {
      idMindMap: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      mmName: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      mindMapJson: {
        type: DataTypes.TEXT, // `TEXT` est plus approprié pour du JSON volumineux.
        allowNull: false,
      },
      idUser: {
        type: DataTypes.INTEGER,
        allowNull: false, // Assurez-vous que cette clé étrangère ne peut pas être nulle.
        references: {
          model: "User", // Nom de la table cible.
          key: "idUser", // Clé primaire dans la table cible.
        },
      },
    },
    {
      tableName: "MindMap",
      timestamps: false,
    }
  );

  // Définir les associations
  MindMap.associate = (models) => {
    MindMap.belongsTo(models.User, {
      foreignKey: "idUser",
      as: "user", // Alias pour la relation.
    });
  };

  return MindMap;
};
